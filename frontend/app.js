class ExecutiveChiefOfStaff {
    constructor() {
        this.userId = 'executive-' + Math.random().toString(36).substring(7);
        this.isConnected = false;
        this.initializeElements();
        this.setupEventListeners();
        this.updateConnectionStatus();
        this.initializeSidebar();
    }

    initializeElements() {
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.status = document.getElementById('status');
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.autoResize();
        });
    }

    initializeSidebar() {
        // Auto-hide sidebar on mobile devices
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.add('hidden');
        }
    }

    autoResize() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Clear input and disable send button
        this.messageInput.value = '';
        this.sendButton.disabled = true;
        this.autoResize();

        // Add user message to chat
        this.addMessage('user', message);
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Call the API
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
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Hide typing indicator and show AI response
            this.hideTypingIndicator();
            this.addMessage('assistant', data.content || 'I understand your request and am processing it.');
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.addMessage('assistant', 'I apologize, but I encountered a connection issue. Please try again.');
        } finally {
            // Re-enable send button
            this.sendButton.disabled = false;
        }
    }

    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = this.formatMessage(content);
        
        messageDiv.appendChild(contentDiv);
        this.messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Convert line breaks and format text
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }

    updateConnectionStatus(connected = true) {
        this.isConnected = connected;
        
        if (connected) {
            this.connectionStatus.textContent = 'Connected';
            this.connectionStatus.className = 'connection-status connected';
            this.status.textContent = 'Strategic consultation • Decision optimization • Executive intelligence';
        } else {
            this.connectionStatus.textContent = 'Disconnected';
            this.connectionStatus.className = 'connection-status disconnected';
            this.status.textContent = 'Reconnecting to AI Executive Chief of Staff...';
        }
    }
}

// Sidebar functionality
let sidebarVisible = true;

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('hidden');
    sidebarVisible = !sidebar.classList.contains('hidden');
    
    // Auto-hide on mobile after interaction
    if (window.innerWidth <= 768 && sidebarVisible) {
        setTimeout(() => {
            sidebar.classList.add('hidden');
            sidebarVisible = false;
        }, 3000);
    }
}

// Quick command functionality
function quickCommand(command) {
    if (window.executiveChief) {
        window.executiveChief.messageInput.value = command;
        window.executiveChief.sendMessage();
        
        // Auto-hide sidebar on mobile after quick command
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.add('hidden');
            sidebarVisible = false;
        }
    }
}

// Global function for quick messages (if needed)
function sendQuickMessage(message) {
    if (window.executiveChief) {
        window.executiveChief.messageInput.value = message;
        window.executiveChief.sendMessage();
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth > 768) {
        // Desktop: show sidebar by default
        sidebar.classList.remove('hidden');
        sidebarVisible = true;
    } else {
        // Mobile: hide sidebar by default
        sidebar.classList.add('hidden');
        sidebarVisible = false;
    }
});

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.executiveChief = new ExecutiveChiefOfStaff();
    console.log('🎩 AI Executive Chief of Staff initialized');
    console.log('🎯 Executive Dashboard initialized');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.executiveChief) {
        window.executiveChief.updateConnectionStatus(true);
    }
});
