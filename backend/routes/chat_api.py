from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from backend.database import get_session
from backend.models import Chat, Project, GlobalSettings, Message, ContextItem
import ollama
from pydantic import BaseModel
import logging

# Re-use the existing MODEL config or move to settings later
MODEL = "llama3.2:1b"

router = APIRouter(prefix="/api/chat_completion", tags=["chat_completion"])

class ChatRequest(BaseModel):
    chat_id: int
    user_message: str

class ContextItemCreate(BaseModel):
    name: str
    content: str
    type: str = "text" # "text", "file"

class ContextItemUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None

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
        
    # Chat Context (Legacy Field - include if present)
    if chat.context_text:
        system_prompt_parts.append(f"Chat Base Context:\n{chat.context_text}")

    # NEW: Context Stack Items
    active_items = [item for item in chat.context_items if item.is_active]
    for item in active_items:
        system_prompt_parts.append(f"Context '{item.name}' ({item.type}):\n{item.content}")
        
    system_prompt = "\n\n".join(system_prompt_parts)
    
    # 5. Build History
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
        
    # Load previous messages from DB
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

# --- Context Management Endpoints ---

@router.get("/{chat_id}/context", response_model=List[ContextItem])
def get_context_items(chat_id: int, session: Session = Depends(get_session)):
    chat = session.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat.context_items

@router.post("/{chat_id}/context", response_model=ContextItem)
def add_context_item(chat_id: int, item: ContextItemCreate, session: Session = Depends(get_session)):
    chat = session.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    db_item = ContextItem(chat_id=chat_id, **item.dict())
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item

@router.put("/context/{item_id}", response_model=ContextItem)
def update_context_item(item_id: int, updates: ContextItemUpdate, session: Session = Depends(get_session)):
    item = session.get(ContextItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = updates.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
        
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@router.delete("/context/{item_id}")
def delete_context_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(ContextItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    session.delete(item)
    session.commit()
    return {"ok": True}

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Simple text extraction for now
    try:
        content = await file.read()
        text_content = content.decode("utf-8")
        return {"filename": file.filename, "content": text_content}
    except Exception as e:
        # Fallback for binary or read errors
        return {"filename": file.filename, "content": f"[Error reading file: {str(e)}]"}
