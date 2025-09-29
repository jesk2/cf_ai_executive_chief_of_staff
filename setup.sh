#!/bin/bash

# CF AI Productivity Assistant - Quick Demo Setup
# This script sets up the application for demonstration

echo "🚀 Setting up CF AI Productivity Assistant Demo..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ $NODE_VERSION -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler CLI..."
    npm install -g wrangler
else
    echo "✅ Wrangler CLI found"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if user is logged in to Cloudflare
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "🔑 Please log in to Cloudflare:"
    wrangler login
fi

# Generate types
echo "🔧 Generating TypeScript types..."
npm run cf-typegen

# Create wrangler.toml if it doesn't exist
if [ ! -f "wrangler.toml" ]; then
    echo "⚙️ Creating wrangler.toml..."
    cp wrangler.example.toml wrangler.toml
    
    echo "📝 Please edit wrangler.toml and add your Account ID."
    echo "   You can find it at: https://dash.cloudflare.com/"
    echo "   Look for 'Account ID' in the right sidebar."
    
    read -p "Enter your Cloudflare Account ID: " ACCOUNT_ID
    if [ ! -z "$ACCOUNT_ID" ]; then
        echo "" >> wrangler.toml
        echo "account_id = \"$ACCOUNT_ID\"" >> wrangler.toml
    fi
fi

# Create vector index
echo "🔍 Creating vector index..."
if wrangler vectorize list | grep -q "productivity-tasks"; then
    echo "✅ Vector index already exists"
else
    echo "📊 Creating new vector index..."
    wrangler vectorize create productivity-tasks --dimensions 768 --metric cosine
fi

# Run tests
echo "🧪 Running tests..."
npm test run

echo ""
echo "🎉 Setup complete! Here's how to start:"
echo ""
echo "1. Start the development server:"
echo "   npm run dev"
echo ""
echo "2. In another terminal, serve the frontend:"
echo "   cd frontend"
echo "   python -m http.server 8080"
echo "   # or use your preferred local server"
echo ""
echo "3. Open your browser to:"
echo "   http://localhost:8080"
echo ""
echo "4. To deploy to production:"
echo "   npm run deploy"
echo ""
echo "📚 Documentation:"
echo "   • README.md - Overview and features"
echo "   • DEPLOYMENT.md - Detailed deployment guide"
echo "   • DEVELOPMENT.md - Development workflow"
echo "   • PROMPTS.md - AI prompts used (required for assignment)"
echo ""
echo "🔧 Useful commands:"
echo "   • npm run cf-typegen - Regenerate types"
echo "   • wrangler tail - View live logs"
echo "   • wrangler vectorize list - Check vector indexes"
echo ""
echo "Happy coding! 🚀"