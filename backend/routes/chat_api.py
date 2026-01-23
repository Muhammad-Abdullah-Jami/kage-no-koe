from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from backend.database import get_session
from backend.models import Chat, Project, GlobalSettings, Message
import ollama
from pydantic import BaseModel
import logging

# Re-use the existing MODEL config or move to settings later
MODEL = "llama3.2:1b"

router = APIRouter(prefix="/api/chat_completion", tags=["chat_completion"])

class ChatRequest(BaseModel):
    chat_id: int
    user_message: str

@router.post("/")
def chat_completion(request: ChatRequest, session: Session = Depends(get_session)):
    # 1. Fetch Chat
    chat = session.get(Chat, request.chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # 2. Fetch Project (if linked)
    project = None
    if chat.project_id:
        project = session.get(Project, chat.project_id)
        
    # 3. Fetch Global Settings
    settings = session.exec(select(GlobalSettings)).first()
    
    # 4. Construct System Prompt (Context Merging)
    system_prompt_parts = []
    
    # Global Context
    if settings and settings.global_context_text:
        system_prompt_parts.append(f"Global Context:\n{settings.global_context_text}")
        
    # Project Context
    if project and project.context_text:
        system_prompt_parts.append(f"Project Context ({project.name}):\n{project.context_text}")
        
    # Chat Context
    if chat.context_text:
        system_prompt_parts.append(f"Chat Context:\n{chat.context_text}")
        
    system_prompt = "\n\n".join(system_prompt_parts)
    
    # 5. Build History
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
        
    # Load previous messages from DB
    # Limit to last N messages for context window if needed, but for now load all
    # Sorted by timestamp
    for msg in sorted(chat.messages, key=lambda x: x.timestamp):
        messages.append({"role": msg.role, "content": msg.content})
    
    # Add current user message
    messages.append({"role": "user", "content": request.user_message})
    
    # 6. Save User Message to DB
    user_msg_db = Message(chat_id=chat.id, role="user", content=request.user_message)
    session.add(user_msg_db)
    session.commit()
    
    # 7. Call Ollama
    try:
        response = ollama.chat(model=MODEL, messages=messages)
        ai_content = response['message']['content']
        
        # 8. Save AI Response to DB
        ai_msg_db = Message(chat_id=chat.id, role="assistant", content=ai_content)
        session.add(ai_msg_db)
        session.commit()
        
        return {
            "role": "assistant",
            "content": ai_content,
            "chat_id": chat.id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
