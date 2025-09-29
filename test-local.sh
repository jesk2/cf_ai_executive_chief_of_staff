#!/bin/bash

# Test script for CF AI Executive Chief of Staff
echo "🧪 Testing CF AI Executive Chief of Staff..."

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install with: npm install -g wrangler"
    exit 1
fi

# Check authentication
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Run: wrangler login"
    exit 1
fi

echo "✅ Prerequisites checked"

# Start local development server
echo "🚀 Starting development server..."
echo "   This will start the worker at http://localhost:8787"
echo "   Press Ctrl+C to stop"
echo ""

# Run in development mode
wrangler dev --local --port 8787

echo ""
echo "🧪 Manual Testing Guide:"
echo ""
echo "1. 📡 Test API endpoints:"
echo "   curl http://localhost:8787/health"
echo ""
echo "2. 💬 Test chat functionality:"
echo "   curl -X POST http://localhost:8787/api/chat \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"userId\":\"test-user\",\"message\":\"Create a strategic task\"}'"
echo ""
echo "3. 📋 Test task management:"
echo "   curl \"http://localhost:8787/api/tasks?userId=test-user\""
echo ""
echo "4. 🔍 Test search:"
echo "   curl -X POST http://localhost:8787/api/search \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"userId\":\"test-user\",\"query\":\"strategic planning\"}'"
echo ""
echo "5. 🌐 Test frontend:"
echo "   cd frontend && python -m http.server 8080"
echo "   Then open http://localhost:8080"