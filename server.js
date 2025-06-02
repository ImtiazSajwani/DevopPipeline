const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage (for demo purposes)
let todos = [
  { id: 1, text: 'Learn DevOps', completed: false, createdAt: new Date() },
  { id: 2, text: 'Set up Jenkins Pipeline', completed: false, createdAt: new Date() },
  { id: 3, text: 'Deploy to Production', completed: false, createdAt: new Date() }
];
let nextId = 4;

// Utility functions
const findTodoById = (id) => todos.find(todo => todo.id === parseInt(id));
const validateTodo = (text) => text && typeof text === 'string' && text.trim().length > 0;

// Health check endpoint
app.get('/health', (req, res) => {
  const healthInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: ENV,
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    todos_count: todos.length
  };
  
  res.status(200).json(healthInfo);
});

// API endpoints
app.get('/api/todos', (req, res) => {
  try {
    res.json({
      success: true,
      data: todos,
      count: todos.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch todos'
    });
  }
});

app.get('/api/todos/:id', (req, res) => {
  try {
    const todo = findTodoById(req.params.id);
    if (!todo) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }
    res.json({
      success: true,
      data: todo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch todo'
    });
  }
});

app.post('/api/todos', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!validateTodo(text)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid todo text'
      });
    }
    
    const newTodo = {
      id: nextId++,
      text: text.trim(),
      completed: false,
      createdAt: new Date()
    };
    
    todos.push(newTodo);
    
    res.status(201).json({
      success: true,
      data: newTodo,
      message: 'Todo created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create todo'
    });
  }
});

app.put('/api/todos/:id', (req, res) => {
  try {
    const todo = findTodoById(req.params.id);
    if (!todo) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }
    
    const { text, completed } = req.body;
    
    if (text !== undefined) {
      if (!validateTodo(text)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid todo text'
        });
      }
      todo.text = text.trim();
    }
    
    if (completed !== undefined) {
      todo.completed = Boolean(completed);
    }
    
    todo.updatedAt = new Date();
    
    res.json({
      success: true,
      data: todo,
      message: 'Todo updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update todo'
    });
  }
});

app.delete('/api/todos/:id', (req, res) => {
  try {
    const todoIndex = todos.findIndex(todo => todo.id === parseInt(req.params.id));
    if (todoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }
    
    const deletedTodo = todos.splice(todoIndex, 1)[0];
    
    res.json({
      success: true,
      data: deletedTodo,
      message: 'Todo deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete todo'
    });
  }
});

// Stats endpoint for monitoring
app.get('/api/stats', (req, res) => {
  try {
    const completedTodos = todos.filter(todo => todo.completed).length;
    const pendingTodos = todos.length - completedTodos;
    
    res.json({
      success: true,
      data: {
        total: todos.length,
        completed: completedTodos,
        pending: pendingTodos,
        completion_rate: todos.length > 0 ? (completedTodos / todos.length * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

// Metrics endpoint for monitoring (Prometheus-style)
app.get('/metrics', (req, res) => {
  const completedTodos = todos.filter(todo => todo.completed).length;
  const pendingTodos = todos.length - completedTodos;
  
  const metrics = `
# HELP todos_total Total number of todos
# TYPE todos_total counter
todos_total ${todos.length}

# HELP todos_completed Number of completed todos
# TYPE todos_completed counter
todos_completed ${completedTodos}

# HELP todos_pending Number of pending todos
# TYPE todos_pending counter
todos_pending ${pendingTodos}

# HELP app_uptime_seconds Application uptime in seconds
# TYPE app_uptime_seconds counter
app_uptime_seconds ${process.uptime()}
`;
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Todo API server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`🌍 Environment: ${ENV}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;