from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_pymongo import PyMongo
import boto3
from dotenv import load_dotenv
import os
import random
import string
import time
from flask_socketio import SocketIO, emit, join_room, leave_room

load_dotenv()

# constants
MAX_PLAYERS = 16

app = Flask(__name__, static_url_path='/static')
# Session management
app.secret_key = os.urandom(24)

# Set up MongoDB connection URI
app.config["MONGO_URI"] = os.getenv("ATLAS_DB_URI")  
mongo = PyMongo(app)

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{os.getenv('DO_ENDPOINT')}",
    aws_access_key_id=os.getenv("DO_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("DO_SECRET_KEY"),
)

# Initialize SocketIO with an async mode
socketio = SocketIO(app, async_mode='eventlet', logger=True, engineio_logger=True)

# socket to join a game room
@socketio.on('join_room')
def handle_join_room(data):
    game_id = data['game_id']
    join_room(game_id)
    emit('joined_room', {'game_id': game_id}, room=game_id)

# Route for Landing page to create or join a game
@app.route('/')
def landing():
    return render_template('landing.html')

# Endpoint for creating a game
@app.route('/create_game', methods=['POST'])
def create_game():
    # Generate a unique game ID
    game_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6)) 
    # Generate a session ID for the player
    session_id = ''.join(random.choices(string.ascii_letters + string.digits, k=16)) 
    session['session_id'] = session_id
    # Get player name
    player_name = request.form.get('player_name')
    if player_name == "":
        player_name = session_id
    player_profile_picture = request.form.get('profile_picture_url')

    game_data = {
        'game_id': game_id,
        'state': 'lobby',
        'players': [{'session_id': session_id, 'name': player_name, 'profile_picture': player_profile_picture, 'image_urls': []}]
    }
    mongo.db.game.insert_one(game_data)
    return redirect(url_for('lobby', game_id=game_id))

# Endpoint for joining a game
@app.route('/join_game', methods=['POST'])
def join_game():
    game_id = request.form.get('game_id')
    game = mongo.db.game.find_one({'game_id': game_id, 'state': 'lobby'})

    if game and len(game['players']) < MAX_PLAYERS:
        # Generate a session ID for the player
        session_id = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
        session['session_id'] = session_id
        player_name = request.form.get('player_name')
        if player_name == "":
            player_name = session_id
        player_profile_picture = request.form.get('profile_picture_url')
    
        mongo.db.game.update_one(
            {'game_id': game_id},
            {'$push': {'players': {'session_id': session_id, 'name': player_name, 'profile_picture': player_profile_picture, 'image_urls': []}}}
        )
        return redirect(url_for('lobby', game_id=game_id))
    else:
        return "Game not found or already full.", 400

# Route for Lobby Page
@app.route('/lobby/<game_id>')
def lobby(game_id):
    game = mongo.db.game.find_one({'game_id': game_id})
    if game:
        return render_template('lobby.html', game=game)
    else:
        return "Game not found."

# Start Game Endpoint
@app.route('/start_game/<game_id>', methods=['POST'])
def start_game(game_id):
    time_limit = request.form.get('timer')
    round_count = int(request.form.get('round_count'))

    # Generate random indexes for each round
    pokemon_ids = [random.randint(0, 1025) for _ in range(round_count)]

    # Update MongoDB document with game details
    mongo.db.game.update_one(
        {'game_id': game_id},
        {'$set': {
            'state': 'draw',
            'time_limit': time_limit,
            'round_count': round_count,
            'current_round': 1,
            'pokemon_ids': pokemon_ids
        }}
    )
    socketio.emit('redirect_to_draw', {'game_id': game_id}, room=game_id)
    return redirect(url_for('draw', game_id=game_id))

# Draw Page
@app.route('/draw/<game_id>')
def draw(game_id):
    game = mongo.db.game.find_one({'game_id': game_id})
    if game and game['state'] == 'draw':
        return render_template('draw.html', game=game)
    else:
        return "Game not found or not in draw state."

