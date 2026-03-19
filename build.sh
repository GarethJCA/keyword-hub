#!/usr/bin/env bash
set -e

echo "📦 Installing Backend Dependencies..."
cd backend
pip install -r requirements.txt
pip install gunicorn

echo "✨ Building Frontend..."
cd ../frontend
npm install
npm run build

echo "✅ Build Process Completed Successfully."
