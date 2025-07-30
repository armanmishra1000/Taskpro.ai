const mongoose = require('mongoose');
const Task = require('../../src/models/task.model');
const User = require('../../src/models/user.model');
const TaskCardsService = require('../../src/services/task-cards/task-cards.service');
const { formatTaskCard, formatTaskList } = require('../../src/bot/formatters/task-cards.formatter');

describe('Task Cards Display', () => {
  let testUser;
  let testTasks;
  
  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      telegramId: '123456',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      role: 'member',
      isActive: true
    });
    
    // Create test tasks with different deadlines and statuses
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const today = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const tomorrow = new Date(now.getTime() + 26 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // For testing overdue tasks, we need to create them with past dates but bypass validation
    const overdueTask = new Task({
      title: 'Overdue Task 1',
      description: 'Test overdue task',
      goal: 'Complete overdue work',
      successMetric: 'Task completed',
      deadline: yesterday,
      createdBy: testUser._id,
      assignedTo: testUser._id,
      status: 'in_progress',
      priority: 'high'
    });
    
    // Bypass validation for overdue task
    await overdueTask.save({ validateBeforeSave: false });
    
    // Create other tasks with future dates
    const otherTasks = await Task.create([
      {
        title: 'Today Task 1',
        description: 'Test today task',
        goal: 'Complete today work',
        successMetric: 'Task completed',
        deadline: today,
        createdBy: testUser._id,
        assignedTo: testUser._id,
        status: 'ready',
        priority: 'medium'
      },
      {
        title: 'Tomorrow Task 1',
        description: 'Test tomorrow task',
        goal: 'Complete tomorrow work',
        successMetric: 'Task completed',
        deadline: tomorrow,
        createdBy: testUser._id,
        assignedTo: testUser._id, // Assign to user for permission tests
        status: 'pending',
        priority: 'low'
      },
      {
        title: 'Next Week Task',
        description: 'Test future task',
        goal: 'Complete future work',
        successMetric: 'Task completed',
        deadline: nextWeek,
        createdBy: testUser._id,
        assignedTo: testUser._id, // Assign to user for permission tests
        status: 'ready',
        priority: 'critical'
      }
    ]);
    
    testTasks = [overdueTask, ...otherTasks];
  });
  
  describe('Task Summary', () => {
    test('calculates correct task counts by urgency', async () => {
      const summary = await TaskCardsService.getTaskSummary(testUser.telegramId);
      
      expect(summary.overdue).toBe(1);
      expect(summary.today).toBe(1);
      expect(summary.tomorrow).toBe(1);
      expect(summary.week).toBe(3); // Only future tasks (today, tomorrow, next week) - overdue is not included
      expect(summary.total).toBe(4);
    });
    
    test('handles user with no tasks', async () => {
      await Task.deleteMany({});
      const summary = await TaskCardsService.getTaskSummary(testUser.telegramId);
      
      expect(summary.overdue).toBe(0);
      expect(summary.today).toBe(0);
      expect(summary.tomorrow).toBe(0);
      expect(summary.week).toBe(0);
      expect(summary.total).toBe(0);
    });
  });
  
  describe('Task Filtering', () => {
    test('overdue filter returns only overdue tasks', async () => {
      const result = await TaskCardsService.getFilteredTasks(testUser.telegramId, 'overdue', 1, 10);
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe('Overdue Task 1');
      expect(result.totalTasks).toBe(1);
    });
    
    test('today filter returns only today tasks', async () => {
      const result = await TaskCardsService.getFilteredTasks(testUser.telegramId, 'today', 1, 10);
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe('Today Task 1');
    });
    
    test('assigned filter returns only assigned tasks', async () => {
      const result = await TaskCardsService.getFilteredTasks(testUser.telegramId, 'assigned', 1, 10);
      
      expect(result.tasks).toHaveLength(4); // All tasks are assigned to user
      expect(result.tasks.every(task => task.assignedTo._id.toString() === testUser._id.toString())).toBe(true);
    });
    
    test('all filter returns all user tasks', async () => {
      const result = await TaskCardsService.getFilteredTasks(testUser.telegramId, 'all', 1, 10);
      
      expect(result.tasks).toHaveLength(4);
      expect(result.totalTasks).toBe(4);
      expect(result.totalPages).toBe(1); // All tasks fit in one page with limit 10
    });
  });
  
  describe('Pagination', () => {
    test('splits large task lists into pages', async () => {
      // Create more tasks to test pagination
      const additionalTasks = [];
      for (let i = 0; i < 10; i++) {
        additionalTasks.push({
          title: `Extra Task ${i}`,
          description: 'Extra task for pagination',
          goal: 'Test pagination',
          successMetric: 'Task completed',
          deadline: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000), // Future dates
          createdBy: testUser._id,
          assignedTo: testUser._id,
          status: 'ready',
          priority: 'medium'
        });
      }
      await Task.create(additionalTasks);
      
      const page1 = await TaskCardsService.getFilteredTasks(testUser.telegramId, 'all', 1, 3);
      const page2 = await TaskCardsService.getFilteredTasks(testUser.telegramId, 'all', 2, 3);
      
      expect(page1.tasks).toHaveLength(3);
      expect(page1.currentPage).toBe(1);
      expect(page1.totalTasks).toBe(14);
      expect(page1.totalPages).toBe(5);
      expect(page1.hasNext).toBe(true);
      expect(page1.hasPrev).toBe(false);
      
      expect(page2.tasks).toHaveLength(3);
      expect(page2.currentPage).toBe(2);
      expect(page2.hasNext).toBe(true);
      expect(page2.hasPrev).toBe(true);
    });
  });
  
  describe('Status Updates', () => {
    test('updates task status with valid transition', async () => {
      const task = testTasks.find(t => t.status === 'ready');
      const result = await TaskCardsService.updateTaskStatus(task._id, 'in_progress', testUser.telegramId);
      
      expect(result.task.status).toBe('in_progress');
      expect(result.oldStatus).toBe('ready');
      expect(result.newStatus).toBe('in_progress');
      expect(result.task.startedAt).toBeDefined();
      expect(result.task.statusHistory).toHaveLength(1);
    });
    
    test('prevents invalid status transitions', async () => {
      const task = testTasks.find(t => t.status === 'pending');
      
      await expect(
        TaskCardsService.updateTaskStatus(task._id, 'done', testUser.telegramId)
      ).rejects.toThrow('Invalid status transition');
    });
    
    test('checks user permissions for updates', async () => {
      const otherUser = await User.create({
        telegramId: '789012',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        role: 'member',
        isActive: true
      });
      
      const task = testTasks[0];
      
      await expect(
        TaskCardsService.updateTaskStatus(task._id, 'review', otherUser.telegramId)
      ).rejects.toThrow('Access denied');
    });
    
    test('allows admin to update any task', async () => {
      const adminUser = await User.create({
        telegramId: '345678',
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        role: 'admin',
        isActive: true
      });
      
      const task = testTasks.find(t => t.status === 'ready');
      const result = await TaskCardsService.updateTaskStatus(task._id, 'in_progress', adminUser.telegramId);
      
      expect(result.task.status).toBe('in_progress');
    });
  });
  
  describe('Card Formatting', () => {
    test('formats task cards with all details', () => {
      const task = testTasks[0];
      task.assignedTo = testUser; // Populate for test
      
      const formatted = formatTaskCard(task, true);
      
      expect(formatted).toContain(task.title);
      expect(formatted).toContain(testUser.username);
      expect(formatted).toContain(task.successMetric);
      expect(formatted).toContain(task.status);
      expect(formatted).toContain(task.priority);
    });
    
    test('shows correct urgency indicators', () => {
      const overdueTask = testTasks.find(t => t.title.includes('Overdue'));
      const todayTask = testTasks.find(t => t.title.includes('Today'));
      const futureTask = testTasks.find(t => t.title.includes('Next Week'));
      
      overdueTask.assignedTo = testUser;
      todayTask.assignedTo = testUser;
      futureTask.assignedTo = testUser;
      
      const overdueCard = formatTaskCard(overdueTask);
      const todayCard = formatTaskCard(todayTask);
      const futureCard = formatTaskCard(futureTask);
      
      expect(overdueCard).toContain('🔥'); // Overdue icon
      expect(todayCard).toContain('⚠️'); // Today icon
      expect(futureCard).toContain('🗓️'); // Future icon
    });
    
    test('handles missing assignee gracefully', () => {
      const task = testTasks[0];
      task.assignedTo = null;
      
      const formatted = formatTaskCard(task);
      
      expect(formatted).toContain('Unassigned');
      expect(formatted).not.toContain('undefined');
      expect(formatted).not.toContain('null');
    });
  });
  
  describe('Task List Formatting', () => {
    test('formats task lists with pagination info', () => {
      const tasks = testTasks.slice(0, 2);
      tasks.forEach(task => task.assignedTo = testUser);
      
      const pagination = {
        currentPage: 1,
        totalPages: 2,
        totalTasks: 4
      };
      
      const formatted = formatTaskList(tasks, 'all', pagination);
      
      expect(formatted).toContain('ALL TASKS (4)');
      expect(formatted).toContain('Page 1 of 2');
      expect(formatted).toContain(tasks[0].title);
      expect(formatted).toContain(tasks[1].title);
    });
    
    test('handles empty task lists', () => {
      const pagination = {
        currentPage: 1,
        totalPages: 1,
        totalTasks: 0
      };
      
      const formatted = formatTaskList([], 'overdue', pagination);
      
      expect(formatted).toContain('📭 No tasks found');
      expect(formatted).toContain('OVERDUE TASKS (0)');
    });
  });
  
  describe('Error Handling', () => {
    test('validates task existence for status updates', async () => {
      const fakeTaskId = new mongoose.Types.ObjectId();
      
      await expect(
        TaskCardsService.updateTaskStatus(fakeTaskId, 'in_progress', testUser.telegramId)
      ).rejects.toThrow('Task not found');
    });
    
    test('provides helpful error messages', async () => {
      const task = testTasks[0];
      
      try {
        await TaskCardsService.updateTaskStatus(task._id, 'invalid_status', testUser.telegramId);
      } catch (error) {
        expect(error.message).toContain('Invalid status transition');
        expect(error.message).toContain(task.status);
        expect(error.message).toContain('invalid_status');
      }
    });
  });
  
  describe('Block Task Feature', () => {
    test('marks task as blocked with reason', async () => {
      const task = testTasks.find(t => t.status === 'ready' && t.title.includes('Today')); // Use today task with future deadline
      const blockReason = 'Waiting for API keys';
      
      const result = await TaskCardsService.blockTask(task._id, blockReason, testUser.telegramId);
      
      expect(result.task.status).toBe('blocked');
      expect(result.blockReason).toBe(blockReason);
      expect(result.task.blockers).toHaveLength(1);
      expect(result.task.blockers[0].reason).toBe(blockReason);
      expect(result.task.blockers[0].reportedBy.toString()).toBe(testUser._id.toString());
    });
  });
  
  describe('Comment Feature', () => {
    test('adds comment to task', async () => {
      const task = testTasks.find(t => t.title.includes('Today')); // Use today task with future deadline
      const comment = 'This is a test comment';
      
      const updatedTask = await TaskCardsService.addTaskComment(task._id, comment, testUser.telegramId);
      
      expect(updatedTask.comments).toHaveLength(1);
      expect(updatedTask.comments[0].text).toBe(comment);
      expect(updatedTask.comments[0].author.toString()).toBe(testUser._id.toString());
    });
  });
}); 