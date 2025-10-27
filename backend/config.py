import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Project root directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load config.json
CONFIG_PATH = BASE_DIR / 'config.json'
with open(CONFIG_PATH, 'r') as f:
    config = json.load(f)

# Model Configuration
MODEL_NAME = config.get('model_name', 'llama3.2:1b')
HARDWARE_PROFILE = config.get('hardware_profile', 'laptop')

# Paths
DATABASE_PATH = BASE_DIR / config.get('database_path', 'data/app.db')
UPLOAD_FOLDER = BASE_DIR / config.get('upload_folder', 'data/uploads')
MODELS_FOLDER = BASE_DIR / 'models'

# Create folders if they don't exist
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
MODELS_FOLDER.mkdir(parents=True, exist_ok=True)

# Flask Configuration
FLASK_ENV = os.getenv('FLASK_ENV', 'development')
FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True') == 'True'
PORT = config.get('port', 5000)

# File Upload Configuration
MAX_FILE_SIZE_MB = config.get('max_file_size_mb', 50)
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Ollama Configuration
OLLAMA_HOST = 'http://localhost:11434'

# Print configuration on load (for debugging)
if __name__ == '__main__':
    print("=== Configuration Loaded ===")
    print(f"Model: {MODEL_NAME}")
    print(f"Hardware: {HARDWARE_PROFILE}")
    print(f"Database: {DATABASE_PATH}")
    print(f"Uploads: {UPLOAD_FOLDER}")
    print(f"Port: {PORT}")
    print(f"Ollama Host: {OLLAMA_HOST}")
    print("===========================")