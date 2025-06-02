// Unit tests for utility functions and logic
describe('Todo Application Unit Tests', () => {
  
  describe('Input Validation', () => {
    const validateTodo = (text) => text && typeof text === 'string' && text.trim().length > 0;
    
    it('should validate correct todo text', () => {
      expect(validateTodo('Valid todo text')).toBe(true);
      expect(validateTodo('  Valid with spaces  ')).toBe(true);
      expect(validateTodo('123')).toBe(true);
    });
    
    it('should reject invalid todo text', () => {
      expect(validateTodo('')).toBe(false);
      expect(validateTodo('   ')).toBe(false);
      expect(validateTodo(null)).toBe(false);
      expect(validateTodo(undefined)).toBe(false);
      expect(validateTodo(123)).toBe(false);
      expect(validateTodo({})).toBe(false);
    });
  });
  
  describe('Todo ID Generation', () => {
    it('should generate unique incremental IDs', () => {
      let nextId = 1;
      const generateId = () => nextId++;
      
      expect(generateId()).toBe(1);
      expect(generateId()).toBe(2);
      expect(generateId()).toBe(3);
    });
  });
  
  describe('Todo Statistics Calculation', () => {
    const calculateStats = (todos) => {
      const total = todos.length;
      const completed = todos.filter(todo => todo.completed).length;
      const pending = total - completed;
      const completionRate = total > 0 ? (completed / total * 100) : 0;
      
      return { total, completed, pending, completionRate };
    };
    
    it('should calculate stats for empty todo list', () => {
      const stats = calculateStats([]);
      expect(stats).toEqual({
        total: 0,
        completed: 0,
        pending: 0,
        completionRate: 0
      });
    });
    
    it('should calculate stats for mixed todo list', () => {
      const todos = [
        { id: 1, text: 'Todo 1', completed: true },
        { id: 2, text: 'Todo 2', completed: false },
        { id: 3, text: 'Todo 3', completed: true },
        { id: 4, text: 'Todo 4', completed: false }
      ];
      
      const stats = calculateStats(todos);
      expect(stats).toEqual({
        total: 4,
        completed: 2,
        pending: 2,
        completionRate: 50
      });
    });
    
    it('should calculate stats for all completed todos', () => {
      const todos = [
        { id: 1, text: 'Todo 1', completed: true },
        { id: 2, text: 'Todo 2', completed: true }
      ];
      
      const stats = calculateStats(todos);
      expect(stats).toEqual({
        total: 2,
        completed: 2,
        pending: 0,
        completionRate: 100
      });
    });
    
    it('should calculate stats for all pending todos', () => {
      const todos = [
        { id: 1, text: 'Todo 1', completed: false },
        { id: 2, text: 'Todo 2', completed: false }
      ];
      
      const stats = calculateStats(todos);
      expect(stats).toEqual({
        total: 2,
        completed: 0,
        pending: 2,
        completionRate: 0
      });
    });
  });
  
  describe('Todo Search and Filter', () => {
    const todos = [
      { id: 1, text: 'Learn DevOps', completed: false },
      { id: 2, text: 'Setup Jenkins', completed: true },
      { id: 3, text: 'Deploy Application', completed: false },
      { id: 4, text: 'Monitor Performance', completed: true }
    ];
    
    const findTodoById = (todos, id) => todos.find(todo => todo.id === parseInt(id));
    const filterByStatus = (todos, completed) => todos.filter(todo => todo.completed === completed);
    const searchTodos = (todos, query) => todos.filter(todo => 
      todo.text.toLowerCase().includes(query.toLowerCase())
    );
    
    it('should find todo by ID', () => {
      expect(findTodoById(todos, 2)).toEqual({
        id: 2, text: 'Setup Jenkins', completed: true
      });
      expect(findTodoById(todos, 99)).toBeUndefined();
    });
    
    it('should filter todos by completion status', () => {
      const completed = filterByStatus(todos, true);
      const pending = filterByStatus(todos, false);
      
      expect(completed).toHaveLength(2);
      expect(pending).toHaveLength(2);
      expect(completed.every(todo => todo.completed)).toBe(true);
      expect(pending.every(todo => !todo.completed)).toBe(true);
    });
    
    it('should search todos by text', () => {
      expect(searchTodos(todos, 'jenkins')).toHaveLength(1);
      expect(searchTodos(todos, 'DevOps')).toHaveLength(1);
      expect(searchTodos(todos, 'deploy')).toHaveLength(1);
      expect(searchTodos(todos, 'xyz')).toHaveLength(0);
    });
  });
  
  describe('Date Handling', () => {
    it('should create todos with proper timestamps', () => {
      const createTodo = (text) => ({
        id: 1,
        text,
        completed: false,
        createdAt: new Date()
      });
      
      const todo = createTodo('Test todo');
      expect(todo.createdAt).toBeInstanceOf(Date);
      expect(todo.createdAt.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });
  });
  
  describe('Text Processing', () => {
    const processTodoText = (text) => {
      if (!text || typeof text !== 'string') return null;
      return text.trim();
    };
    
    it('should trim whitespace from todo text', () => {
      expect(processTodoText('  Hello World  ')).toBe('Hello World');
      expect(processTodoText('Test')).toBe('Test');
      expect(processTodoText('')).toBe('');
    });
    
    it('should handle invalid input', () => {
      expect(processTodoText(null)).toBeNull();
      expect(processTodoText(undefined)).toBeNull();
      expect(processTodoText(123)).toBeNull();
    });
  });
  
  describe('Array Operations', () => {
    it('should safely remove items from array', () => {
      const removeTodoById = (todos, id) => {
        const index = todos.findIndex(todo => todo.id === id);
        if (index === -1) return null;
        return todos.splice(index, 1)[0];
      };
      
      const todos = [
        { id: 1, text: 'Todo 1' },
        { id: 2, text: 'Todo 2' },
        { id: 3, text: 'Todo 3' }
      ];
      
      const removed = removeTodoById(todos, 2);
      expect(removed).toEqual({ id: 2, text: 'Todo 2' });
      expect(todos).toHaveLength(2);
      expect(todos.find(t => t.id === 2)).toBeUndefined();
      
      const notFound = removeTodoById(todos, 99);
      expect(notFound).toBeNull();
      expect(todos).toHaveLength(2);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle async errors gracefully', async () => {
      const asyncOperation = async (shouldFail) => {
        if (shouldFail) {
          throw new Error('Simulated error');
        }
        return 'Success';
      };
      
      await expect(asyncOperation(false)).resolves.toBe('Success');
      await expect(asyncOperation(true)).rejects.toThrow('Simulated error');
    });
  });
});