const mongoose = require('mongoose');
const Task = require('../../src/models/task.model');
const User = require('../../src/models/user.model');
const statusTrackingService = require('../../src/services/status-tracking/status-tracking.service');

// Mock bot for testing
const mockBot = {
  editMessageText: jest.fn(),
  answerCallbackQuery: jest.fn()
};

describe('Task Cards Callbacks - Status Tracking', () => {
  let testUser;
  let testTask;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      telegramId: 123456789,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    });
    await testUser.save();

    // Create test task
    testTask = new Task({
      title: 'Test Task for Status Tracking',
      description: 'A test task to verify status tracking callbacks',
      goal: 'Successfully implement status tracking callbacks',
      priority: 'medium',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      status: 'pending',
      createdBy: testUser._id,
      assignedTo: testUser._id,
      successMetric: 'Task completed successfully'
    });
    await testTask.save();
  });

  describe('Status Change Callbacks', () => {
    test('should handle status change from pending to ready', async () => {
      const mockQuery = {
        data: `task_status_ready_${testTask._id.toString().slice(-6)}`,
        from: { id: testUser._id, username: 'testuser' },
        message: { chat: { id: 123 }, message_id: 456 },
        id: 'callback_123'
      };

      // Import the callback handler
      const { handleStatusChange } = require('../../src/bot/callbacks/task-cards.callbacks');

      const result = await handleStatusChange(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Status Updated'),
        expect.objectContaining({
          chat_id: 123,
          message_id: 456,
          parse_mode: 'Markdown'
        })
      );

      // Verify task was updated
      const updatedTask = await Task.findById(testTask._id);
      expect(updatedTask.status).toBe('ready');
      expect(updatedTask.statusHistory).toHaveLength(1);
      expect(updatedTask.statusHistory[0].fromStatus).toBe('pending');
      expect(updatedTask.statusHistory[0].toStatus).toBe('ready');
    });

    test('should handle status change from ready to in_progress', async () => {
      // First set task to ready using the service to log the change
      await statusTrackingService.changeTaskStatus(testTask._id, 'ready', testUser._id);
      testTask = await Task.findById(testTask._id); // Refresh the task

      const mockQuery = {
        data: `task_status_progress_${testTask._id.toString().slice(-6)}`,
        from: { id: testUser._id, username: 'testuser' },
        message: { chat: { id: 123 }, message_id: 456 },
        id: 'callback_123'
      };

      const { handleStatusChange } = require('../../src/bot/callbacks/task-cards.callbacks');

      const result = await handleStatusChange(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Status Updated'),
        expect.objectContaining({
          chat_id: 123,
          message_id: 456,
          parse_mode: 'Markdown'
        })
      );

      // Verify task was updated
      const updatedTask = await Task.findById(testTask._id);
      expect(updatedTask.status).toBe('in_progress');
      expect(updatedTask.statusHistory).toHaveLength(2);
      expect(updatedTask.statusHistory[1].fromStatus).toBe('ready');
      expect(updatedTask.statusHistory[1].toStatus).toBe('in_progress');
    });

    test('should handle invalid status transition', async () => {
      const mockQuery = {
        data: `task_status_done_${testTask._id.toString().slice(-6)}`,
        from: { id: testUser._id, username: 'testuser' },
        message: { chat: { id: 123 }, message_id: 456 },
        id: 'callback_123'
      };

      const { handleStatusChange } = require('../../src/bot/callbacks/task-cards.callbacks');

      const result = await handleStatusChange(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        'callback_123',
        expect.objectContaining({
          text: expect.stringContaining('Invalid Status Change'),
          show_alert: true
        })
      );
    });
  });

  describe('Status History Callbacks', () => {
    test('should display status history for task with changes', async () => {
      // Add some status history
      testTask.statusHistory = [
        {
          fromStatus: 'pending',
          toStatus: 'ready',
          changedBy: testUser._id,
          changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          reason: null,
          duration: 3600000 // 1 hour
        },
        {
          fromStatus: 'ready',
          toStatus: 'in_progress',
          changedBy: testUser._id,
          changedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          reason: null,
          duration: 3600000 // 1 hour
        }
      ];
      testTask.status = 'in_progress';
      await testTask.save();

      const mockQuery = {
        data: `status_history_${testTask._id.toString().slice(-6)}`,
        from: { id: testUser._id, username: 'testuser' },
        message: { chat: { id: 123 }, message_id: 456 },
        id: 'callback_123'
      };

      const { handleStatusHistory } = require('../../src/bot/callbacks/task-cards.callbacks');

      const result = await handleStatusHistory(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Status History'),
        expect.objectContaining({
          chat_id: 123,
          message_id: 456,
          parse_mode: 'Markdown',
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: '⬅️ Back to Task' }),
                expect.objectContaining({ text: '🔄 Refresh' })
              ])
            ])
          })
        })
      );
    });

    test('should display status history for task without changes', async () => {
      const mockQuery = {
        data: `status_history_${testTask._id.toString().slice(-6)}`,
        from: { id: testUser._id, username: 'testuser' },
        message: { chat: { id: 123 }, message_id: 456 },
        id: 'callback_123'
      };

      const { handleStatusHistory } = require('../../src/bot/callbacks/task-cards.callbacks');

      const result = await handleStatusHistory(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('No status changes yet'),
        expect.objectContaining({
          chat_id: 123,
          message_id: 456,
          parse_mode: 'Markdown'
        })
      );
    });
  });

  describe('Blocker Details Callbacks', () => {
    test('should show blocker details prompt', async () => {
      const mockQuery = {
        data: `blocker_add_${testTask._id.toString().slice(-6)}`,
        from: { id: testUser._id, username: 'testuser' },
        message: { chat: { id: 123 }, message_id: 456 },
        id: 'callback_123'
      };

      const { handleBlockerAdd } = require('../../src/bot/callbacks/task-cards.callbacks');

      const result = await handleBlockerAdd(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Add Blocker Details'),
        expect.objectContaining({
          chat_id: 123,
          message_id: 456,
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: '❌ Cancel' })
              ])
            ])
          })
        })
      );
    });
  });

  describe('Dynamic Callback Handler', () => {
    test('should route status change callbacks correctly', async () => {
      const mockQuery = {
        data: `task_status_ready_${testTask._id.toString().slice(-6)}`,
        from: { id: testUser._id, username: 'testuser' },
        message: { chat: { id: 123 }, message_id: 456 },
        id: 'callback_123'
      };

      const { handleDynamicCallback } = require('../../src/bot/callbacks/task-cards.callbacks');

      const result = await handleDynamicCallback(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });

    test('should route status history callbacks correctly', async () => {
      const mockQuery = {
        data: `status_history_${testTask._id.toString().slice(-6)}`,
        from: { id: testUser._id, username: 'testuser' },
        message: { chat: { id: 123 }, message_id: 456 },
        id: 'callback_123'
      };

      const { handleDynamicCallback } = require('../../src/bot/callbacks/task-cards.callbacks');

      const result = await handleDynamicCallback(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });

    test('should route blocker add callbacks correctly', async () => {
      const mockQuery = {
        data: `blocker_add_${testTask._id.toString().slice(-6)}`,
        from: { id: testUser._id, username: 'testuser' },
        message: { chat: { id: 123 }, message_id: 456 },
        id: 'callback_123'
      };

      const { handleDynamicCallback } = require('../../src/bot/callbacks/task-cards.callbacks');

      const result = await handleDynamicCallback(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });
  });
}); 