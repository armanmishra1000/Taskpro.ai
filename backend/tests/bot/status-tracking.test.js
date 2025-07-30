const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const taskCardsCallbacks = require('../../src/bot/callbacks/task-cards.callbacks');
const Task = require('../../src/models/task.model');
const User = require('../../src/models/user.model');
const statusTrackingService = require('../../src/services/status-tracking/status-tracking.service');

// Mock Telegram Bot
jest.mock('node-telegram-bot-api');

describe('Status Tracking Integration', () => {
  let mockBot, testUser, testTask, mockQuery;

  beforeEach(async () => {
    mockBot = {
      editMessageText: jest.fn().mockResolvedValue({}),
      answerCallbackQuery: jest.fn().mockResolvedValue({}),
      sendMessage: jest.fn().mockResolvedValue({})
    };

    testUser = await User.create({
      telegramId: `12345_${Date.now()}_${Math.random()}`,
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      role: 'member'
    });

    testTask = await Task.create({
      title: 'Integration Test Task',
      description: 'Test task for integration testing',
      goal: 'Test goal',
      successMetric: 'Test metric',
      deadline: new Date(Date.now() + 86400000),
      createdBy: testUser._id,
      assignedTo: testUser._id,
      status: 'ready'
    });

    mockQuery = {
      id: 'test-query-id',
      from: { id: testUser._id.toString(), username: 'testuser' },
      message: {
        chat: { id: 123 },
        message_id: 456
      },
      data: `task_status_progress_${testTask._id.toString().slice(-6)}`
    };
  });

  afterEach(async () => {
    await Task.deleteMany({});
    await User.deleteMany({});
    jest.clearAllMocks();
  });

  describe('Status Change Flow', () => {
    test('should handle status change callback successfully', async () => {
      const result = await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalled();

      // Verify task was updated
      const updatedTask = await Task.findById(testTask._id);
      expect(updatedTask.status).toBe('in_progress');
      expect(updatedTask.statusHistory).toHaveLength(1);
      expect(updatedTask.statusHistory[0].fromStatus).toBe('ready');
      expect(updatedTask.statusHistory[0].toStatus).toBe('in_progress');
      expect(updatedTask.statusHistory[0].changedBy.toString()).toBe(testUser._id.toString());
    });

    test('should handle invalid status transition gracefully', async () => {
      // Try to go from ready to done (invalid)
      mockQuery.data = `task_status_done_${testTask._id.toString().slice(-6)}`;

      const result = await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        'test-query-id',
        expect.objectContaining({
          text: expect.stringContaining('Invalid Status Change'),
          show_alert: true
        })
      );
    });

    test('should handle complete task lifecycle', async () => {
      // ready → in_progress
      await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);
      
      // in_progress → review
      mockQuery.data = `task_status_review_${testTask._id.toString().slice(-6)}`;
      await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);
      
      // review → done
      mockQuery.data = `task_status_done_${testTask._id.toString().slice(-6)}`;
      await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);

      const finalTask = await Task.findById(testTask._id);
      expect(finalTask.status).toBe('done');
      expect(finalTask.statusHistory).toHaveLength(3);
      expect(finalTask.completedAt).toBeDefined();
      expect(finalTask.completedAt).toBeInstanceOf(Date);
    });

    test('should handle blocked status with reason', async () => {
      // First move to in_progress
      await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);
      
      // Then block with reason
      mockQuery.data = `blocker_add_${testTask._id.toString().slice(-6)}`;
      
      // Mock the blocker add flow
      const result = await taskCardsCallbacks.handleBlockerAdd(mockBot, mockQuery);
      
      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('📝 Add Blocker Details'),
        expect.objectContaining({
          chat_id: 123,
          message_id: 456
        })
      );
    });
  });

  describe('Status History Integration', () => {
    test('should display status history correctly', async () => {
      // Add some status changes
      await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);
      
      // Now request history
      mockQuery.data = `status_history_${testTask._id.toString().slice(-6)}`;
      const result = await taskCardsCallbacks.handleStatusHistory(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('📊 Status History'),
        expect.objectContaining({
          parse_mode: 'Markdown'
        })
      );
    });

    test('should handle status history for task with no changes', async () => {
      // Request history for task that hasn't changed status
      mockQuery.data = `status_history_${testTask._id.toString().slice(-6)}`;
      const result = await taskCardsCallbacks.handleStatusHistory(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('📊 No status changes yet'),
        expect.objectContaining({
          parse_mode: 'Markdown'
        })
      );
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle non-existent task gracefully', async () => {
      mockQuery.data = 'task_status_ready_999999';
      
      const result = await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        'test-query-id',
        expect.objectContaining({
          text: 'Task not found'
        })
      );
    });

    test('should handle permission errors for status changes', async () => {
      // Create different user
      const otherUser = await User.create({
        telegramId: `99999_${Date.now()}_${Math.random()}`,
        firstName: 'Other',
        lastName: 'User', 
        username: 'otheruser',
        role: 'member'
      });

      // Try to change status as different user  
      mockQuery.from.id = otherUser._id.toString();
      
      const result = await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        'test-query-id',
        expect.objectContaining({
          text: expect.stringContaining('❌ Status Change Failed')
        })
      );
    });

    test('should handle service layer errors gracefully', async () => {
      // Mock service to throw error
      jest.spyOn(statusTrackingService, 'changeTaskStatus').mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        'test-query-id',
        expect.objectContaining({
          text: expect.stringContaining('❌ Status Change Failed')
        })
      );

      // Restore original function
      jest.restoreAllMocks();
    });
  });

  describe('Service Layer Integration', () => {
    test('should integrate with status tracking service correctly', async () => {
      // Test that the callback uses the service layer
      const serviceSpy = jest.spyOn(statusTrackingService, 'changeTaskStatus');
      
      await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);

      expect(serviceSpy).toHaveBeenCalled();
      expect(serviceSpy.mock.calls[0][1]).toBe('in_progress');

      serviceSpy.mockRestore();
    });

    test('should handle service validation errors', async () => {
      // Test validation error from service
      const serviceSpy = jest.spyOn(statusTrackingService, 'changeTaskStatus').mockRejectedValue(
        new Error('Invalid status transition from ready to done')
      );

      mockQuery.data = `task_status_done_${testTask._id.toString().slice(-6)}`;
      
      const result = await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        'test-query-id',
        expect.objectContaining({
          text: expect.stringContaining('Invalid Status Change')
        })
      );

      serviceSpy.mockRestore();
    });
  });

  describe('Callback Data Parsing', () => {
    test('should parse status change callback data correctly', async () => {
      const result = await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);

      expect(result).toBe(true);
      
      // Verify the callback data was parsed correctly
      const updatedTask = await Task.findById(testTask._id);
      expect(updatedTask.status).toBe('in_progress');
    });

    test('should handle malformed callback data', async () => {
      mockQuery.data = 'invalid_callback_data';
      
      const result = await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        'test-query-id',
        expect.objectContaining({
          text: expect.stringContaining('Task not found')
        })
      );
    });
  });

  describe('Message Formatting Integration', () => {
    test('should format status update messages correctly', async () => {
      await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);

      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('✅ Status Updated Successfully!'),
        expect.objectContaining({
          parse_mode: 'Markdown'
        })
      );
    });

    test('should include task details in status update', async () => {
      await taskCardsCallbacks.handleStatusChange(mockBot, mockQuery);

      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Integration Test Task'),
        expect.objectContaining({
          parse_mode: 'Markdown'
        })
      );
    });
  });
}); 