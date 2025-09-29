# CF AI Productivity Assistant Deployment Guide

## Prerequisites

1. **Cloudflare Account**
   - Sign up at [cloudflare.com](https://cloudflare.com)
   - Enable Workers AI in your dashboard
   - Note your Account ID

2. **Wrangler CLI**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

3. **Node.js 18+**
   ```bash
   node --version  # Should be 18+
   ```

## Local Development Setup

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd cf_ai_productivity_assistant
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp wrangler.example.toml wrangler.toml
   ```
   
   Edit `wrangler.toml` and add your Account ID:
   ```toml
   account_id = "your-account-id-here"
   ```

3. **Create Vector Index**
   ```bash
   wrangler vectorize create productivity-tasks --dimensions 768 --metric cosine
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```
   
   Your worker will be available at `http://localhost:8787`

5. **Serve Frontend Locally**
   ```bash
   cd frontend
   python -m http.server 8080
   # Or use any local server
   ```
   
   Open `http://localhost:8080` in your browser

## Production Deployment

1. **Deploy Worker**
   ```bash
   npm run deploy
   ```

2. **Deploy Frontend to Pages**
   ```bash
   wrangler pages create cf-ai-productivity-assistant
   wrangler pages deploy frontend --project-name cf-ai-productivity-assistant
   ```

3. **Configure Custom Domain (Optional)**
   ```bash
   wrangler route add "your-domain.com/*" cf_ai_productivity_assistant
   ```

## Testing

1. **Run Unit Tests**
   ```bash
   npm test
   ```

2. **Test API Endpoints**
   ```bash
   # Health check
   curl https://your-worker.your-subdomain.workers.dev/health
   
   # Chat API
   curl -X POST https://your-worker.your-subdomain.workers.dev/api/chat \
     -H "Content-Type: application/json" \
     -d '{"userId":"test-user","message":"Create a task to review quarterly report"}'
   ```

3. **Test WebSocket Connection**
   Use your browser's developer console:
   ```javascript
   const ws = new WebSocket('wss://your-worker.your-subdomain.workers.dev/api/ws?userId=test-user');
   ws.onopen = () => console.log('Connected');
   ws.onmessage = (e) => console.log('Received:', e.data);
   ws.send(JSON.stringify({type: 'chat', content: 'Hello!'}));
   ```

## Configuration Options

### Environment Variables

Add these to your `wrangler.toml` under `[vars]`:

```toml
[vars]
ENVIRONMENT = "production"
# Optional: Add external API keys for enhanced functionality
OPENAI_API_KEY = "your-openai-key"  # For fallback AI
```

### Scheduled Tasks

The application includes cron triggers for:
- 9 AM daily: Morning task prioritization
- 5 PM daily: End-of-day summaries

Modify in `wrangler.toml`:
```toml
[triggers]
crons = ["0 9 * * *", "0 17 * * *"]
```

### Vector Database

Configure the vector index for semantic search:
```bash
# Create index with custom settings
wrangler vectorize create productivity-tasks \
  --dimensions 768 \
  --metric cosine \
  --description "Task and project semantic search"
```

## Monitoring & Analytics

1. **View Logs**
   ```bash
   wrangler tail
   ```

2. **Check Metrics**
   Visit your Cloudflare dashboard > Workers & Pages > cf_ai_productivity_assistant

3. **Custom Analytics** (Optional)
   Add analytics tracking in your worker:
   ```javascript
   // In your worker code
   ctx.waitUntil(
     fetch('https://analytics-endpoint.com/track', {
       method: 'POST',
       body: JSON.stringify({ event: 'chat_message', userId })
     })
   );
   ```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   ```bash
   npm install  # Ensure all dependencies are installed
   wrangler types  # Regenerate TypeScript types
   ```

2. **WebSocket connection fails**
   - Check that your worker URL is correct
   - Ensure you're using `wss://` for HTTPS domains
   - Verify the userId parameter is included

3. **AI model timeouts**
   - Add retry logic in your worker
   - Consider using fallback models
   - Check Cloudflare AI status page

4. **Vector index errors**
   ```bash
   wrangler vectorize list  # Check if index exists
   wrangler vectorize delete productivity-tasks  # Delete and recreate if needed
   wrangler vectorize create productivity-tasks --dimensions 768 --metric cosine
   ```

### Performance Optimization

1. **Cold Start Reduction**
   ```javascript
   // Pre-warm connections
   export default {
     fetch: warmupHandler,
     scheduled: keepWarmHandler
   }
   ```

2. **Caching Strategies**
   ```javascript
   // Cache user profiles
   const cache = await caches.open('user-profiles');
   ```

3. **Batch Operations**
   ```javascript
   // Process multiple tasks at once
   const updates = await Promise.all(tasks.map(updateTask));
   ```

## Security Considerations

1. **API Rate Limiting**
   ```javascript
   // Implement rate limiting per user
   const rateLimiter = new RateLimiter({ requestsPerMinute: 60 });
   ```

2. **Input Validation**
   ```javascript
   // Validate all user inputs
   const sanitizedMessage = sanitize(userMessage);
   ```

3. **Authentication** (Optional)
   ```javascript
   // Add JWT token validation
   const user = await validateToken(request.headers.get('Authorization'));
   ```

## Scaling Considerations

- **Durable Objects**: Automatically scale to millions of instances
- **Vector Index**: Supports up to 5M vectors per index
- **Worker Requests**: 100,000 free requests/day, unlimited on paid plans
- **WebSocket Connections**: 1,000 concurrent connections per worker

## Support

- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Cloudflare AI docs: https://developers.cloudflare.com/workers-ai/
- Community Discord: https://discord.gg/cloudflaredev

For issues specific to this application, check the GitHub repository or create an issue.