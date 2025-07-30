const mongoose = require('mongoose');
const Task = require('../../src/models/task.model');
const Team = require('../../src/models/team.model');
const User = require('../../src/models/user.model');
const blockerService = require('../../src/services/blocker-management/blocker-management.service');
const { formatBlockerForm, createBlockerKeyboard, formatValidationError } = require('../../src/bot/formatters/blocker-management.formatter');

describe('Blocker Management Integration', () => {
  let testTask, testUser, testManager, testTeam;
  
  beforeEach(async () => {
    // Clean database
    await Task.deleteMany({});
    await User.deleteMany({});
    await Team.deleteMany({});
    
    // Create test data
    testUser = await User.create({
      telegramId: 123456,
      username: 'testuser',
      firstName: 'Test',
      role: 'member'
    });
    
    testManager = await User.create({
      telegramId: 789012,
      username: 'manager',
      firstName: 'Manager',
      role: 'manager'
    });
    
    testTeam = await Team.create({
      name: 'Test Team',
      createdBy: testManager._id,
      members: [
        { userId: testUser._id, username: 'testuser', role: 'member', addedBy: testManager._id },
        { userId: testManager._id, username: 'manager', role: 'manager', addedBy: testManager._id }
      ]
    });
    
    testTask = await Task.create({
      title: 'Test Task',
      description: 'Test Description',
      goal: 'Complete test',
      successMetric: 'Tests pass',
      deadline: new Date(Date.now() + 86400000),
      createdBy: testUser._id,
      assignedTo: testUser._id,
      teamId: testTeam._id,
      status: 'in_progress'
    });
  });
  
  describe('Blocker Reporting Service', () => {
    test('should report blocker with valid data', async () => {
      const blockerData = {
        impact: 'high',
        attempts: 'Tried restarting service, checked logs, contacted DevOps team',
        logs: 'Error: Connection timeout. Server logs show no errors.'
      };
      
      const result = await blockerService.reportBlocker(
        testTask._id,
        { userId: testUser._id, username: 'testuser' },
        blockerData
      );
      
      expect(result.blocker).toBeDefined();
      expect(result.blocker.impact).toBe('high');
      expect(result.blocker.status).toBe('active');
      expect(result.task.status).toBe('blocked');
    });
    
    test('should reject blocker with insufficient attempts', async () => {
      const blockerData = {
        impact: 'high',
        attempts: 'tried stuff', // Too short
        logs: 'Error occurred'
      };
      
      await expect(
        blockerService.reportBlocker(
          testTask._id,
          { userId: testUser._id },
          blockerData
        )
      ).rejects.toThrow('at least 20 characters');
    });
    
    test('should reject blocker with insufficient logs', async () => {
      const blockerData = {
        impact: 'high',
        attempts: 'Tried restarting service and checking logs',
        logs: 'error' // Too short
      };
      
      await expect(
        blockerService.reportBlocker(
          testTask._id,
          { userId: testUser._id },
          blockerData
        )
      ).rejects.toThrow('at least 10 characters');
    });
    
    test('should prevent duplicate active blockers', async () => {
      const blockerData = {
        impact: 'high',
        attempts: 'Tried restarting service, checked logs',
        logs: 'Connection timeout error'
      };
      
      // Report first blocker
      await blockerService.reportBlocker(
        testTask._id,
        { userId: testUser._id },
        blockerData
      );
      
      // Try to report second blocker
      await expect(
        blockerService.reportBlocker(
          testTask._id,
          { userId: testUser._id },
          blockerData
        )
      ).rejects.toThrow('already has an active blocker');
    });
    
    test('should find task manager correctly', async () => {
      const manager = await blockerService.findTaskManager(testTask);
      expect(manager._id.toString()).toBe(testManager._id.toString());
    });
    
    test('should resolve blocker successfully', async () => {
      // First report a blocker
      const blockerData = {
        impact: 'medium',
        attempts: 'Tried multiple solutions including restart',
        logs: 'Service logs show timeout errors'
      };
      
      const reported = await blockerService.reportBlocker(
        testTask._id,
        { userId: testUser._id },
        blockerData
      );
      
      // Then resolve it - use array index since blockers don't have IDs
      const resolved = await blockerService.resolveBlocker(
        testTask._id,
        0, // First blocker in array
        { userId: testManager._id },
        'Increased timeout settings and restarted service'
      );
      
      expect(resolved.blocker.status).toBe('resolved');
      expect(resolved.blocker.resolution).toBe('Increased timeout settings and restarted service');
      expect(resolved.task.status).toBe('in_progress');
    });
  });
  
  describe('Message Formatters', () => {
    test('should format blocker form correctly', () => {
      const message = formatBlockerForm('main', testTask);
      
      expect(message).toContain('Report Task Blocker');
      expect(message).toContain(testTask.title);
      expect(message).toContain('management attention');
    });
    
    test('should create impact keyboard correctly', () => {
      const keyboard = createBlockerKeyboard(testTask._id, 'impact');
      
      expect(keyboard.inline_keyboard).toHaveLength(4); // 3 impact levels + back
      expect(keyboard.inline_keyboard[0][0].text).toContain('Critical');
      expect(keyboard.inline_keyboard[1][0].text).toContain('High');
      expect(keyboard.inline_keyboard[2][0].text).toContain('Medium');
    });
    
    test('should format validation errors clearly', () => {
      const message = formatValidationError(['Impact assessment', 'Attempts description']);
      
      expect(message).toContain('Incomplete Blocker Report');
      expect(message).toContain('Impact assessment ❌');
      expect(message).toContain('Attempts description ❌');
    });
    
    test('should format all form steps correctly', () => {
      const mainMessage = formatBlockerForm('main', testTask);
      const impactMessage = formatBlockerForm('impact', testTask);
      const attemptsMessage = formatBlockerForm('attempts', testTask);
      const logsMessage = formatBlockerForm('logs', testTask);
      
      expect(mainMessage).toContain('Report Task Blocker');
      expect(impactMessage).toContain('Impact Assessment');
      expect(attemptsMessage).toContain('What Have You Tried?');
      expect(logsMessage).toContain('Provide Evidence');
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle task with no team gracefully', async () => {
      // Create task without team
      const soloTask = await Task.create({
        title: 'Solo Task',
        description: 'No team task',
        goal: 'Complete alone',
        successMetric: 'Done',
        deadline: new Date(Date.now() + 86400000),
        createdBy: testUser._id,
        assignedTo: testUser._id,
        status: 'in_progress'
        // No teamId
      });
      
      const manager = await blockerService.findTaskManager(soloTask);
      expect(manager).toBeNull();
    });
    
    test('should reject blocker for completed tasks', async () => {
      testTask.status = 'done';
      await testTask.save();
      
      const blockerData = {
        impact: 'high',
        attempts: 'Tried restarting service and checking logs',
        logs: 'Connection timeout error occurred'
      };
      
      await expect(
        blockerService.reportBlocker(
          testTask._id,
          { userId: testUser._id },
          blockerData
        )
      ).rejects.toThrow('ready or in-progress tasks');
    });
    
    test('should handle missing task gracefully', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(
        blockerService.reportBlocker(
          fakeId,
          { userId: testUser._id },
          { impact: 'high', attempts: 'Tried multiple approaches and consulted documentation', logs: 'Error logs show connection issues' }
        )
      ).rejects.toThrow('Task not found');
    });
    
    test('should handle invalid impact levels', async () => {
      const blockerData = {
        impact: 'invalid_level',
        attempts: 'Tried restarting service and checking logs',
        logs: 'Connection timeout error occurred'
      };
      
      await expect(
        blockerService.reportBlocker(
          testTask._id,
          { userId: testUser._id },
          blockerData
        )
      ).rejects.toThrow('Valid impact level required');
    });
  });
  
  describe('Complete Workflow', () => {
    test('should handle complete blocker lifecycle', async () => {
      // 1. Report blocker
      const blockerData = {
        impact: 'critical',
        attempts: 'Tried restarting service, checked logs, contacted DevOps team, reviewed documentation',
        logs: 'Error: Connection timeout. Server logs show no errors. Documentation checked.'
      };
      
      const reported = await blockerService.reportBlocker(
        testTask._id,
        { userId: testUser._id, username: 'testuser' },
        blockerData
      );
      
      expect(reported.blocker.status).toBe('active');
      expect(reported.task.status).toBe('blocked');
      
      // 2. Find manager
      const manager = await blockerService.findTaskManager(reported.task);
      expect(manager._id.toString()).toBe(testManager._id.toString());
      
      // 3. Resolve blocker
      const resolved = await blockerService.resolveBlocker(
        reported.task._id,
        0, // First blocker in array
        { userId: testManager._id, username: 'manager' },
        'Increased connection timeout from 30s to 60s and restarted the service'
      );
      
      expect(resolved.blocker.status).toBe('resolved');
      expect(resolved.task.status).toBe('in_progress');
      
      // 4. Verify no active blockers
      const activeBlockers = await blockerService.getActiveBlockers(resolved.task._id);
      expect(activeBlockers).toHaveLength(0);
    });
    
    test('should handle multiple blockers over time', async () => {
      // First blocker
      const blocker1 = await blockerService.reportBlocker(
        testTask._id,
        { userId: testUser._id },
        {
          impact: 'high',
          attempts: 'Tried restarting service and checking logs',
          logs: 'Connection timeout error occurred'
        }
      );
      
      // Resolve first blocker
      await blockerService.resolveBlocker(
        testTask._id,
        0, // First blocker in array
        { userId: testManager._id },
        'Fixed connection issue'
      );
      
      // Second blocker
      const blocker2 = await blockerService.reportBlocker(
        testTask._id,
        { userId: testUser._id },
        {
          impact: 'medium',
          attempts: 'Tried different approach and consulted team',
          logs: 'New error: authentication failed'
        }
      );
      
      expect(blocker2.blocker.status).toBe('active');
      expect(blocker2.task.status).toBe('blocked');
      
      // Verify blocker history
      const updatedTask = await Task.findById(testTask._id);
      expect(updatedTask.blockers).toHaveLength(2);
      expect(updatedTask.blockers[0].status).toBe('resolved');
      expect(updatedTask.blockers[1].status).toBe('active');
    });
  });
  
  afterEach(async () => {
    await Task.deleteMany({});
    await User.deleteMany({});
    await Team.deleteMany({});
  });
}); 