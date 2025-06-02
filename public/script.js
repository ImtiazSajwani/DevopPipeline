class TodoApp {
    constructor() {
        this.todos = [];
        this.init();
    }

    init() {
        this.todoInput = document.getElementById('todoInput');
        this.addBtn = document.getElementById('addBtn');
        this.todosList = document.getElementById('todosList');
        this.totalTodos = document.getElementById('totalTodos');
        this.completedTodos = document.getElementById('completedTodos');
        this.pendingTodos = document.getElementById('pendingTodos');
        this.healthStatus = document.getElementById('healthStatus');

        this.bindEvents();
        this.loadTodos();
        this.checkHealth();
        
        // Auto-refresh health status every 30 seconds
        setInterval(() => this.checkHealth(), 30000);
    }

    bindEvents() {
        this.addBtn.addEventListener('click', () => this.addTodo());
        this.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTodo();
            }
        });
    }

    async loadTodos() {
        try {
            const response = await fetch('/api/todos');
            const result = await response.json();
            
            if (result.success) {
                this.todos = result.data;
                this.renderTodos();
                this.updateStats();
            } else {
                this.showError('Failed to load todos');
            }
        } catch (error) {
            this.showError('Network error while loading todos');
            console.error('Error loading todos:', error);
        }
    }

    async addTodo() {
        const text = this.todoInput.value.trim();
        
        if (!text) {
            this.showError('Please enter a todo text');
            return;
        }

        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            const result = await response.json();

            if (result.success) {
                this.todos.push(result.data);
                this.todoInput.value = '';
                this.renderTodos();
                this.updateStats();
                this.showSuccess('Todo added successfully');
            } else {
                this.showError(result.error || 'Failed to add todo');
            }
        } catch (error) {
            this.showError('Network error while adding todo');
            console.error('Error adding todo:', error);
        }
    }

    async toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completed: !todo.completed })
            });

            const result = await response.json();

            if (result.success) {
                todo.completed = result.data.completed;
                this.renderTodos();
                this.updateStats();
            } else {
                this.showError(result.error || 'Failed to update todo');
            }
        } catch (error) {
            this.showError('Network error while updating todo');
            console.error('Error updating todo:', error);
        }
    }

    async deleteTodo(id) {
        if (!confirm('Are you sure you want to delete this todo?')) {
            return;
        }

        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.todos = this.todos.filter(t => t.id !== id);
                this.renderTodos();
                this.updateStats();
                this.showSuccess('Todo deleted successfully');
            } else {
                this.showError(result.error || 'Failed to delete todo');
            }
        } catch (error) {
            this.showError('Network error while deleting todo');
            console.error('Error deleting todo:', error);
        }
    }

    async editTodo(id, newText) {
        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: newText })
            });

            const result = await response.json();

            if (result.success) {
                const todo = this.todos.find(t => t.id === id);
                if (todo) {
                    todo.text = result.data.text;
                    this.renderTodos();
                    this.showSuccess('Todo updated successfully');
                }
            } else {
                this.showError(result.error || 'Failed to update todo');
            }
        } catch (error) {
            this.showError('Network error while updating todo');
            console.error('Error updating todo:', error);
        }
    }

    renderTodos() {
        if (this.todos.length === 0) {
            this.todosList.innerHTML = `
                <div class="empty-state">
                    <h3>No todos yet!</h3>
                    <p>Add your first todo to get started.</p>
                </div>
            `;
            return;
        }

        this.todosList.innerHTML = this.todos.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <input type="checkbox" class="todo-checkbox" 
                       ${todo.completed ? 'checked' : ''} 
                       onchange="app.toggleTodo(${todo.id})">
                
                <span class="todo-text" ondblclick="app.startEdit(${todo.id})">${this.escapeHtml(todo.text)}</span>
                
                <div class="todo-actions">
                    <button class="edit-btn" onclick="app.startEdit(${todo.id})">Edit</button>
                    <button class="delete-btn" onclick="app.deleteTodo(${todo.id})">Delete</button>
                </div>
            </li>
        `).join('');
    }

    startEdit(id) {
        const todoItem = document.querySelector(`[data-id="${id}"]`);
        const todoText = todoItem.querySelector('.todo-text');
        const currentText = this.todos.find(t => t.id === id)?.text || '';

        todoText.innerHTML = `
            <input type="text" class="edit-input" value="${this.escapeHtml(currentText)}" 
                   onkeypress="if(event.key==='Enter') app.saveEdit(${id})"
                   onblur="app.cancelEdit(${id})">
        `;

        const input = todoText.querySelector('.edit-input');
        input.focus();
        input.select();

        // Update action buttons
        const actions = todoItem.querySelector('.todo-actions');
        actions.innerHTML = `
            <button class="save-btn" onclick="app.saveEdit(${id})">Save</button>
            <button class="cancel-btn" onclick="app.cancelEdit(${id})">Cancel</button>
        `;
    }

    saveEdit(id) {
        const todoItem = document.querySelector(`[data-id="${id}"]`);
        const input = todoItem.querySelector('.edit-input');
        const newText = input.value.trim();

        if (!newText) {
            this.showError('Todo text cannot be empty');
            return;
        }

        this.editTodo(id, newText);
    }

    cancelEdit(id) {
        this.renderTodos();
    }

    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const pending = total - completed;

        this.totalTodos.textContent = total;
        this.completedTodos.textContent = completed;
        this.pendingTodos.textContent = pending;
    }

    async checkHealth() {
        try {
            const response = await fetch('/health');
            const health = await response.json();

            if (response.ok && health.status === 'healthy') {
                this.healthStatus.innerHTML = `
                    <span class="status-indicator">✅</span>
                    <span>Application is healthy (Uptime: ${Math.floor(health.uptime)}s)</span>
                `;
                this.healthStatus.className = 'health-status status-healthy';
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            this.healthStatus.innerHTML = `
                <span class="status-indicator">❌</span>
                <span>Application is unhealthy</span>
            `;
            this.healthStatus.className = 'health-status status-unhealthy';
            console.error('Health check failed:', error);
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            background: ${type === 'error' ? '#dc3545' : '#28a745'};
        `;

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TodoApp();
});