from flask import Flask, jsonify, request
from flask_socketio import SocketIO
from flask_cors import CORS
from backend.config import PORT, FLASK_DEBUG
from backend.ollama_handler import OllamaHandler
from backend.database import Database

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
CORS(app)

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize Ollama handler
ollama = OllamaHandler()

# Initialize Database
db = Database()

# ============= BASIC ROUTES =============

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    ollama_connected = ollama.check_connection()
    model_available = ollama.check_model_exists()
    
    return jsonify({
        'status': 'healthy' if ollama_connected else 'degraded',
        'ollama_connected': ollama_connected,
        'model_available': model_available,
        'model_name': ollama.model
    })

@app.route('/api/models', methods=['GET'])
def get_models():
    """Get list of available models"""
    try:
        models = ollama.get_available_models()
        return jsonify({
            'success': True,
            'models': models,
            'current_model': ollama.model
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/test', methods=['POST'])
def test_chat():
    """Test endpoint for quick chat"""
    try:
        data = request.json
        message = data.get('message', 'Hello!')
        
        messages = [{"role": "user", "content": message}]
        response = ollama.chat_complete(messages)
        
        return jsonify({
            'success': True,
            'response': response
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============= CHAT ROUTES =============

@app.route('/api/chats', methods=['GET'])
def get_chats():
    """Get all chats"""
    try:
        chats = db.list_chats()
        return jsonify({
            'success': True,
            'chats': chats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats', methods=['POST'])
def create_chat():
    """Create a new chat"""
    try:
        data = request.json
        title = data.get('title', 'New Chat')
        model_name = data.get('model_name', ollama.model)
        system_message = data.get('system_message')
        
        chat_id = db.create_chat(title, model_name, system_message)
        chat = db.get_chat(chat_id)
        
        return jsonify({
            'success': True,
            'chat': chat
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats/<int:chat_id>', methods=['GET'])
def get_chat(chat_id):
    """Get a specific chat with messages"""
    try:
        chat = db.get_chat(chat_id)
        if not chat:
            return jsonify({
                'success': False,
                'error': 'Chat not found'
            }), 404
        
        messages = db.get_messages(chat_id)
        chat['messages'] = messages
        
        return jsonify({
            'success': True,
            'chat': chat
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chats/<int:chat_id>', methods=['DELETE'])
def delete_chat_route(chat_id):
    """Delete a chat"""
    try:
        success = db.delete_chat(chat_id)
        return jsonify({
            'success': success
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============= MAIN =============

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 LocalMind Backend Starting...")
    print("="*50)
    
    # Check Ollama connection
    if ollama.check_connection():
        print("✅ Ollama connected")
        print(f"✅ Model: {ollama.model}")
    else:
        print("❌ WARNING: Ollama not connected!")
        print("   Run 'ollama serve' in another terminal")
    
    print(f"\n🌐 Server starting on http://localhost:{PORT}")
    print("="*50 + "\n")
    
    # Start server
    socketio.run(app, host='0.0.0.0', port=PORT, debug=FLASK_DEBUG)