import { WorkerEntrypoint } from 'cloudflare:workers';
import { Env, WorkflowData } from './types';

export class ExecutiveWorkflowOrchestrator extends WorkerEntrypoint<Env> {
  /**
   * Strategic Priority Optimization Workflow
   * Applies McKinsey-style priority matrices and CEO time management principles
   */
  async optimizeStrategicPriorities(data: WorkflowData): Promise<void> {
    const { userId } = data;
    
    try {
      // Get executive context
      const executiveContext = await this.getExecutiveContext(userId);
      const marketConditions = await this.analyzeMarketContext();
      
      // Apply strategic frameworks
      const priorityMatrix = await this.applyEisenhowerMatrix(executiveContext.tasks);
      const resourceAllocation = await this.optimizeResourceAllocation(executiveContext);
      
      // Generate strategic recommendations
      const strategicPlan = await this.generateStrategicPlan({
        priorities: priorityMatrix,
        resources: resourceAllocation,
        market: marketConditions,
        executive: executiveContext
      });
      
      // Execute strategic updates
      await this.executeStrategicUpdates(userId, strategicPlan);
      
      // Brief executive on changes
      await this.deliverExecutiveBriefing(userId, {
        type: 'strategic_optimization',
        insights: strategicPlan.keyInsights,
        actions: strategicPlan.recommendedActions,
        impact: strategicPlan.projectedImpact
      });
      
    } catch (error) {
      console.error('Error in strategic optimization workflow:', error);
      await this.escalateToChiefOfStaff(userId, error);
    }
  }

  /**
   * Schedule optimization workflow
   * Analyzes user schedule and suggests optimal time blocks
   */
  async optimizeSchedule(data: WorkflowData): Promise<void> {
    const { userId } = data;

    try {
      // Get user tasks and current schedule
      const taskManagerId = this.env.TASK_MANAGER.idFromName(userId);
      const taskManager = this.env.TASK_MANAGER.get(taskManagerId);
      
      const tasksResponse = await taskManager.fetch('http://internal/tasks?status=todo,in-progress');
      const tasks = await tasksResponse.json();

      // Get user preferences
      const userSessionId = this.env.USER_SESSION.idFromName(userId);
      const userSession = this.env.USER_SESSION.get(userSessionId);
      const profileResponse = await userSession.fetch('http://internal/profile');
      const profile = await profileResponse.json();

      // Generate schedule optimization
      const scheduleOptimization = await this.generateOptimalSchedule(tasks, profile);

      // Store optimization results
      await userSession.fetch('http://internal/schedule-suggestion', {
        method: 'POST',
        body: JSON.stringify(scheduleOptimization)
      });

      // Notify user of new schedule suggestions
      await this.notifyUser(userId, `I've optimized your schedule for ${scheduleOptimization.blocks.length} tasks`);

    } catch (error) {
      console.error('Error in optimizeSchedule workflow:', error);
    }
  }

  /**
   * Deadline reminder workflow
   * Checks for upcoming deadlines and sends reminders
   */
  async checkDeadlines(data: WorkflowData): Promise<void> {
    const { userId } = data;

    try {
      const taskManagerId = this.env.TASK_MANAGER.idFromName(userId);
      const taskManager = this.env.TASK_MANAGER.get(taskManagerId);
      
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Get tasks with upcoming deadlines
      const urgentResponse = await taskManager.fetch(
        `http://internal/tasks?due_before=${tomorrow.toISOString()}&status=todo,in-progress`
      );
      const urgentTasks = await urgentResponse.json();

      const soonResponse = await taskManager.fetch(
        `http://internal/tasks?due_before=${nextWeek.toISOString()}&status=todo,in-progress`
      );
      const soonTasks = await soonResponse.json();

      // Send urgent reminders
      if (urgentTasks && urgentTasks.length > 0) {
        await this.notifyUser(userId, 
          `🚨 You have ${urgentTasks.length} task(s) due within 24 hours: ${urgentTasks.map((t: any) => t.title).join(', ')}`
        );
      }

      // Send weekly reminders
      if (soonTasks && soonTasks.length > 0) {
        await this.notifyUser(userId,
          `📅 You have ${soonTasks.length} task(s) due this week. Consider prioritizing: ${soonTasks.slice(0, 3).map((t: any) => t.title).join(', ')}`
        );
      }

    } catch (error) {
      console.error('Error in checkDeadlines workflow:', error);
    }
  }

