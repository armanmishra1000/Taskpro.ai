const mongoose = require('mongoose');
const StatusTrackingService = require('../../src/services/status-tracking/status-tracking.service');
const Task = require('../../src/models/task.model');
const User = require('../../src/models/user.model');
const { ValidationError } = require('../../src/utils/errors');

describe('StatusTrackingService', () => {
  let testUser, testCreator, testTask;

  beforeEach(async () => {
    // Create test users with unique telegramIds
    testUser = await User.create({
      telegramId: `123456789_${Date.now()}_${Math.random()}`,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'member'
    });

    testCreator = await User.create({
      telegramId: `987654321_${Date.now()}_${Math.random()}`,
      username: 'testcreator',
      firstName: 'Test',
      lastName: 'Creator',
      role: 'admin'
    });
  });

  beforeEach(async () => {
    // Create a fresh task for each test
    testTask = await Task.create({
      title: 'Test Task',
      description: 'Test Description',
      goal: 'Test Goal',
      successMetric: 'Test Metric',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdBy: testCreator._id,
      assignedTo: testUser._id,
      status: 'ready'
    });
  });

  afterEach(async () => {
    // Clean up is handled by global beforeEach in setup.js
  });

  describe('changeTaskStatus', () => {
    it('should change task status with valid transition', async () => {
      const result = await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'in_progress',
        testUser._id
      );

      expect(result.status).toBe('in_progress');
      expect(result.statusHistory).toHaveLength(1);
      expect(result.statusHistory[0].fromStatus).toBe('ready');
      expect(result.statusHistory[0].toStatus).toBe('in_progress');
      expect(result.statusHistory[0].changedBy.toString()).toBe(testUser._id.toString());
    });

    it('should throw error for invalid status transition', async () => {
      await expect(
        StatusTrackingService.changeTaskStatus(
          testTask._id,
          'done',
          testUser._id
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should require reason when blocking task', async () => {
      await expect(
        StatusTrackingService.changeTaskStatus(
          testTask._id,
          'blocked',
          testUser._id
        )
      ).rejects.toThrow('Reason is required when blocking a task');
    });

    it('should allow blocking with reason', async () => {
      const result = await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'blocked',
        testUser._id,
        'Waiting for external dependency'
      );

      expect(result.status).toBe('blocked');
      expect(result.statusHistory[0].reason).toBe('Waiting for external dependency');
    });

    it('should only allow assignee to start work', async () => {
      await expect(
        StatusTrackingService.changeTaskStatus(
          testTask._id,
          'in_progress',
          testCreator._id
        )
      ).rejects.toThrow('Only the assigned user can start work on this task');
    });

    it('should only allow creator to mark task as done', async () => {
      // First move to review
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'in_progress',
        testUser._id
      );
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'review',
        testUser._id
      );

      // Try to mark as done by non-creator
      await expect(
        StatusTrackingService.changeTaskStatus(
          testTask._id,
          'done',
          testUser._id
        )
      ).rejects.toThrow('Only the task creator can mark task as done');
    });

    it('should allow creator to mark task as done', async () => {
      // First move to review
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'in_progress',
        testUser._id
      );
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'review',
        testUser._id
      );

      // Mark as done by creator
      const result = await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'done',
        testCreator._id
      );

      expect(result.status).toBe('done');
    });

    it('should prevent changing status of completed tasks', async () => {
      // First complete the task
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'in_progress',
        testUser._id
      );
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'review',
        testUser._id
      );
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'done',
        testCreator._id
      );

      // Try to change status of completed task
      await expect(
        StatusTrackingService.changeTaskStatus(
          testTask._id,
          'in_progress',
          testUser._id
        )
      ).rejects.toThrow('Cannot change status of completed tasks');
    });
  });

  describe('getValidNextStatuses', () => {
    it('should return valid next statuses for ready', () => {
      const validStatuses = StatusTrackingService.getValidNextStatuses('ready');
      expect(validStatuses).toEqual(['in_progress', 'blocked']);
    });

    it('should return valid next statuses for in_progress', () => {
      const validStatuses = StatusTrackingService.getValidNextStatuses('in_progress');
      expect(validStatuses).toEqual(['review', 'blocked']);
    });

    it('should return empty array for done', () => {
      const validStatuses = StatusTrackingService.getValidNextStatuses('done');
      expect(validStatuses).toEqual([]);
    });
  });

  describe('getStatusHistory', () => {
    it('should return task with populated status history', async () => {
      // Make some status changes
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'in_progress',
        testUser._id
      );
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'review',
        testUser._id
      );

      const result = await StatusTrackingService.getStatusHistory(testTask._id);

      expect(result.statusHistory).toHaveLength(2);
      expect(result.statusHistory[0].fromStatus).toBe('ready');
      expect(result.statusHistory[0].toStatus).toBe('in_progress');
      expect(result.statusHistory[1].fromStatus).toBe('in_progress');
      expect(result.statusHistory[1].toStatus).toBe('review');
    });

    it('should throw error for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        StatusTrackingService.getStatusHistory(fakeId)
      ).rejects.toThrow('Task not found');
    });
  });

  describe('getStatusStatistics', () => {
    it('should return correct statistics', async () => {
      // Make some status changes
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'in_progress',
        testUser._id
      );
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'review',
        testUser._id
      );

      const stats = await StatusTrackingService.getStatusStatistics(testTask._id);

      expect(stats.totalChanges).toBe(2);
      expect(stats.currentStatus).toBe('review');
      expect(stats.statusBreakdown).toHaveProperty('ready');
      expect(stats.statusBreakdown).toHaveProperty('in_progress');
      expect(stats.statusBreakdown).toHaveProperty('review');
    });
  });

  describe('getTaskProgress', () => {
    it('should return correct progress for ready status', async () => {
      const progress = await StatusTrackingService.getTaskProgress(testTask._id);
      expect(progress).toBe(25); // ready is 2nd status (25%)
    });

    it('should return correct progress for in_progress status', async () => {
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'in_progress',
        testUser._id
      );

      const progress = await StatusTrackingService.getTaskProgress(testTask._id);
      expect(progress).toBe(50); // in_progress is 3rd status (50%)
    });

    it('should return correct progress for done status', async () => {
      // Complete the task
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'in_progress',
        testUser._id
      );
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'review',
        testUser._id
      );
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'done',
        testCreator._id
      );

      const progress = await StatusTrackingService.getTaskProgress(testTask._id);
      expect(progress).toBe(100); // done is 5th status (100%)
    });

    it('should return progress from previous status when blocked', async () => {
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'in_progress',
        testUser._id
      );
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'blocked',
        testUser._id,
        'External dependency'
      );

      const progress = await StatusTrackingService.getTaskProgress(testTask._id);
      expect(progress).toBe(50); // Should return progress from in_progress (50%)
    });
  });

  describe('getTasksByStatus', () => {
    it('should return tasks with specified status', async () => {
      // Create another task
      await Task.create({
        title: 'Another Task',
        description: 'Another Description',
        goal: 'Another Goal',
        successMetric: 'Another Metric',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: testCreator._id,
        assignedTo: testUser._id,
        status: 'in_progress'
      });

      const readyTasks = await StatusTrackingService.getTasksByStatus(testUser._id, 'ready');
      const inProgressTasks = await StatusTrackingService.getTasksByStatus(testUser._id, 'in_progress');

      expect(readyTasks).toHaveLength(1);
      expect(inProgressTasks).toHaveLength(1);
      expect(readyTasks[0].title).toBe('Test Task');
      expect(inProgressTasks[0].title).toBe('Another Task');
    });
  });

  describe('getRecentStatusChanges', () => {
    it('should return recent status changes', async () => {
      // Make status changes
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'in_progress',
        testUser._id
      );
      await StatusTrackingService.changeTaskStatus(
        testTask._id,
        'review',
        testUser._id
      );

      const recentChanges = await StatusTrackingService.getRecentStatusChanges(testUser._id, 5);

      expect(recentChanges).toHaveLength(2);
      expect(recentChanges[0].taskId.toString()).toBe(testTask._id.toString());
      expect(recentChanges[0].fromStatus).toBe('in_progress');
      expect(recentChanges[0].toStatus).toBe('review');
    });
  });
}); 