# Draw Pokemon From Memory

Draw Pokemon From Memory is a simple and fun drawing game that utilizes the HTML5 canvas element. The game allows users from different devices to connect to a shared game session, draw a specified Pokemon from memory, and then view and compare each other's drawings.

## How It Works

- **Game Sessions**: Players create or connect to a game session using a unique game ID they can share with others.
- **Pokemon Name**: Each player in the session receives the same Pokemon name that they must draw from memory.
- **Canvas Drawing**: Users draw a Pokemon on a 128x128 canvas.
- **Image Upload**: The drawn images are uploaded directly to DigitalOcean Spaces.
- **Database Storage**: URLs of the uploaded images are stored in a database.
- **View Drawings**: After all player have finished drawing, they can view all their groups drawings together.
- **Pokedex**: All user drawings that have been uploaded can be accessed from the Pokedex page outside of a game session.

## Features & Purpose

The primary purpose of building this game is to demonstrate developer skills in different areas and tech stacks:

- **Real-time Interaction**: Connect and play with multiple users in real-time.
- **Cloud Storage of Streaming Data**: Stream data directly into a cloud bucket (DigitalOcean Spaces) showing experience in I/O operations (regardless of the small image size) to avoid handling data multiple times and showing experience in effective use of storage resources.
- **Cost-effective Design**: The 128x128 image size is used to be cost-effective for the developer, but is also aesthetically reminiscent of early Pokemon game designs.
- **Database Integration**: Store and retrieve image URLs in a database, demonstrating proficiency with cloud storage and database integration.

## Technologies Used

- **HTML5 Canvas**: For drawing the Pokemon.
- **JavaScript**: For client-side interactions.
- **Python (Flask)**: For the server-side application.
- **DigitalOcean Spaces**: For cloud object storage.
- **AWS SDK**: For interacting with DigitalOcean Spaces.
- **SQL Database**: For storing URLs of the uploaded images.

## Getting Started

To get started with developing or running the game, follow these steps:

### Prerequisites

- Python 3.x
- Node.js and npm
- DigitalOcean Spaces account

### Installation

1. **Clone the Repository**:

   ```sh
   git clone https://github.com/yourusername/draw-pokemon-from-memory.git
   cd draw-pokemon-from-memory
   ```

2. **Install Python Dependencies**:

   ```sh
   pip install -r requirements.txt
   ```

3. **Install Node.js Dependencies**:

   ```sh
   npm install
   ```

4. **Set Up Environment Variables**:
   Create a `.env` file in the root directory and add your DigitalOcean Spaces credentials:
   ```env
   DO_BUCKET=your_bucket_name
   DO_ACCESS_KEY=your_access_key
   DO_SECRET_KEY=your_secret_key
   DO_ENDPOINT=spaces_region_and_endpoint (e.g. https://syd1.digitaloceanspaces.com)
   ```

### Running the Application

1. **Start the Flask Server**:

   ```sh
   npm start
   ```

2. **Access the Application**:
   Open your browser and navigate to `http://localhost:5000`.
