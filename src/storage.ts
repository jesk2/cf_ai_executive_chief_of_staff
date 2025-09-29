import { Env, Task, Project } from './types';

export class TaskManager {
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

    try {
      // Initialize database if needed
      await this.initializeDatabase();

      if (method === 'GET' && path === '/tasks') {
        return await this.getTasks(url.searchParams);
      }

      if (method === 'POST' && path === '/tasks') {
        const taskData = await request.json();
        return await this.createTask(taskData);
      }

      if (method === 'PATCH' && path.startsWith('/tasks/')) {
        const taskId = path.split('/')[2];
        const updateData = await request.json();
        return await this.updateTask(taskId, updateData);
      }

      if (method === 'DELETE' && path.startsWith('/tasks/')) {
        const taskId = path.split('/')[2];
        return await this.deleteTask(taskId);
      }

      if (method === 'GET' && path === '/projects') {
        return await this.getProjects(url.searchParams);
      }

      if (method === 'POST' && path === '/projects') {
        const projectData = await request.json();
        return await this.createProject(projectData);
      }

      return new Response('Not Found', { status: 404 });

    } catch (error) {
      console.error('TaskManager error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  private async initializeDatabase(): Promise<void> {
    await this.ctx.storage.sql.exec(`
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

    await this.ctx.storage.sql.exec(`
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

    await this.ctx.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status)
    `);

    await this.ctx.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL
    `);
  }

  private async getTasks(searchParams: URLSearchParams): Promise<Response> {
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    const projectId = searchParams.get('project_id');
    const dueBefore = searchParams.get('due_before');

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    if (status) {
      const statuses = status.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      query += ` AND status IN (${placeholders})`;
      params.push(...statuses);
    }

    if (projectId) {
      query += ' AND project_id = ?';
      params.push(projectId);
    }

    if (dueBefore) {
      query += ' AND due_date <= ?';
      params.push(dueBefore);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.ctx.storage.sql.prepare(query).bind(...params).all();
    
    const tasks: Task[] = result.results.map((row: any) => ({
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

    return new Response(JSON.stringify(tasks), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async createTask(taskData: Partial<Task>): Promise<Response> {
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      title: taskData.title || 'Untitled Task',
      description: taskData.description,
      priority: taskData.priority || 'medium',
      status: taskData.status || 'todo',
      dueDate: taskData.dueDate,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      userId: taskData.userId || '',
      projectId: taskData.projectId,
      tags: taskData.tags || [],
      estimatedDuration: taskData.estimatedDuration
    };

    await this.ctx.storage.sql.prepare(`
      INSERT INTO tasks (
        id, user_id, title, description, priority, status, 
        due_date, created_at, updated_at, project_id, tags, estimated_duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      task.id,
      task.userId,
      task.title,
      task.description,
      task.priority,
      task.status,
      task.dueDate?.toISOString(),
      task.createdAt.toISOString(),
      task.updatedAt.toISOString(),
      task.projectId,
      JSON.stringify(task.tags),
      task.estimatedDuration
    ).run();

    // Add to vectorize for semantic search
    if (this.env.VECTORIZE_INDEX) {
      try {
        const embedding = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: `${task.title} ${task.description || ''}`
        });

        await this.env.VECTORIZE_INDEX.upsert([{
          id: task.id,
          values: embedding.data[0],
          metadata: {
            title: task.title,
            description: task.description,
            priority: task.priority,
            userId: task.userId,
            type: 'task'
          }
        }]);
      } catch (error) {
        console.error('Error adding task to vector index:', error);
      }
    }

    return new Response(JSON.stringify(task), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async updateTask(taskId: string, updateData: Partial<Task>): Promise<Response> {
    const now = new Date().toISOString();
    
    // Build dynamic update query
    const setClause: string[] = [];
    const params: any[] = [];

    if (updateData.title) {
      setClause.push('title = ?');
      params.push(updateData.title);
    }
    
    if (updateData.description !== undefined) {
      setClause.push('description = ?');
      params.push(updateData.description);
    }
    
    if (updateData.priority) {
      setClause.push('priority = ?');
      params.push(updateData.priority);
    }
    
    if (updateData.status) {
      setClause.push('status = ?');
      params.push(updateData.status);
    }
    
    if (updateData.dueDate !== undefined) {
      setClause.push('due_date = ?');
      params.push(updateData.dueDate?.toISOString());
    }
    
    if (updateData.projectId !== undefined) {
      setClause.push('project_id = ?');
      params.push(updateData.projectId);
    }
    
    if (updateData.tags) {
      setClause.push('tags = ?');
      params.push(JSON.stringify(updateData.tags));
    }
    
    if (updateData.estimatedDuration !== undefined) {
      setClause.push('estimated_duration = ?');
      params.push(updateData.estimatedDuration);
    }

    setClause.push('updated_at = ?');
    params.push(now);
    params.push(taskId);

    const query = `UPDATE tasks SET ${setClause.join(', ')} WHERE id = ?`;
    await this.ctx.storage.sql.prepare(query).bind(...params).run();

    // Get updated task
    const result = await this.ctx.storage.sql.prepare(
      'SELECT * FROM tasks WHERE id = ?'
    ).bind(taskId).first();

    if (!result) {
      return new Response('Task not found', { status: 404 });
    }

    const task: Task = {
      id: result.id,
      title: result.title,
      description: result.description,
      priority: result.priority as Task['priority'],
      status: result.status as Task['status'],
      dueDate: result.due_date ? new Date(result.due_date) : undefined,
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at),
      userId: result.user_id,
      projectId: result.project_id,
      tags: result.tags ? JSON.parse(result.tags) : [],
      estimatedDuration: result.estimated_duration
    };

    return new Response(JSON.stringify(task), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async deleteTask(taskId: string): Promise<Response> {
    await this.ctx.storage.sql.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();

    // Remove from vector index
    if (this.env.VECTORIZE_INDEX) {
      try {
        await this.env.VECTORIZE_INDEX.deleteByIds([taskId]);
      } catch (error) {
        console.error('Error removing task from vector index:', error);
      }
    }

    return new Response(null, { status: 204 });
  }

  private async getProjects(searchParams: URLSearchParams): Promise<Response> {
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');

    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.ctx.storage.sql.prepare(query).bind(...params).all();
    
    const projects: Project[] = result.results.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status as Project['status'],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      userId: row.user_id,
      tasks: row.task_ids ? JSON.parse(row.task_ids) : [],
      deadline: row.deadline ? new Date(row.deadline) : undefined
    }));

    return new Response(JSON.stringify(projects), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async createProject(projectData: Partial<Project>): Promise<Response> {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name: projectData.name || 'Untitled Project',
      description: projectData.description,
      status: projectData.status || 'active',
      createdAt: new Date(now),
      updatedAt: new Date(now),
      userId: projectData.userId || '',
      tasks: projectData.tasks || [],
      deadline: projectData.deadline
    };

    await this.ctx.storage.sql.prepare(`
      INSERT INTO projects (
        id, user_id, name, description, status,
        created_at, updated_at, deadline, task_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      project.id,
      project.userId,
      project.name,
      project.description,
      project.status,
      project.createdAt.toISOString(),
      project.updatedAt.toISOString(),
      project.deadline?.toISOString(),
      JSON.stringify(project.tasks)
    ).run();

    return new Response(JSON.stringify(project), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}