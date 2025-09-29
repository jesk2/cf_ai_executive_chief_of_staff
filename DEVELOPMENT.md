## Development Workflow

### Setting up development environment
1. Clone repository
2. Install dependencies: `npm install`  
3. Copy `wrangler.example.toml` to `wrangler.toml`
4. Set up Cloudflare account and get Account ID
5. Create Vectorize index: `wrangler vectorize create productivity-tasks --dimensions 768`
6. Start development: `npm run dev`

### Key architectural decisions
- Used Durable Objects for state management instead of external database for better performance and Cloudflare integration
- Implemented WebSocket for real-time communication to enable instant AI responses
- Chose Llama 3.3 70B for balance between capability and cost
- Used Vectorize for semantic search to enable context-aware task retrieval
- Separated concerns: Agent (AI logic), TaskManager (data), Workflow (orchestration), UserSession (preferences)

### Code organization
```
src/
├── index.ts          # Main worker entry point and routing
├── agent.ts          # AI agent with chat handling and intent analysis  
├── storage.ts        # TaskManager Durable Object for data management
├── workflow.ts       # Workflow orchestration and automation
└── types.ts          # TypeScript interfaces and types

frontend/
├── index.html        # Chat interface with responsive design
└── app.js           # WebSocket client and UI interactions
```

### AI Integration approach
- Primary: Cloudflare Workers AI with Llama 3.3 70B for natural language understanding
- Fallback: External OpenAI API for enhanced capabilities when needed
- Embeddings: BGE-base-en-v1.5 for semantic search and task clustering
- Prompt engineering: System prompts optimized for productivity and task management contexts

### State management strategy
- User sessions: Durable Objects with SQLite for user preferences and history
- Task data: Separate TaskManager DO with indexed queries for performance
- AI context: Message history with sliding window to manage token limits
- Real-time sync: WebSocket connections maintain state consistency between client and server

### Workflow automation
- Cron triggers: Daily task prioritization and deadline reminders
- Event-driven: Workflows triggered by user actions (task creation, updates)
- AI-powered: Intelligent scheduling and priority suggestions
- Background processing: Long-running operations handled asynchronously

### Testing strategy
- Unit tests for core AI logic and data operations
- Integration tests for API endpoints
- WebSocket connection testing
- Mock Cloudflare services for local development

### Performance optimizations
- Vectorize indexing for fast semantic search
- SQL indexes on frequently queried fields (user_id, status, due_date)
- WebSocket connection pooling and heartbeat
- Lazy loading of tasks and projects in UI
- AI response caching for common queries

### Security considerations
- Input sanitization for all user messages
- CORS headers properly configured
- Rate limiting on API endpoints
- No sensitive data in vector embeddings
- User isolation through Durable Object namespacing

### Deployment pipeline
1. TypeScript compilation and bundling via Wrangler
2. Automated Durable Object migrations
3. Vector index deployment and configuration
4. Frontend deployment to Cloudflare Pages
5. DNS routing and custom domain setup