#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}🚀 LocalMind Launcher${NC}"
echo -e "${GREEN}======================================${NC}\n"

# Get script directory
# Get script directory (Project Root)
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd "$PROJECT_DIR"

# Set local model directory
export OLLAMA_MODELS="$PROJECT_DIR/ollama_models"
mkdir -p "$OLLAMA_MODELS"
echo -e "${GREEN}📂 Using local model directory: $OLLAMA_MODELS${NC}"

# -----------------------------
# 0) Ensure Ollama is installed
# -----------------------------
echo -e "${YELLOW}Checking Ollama installation...${NC}"
if ! command -v ollama >/dev/null 2>&1; then
  echo -e "${RED}❌ Ollama not found${NC}"
  echo -e "${YELLOW}Attempting to install Ollama...${NC}"
  # Official install script (Linux/macOS)
  if curl -fsSL https://ollama.com/install.sh | sh; then
    echo -e "${GREEN}✅ Ollama installed successfully${NC}"
  else
    echo -e "${RED}❌ Failed to install Ollama automatically${NC}"
    echo -e "${YELLOW}Please install it manually from https://ollama.com and re-run this script.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✅ Ollama is installed${NC}"
fi

# -----------------------------
# 1) Ensure Ollama is running
# -----------------------------
echo -e "${YELLOW}Checking Ollama service...${NC}"
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo -e "${YELLOW}Starting Ollama in background...${NC}"
  nohup ollama serve > /dev/null 2>&1 &
  # Wait a few seconds for the API to come up
  for i in {1..10}; do
    sleep 1
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
      break
    fi
  done
fi

if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Ollama is running${NC}"
else
  echo -e "${RED}❌ Failed to start Ollama${NC}"
  echo -e "${YELLOW}Please try running 'ollama serve' manually and re-run this script.${NC}"
  exit 1
fi

# -----------------------------------------
# 2) Ensure at least one model is available
#    - If none, pull llama3.2:1b by default
# -----------------------------------------
echo -e "${YELLOW}Checking for installed Ollama models...${NC}"
TAGS_JSON="$(curl -s http://localhost:11434/api/tags || true)"

# If the tags endpoint returns an empty list, install default model
if echo "$TAGS_JSON" | grep -q '"models"[[:space:]]*:[[:space:]]*\[\]'; then
  echo -e "${YELLOW}No models found. Pulling default model: llama3.2:1b ...${NC}"
  if ollama pull llama3.2:1b; then
    echo -e "${GREEN}✅ Default model 'llama3.2:1b' installed${NC}"
  else
    echo -e "${RED}❌ Failed to pull 'llama3.2:1b'${NC}"
    echo -e "${YELLOW}You can manually run: 'ollama pull llama3.2:1b' and re-run this script.${NC}"
    # Not exiting—continue so the app can still start if desired
  fi
else
  echo -e "${GREEN}✅ At least one model already present. Skipping default install.${NC}"
fi

# -----------------------------
# 3) Activate virtual environment & Install Dep
# -----------------------------
echo -e "\n${YELLOW}Checking virtual environment...${NC}"

if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# shellcheck disable=SC1091
source venv/bin/activate
echo -e "${GREEN}✅ Virtual environment activated${NC}"

if [ -f "requirements.txt" ]; then
    echo -e "${YELLOW}Installing/Updating dependencies...${NC}"
    pip install -q -r requirements.txt
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# -----------------------------
# 4) Start Services
# -----------------------------
echo -e "\n${YELLOW}Starting Backend Server (FastAPI)...${NC}"
uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend running on port 8000 (PID: $BACKEND_PID)${NC}"

echo -e "\n${YELLOW}Starting Frontend Server (Vite)...${NC}"
cd frontend
npm install > /dev/null 2>&1 # Ensure deps are installed
npm run dev -- --host > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend running on port 5173 (PID: $FRONTEND_PID)${NC}"

echo -e "\n${GREEN}🚀 Kage no Koe is live!${NC}"
echo -e "${GREEN}👉 Open http://localhost:5173 to chat${NC}"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

wait

