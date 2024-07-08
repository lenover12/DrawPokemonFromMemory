from flask import Flask, render_template, request, jsonify
import boto3
from dotenv import load_dotenv
import os
import time

load_dotenv()

app = Flask(__name__)
s3 = boto3.client(
    "s3",
    endpoint_url=os.getenv("DO_ENDPOINT"),
    aws_access_key_id=os.getenv("DO_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("DO_SECRET_KEY"),
)

@app.route('/')
def index():
    return render_template('index.html')

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
        return jsonify({'success': 'Image uploaded successfully!', 'imageUrl': image_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
