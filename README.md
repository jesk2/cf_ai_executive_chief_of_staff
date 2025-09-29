# CF AI Executive Chief of Staff

Frontend (Pages): https://cf-ai-executive-chief-of-staff.pages.dev

**Meet your AI Executive Assistant** - A hyper-intelligent digital chief of staff that thinks like a top-tier executive assistant, built on Cloudflare's cutting-edge AI platform. It doesn't just manage tasks; it anticipates your needs, strategizes your time, and operates with the sophistication of a C-suite aide.

## Unique Executive Features

### **Strategic Intelligence Engine**
- **Executive Decision Matrices**: Applies OKR alignment, ICE scoring, and RICE prioritization frameworks
- **Pattern Recognition**: Identifies decision velocity patterns, resource allocation trends, and strategic pivots
- **Competitive Intelligence**: Real-time market analysis and strategic opportunity identification
- **Scenario Planning**: Multi-scenario strategic planning with contingency protocols

### **Executive Energy Optimization**
- **Circadian Performance Mapping**: Maps cognitive peaks to strategic decision-making windows
- **Cognitive Load Analysis**: Monitors and optimizes mental bandwidth allocation
- **Energy-Task Alignment**: Matches high-energy periods to strategic work, low-energy to routine tasks
- **Decision Fatigue Prevention**: Proactive workload balancing to maintain decision quality

### **Real-time Executive Dashboard**
- **Strategic Alignment Tracking**: Live percentage of activities aligned with strategic objectives
- **Decision Velocity Metrics**: Tracks decisions per hour and decision quality indicators
- **Cognitive Load Monitoring**: Visual representation of mental bandwidth utilization
- **Force Multiplier Identification**: AI-powered suggestions for delegation and automation

### **Advanced Executive Frameworks**
- **Eisenhower Matrix AI**: Intelligent urgent/important categorization with strategic context
- **Executive Communication Protocols**: McKinsey-style briefings and BLUF communication
- **Strategic Status Updates**: Structured SBAR (Situation, Background, Assessment, Recommendation) reports
- **Meeting Intelligence**: Automated briefing materials and strategic talking points

### **Proactive Executive Assistance**
- **Anticipatory Intelligence**: Predicts needs based on calendar, workload, and historical patterns
- **Strategic Opportunity Mining**: Scans for efficiency gains and competitive advantages
- **Executive Context Switching**: Maintains conversation threads and project context across weeks
- **Risk Pattern Detection**: Identifies potential issues before they become critical

## Components

### 1. LLM Integration
- Uses Llama 3.3 70B via Workers AI for natural language understanding
- Fallback to external OpenAI API for enhanced capabilities
- Context-aware responses based on user history

### 2. Workflow Coordination
- Automated task prioritization workflows
- Project deadline tracking and notifications
- Resource allocation and scheduling optimization

### 3. User Interface
- Real-time chat interface built with vanilla JS/HTML
- WebSocket connection for instant updates
- Voice input support (Web Speech API)
- Mobile-responsive design

### 4. Memory & State
- User preferences and work patterns
- Task history and completion analytics
- Project context and relationships
- Learning from user interactions

## Getting Started

### Prerequisites
- Node.js 18+ 
- Cloudflare account with Workers AI enabled
- Wrangler CLI installed globally

### Installation

1. **Clone and setup**:
   ```bash
   git clone <your-repo-url>
   cd cf_ai_productivity_assistant
   npm install
   ```

2. **Configure Cloudflare**:
   ```bash
   # Login to Cloudflare
   wrangler login
   
   # Generate types
   npm run cf-typegen
   ```

3. **Environment Setup**:
   Copy `wrangler.example.toml` to `wrangler.toml` and configure:
   - Account ID
   - Database ID (if using external DB)
   - API keys (if using external services)

4. **Development**:
   ```bash
   # Start development server
   npm run dev
   
   # In another terminal, serve frontend
   cd frontend && python -m http.server 8080
   ```

5. **Deploy**:
   ```bash
   # Deploy worker and durable objects
   npm run deploy
   
   # Deploy frontend to Pages
   wrangler pages deploy frontend/dist
   ```

### Local Testing

1. Start the development server: `npm run dev`
2. Open `http://localhost:8080` for the chat interface
3. The worker will be available at `http://localhost:8787`

## Configuration

### Environment Variables

Set these in your `wrangler.toml`:

```toml
[vars]
OPENAI_API_KEY = "your-openai-key" # Optional fallback
ENVIRONMENT = "production"
```

### Durable Objects

The app uses several Durable Objects:
- `ProductivityAgent`: Main AI agent instance
- `TaskManager`: Task state management  
- `UserSession`: User session persistence

## API Endpoints

### Agent Endpoints
- `POST /api/chat` - Send message to AI agent
- `GET /api/tasks` - Retrieve user tasks
- `POST /api/tasks` - Create new task
- `WebSocket /api/ws` - Real-time communication

### Workflow Endpoints
- `POST /api/workflows/schedule` - Trigger scheduling workflow
- `GET /api/workflows/status/:id` - Check workflow status

## Testing

```bash
# Run tests
npm test

# Test specific component
npm test -- --grep "ProductivityAgent"
```
MIT License - see LICENSE file for details.

**Note**: This project was built as part of a Cloudflare AI application assignment, showcasing the integration of Workers AI, Workflows, Pages, and Durable Objects in a production-ready application.