  /**
   * Get comprehensive executive context for strategic decision making
   */
  private async getExecutiveContext(userId: string) {
    const taskManagerId = this.env.TASK_MANAGER.idFromName(userId);
    const taskManager = this.env.TASK_MANAGER.get(taskManagerId);
    
    const userSessionId = this.env.USER_SESSION.idFromName(userId);
    const userSession = this.env.USER_SESSION.get(userSessionId);
    
    const [tasks, profile, performance] = await Promise.all([
      taskManager.fetch('http://internal/tasks').then(r => r.json()),
      userSession.fetch('http://internal/profile').then(r => r.json()),
      this.analyzeExecutivePerformance(userId)
    ]);
    
    return {
      tasks,
      profile,
      performance,
      workload: this.calculateCognitiveLoad(tasks),
      energyMap: this.generateEnergyMap(profile.workingHours),
      strategicAlignment: await this.assessStrategicAlignment(tasks)
    };
  }

  /**
   * Apply Eisenhower Priority Matrix with AI enhancement
   */
  private async applyEisenhowerMatrix(tasks: any[]) {
    const matrixPrompt = `You are a strategic consultant applying the Eisenhower Decision Matrix.
    
    For each task, classify into:
    - URGENT + IMPORTANT: Crisis management, deadline-driven critical tasks
    - IMPORTANT + NOT URGENT: Strategic planning, skill development, prevention
    - URGENT + NOT IMPORTANT: Interruptions that can be delegated
    - NOT URGENT + NOT IMPORTANT: Time wasters to eliminate
    
    Consider business impact, strategic value, and opportunity cost.
    
    Return JSON: {
      "doFirst": [],     // Urgent + Important
      "schedule": [],   // Important + Not Urgent  
      "delegate": [],   // Urgent + Not Important
      "eliminate": []   // Neither
    }`;

    const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct', {
      messages: [
        { role: 'system', content: matrixPrompt },
        { role: 'user', content: `Tasks: ${JSON.stringify(tasks)}` }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    return JSON.parse(response.response || '{}');
  }

  /**
   * Analyze executive performance patterns using advanced metrics
   */
  private async analyzeExecutivePerformance(userId: string) {
    // This would analyze completion rates, time estimation accuracy,
    // peak performance hours, and strategic goal progress
    return {
      completionRate: 0.78, // 78% task completion rate
      timeEstimationAccuracy: 0.65, // 65% accuracy in time estimates
      peakHours: ['09:00-11:00', '14:00-16:00'],
      strategicProgress: 0.85, // 85% on track for strategic goals
      cognitiveLoadTrend: 'increasing',
      decisionFatigue: 'moderate'
    };
  }

  /**
   * Calculate cognitive load based on task complexity and volume
   */
  private calculateCognitiveLoad(tasks: any[]) {
    let load = 0;
    
    tasks.forEach((task: any) => {
      // Base load by priority
      const priorityWeight = {
        'urgent': 4,
        'high': 3,
        'medium': 2,
        'low': 1
      }[task.priority] || 2;
      
      // Complexity multiplier
      const complexityFactor = task.estimatedDuration > 120 ? 1.5 : 1;
      
      // Context switching penalty
      const contextPenalty = task.projectId ? 1 : 1.2;
      
      load += priorityWeight * complexityFactor * contextPenalty;
    });
    
    return {
      total: load,
      level: load < 20 ? 'optimal' : load < 40 ? 'high' : 'overloaded',
      recommendations: load > 30 ? ['Consider delegation', 'Block focus time'] : []
    };
  }

  /**
   * Send notification to user
   */
  private async notifyUser(userId: string, message: string): Promise<void> {
    try {
      // Get user's agent for notification
      const agentId = this.env.PRODUCTIVITY_AGENT.idFromName(userId);
      const agent = this.env.PRODUCTIVITY_AGENT.get(agentId);
      
      await agent.fetch('http://internal/notify', {
        method: 'POST',
        body: JSON.stringify({ message, type: 'workflow_update' })
      });
    } catch (error) {
      console.error('Error notifying user:', error);
    }
  }

  /**
   * Scheduled workflow runner - called by Cloudflare cron triggers
   */
  async scheduled(event: ScheduledEvent): Promise<void> {
    try {
      // This would be triggered by cron for all users
      // For demo purposes, we'll just log
      console.log('Running scheduled workflows:', event.cron);
      
      // In production, you'd iterate through active users
      // and run appropriate workflows
    } catch (error) {
      console.error('Error in scheduled workflow:', error);
    }
  }
}