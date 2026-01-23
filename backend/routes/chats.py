from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from backend.database import get_session
from backend.models import Chat, ChatBase, Message, Project

router = APIRouter(prefix="/api/chats", tags=["chats"])

@router.post("/", response_model=Chat)
def create_chat(chat: ChatBase, project_id: int = None, session: Session = Depends(get_session)):
    db_chat = Chat.from_orm(chat)
    if project_id:
        db_chat.project_id = project_id
    session.add(db_chat)
    session.commit()
    session.refresh(db_chat)
    return db_chat

@router.get("/", response_model=List[Chat])
def read_chats(project_id: int = None, session: Session = Depends(get_session)):
    if project_id:
        statement = select(Chat).where(Chat.project_id == project_id)
    else:
        statement = select(Chat)
    chats = session.exec(statement).all()
    return chats

@router.get("/{chat_id}", response_model=Chat)
def read_chat(chat_id: int, session: Session = Depends(get_session)):
    chat = session.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@router.put("/{chat_id}", response_model=Chat)
def update_chat(chat_id: int, chat_data: ChatBase, session: Session = Depends(get_session)):
    chat = session.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    chat_dict = chat_data.dict(exclude_unset=True)
    for key, value in chat_dict.items():
        setattr(chat, key, value)
        
    session.add(chat)
    session.commit()
    session.refresh(chat)
    return chat

@router.get("/{chat_id}/messages", response_model=List[Message])
def read_chat_messages(chat_id: int, session: Session = Depends(get_session)):
    chat = session.get(Chat, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat.messages
