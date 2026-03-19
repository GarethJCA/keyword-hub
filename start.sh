#!/bin/bash

# Setup Virtual Environment if not exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r backend/requirements.txt
else
    source .venv/bin/activate
fi

# Start the Backend
echo "🚀 Starting Backend (FastAPI) on http://localhost:8000..."
cd backend && python3 -m uvicorn app.main:app --port 8000 --reload &
BACKEND_PID=$!

# Start the Frontend
echo "✨ Starting Frontend (Vite) on http://localhost:5173..."
cd frontend && npm run dev &
FRONTEND_PID=$!

# Handle exit
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

echo "Dashboard is initializing. Please wait a moment..."
wait
