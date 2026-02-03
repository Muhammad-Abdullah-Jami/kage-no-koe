from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from backend.database import get_session
from backend.models import GlobalSettings
import ollama
from pydantic import BaseModel
from backend.download_handler import get_tracker

router = APIRouter(prefix="/api/settings", tags=["settings"])

class SettingsUpdate(BaseModel):
    global_context_text: str

@router.get("/", response_model=GlobalSettings)
def get_settings(session: Session = Depends(get_session)):
    # Always return the first row, create if not exists
    settings = session.exec(select(GlobalSettings)).first()
    if not settings:
        settings = GlobalSettings(global_context_text="")
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings

@router.post("/", response_model=GlobalSettings)
def update_settings(settings: SettingsUpdate, session: Session = Depends(get_session)):
    db_settings = session.exec(select(GlobalSettings)).first()
    if not db_settings:
        db_settings = GlobalSettings()
        session.add(db_settings)
    
    db_settings.global_context_text = settings.global_context_text
    session.commit()
    session.refresh(db_settings)
    return db_settings

@router.get("/models")
def list_models():
    """List local Ollama models"""
    try:
        models_resp = ollama.list()
        raw_models = models_resp.get("models", [])
        # Transform to simple format frontend expects
        return [{"name": m.get("model")} for m in raw_models]
    except Exception as e:
        return []

@router.post("/models/download")
def download_model(model_name: str):
    """Trigger an Ollama model download with progress tracking"""
    try:
        tracker = get_tracker()
        tracker.start_download(model_name)
        return {"status": "started", "message": f"Started downloading {model_name}", "model_name": model_name}
    except Exception as e:
        return {"error": str(e)}

@router.get("/models/download/progress")
def get_download_progress():
    """Get progress of all active downloads"""
    tracker = get_tracker()
    all_progress = tracker.get_all_progress()

    # Transform to frontend-friendly format
    downloads = []
    for model_name, info in all_progress.items():
        downloads.append({
            "modelName": model_name,
            "status": info["status"],
            "progress": info.get("progress", 0),
            "size": info.get("size"),
            "downloaded": info.get("downloaded"),
            "error": info.get("error")
        })

    return downloads
