import requests
import json
import sys

# Configuration
OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2:1b"

def chat():
    print(f"\n🔮 Connected to {MODEL}. Type '/bye' to exit.\n")
    
    # Context variable to hold the conversation history if we were using the chat endpoint,
    # but for simple 'generate' loop or even 'chat' endpoint, we might want to keep history.
    # For MVP as per 'chat with me' request, let's use the 'api/chat' endpoint for better history handling if possible,
    # or just simple generate with context. 
    # Let's use /api/chat which is more modern for Ollama conversations.
    
    chat_url = "http://localhost:11434/api/chat"
    history = []

    while True:
        try:
            user_input = input("You: ")
            if not user_input.strip():
                continue
            
            if user_input.lower() in ['/bye', 'exit', 'quit']:
                print("👋 Sayonara!")
                break

            history.append({"role": "user", "content": user_input})
            
            print("AI: ", end="", flush=True)

            payload = {
                "model": MODEL,
                "messages": history,
                "stream": True
            }

            full_response = ""
            try:
                with requests.post(chat_url, json=payload, stream=True) as r:
                    r.raise_for_status()
                    for line in r.iter_lines():
                        if line:
                            body = json.loads(line)
                            if "message" in body and "content" in body["message"]:
                                chunk = body["message"]["content"]
                                print(chunk, end="", flush=True)
                                full_response += chunk
                            if body.get("done", False):
                                break
            except requests.exceptions.RequestException as e:
                print(f"\n❌ Error contacting Ollama: {e}")
                print("Make sure Ollama is running (try 'ollama serve' in another terminal)")
                continue

            print() # Newline after response
            history.append({"role": "assistant", "content": full_response})

        except KeyboardInterrupt:
            print("\n👋 Sayonara!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    chat()
