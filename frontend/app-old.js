class ExecutiveChiefOfStaff {
    constructor() {
        this.websocket = null;
        this.userId = 'executive-' + Math.random().toString(36).substring(7);
        this.isConnected = false;
        this.recognition = null;
        this.isRecording = false;
        this.executiveMetrics = {
            strategicProgress: 87,
            cognitiveLoad: 68, 
            decisionVelocity: 2.3
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectWebSocket();
        this.setupSpeechRecognition();
        this.loadStrategicInitiatives();
        this.updateExecutiveDashboard();
    }

    initializeElements() {
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.voiceButton = document.getElementById('voiceButton');
        this.messages = document.getElementById('messages');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.status = document.getElementById('status');
        this.todayTasks = document.getElementById('todayTasks');
        this.userStats = document.getElementById('userStats');
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.voiceButton.addEventListener('click', () => this.toggleVoiceRecording());
        
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput.addEventListener('input', () => {
            this.autoResize();
        });

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });
    }

    connectWebSocket() {
        const wsUrl = `wss://cf_ai_productivity_assistant.219jessicak.workers.dev/api/ws?userId=${this.userId}`;
        // For production, use wss://your-worker-domain/api/ws?userId=${this.userId}
        
        try {
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                this.isConnected = true;
                this.updateConnectionStatus(true);
                console.log('WebSocket connected');
            };

            this.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.websocket.onclose = () => {
                this.isConnected = false;
                this.updateConnectionStatus(false);
                console.log('WebSocket disconnected');
                
                // Attempt to reconnect after 3 seconds
                setTimeout(() => this.connectWebSocket(), 3000);
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus(false);
            };

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.updateConnectionStatus(false);
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'chat_response':
                this.hideTypingIndicator();
                this.addMessage(data.data.content, 'assistant');
                this.loadTasks(); // Refresh tasks after AI response
                break;
                
            case 'tasks':
                this.updateTasksList(data.data);
                break;
                
            case 'error':
                this.hideTypingIndicator();
                this.addMessage('Sorry, I encountered an error: ' + data.message, 'assistant');
                break;
                
            case 'pong':
                console.log('Received pong');
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        this.connectionStatus.textContent = connected ? 'Executive Network Online' : 'Reconnecting...';
        this.connectionStatus.className = 'connection-status ' + (connected ? 'connected' : 'disconnected');
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isRecording = true;
                this.voiceButton.classList.add('recording');
                this.status.textContent = 'Listening...';
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.sendMessage();
            };

            this.recognition.onend = () => {
                this.isRecording = false;
                this.voiceButton.classList.remove('recording');
                this.status.textContent = 'Ready to help with your productivity!';
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isRecording = false;
                this.voiceButton.classList.remove('recording');
                this.status.textContent = 'Voice recognition failed. Please try again.';
            };
        } else {
            this.voiceButton.style.display = 'none';
        }
    }

    toggleVoiceRecording() {
        if (!this.recognition) return;

        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    autoResize() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = (this.messageInput.scrollHeight) + 'px';
    }

    async sendMessage(content = null) {
        const message = content || this.messageInput.value.trim();
        
        if (!message) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Clear input
        if (!content) {
            this.messageInput.value = '';
            this.autoResize();
        }

        // Show typing indicator
        this.showTypingIndicator();

        try {
            if (this.isConnected && this.websocket.readyState === WebSocket.OPEN) {
                // Send via WebSocket for real-time response
                this.websocket.send(JSON.stringify({
                    type: 'chat',
                    content: message
                }));
            } else {
                // Fallback to HTTP API
                await this.sendMessageHTTP(message);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.addMessage('Sorry, I encountered an error sending your message.', 'assistant');
        }
    }

    async sendMessageHTTP(message) {
        try {
            const response = await fetch('https://cf_ai_productivity_assistant.219jessicak.workers.dev/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            this.hideTypingIndicator();
            this.addMessage(data.content, 'assistant');
            this.loadTasks(); // Refresh tasks after response

        } catch (error) {
            console.error('HTTP request error:', error);
            this.hideTypingIndicator();
            this.addMessage('Sorry, I encountered an error processing your request.', 'assistant');
        }
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = this.formatMessage(content);
        
        messageDiv.appendChild(contentDiv);
        this.messages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    formatMessage(content) {
        // Basic markdown-like formatting
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
        content = content.replace(/\n/g, '<br>');
        
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        content = content.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
        
        return content;
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    updateExecutiveDashboard() {
        // Update executive metrics with dynamic values
        document.getElementById('strategicProgress').textContent = this.executiveMetrics.strategicProgress + '%';
        document.getElementById('cognitiveLoad').textContent = this.executiveMetrics.cognitiveLoad + '%';
        document.getElementById('decisionVelocity').textContent = this.executiveMetrics.decisionVelocity;
        
        // Simulate metric updates every 30 seconds
        setInterval(() => {
            this.executiveMetrics.strategicProgress += Math.floor(Math.random() * 3) - 1; // -1 to 1
            this.executiveMetrics.cognitiveLoad += Math.floor(Math.random() * 5) - 2; // -2 to 2  
            this.executiveMetrics.decisionVelocity = Math.max(0, this.executiveMetrics.decisionVelocity + (Math.random() * 0.4) - 0.2);
            
            // Clamp values
            this.executiveMetrics.strategicProgress = Math.max(0, Math.min(100, this.executiveMetrics.strategicProgress));
            this.executiveMetrics.cognitiveLoad = Math.max(0, Math.min(100, this.executiveMetrics.cognitiveLoad));
            
            this.updateExecutiveDashboard();
        }, 30000);
    }

    async loadStrategicInitiatives() {
        try {
            const response = await fetch(`https://cf_ai_productivity_assistant.219jessicak.workers.dev/api/tasks?userId=${this.userId}&status=todo,in-progress`);
            
            if (response.ok) {
                const initiatives = await response.json();
                this.updateInitiativesList(initiatives);
                this.updateExecutiveStats(initiatives);
            }
        } catch (error) {
            console.error('Error loading strategic initiatives:', error);
        }
    }

    updateTasksList(tasks) {
        if (!tasks || tasks.length === 0) {
            this.todayTasks.innerHTML = `
                <div class="task-item priority-medium">
                    <div class="task-title">No tasks yet</div>
                    <div class="task-meta">Ask me to create your first task!</div>
                </div>
            `;
            return;
        }

        this.todayTasks.innerHTML = '';
        
        // Show up to 5 most recent tasks
        const recentTasks = tasks.slice(0, 5);
        
        recentTasks.forEach(task => {
            const taskDiv = document.createElement('div');
            taskDiv.className = `task-item priority-${task.priority}`;
            
            const dueText = task.dueDate ? 
                ` • Due ${new Date(task.dueDate).toLocaleDateString()}` : '';
            
            taskDiv.innerHTML = `
                <div class="task-title">${task.title}</div>
                <div class="task-meta">${task.status}${dueText}</div>
            `;
            
            taskDiv.addEventListener('click', () => {
                this.sendMessage(`Tell me more about the task: ${task.title}`);
            });
            
            this.todayTasks.appendChild(taskDiv);
        });
    }

    updateUserStats(tasks) {
        const todoCount = tasks.filter(t => t.status === 'todo').length;
        const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
        
        this.userStats.textContent = `${todoCount + inProgressCount} active tasks`;
    }

    // Send a predefined quick message
    sendQuickMessage(message) {
        this.sendMessage(message);
    }

    // Periodic ping to keep WebSocket alive
    startHeartbeat() {
        setInterval(() => {
            if (this.isConnected && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000); // Every 30 seconds
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new ExecutiveChiefOfStaff();
    app.startHeartbeat();
    
    // Make sendQuickMessage available globally for onclick handlers
    window.sendQuickMessage = (message) => app.sendQuickMessage(message);
    window.app = app; // Store reference for visibility change handler
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Reconnect WebSocket if needed when page becomes visible
        if (window.app && !window.app.isConnected) {
            window.app.connectWebSocket();
        }
    }
});