# Periodic Update Endpoint
@app.route('/get_players/<game_id>')
def get_players(game_id):
    game = mongo.db.game.find_one({'game_id': game_id})
    if game:
        return jsonify({'players': game['players']})
    else:
        return jsonify({'error': 'Game not found.'}), 404

@app.route('/upload', methods=['POST'])
def upload():
    pokemon_name = request.form['pokemonName'].strip()
    if not pokemon_name:
        pokemon_name = "~missingno"

    player_name = request.form['player_name'].strip()
    if not player_name:
        player_name = "~missingno"

    file = request.files['canvasImage']
    timestamp = int(time.time())
    filename = f"{player_name}_{timestamp}.png"

    # Get variables
    session_id = session.get('session_id')
    game_id = request.form.get('game_id')

    game = mongo.db.game.find_one({'game_id': game_id})

    # Check if each player has an image URL for the specific round key
    currentRound = game['current_round']

    pokemon_id = game['pokemon_ids'][currentRound - 1] + 1
    print (f"\n\n\n\nPOKEMON ID IS:::: {pokemon_id}")

    try:
        s3.upload_fileobj(file, os.getenv("DO_BUCKET"), f"{pokemon_id}/{filename}", ExtraArgs={'ACL': 'public-read'})
        image_url = f"https://{os.getenv('DO_BUCKET')}.{os.getenv('DO_ENDPOINT')}/{pokemon_id}/{filename}"


        # Find the index of the player's image_urls array that matches currentRound
        index = -1
        for i, player in enumerate(game['players']):
            if player['session_id'] == session_id:
                for j, img_dict in enumerate(player['image_urls']):
                    if str(currentRound) in img_dict:
                        index = j
                        break
                break

        # Construct the update query based on whether index was found
        if index != -1:
            # If index found, update the existing key-value pair
            mongo.db.game.update_one(
                {'game_id': game_id, 'players.session_id': session_id},
                {'$set': {f'players.$.image_urls.{index}.{currentRound}': image_url}}
            )
        else:
            # If index not found, push a new key-value pair
            mongo.db.game.update_one(
                {'game_id': game_id, 'players.session_id': session_id},
                {'$push': {'players.$.image_urls': {str(currentRound): image_url}}}
            )

        # Update Pokedex
        mongo.db.pokedex.update_one(
            {'pokemon_id': pokemon_id},
            {'$push': {'image_urls': image_url}},
            upsert=True
        )

        #fetch the game data after it is updated
        updated_game = mongo.db.game.find_one({'game_id': game_id})

        # Check if all players have uploaded their images
        all_uploaded = all(
            any(str(currentRound) in img_dict for img_dict in player.get('image_urls', []))
            for player in updated_game.get('players', [])
        )

        # check if the current round is the last round
        if all_uploaded:
            if updated_game and updated_game['round_count'] == updated_game['current_round']:
                mongo.db.game.update_one(
                    {'game_id': game_id},
                    {'$set': {'state': 'review'}}
                )
                # Notify all clients in the room to redirect to the review page
                socketio.emit('redirect_to_review', {'game_id': game_id}, room=game_id)
                #remove the room
                socketio.close_room(game_id)
                print(f"Room {game_id} has been closed.")
            else:
                current_round = updated_game['current_round'] + 1
                mongo.db.game.update_one(
                    {'game_id': game_id},
                    {'$set': {'current_round': current_round}}
                )
                # Notify all clients in the room to redirect to the next drawing page
                socketio.emit('redirect_to_next_round', {'game_id': game_id}, room=game_id)
        else:
            print (f"waiting on other players to upload")
        return jsonify({'success': 'Image uploaded successfully!', 'imageUrl': image_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
# Review Page
@app.route('/review/<game_id>')
def review(game_id):
    game = mongo.db.game.find_one({'game_id': game_id})
    if game and game['state'] == 'review':
        return render_template('review.html', game=game)
    else:
        return "Game not found or not in review state."


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=25565)
    # socketio.run(app, debug=True)
