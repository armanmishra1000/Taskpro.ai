const {
  formatTaskCard,
  formatTaskList,
  createTaskActionKeyboard,
  getUrgencyIcon,
  getPriorityIcon,
  getStatusIcon
} = require('../../../src/bot/formatters/task-cards.formatter');

describe('Task Cards Formatter', () => {
  const mockTask = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Test Task',
    description: 'Test description',
    goal: 'Test goal',
    successMetric: 'Test metric',
    deadline: new Date(),
    status: 'in_progress',
    priority: 'high',
    assignedTo: {
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    getTimeAgo: () => '2 days ago'
  };
  
  describe('Visual Icons', () => {
    test('returns correct urgency icons', () => {
      const overdue = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const tomorrow = new Date(Date.now() + 26 * 60 * 60 * 1000);
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      expect(getUrgencyIcon(overdue)).toBe('🔥');
      expect(getUrgencyIcon(today)).toBe('⚠️');
      expect(getUrgencyIcon(tomorrow)).toBe('📅');
      expect(getUrgencyIcon(future)).toBe('🗓️');
    });
    
    test('returns correct priority icons', () => {
      expect(getPriorityIcon('critical')).toBe('🚨');
      expect(getPriorityIcon('high')).toBe('⚡');
      expect(getPriorityIcon('medium')).toBe('📌');
      expect(getPriorityIcon('low')).toBe('📋');
      expect(getPriorityIcon('unknown')).toBe('📋');
    });
    
    test('returns correct status icons', () => {
      expect(getStatusIcon('pending')).toBe('⏳');
      expect(getStatusIcon('ready')).toBe('✅');
      expect(getStatusIcon('in_progress')).toBe('🔄');
      expect(getStatusIcon('review')).toBe('👀');
      expect(getStatusIcon('done')).toBe('✔️');
      expect(getStatusIcon('blocked')).toBe('🚧');
    });
  });
  
  describe('Task Card Formatting', () => {
    test('formats complete task card', () => {
      const formatted = formatTaskCard(mockTask, true);
      
      expect(formatted).toContain('📋 *Test Task*');
      expect(formatted).toContain('👤 Assigned: @testuser');
      expect(formatted).toContain('🎯 Success: Test metric');
      expect(formatted).toContain('📊 Status: 🔄 in_progress');
      expect(formatted).toContain('⚡ Priority: ⚡ high');
      expect(formatted).toContain('🆔 Task #439011');
      expect(formatted).toContain('Created 2 days ago');
    });
    
    test('formats compact task card', () => {
      const formatted = formatTaskCard(mockTask, false);
      
      expect(formatted).toContain('📋 *Test Task*');
      expect(formatted).toContain('👤 @testuser');
      expect(formatted).not.toContain('Success:');
      expect(formatted).not.toContain('Task #');
    });
    
    test('handles unassigned task', () => {
      const unassignedTask = { ...mockTask, assignedTo: null };
      const formatted = formatTaskCard(unassignedTask);
      
      expect(formatted).toContain('Assigned: Unassigned');
    });
  });
  
  describe('Action Keyboard Creation', () => {
    test('creates action keyboard with status buttons', () => {
      const keyboard = createTaskActionKeyboard('507f1f77bcf86cd799439011', 'ready');
      
      expect(keyboard.inline_keyboard).toHaveLength(5); // 5 rows of buttons
      expect(keyboard.inline_keyboard[0]).toContainEqual({
        text: "● ✅ Ready",
        callback_data: "task_status_ready_439011"
      });
      expect(keyboard.inline_keyboard[0]).toContainEqual({
        text: "🔄 In Progress", 
        callback_data: "task_status_in_progress_439011"
      });
    });
    
    test('marks current status in keyboard', () => {
      const keyboard = createTaskActionKeyboard('507f1f77bcf86cd799439011', 'ready');
      
      const readyButton = keyboard.inline_keyboard[0].find(btn => 
        btn.callback_data === 'task_status_ready_439011'
      );
      
      expect(readyButton.text).toContain('● '); // Current status marker
    });
  });
  
  describe('Task List Formatting', () => {
    test('formats task list with header and pagination', () => {
      const tasks = [mockTask];
      const pagination = {
        currentPage: 1,
        totalPages: 2,
        totalTasks: 5
      };
      
      const formatted = formatTaskList(tasks, 'overdue', pagination);
      
      expect(formatted).toContain('🔥 OVERDUE TASKS (5)');
      expect(formatted).toContain('Page 1 of 2');
      expect(formatted).toContain('Test Task');
      expect(formatted).toContain('Page 1 of 2 | 1 tasks shown');
    });
    
    test('handles empty task list', () => {
      const formatted = formatTaskList([], 'today', {
        currentPage: 1,
        totalPages: 1,
        totalTasks: 0
      });
      
      expect(formatted).toContain('📭 No tasks found');
      expect(formatted).toContain('📅 TODAY\'S TASKS (0)');
    });
  });
}); 