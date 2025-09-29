#!/bin/bash

# Quick deployment script for CF AI Executive Chief of Staff
echo "🚀 Deploying CF AI Executive Chief of Staff..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Check Wrangler authentication
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "❌ Please login to Cloudflare first:"
    echo "   wrangler login"
    exit 1
fi

# Step 3: Create vector index if it doesn't exist
echo "🗄️ Setting up vector database..."
if ! wrangler vectorize list | grep -q "productivity-tasks"; then
    echo "📊 Creating vector index..."
    wrangler vectorize create productivity-tasks --dimensions 768 --metric cosine
else
    echo "✅ Vector index already exists"
fi

# Step 4: Deploy the worker
echo "🚀 Deploying worker..."
wrangler deploy

# Step 5: Get the deployed URL
WORKER_URL=$(wrangler subdomain | grep -o 'https://[^/]*.workers.dev' || echo "https://your-worker.workers.dev")

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "🌐 Your AI Chief of Staff is live at:"
echo "   Worker API: $WORKER_URL"
echo ""
echo "📱 To test the application:"
echo "   1. Serve the frontend locally:"
echo "      cd frontend"
echo "      python -m http.server 8080"
echo ""
echo "   2. Open http://localhost:8080"
echo ""
echo "🧪 Quick API Tests:"
echo ""
echo "   # Health check"
echo "   curl $WORKER_URL/health"
echo ""
echo "   # Chat test"
echo "   curl -X POST $WORKER_URL/api/chat \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"userId\":\"test-exec\",\"message\":\"Analyze my strategic priorities\"}'"
echo ""
echo "🔧 Next Steps:"
echo "   • Update frontend/app.js with your worker URL for production"
echo "   • Deploy frontend to Cloudflare Pages"
echo "   • Configure custom domain if desired"
echo ""
echo "📚 Documentation:"
echo "   • README.md - Full feature overview"
echo "   • DEPLOYMENT.md - Detailed deployment guide"
echo "   • PROMPTS.md - AI prompts used (required for assignment)"