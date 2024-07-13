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
    print('backend user is joined room:', game_id)
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

    # Generate a random index
    random_index = random.randint(0, 1025)

    game_data = {
        'game_id': game_id,
        'state': 'lobby',
        'players': [{'session_id': session_id, 'image_url': None}],
        'pokemon_id': random_index
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
        mongo.db.game.update_one(
            {'game_id': game_id},
            {'$push': {'players': {'session_id': session_id, 'image_url': None}}}
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
    mongo.db.game.update_one(
        {'game_id': game_id},
        {'$set': {'state': 'draw'}}
    )
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
        return jsonify({'error': 'Pokemon name is required!'}), 400

    file = request.files['canvasImage']
    timestamp = int(time.time())
    filename = f"{timestamp}.png"

    try:
        s3.upload_fileobj(file, os.getenv("DO_BUCKET"), f"{pokemon_name}/{filename}", ExtraArgs={'ACL': 'public-read'})
        image_url = f"https://{os.getenv('DO_BUCKET')}.{os.getenv('DO_ENDPOINT')}/{pokemon_name}/{filename}"
        # print(image_url)

        # Update the player's image URL in the database
        session_id = session.get('session_id')
        game_id = request.form.get('game_id')
        mongo.db.game.update_one(
            {'game_id': game_id, 'players.session_id': session_id},
            {'$set': {'players.$.image_url': image_url}}
        )

        # Update Pokedex
        mongo.db.pokedex.update_one(
            {'pokemon_name': pokemon_name},
            {'$push': {'image_urls': image_url}},
            upsert=True
        )

        # Check if all players have uploaded their images
        game = mongo.db.game.find_one({'game_id': game_id})
        all_uploaded = all(player.get('image_url') for player in game.get('players', []))
        if all_uploaded:
            mongo.db.game.update_one(
                {'game_id': game_id},
                {'$set': {'state': 'review'}}
            )
            # Notify all clients in the room to redirect to the review page
            socketio.emit('redirect_to_review', {'game_id': game_id}, room=game_id)

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
