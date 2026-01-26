import requests
import sys
import time

BASE_URL = "http://localhost:8000/api"

def main():
    # Wait for server to be ready
    print("Waiting for server to be ready...")
    for i in range(20):
        try:
            # Try to get projects as a health check
            requests.get(f"{BASE_URL}/projects/")
            print("Server is ready!")
            break
        except requests.exceptions.ConnectionError:
            time.sleep(2)
            print(".", end="", flush=True)
    else:
        print("\nServer not responding after 40 seconds.")
        # We try anyway, maybe it just came up
    
    # 1. Create Chat
    print("\nCreating chat...")
    try:
        resp = requests.post(f"{BASE_URL}/chats/", json={"title": "Query Chat"})
        resp.raise_for_status()
        chat = resp.json()
        chat_id = chat["id"]
        print(f"Chat created with ID: {chat_id}")
    except Exception as e:
        print(f"Error creating chat: {e}")
        return

    # 2. Send Message
    query = "who are you and tell me what do you know about british coloniliasm"
    print(f"Sending query: {query}")
    try:
        resp = requests.post(f"{BASE_URL}/chat_completion/", json={
            "chat_id": chat_id,
            "user_message": query
        })
        resp.raise_for_status()
        result = resp.json()
        print("\n--- RESPONSE ---\n")
        print(result["content"])
        print("\n----------------\n")
    except Exception as e:
        print(f"Error sending message: {e}")
        if 'resp' in locals():
            print(resp.text)

if __name__ == "__main__":
    main()
