import { Agent, AgentNamespace } from 'agents';
import { Env, Task, Project, UserProfile, ChatMessage } from './types';

export class ProductivityAgent extends Agent {
  private env: Env;
  private userId: string;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.env = env;
    this.userId = '';
  }

  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.setState({ userId, initialized: true });
  }

  /**
   * Main chat handler - processes user messages and returns AI responses
   */
  async handleChat(message: string): Promise<ChatMessage> {
    try {
      // Store user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        userId: this.userId,
        content: message,
        timestamp: new Date(),
        type: 'user'
      };

      // Analyze message for intent and extract actions
      const intent = await this.analyzeIntent(message);
      
      // Generate AI response based on intent
      const response = await this.generateResponse(message, intent);

      // Execute any actions identified
      if (intent.actions.length > 0) {
        await this.executeActions(intent.actions);
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        userId: this.userId,
        content: response,
        timestamp: new Date(),
        type: 'assistant',
        metadata: {
          actionType: intent.primaryAction,
          taskIds: intent.extractedTasks?.map(t => t.id),
          projectIds: intent.extractedProjects?.map(p => p.id)
        }
      };

      // Store both messages in state
      await this.sql.exec(
        `INSERT INTO messages (id, user_id, content, timestamp, type, metadata) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        userMessage.id, this.userId, userMessage.content, 
        userMessage.timestamp.toISOString(), userMessage.type, JSON.stringify(userMessage.metadata)
      );

      await this.sql.exec(
        `INSERT INTO messages (id, user_id, content, timestamp, type, metadata) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        assistantMessage.id, this.userId, assistantMessage.content,
        assistantMessage.timestamp.toISOString(), assistantMessage.type, JSON.stringify(assistantMessage.metadata)
      );

      return assistantMessage;
    } catch (error) {
      console.error('Error handling chat:', error);
      return {
        id: crypto.randomUUID(),
        userId: this.userId,
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        type: 'assistant'
      };
    }
  }

  /**
   * Analyze user message to determine intent and extract actionable items
   */
  private async analyzeIntent(message: string) {
    const systemPrompt = `You are a productivity assistant AI. Analyze the user message and determine:
1. Primary intent (create_task, schedule, query, update, general_chat)
2. Any tasks mentioned or to be created
3. Any projects referenced
4. Priority level if mentioned
5. Due dates or time references
6. Actions to take

Respond in JSON format with the structure:
{
  "primaryAction": "create_task|schedule|query|update|general_chat",
  "confidence": 0.0-1.0,
  "extractedTasks": [{"title": "...", "priority": "...", "dueDate": "..."}],
  "extractedProjects": [{"name": "...", "description": "..."}],
  "timeReferences": ["..."],
  "actions": ["action1", "action2"]
}`;

    try {
      const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 512,
        temperature: 0.1
      });

      return JSON.parse(response.response || '{}');
    } catch (error) {
      console.error('Error analyzing intent:', error);
      return {
        primaryAction: 'general_chat',
        confidence: 0.5,
        extractedTasks: [],
        extractedProjects: [],
        timeReferences: [],
        actions: []
      };
    }
  }

  /**
   * Generate AI response based on message and intent
   */
  private async generateResponse(message: string, intent: any): Promise<string> {
    // Get user context and recent messages
    const context = await this.getUserContext();
    const recentMessages = await this.getRecentMessages(5);
    const strategicInsights = await this.generateStrategicInsights(context);

    const systemPrompt = `You are an elite AI Chief of Staff, modeled after the world's top executive assistants. You think strategically, anticipate needs, and operate with sophisticated business acumen.

Your Core Traits:
- Strategic thinking: Always consider the bigger picture and long-term impact
- Proactive intelligence: Anticipate needs before they're expressed
- Executive communication: Clear, concise, with strategic context
- Systems thinking: See connections between tasks, projects, and goals
- Time sovereignty: Treat time as the most precious executive resource

Current Executive Context:
- Core hours: ${context.workingHours?.start || '09:00'} - ${context.workingHours?.end || '17:00'}
- Time zone: ${context.timezone || 'UTC'}
- Active initiatives: ${context.taskCount || 0} tasks across ${context.projectCount || 0} projects
- Strategic insights: ${strategicInsights}

Conversation Thread:
${recentMessages.map(m => `${m.type}: ${m.content}`).join('\n')}

Respond as an elite chief of staff would: with strategic insight, proactive suggestions, and executive-level communication. When taking actions, explain the strategic rationale.`;

    try {
      const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      return response.response || 'I understand, let me help you with that.';
    } catch (error) {
      console.error('Error generating response:', error);
      return 'I understand your request and I\'m working on it.';
    }
  }

  /**
   * Execute identified actions from intent analysis
   */
  private async executeActions(actions: string[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action) {
          case 'create_task':
            await this.triggerWorkflow('task_creation', { userId: this.userId });
            break;
          case 'schedule_optimization':
            await this.triggerWorkflow('schedule_optimization', { userId: this.userId });
            break;
          case 'priority_update':
            await this.triggerWorkflow('task_prioritization', { userId: this.userId });
            break;
          default:
            console.log(`Unknown action: ${action}`);
        }
      } catch (error) {
        console.error(`Error executing action ${action}:`, error);
      }
    }
  }

  /**
   * Trigger a Cloudflare Workflow
   */
  private async triggerWorkflow(workflowType: string, data: any): Promise<void> {
    try {
      // Note: This would be implemented with actual Workflow binding
      console.log(`Triggering workflow: ${workflowType}`, data);
      // await this.env.WORKFLOWS.create({ type: workflowType, data });
    } catch (error) {
      console.error(`Error triggering workflow ${workflowType}:`, error);
    }
  }

  /**
   * Get user context for AI responses
   */
  private async getUserContext(): Promise<any> {
    try {
      const tasks = await this.sql.prepare(
        `SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status != 'completed'`
      ).bind(this.userId).first();

      const projects = await this.sql.prepare(
        `SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = 'active'`
      ).bind(this.userId).first();

      return {
        taskCount: tasks?.count || 0,
        projectCount: projects?.count || 0,
        workingHours: { start: '09:00', end: '17:00' },
        timezone: 'UTC'
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {};
    }
  }

  /**
   * Generate strategic insights from current context
   */
  private async generateStrategicInsights(context: any): Promise<string> {
    const currentHour = new Date().getHours();
    const insights = [];
    
    if (currentHour < 10) {
      insights.push('Prime strategic thinking hours - ideal for high-impact planning');
    } else if (currentHour > 15) {
      insights.push('Energy optimization window - focus on communication and lighter tasks');
    }
    
    if (context.taskCount > 10) {
      insights.push('High task volume detected - recommend strategic consolidation');
    }
    
    if (context.projectCount > 3) {
      insights.push('Multi-project complexity - suggest priority matrix review');
    }
    
    return insights.join('; ') || 'Optimal execution conditions';
  }

  /**
   * Get recent chat messages for context
   */
  private async getRecentMessages(limit: number = 5): Promise<ChatMessage[]> {
    try {
      const messages = await this.sql.prepare(
        `SELECT * FROM messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`
      ).bind(this.userId, limit).all();

      return messages.results.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        content: row.content,
        timestamp: new Date(row.timestamp),
        type: row.type,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      })).reverse();
    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  /**
   * Initialize database schema
   */
  async initializeSchema(): Promise<void> {
    try {
      await this.sql.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          type TEXT NOT NULL,
          metadata TEXT
        )
      `);

      await this.sql.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          priority TEXT DEFAULT 'medium',
          status TEXT DEFAULT 'todo',
          due_date TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          project_id TEXT,
          tags TEXT,
          estimated_duration INTEGER
        )
      `);

      await this.sql.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'active',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deadline TEXT,
          task_ids TEXT
        )
      `);

      console.log('Database schema initialized');
    } catch (error) {
      console.error('Error initializing schema:', error);
      throw error;
    }
  }

  /**
   * WebSocket message handler
   */
  async webSocketMessage(websocket: WebSocket, message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'chat':
          const response = await this.handleChat(data.content);
          websocket.send(JSON.stringify({
            type: 'chat_response',
            data: response
          }));
          break;
          
        case 'get_tasks':
          const tasks = await this.getUserTasks();
          websocket.send(JSON.stringify({
            type: 'tasks',
            data: tasks
          }));
          break;
          
        default:
          websocket.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type'
          }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      websocket.send(JSON.stringify({
        type: 'error',
        message: 'Error processing message'
      }));
    }
  }

  /**
   * Get user's tasks
   */
  private async getUserTasks(): Promise<Task[]> {
    try {
      const result = await this.sql.prepare(
        `SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC`
      ).bind(this.userId).all();

      return result.results.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority as Task['priority'],
        status: row.status as Task['status'],
        dueDate: row.due_date ? new Date(row.due_date) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        userId: row.user_id,
        projectId: row.project_id,
        tags: row.tags ? JSON.parse(row.tags) : [],
        estimatedDuration: row.estimated_duration
      }));
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }
}