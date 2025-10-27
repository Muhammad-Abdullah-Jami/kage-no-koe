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

# Check if Ollama is running
echo -e "${YELLOW}Checking Ollama...${NC}"
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${RED}❌ Ollama is not running!${NC}"
    echo -e "${YELLOW}Starting Ollama in background...${NC}"
    ollama serve > /dev/null 2>&1 &
    sleep 3
    
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Ollama started${NC}"
    else
        echo -e "${RED}❌ Failed to start Ollama${NC}"
        echo -e "${YELLOW}Please run 'ollama serve' manually${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Ollama is running${NC}"
fi

# Activate virtual environment
echo -e "\n${YELLOW}Activating virtual environment...${NC}"
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✅ Virtual environment activated${NC}"
else
    echo -e "${RED}❌ Virtual environment not found!${NC}"
    echo -e "${YELLOW}Run: python3 -m venv venv${NC}"
    exit 1
fi

# Start Flask server
echo -e "\n${YELLOW}Starting Flask server...${NC}"
echo -e "${GREEN}✅ Server will start on http://localhost:5000${NC}\n"

# Open browser after 2 seconds
(sleep 2 && xdg-open http://localhost:5000 2>/dev/null) &

# Start the app
python -m backend.app