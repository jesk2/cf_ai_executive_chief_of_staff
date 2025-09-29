import { DurableObject } from 'cloudflare:workers';

export interface Env {
  AI: any;
  PRODUCTIVITY_AGENT: DurableObjectNamespace;
  TASK_MANAGER: DurableObjectNamespace; 
  USER_SESSION: DurableObjectNamespace;
  VECTORIZE_INDEX: VectorizeIndex;
  ENVIRONMENT: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'completed';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  type: 'user' | 'assistant';
}

// Simplified AI Agent
export class ProductivityAgent extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (request.method === 'POST' && url.pathname === '/chat') {
      const { message } = await request.json() as { message: string };
      
      try {
        // Use Llama 3.3 for AI response
        const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct', {
          messages: [
            { 
              role: 'system', 
              content: `You are an elite AI Chief of Staff with sophisticated business intelligence. 
              You think strategically, provide executive-level insights, and communicate with the precision of a top-tier consultant.
              Apply frameworks like OKRs, Eisenhower Matrix, and strategic planning when relevant.` 
            },
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7
        });

        const chatResponse: ChatMessage = {
          id: crypto.randomUUID(),
          userId: 'user',
          content: response.response || 'I understand your request and am analyzing the strategic implications.',
          timestamp: new Date().toISOString(),
          type: 'assistant'
        };

        return new Response(JSON.stringify(chatResponse), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          id: crypto.randomUUID(),
          userId: 'user',
          content: 'I apologize, but I encountered an issue processing your strategic consultation. Please try again.',
          timestamp: new Date().toISOString(),
          type: 'assistant'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
}

// Simplified Task Manager  
export class TaskManager extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (request.method === 'GET' && url.pathname === '/tasks') {
      // Return sample tasks for demo
      const sampleTasks: Task[] = [
        {
          id: '1',
          title: 'Strategic Market Analysis Q4',
          description: 'Comprehensive analysis of market positioning and competitive landscape',
          priority: 'high',
          status: 'in-progress',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: 'executive-001'
        },
        {
          id: '2', 
          title: 'Executive Board Presentation Prep',
          description: 'Prepare strategic recommendations for board review',
          priority: 'urgent',
          status: 'todo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: 'executive-001'
        }
      ];

      return new Response(JSON.stringify(sampleTasks), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST' && url.pathname === '/tasks') {
      const taskData = await request.json() as Partial<Task>;
      
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: taskData.title || 'New Strategic Initiative',
        description: taskData.description,
        priority: taskData.priority || 'medium',
        status: 'todo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: taskData.userId || 'executive-001'
      };

      return new Response(JSON.stringify(newTask), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

// Simplified User Session
export class UserSession extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'GET') {
      const profile = {
        id: 'executive-001',
        preferences: {
          workingHours: { start: '09:00', end: '17:00' },
          timezone: 'UTC',
          aiPersonality: 'executive'
        }
      };
      
      return new Response(JSON.stringify(profile), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

// Main Worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          message: 'AI Chief of Staff is online and ready for strategic consultation'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Chat endpoint
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        const { userId, message } = await request.json() as { userId: string, message: string };
        
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
      if (url.pathname === '/api/tasks') {
        const userId = url.searchParams.get('userId') || 'executive-001';
        const taskManagerId = env.TASK_MANAGER.idFromName(userId);
        const taskManager = env.TASK_MANAGER.get(taskManagerId);

        const taskResponse = await taskManager.fetch(new Request(
          `http://internal/tasks?${url.searchParams.toString()}`,
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

      // WebSocket upgrade
      if (url.pathname === '/api/ws') {
        const upgradeHeader = request.headers.get('Upgrade');
        if (!upgradeHeader || upgradeHeader !== 'websocket') {
          return new Response('Expected WebSocket upgrade', { status: 426 });
        }

        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);

        (server as WebSocket).accept();
        
        (server as WebSocket).addEventListener('message', async (event) => {
          try {
            const data = JSON.parse(event.data as string);
            
            if (data.type === 'chat') {
              // Echo back a strategic response
              (server as WebSocket).send(JSON.stringify({
                type: 'chat_response',
                data: {
                  id: crypto.randomUUID(),
                  content: `Strategic analysis of "${data.content}" is underway. I'm applying executive frameworks to provide optimal recommendations.`,
                  timestamp: new Date().toISOString(),
                  type: 'assistant'
                }
              }));
            }
          } catch (error) {
            (server as WebSocket).send(JSON.stringify({
              type: 'error',
              message: 'Error processing strategic consultation'
            }));
          }
        });

        return new Response(null, {
          status: 101,
          webSocket: client,
        });
      }

      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders 
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};