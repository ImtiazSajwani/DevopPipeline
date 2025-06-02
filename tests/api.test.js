const request = require('supertest');
const app = require('../server');

describe('Todo API Endpoints', () => {
  let server;
  
  beforeAll(() => {
    server = app.listen(0); // Use random port for testing
  });
  
  afterAll((done) => {
    server.close(done);
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('todos_count');
    });
  });

  describe('GET /api/todos', () => {
    it('should return list of todos', async () => {
      const response = await request(app)
        .get('/api/todos')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/todos', () => {
    it('should create a new todo', async () => {
      const newTodo = { text: 'Test todo for Jenkins pipeline' };
      
      const response = await request(app)
        .post('/api/todos')
        .send(newTodo)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('text', newTodo.text);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('completed', false);
      expect(response.body.data).toHaveProperty('createdAt');
    });

    it('should return error for empty todo text', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ text: '' })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for missing todo text', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/todos/:id', () => {
    it('should return specific todo by id', async () => {
      // First create a todo
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Test todo for GET by ID' });
      
      const todoId = createResponse.body.data.id;
      
      const response = await request(app)
        .get(`/api/todos/${todoId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', todoId);
      expect(response.body.data).toHaveProperty('text', 'Test todo for GET by ID');
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .get('/api/todos/99999')
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Todo not found');
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update todo text', async () => {
      // First create a todo
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Original text' });
      
      const todoId = createResponse.body.data.id;
      
      const response = await request(app)
        .put(`/api/todos/${todoId}`)
        .send({ text: 'Updated text' })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('text', 'Updated text');
      expect(response.body.data).toHaveProperty('updatedAt');
    });

    it('should toggle todo completion status', async () => {
      // First create a todo
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Todo to complete' });
      
      const todoId = createResponse.body.data.id;
      
      const response = await request(app)
        .put(`/api/todos/${todoId}`)
        .send({ completed: true })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('completed', true);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .put('/api/todos/99999')
        .send({ text: 'Updated text' })
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Todo not found');
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete a todo', async () => {
      // First create a todo
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Todo to delete' });
      
      const todoId = createResponse.body.data.id;
      
      const response = await request(app)
        .delete(`/api/todos/${todoId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', todoId);
      
      // Verify todo is deleted
      await request(app)
        .get(`/api/todos/${todoId}`)
        .expect(404);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .delete('/api/todos/99999')
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Todo not found');
    });
  });

  describe('GET /api/stats', () => {
    it('should return todo statistics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('completed');
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('completion_rate');
    });
  });

  describe('GET /metrics', () => {
    it('should return prometheus-style metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.type).toBe('text/plain');
      expect(response.text).toContain('todos_total');
      expect(response.text).toContain('todos_completed');
      expect(response.text).toContain('todos_pending');
      expect(response.text).toContain('app_uptime_seconds');
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Route not found');
    });
  });
});