from typing import List, Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship

class ProjectBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None
    context_text: Optional[str] = None # Project-level context

class Project(ProjectBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    chats: List["Chat"] = Relationship(back_populates="project")

class ChatBase(SQLModel):
    title: str
    context_text: Optional[str] = None # Chat-specific context

class Chat(ChatBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    project: Optional[Project] = Relationship(back_populates="chats")
    messages: List["Message"] = Relationship(back_populates="chat")
    context_items: List["ContextItem"] = Relationship(back_populates="chat")


class MessageBase(SQLModel):
    role: str # "user", "assistant", "system"
    content: str

class Message(MessageBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    chat_id: Optional[int] = Field(default=None, foreign_key="chat.id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    chat: Optional[Chat] = Relationship(back_populates="messages")

class GlobalSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    global_context_text: Optional[str] = None # Global system prompt

class ContextItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    chat_id: Optional[int] = Field(default=None, foreign_key="chat.id")
    name: str
    type: str = "text" # "text", "file", "system"
    content: str # content or file path
    is_active: bool = True
    
    chat: Optional["Chat"] = Relationship(back_populates="context_items")

