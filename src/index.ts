import { ProductivityAgent } from './agent';
import { TaskManager } from './storage';
import { ExecutiveWorkflowOrchestrator } from './workflow';
import { Env } from './types';

// User Session Durable Object for managing user state
export class UserSession {
  private ctx: DurableObjectState;
  private env: Env;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'GET' && path === '/profile') {
      const profile = await this.ctx.storage.get('profile') || {
        id: crypto.randomUUID(),
        preferences: {
          workingHours: { start: '09:00', end: '17:00' },
          timezone: 'UTC',
          priorityWeights: { urgency: 0.4, importance: 0.3, deadline: 0.3 },
          aiPersonality: 'professional'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return new Response(JSON.stringify(profile), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'POST' && path === '/profile') {
      const profileData = await request.json();
      profileData.updatedAt = new Date();
      await this.ctx.storage.put('profile', profileData);
      
      return new Response(JSON.stringify(profileData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'POST' && path === '/schedule-suggestion') {
      const suggestion = await request.json();
      suggestion.createdAt = new Date();
      await this.ctx.storage.put('latest-schedule', suggestion);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

// Main Worker entry point
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS handling
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    try {
      // Health check
      if (path === '/health') {
        return new Response(JSON.stringify({ status: 'healthy', timestamp: new Date() }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Chat endpoint
      if (path === '/api/chat' && request.method === 'POST') {
        const { userId, message } = await request.json();
        
        if (!userId || !message) {
          return new Response(JSON.stringify({ error: 'userId and message are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const agentId = env.PRODUCTIVITY_AGENT.idFromName(userId);
        const agent = env.PRODUCTIVITY_AGENT.get(agentId);

        const response = await agent.fetch('http://internal/chat', {
          method: 'POST',
          body: JSON.stringify({ message })
        });

        const result = await response.json();
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Tasks API
      if (path.startsWith('/api/tasks')) {
        const userId = url.searchParams.get('userId');
        
        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const taskManagerId = env.TASK_MANAGER.idFromName(userId);
        const taskManager = env.TASK_MANAGER.get(taskManagerId);

        const taskResponse = await taskManager.fetch(new Request(
          `http://internal${path.replace('/api', '')}?${url.searchParams.toString()}`,
          {
            method: request.method,
            body: request.body,
            headers: request.headers
          }
        ));

        const result = await taskResponse.json();
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // WebSocket upgrade for real-time communication
      if (path === '/api/ws') {
        const upgradeHeader = request.headers.get('Upgrade');
        const userId = url.searchParams.get('userId');

        if (!upgradeHeader || upgradeHeader !== 'websocket') {
          return new Response('Expected Upgrade: websocket', { status: 426 });
        }

        if (!userId) {
          return new Response('userId parameter is required', { status: 400 });
        }

        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);

        // Connect to user's agent
        const agentId = env.PRODUCTIVITY_AGENT.idFromName(userId);
        const agent = env.PRODUCTIVITY_AGENT.get(agentId);

        // Accept the WebSocket connection
        server.accept();

        // Handle WebSocket messages
        server.addEventListener('message', async (event) => {
          try {
            await agent.fetch('http://internal/websocket', {
              method: 'POST',
              body: event.data
            });
          } catch (error) {
            server.send(JSON.stringify({
              type: 'error',
              message: 'Error processing message'
            }));
          }
        });

        return new Response(null, {
          status: 101,
          webSocket: client,
        });
      }

      // Workflow triggers
      if (path === '/api/workflows/schedule' && request.method === 'POST') {
        const { userId, type } = await request.json();
        
        // This would trigger a Cloudflare Workflow
        // For now, we'll simulate it
        console.log(`Triggering workflow: ${type} for user: ${userId}`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: `${type} workflow scheduled` 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // User profile management
      if (path.startsWith('/api/profile')) {
        const userId = url.searchParams.get('userId');
        
        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const sessionId = env.USER_SESSION.idFromName(userId);
        const userSession = env.USER_SESSION.get(sessionId);

        const sessionResponse = await userSession.fetch(new Request(
          `http://internal${path.replace('/api', '')}`,
          {
            method: request.method,
            body: request.body,
            headers: request.headers
          }
        ));

        const result = await sessionResponse.json();
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Semantic search endpoint
      if (path === '/api/search' && request.method === 'POST') {
        const { userId, query } = await request.json();
        
        if (!userId || !query) {
          return new Response(JSON.stringify({ error: 'userId and query are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        try {
          // Generate embedding for search query
          const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
            text: query
          });

          // Search vector index
          const results = await env.VECTORIZE_INDEX.query(embedding.data[0], {
            topK: 10,
            filter: { userId: { $eq: userId } }
          });

          return new Response(JSON.stringify({ results: results.matches }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });

        } catch (error) {
          console.error('Search error:', error);
          return new Response(JSON.stringify({ error: 'Search failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders 
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  },

  // Scheduled event handler for background workflows
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Scheduled event triggered:', event.cron);
    
    // This would run periodic tasks like:
    // - Deadline reminders
    // - Schedule optimization
    // - Analytics collection
    
    try {
      // Example: Run deadline check workflow for all active users
      // In a real implementation, you'd iterate through users
      const sampleUserId = 'sample-user';
      const workflow = new ExecutiveWorkflowOrchestrator();
      await workflow.checkDeadlines({ 
        userId: sampleUserId, 
        type: 'deadline_reminder', 
        payload: {} 
      });
      
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  },

  // WebSocket handler
  async websocket(websocket: WebSocket, userId?: string): Promise<void> {
    websocket.accept();
    
    if (!userId) {
      websocket.close(1008, 'userId is required');
      return;
    }

    websocket.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        
        // Handle different message types
        switch (data.type) {
          case 'ping':
            websocket.send(JSON.stringify({ type: 'pong' }));
            break;
            
          case 'chat':
            // Forward to agent
            websocket.send(JSON.stringify({
              type: 'chat_response',
              data: { message: 'Processing your request...' }
            }));
            break;
            
          default:
            websocket.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }));
        }
      } catch (error) {
        websocket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    websocket.addEventListener('close', (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
    });

    websocket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
};

// Export Durable Object classes
export { ProductivityAgent, TaskManager, ExecutiveWorkflowOrchestrator };