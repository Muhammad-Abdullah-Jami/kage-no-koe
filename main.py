import logging
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from backend.database import create_db_and_tables
from backend.routes import projects, chats, settings, chat_api

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Kage no Koe API")

# Allow CORS for development (React/Vite usually runs on port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database on Startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Include Routers
app.include_router(projects.router)
app.include_router(chats.router)
app.include_router(settings.router)
app.include_router(chat_api.router)

# Mount static files (Frontend build will go here eventually)
# For now, we keep the old static folder for fallback or reference
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
