from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from backend.database import get_session
from backend.models import GlobalSettings
from pydantic import BaseModel

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
