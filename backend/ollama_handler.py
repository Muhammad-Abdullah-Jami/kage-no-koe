import requests
import json
from typing import Generator, List, Dict, Optional
from backend.config import OLLAMA_HOST, MODEL_NAME

class OllamaHandler:
    def __init__(self, host: str = OLLAMA_HOST, model: str = MODEL_NAME):
        self.host = host
        self.model = model
        self.api_url = f"{host}/api"
    
    def check_connection(self) -> bool:
        """Check if Ollama server is running"""
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=5)
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False
    
    def get_available_models(self) -> List[Dict]:
        """Get list of downloaded models"""
        try:
            response = requests.get(f"{self.api_url}/tags")
            if response.status_code == 200:
                data = response.json()
                return data.get('models', [])
            return []
        except requests.exceptions.RequestException as e:
            print(f"Error fetching models: {e}")
            return []
    
    def check_model_exists(self, model_name: Optional[str] = None) -> bool:
        """Check if a specific model is downloaded"""
        model = model_name or self.model
        models = self.get_available_models()
        return any(m['name'] == model for m in models)
    
    def chat_stream(self, messages: List[Dict], model: Optional[str] = None) -> Generator[str, None, None]:
        """
        Stream chat responses token by token
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name (uses default if None)
        
        Yields:
            Individual tokens as they're generated
        """
        model = model or self.model
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": True
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/chat",
                json=payload,
                stream=True,
                timeout=120
            )
            
            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        try:
                            chunk = json.loads(line)
                            if 'message' in chunk:
                                content = chunk['message'].get('content', '')
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue
            else:
                yield f"Error: Server returned {response.status_code}"
                
        except requests.exceptions.RequestException as e:
            yield f"Error: {str(e)}"
    
    def chat_complete(self, messages: List[Dict], model: Optional[str] = None) -> str:
        """
        Get complete chat response (non-streaming)
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name (uses default if None)
        
        Returns:
            Complete response text
        """
        model = model or self.model
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": False
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/chat",
                json=payload,
                timeout=120
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('message', {}).get('content', '')
            else:
                return f"Error: Server returned {response.status_code}"
                
        except requests.exceptions.RequestException as e:
            return f"Error: {str(e)}"


# Test functions
if __name__ == '__main__':
    handler = OllamaHandler()
    
    print("=== Testing Ollama Handler ===\n")
    
    # Test 1: Connection
    print("1. Checking connection...")
    if handler.check_connection():
        print("   ✅ Connected to Ollama\n")
    else:
        print("   ❌ Cannot connect to Ollama\n")
        exit(1)
    
    # Test 2: List models
    print("2. Available models:")
    models = handler.get_available_models()
    for model in models:
        print(f"   - {model['name']} ({model['size'] / 1e9:.1f}GB)")
    print()
    
    # Test 3: Check if default model exists
    print(f"3. Checking if {MODEL_NAME} exists...")
    if handler.check_model_exists():
        print(f"   ✅ {MODEL_NAME} is available\n")
    else:
        print(f"   ❌ {MODEL_NAME} not found\n")
        exit(1)
    
    # Test 4: Streaming chat
    print("4. Testing streaming response...")
    print("   User: Hello!")
    print("   Assistant: ", end='', flush=True)
    
    messages = [{"role": "user", "content": "Say hello in one short sentence"}]
    for token in handler.chat_stream(messages):
        print(token, end='', flush=True)
    print("\n")
    
    # Test 5: Complete response
    print("5. Testing complete response...")
    messages = [{"role": "user", "content": "What is 2+2? Answer in 3 words."}]
    response = handler.chat_complete(messages)
    print(f"   Response: {response}\n")
    
    print("=== All Tests Passed! ===")