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
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

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
# 3) Activate virtual environment
# -----------------------------
echo -e "\n${YELLOW}Activating virtual environment...${NC}"
if [ -f "venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source venv/bin/activate
  echo -e "${GREEN}✅ Virtual environment activated${NC}"
else
  echo -e "${RED}❌ Virtual environment not found!${NC}"
  echo -e "${YELLOW}Run: python3 -m venv venv && source venv/bin/activate${NC}"
  exit 1
fi

# -----------------------------
# 4) Start Flask server
# -----------------------------
echo -e "\n${YELLOW}Starting Flask server...${NC}"
echo -e "${GREEN}✅ Server will start on http://localhost:5000${NC}\n"

# Open browser after 2 seconds (Linux)
( sleep 2 && command -v xdg-open >/dev/null 2>&1 && xdg-open http://localhost:5000 2>/dev/null ) &

# Start the app
python -m backend.app

