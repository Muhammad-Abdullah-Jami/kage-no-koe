import requests
import time

BASE_URL = "http://localhost:8000/api"

def main():
    # 1. Wait for server (assuming we restart it after this script is created)
    print("Waiting for server...")
    for _ in range(30):
        try:
            requests.get(f"{BASE_URL}/projects/")
            print("Server is up!")
            break
        except:
            time.sleep(1)
            
    # 2. Create Chat
    chat_resp = requests.post(f"{BASE_URL}/chats/", json={"title": "Context Test Chat"})
    if chat_resp.status_code != 200:
        print(f"Failed to create chat: {chat_resp.text}")
        return
    chat_id = chat_resp.json()["id"]
    print(f"Chat created: {chat_id}")
    
    # 3. Add Text Context
    print("Adding text context...")
    text_ctx_resp = requests.post(f"{BASE_URL}/chat_completion/{chat_id}/context", json={
        "name": "My Secrets",
        "content": "The secret code is 12345.",
        "type": "text"
    })
    print(f"Add Context Response: {text_ctx_resp.status_code}")
    print(text_ctx_resp.json())
    
    # 4. Upload File
    print("Uploading file...")
    files = {'file': ('test.txt', 'This is content from a text file.')}
    upload_resp = requests.post(f"{BASE_URL}/chat_completion/upload", files=files)
    print(f"Upload Response: {upload_resp.status_code}")
    upload_data = upload_resp.json()
    print(upload_data)
    
    # 5. Add File Context
    print("Adding file context...")
    file_ctx_resp = requests.post(f"{BASE_URL}/chat_completion/{chat_id}/context", json={
        "name": upload_data["filename"],
        "content": upload_data["content"],
        "type": "file"
    })
    print(f"Add File Context Response: {file_ctx_resp.status_code}")
    print(file_ctx_resp.json())
    
    # 6. Verify Context Items
    print("Verifying items...")
    items_resp = requests.get(f"{BASE_URL}/chat_completion/{chat_id}/context")
    items = items_resp.json()
    print(f"Found {len(items)} items")
    for item in items:
        print(f"- {item['name']} ({item['type']}): active={item['is_active']}")
        
    # 7. Test Chat (asking about secret)
    print("Testing chat knowledge...")
    chat_req_resp = requests.post(f"{BASE_URL}/chat_completion/", json={
        "chat_id": chat_id,
        "user_message": "What is the secret code?"
    })
    print("Chat Response:")
    print(chat_req_resp.json()["content"])

if __name__ == "__main__":
    main()
