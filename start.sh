#!/bin/bash
# ============================================================
# AI Ticketing System - One-Command Setup Script
# ============================================================

echo ""
echo "⚡ AI Ticketing System Setup"
echo "============================================================"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.9+"
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo ""
    echo "⚠️  ANTHROPIC_API_KEY is not set."
    read -p "Enter your Anthropic API key: " key
    export ANTHROPIC_API_KEY="$key"
fi

echo ""
echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt -q

echo "✅ Backend ready"

echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install --silent

echo "✅ Frontend ready"

echo ""
echo "🚀 Starting servers..."
echo ""

# Start backend in background
cd ../backend
ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" python main.py &
BACKEND_PID=$!
echo "✅ Backend started at http://localhost:8000 (PID: $BACKEND_PID)"

sleep 2

# Start frontend
cd ../frontend
echo "✅ Starting frontend at http://localhost:3000"
echo ""
echo "============================================================"
echo "🎉 App is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "============================================================"
echo ""
npm start
