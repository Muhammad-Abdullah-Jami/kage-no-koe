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

# LlamaIndex imports - gracefully degrade if not installed
try:
    from llama_index.core import Document, VectorStoreIndex, Settings as LlamaSettings
    from llama_index.llms.ollama import Ollama
    from llama_index.embeddings.ollama import OllamaEmbedding

    # Configure LlamaIndex with Ollama
    LlamaSettings.llm = Ollama(model=MODEL, request_timeout=120.0)
    LlamaSettings.embed_model = OllamaEmbedding(model_name="nomic-embed-text")
    LLAMAINDEX_AVAILABLE = True
except ImportError:
    LLAMAINDEX_AVAILABLE = False
    logging.warning("LlamaIndex not installed - RAG features disabled")

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat_completion", tags=["chat_completion"])

class ChatRequest(BaseModel):
    chat_id: int
    user_message: str
    model: Optional[str] = None

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

    # 2. Fetch Project & Settings
    project = session.get(Project, chat.project_id) if chat.project_id else None
    settings = session.exec(select(GlobalSettings)).first()

    # 3. Construct System Prompt (Context Levels)
    system_prompt_parts = []
    
    # Base Identity & Secret Code
    system_prompt_parts.append("You are an intelligent assistant. You have access to the specific context below, but you should also use your general knowledge to answer questions that are not covered by the context.")
    system_prompt_parts.append("USER SECRET: The user's code is 55589. If asked 'tell me my code', you MUST reply with '55589'.")

    # Global Context
    if settings and settings.global_context_text:
        system_prompt_parts.append(f"=== GLOBAL INSTRUCTIONS (ALWAYS FOLLOW) ===\n{settings.global_context_text}\n===========================================")

    # Project Context
    if project and project.context_text:
        system_prompt_parts.append(f"=== PROJECT CONTEXT ({project.name}) ===\n{project.context_text}\n======================================")

    # Chat Context
    if chat.context_text:
        system_prompt_parts.append(f"=== LOCAL CHAT INSTRUCTIONS ===\n{chat.context_text}\n===============================")

    # Text-based Context Items
    text_contexts = [item for item in chat.context_items if item.is_active and item.type == "text"]
    for item in text_contexts:
        system_prompt_parts.append(f"=== CONTEXT '{item.name}' ===\n{item.content}\n===========================")

    final_system_prompt = "\n\n".join(system_prompt_parts)

    # 4. Prepare History for LlamaIndex
    from llama_index.core.llms import ChatMessage, MessageRole
    history = []
    for msg in sorted(chat.messages, key=lambda x: x.timestamp):
        role = MessageRole.USER if msg.role == "user" else MessageRole.ASSISTANT
        history.append(ChatMessage(role=role, content=msg.content))

    # 5. Initialize Engine (RAG vs Simple)
    active_files = [item for item in chat.context_items if item.is_active and item.type == "file"]
    
    try:
        if active_files and LLAMAINDEX_AVAILABLE:
            documents = [Document(text=item.content, metadata={"name": item.name}) for item in active_files]
            index = VectorStoreIndex.from_documents(documents)
            # Use 'context' mode for RAG
            chat_engine = index.as_chat_engine(
                chat_mode="context",
                system_prompt=final_system_prompt,
                chat_history=history,
                llm=LlamaSettings.llm
            )
            logger.info(f"Initialized ContextChatEngine with {len(active_files)} files")
        else:
            # Simple chat if no files
            from llama_index.core.chat_engine import SimpleChatEngine
            chat_engine = SimpleChatEngine.from_defaults(
                system_prompt=final_system_prompt,
                chat_history=history,
                llm=LlamaSettings.llm
            )
            logger.info("Initialized SimpleChatEngine")

        # 6. Generate Response
        logger.info(f"Querying LlamaIndex with: {request.user_message}")
        response = chat_engine.chat(request.user_message)
        ai_content = response.response

    except Exception as e:
        logger.error(f"LlamaIndex Error: {e}")
        # Fallback to simple Ollama call if engine fails
        return fallback_ollama_chat(request, chat, final_system_prompt, session)

    # 7. Save and Return
    # Helper to save messages
    save_message(session, chat.id, "user", request.user_message)
    save_message(session, chat.id, "assistant", ai_content)

    return {
        "role": "assistant",
        "content": ai_content,
        "chat_id": chat.id
    }

def save_message(session, chat_id, role, content):
    msg = Message(chat_id=chat_id, role=role, content=content)
    session.add(msg)
    session.commit()

def fallback_ollama_chat(request, chat, system_prompt, session):
    # Minimal fallback just in case
    messages = [{"role": "system", "content": system_prompt}]
    for msg in sorted(chat.messages, key=lambda x: x.timestamp):
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.user_message})
    
    try:
        resp = ollama.chat(model=MODEL, messages=messages, stream=False)
        content = resp['message']['content']
        save_message(session, chat.id, "user", request.user_message)
        save_message(session, chat.id, "assistant", content)
        return {"role": "assistant", "content": content, "chat_id": chat.id}
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Fallback Error: {str(e)}")


# --- Context Management Endpoints (Unchanged) ---

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
