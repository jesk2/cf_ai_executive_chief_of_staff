export interface Env {
  AI: any; // Cloudflare AI binding
  PRODUCTIVITY_AGENT: DurableObjectNamespace;
  TASK_MANAGER: DurableObjectNamespace;
  USER_SESSION: DurableObjectNamespace;
  WORKFLOWS: any; // Workflow binding
  VECTORIZE_INDEX: VectorizeIndex;
  
  // Environment variables
  ENVIRONMENT: string;
  OPENAI_API_KEY?: string;
  DATABASE_URL?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'completed' | 'cancelled';
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  projectId?: string;
  tags: string[];
  estimatedDuration?: number; // in minutes
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  tasks: string[]; // task IDs
  deadline?: Date;
}

export interface UserProfile {
  id: string;
  preferences: {
    workingHours: {
      start: string; // HH:MM format
      end: string;
    };
    timezone: string;
    priorityWeights: {
      urgency: number;
      importance: number;
      deadline: number;
    };
    aiPersonality: 'professional' | 'casual' | 'friendly';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'assistant';
  metadata?: {
    taskIds?: string[];
    projectIds?: string[];
    actionType?: 'create_task' | 'schedule' | 'query' | 'update';
  };
}

export interface WorkflowData {
  userId: string;
  type: 'schedule_optimization' | 'task_prioritization' | 'deadline_reminder';
  payload: any;
  scheduledFor?: Date;
}