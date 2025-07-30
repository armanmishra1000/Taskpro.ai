const TaskCreationService = require('../../src/services/task-creation/task-creation.service');
const Task = require('../../src/models/task.model');
const newtaskCommand = require('../../src/bot/commands/newtask.command');
const taskCallbacks = require('../../src/bot/callbacks/task-creation.callbacks');
const taskFormatter = require('../../src/bot/formatters/task-creation.formatter');
const { ValidationError } = require('../../src/utils/errors');
const mongoose = require('mongoose');

describe('Task Creation & Validation Integration', () => {
  beforeEach(async () => {
    // Clear test data
    await Task.deleteMany({});
    // Clear user states
    newtaskCommand.userStates.clear();
  });

  describe('Complete Task Creation Flow', () => {
    test('should handle complete task creation flow from command to database', async () => {
      // Mock bot interaction
      const mockBot = {
        sendMessage: jest.fn(),
        editMessageText: jest.fn(),
        answerCallbackQuery: jest.fn()
      };

      const mockMsg = {
        chat: { id: 123 },
        from: { id: 456, first_name: 'Test', username: 'testuser' }
      };

      const mockQuery = {
        data: 'task_input_text',
        message: { chat: { id: 123 }, message_id: 1 },
        from: { id: 456, first_name: 'Test', username: 'testuser' },
        id: 'callback_query_id'
      };

      // Step 1: Test command handler
      await newtaskCommand.handler(mockBot, mockMsg);
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123,
        '🆕 Creating New Task\n\nWhat needs to be done?\nYou can type or send a voice note.',
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: '📝 Type Description' })
              ])
            ])
          })
        })
      );

      // Step 2: Test callback handler for text input
      await taskCallbacks['task_input_text'](mockBot, mockQuery);
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        '📝 Type your task description:\n\nExample: "Fix login error on mobile app by tomorrow"',
        { chat_id: 123, message_id: 1 }
      );

      // Step 3: Test service parsing
      const description = 'Fix login error on mobile app by tomorrow';
      const parsed = await TaskCreationService.parseTaskDescription(description, '456');
      
      expect(parsed.title).toContain('Fix login error');
      expect(parsed.goal).toBe(description);
      expect(parsed.successMetric).toBe('Issue is resolved and working properly');
      expect(parsed.deadline).toBeDefined();

      // Step 4: Test validation
      const taskData = {
        ...parsed,
        createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
      };
      
      expect(() => TaskCreationService.validateTaskData(taskData)).not.toThrow();

      // Step 5: Test task creation
      const task = await TaskCreationService.createTask(taskData);
      expect(task._id).toBeDefined();
      expect(task.status).toBe('pending');
      expect(task.title).toBe(parsed.title);
      expect(task.goal).toBe(parsed.goal);
    });

    test('should handle deadline selection flow', async () => {
      const mockBot = {
        editMessageText: jest.fn()
      };

      const mockQuery = {
        data: 'deadline_tomorrow',
        message: { chat: { id: 123 }, message_id: 1 },
        from: { id: 456, first_name: 'Test' },
        id: 'callback_query_id'
      };

      // Set up initial state
      newtaskCommand.userStates.set(456, {
        step: 'awaiting_deadline',
        chatId: 123,
        taskData: {
          title: 'Test Task',
          goal: 'Test Goal',
          successMetric: 'Test Metric'
        }
      });

      // Test deadline selection
      await taskCallbacks['deadline_tomorrow'](mockBot, mockQuery);
      
      const state = newtaskCommand.userStates.get(456);
      expect(state.taskData.deadline).toBeDefined();
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(state.taskData.deadline.getDate()).toBe(tomorrow.getDate());
    });

    test('should handle task confirmation and creation', async () => {
      const mockBot = {
        editMessageText: jest.fn()
      };

      const mockQuery = {
        data: 'task_confirm_create',
        message: { chat: { id: 123 }, message_id: 1 },
        from: { id: 456, first_name: 'Test' },
        id: 'callback_query_id'
      };

      // Set up complete task data
      const taskData = {
        title: 'Fix login error',
        goal: 'Resolve authentication issues on mobile app',
        successMetric: 'Users can log in without errors',
        deadline: new Date(Date.now() + 86400000),
        createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
      };

      newtaskCommand.userStates.set(456, {
        step: 'confirmation',
        chatId: 123,
        taskData
      });

      // Test task confirmation
      await taskCallbacks['task_confirm_create'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        '✅ Task created successfully!\n\n📋 Task details saved.\n\nNote: Database integration will be added in the next task.',
        { chat_id: 123, message_id: 1 }
      );

      // State should be cleared
      expect(newtaskCommand.userStates.get(456)).toBeUndefined();
    });
  });

  describe('TaskCreationService Integration', () => {
    test('should parse task description correctly', async () => {
      const description = 'Fix login bug by tomorrow';
      const userId = 'test-user-id';
      
      const parsed = await TaskCreationService.parseTaskDescription(description, userId);
      
      expect(parsed.title).toContain('Fix login bug');
      expect(parsed.goal).toBe(description);
      expect(parsed.successMetric).toBe('Issue is resolved and working properly');
      expect(parsed.deadline).toBeDefined();
      
      // Check deadline is tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(parsed.deadline.getDate()).toBe(tomorrow.getDate());
    });

    test('should validate required fields', () => {
      const invalidData = {
        title: 'Short',
        goal: '',
        successMetric: '',
        deadline: null
      };

      expect(() => {
        TaskCreationService.validateTaskData(invalidData);
      }).toThrow(ValidationError);
    });

    test('should create task with valid data', async () => {
      const validData = {
        title: 'Fix login authentication error',
        description: 'Users cannot log in on mobile app',
        goal: 'Resolve authentication issues on mobile platform',
        successMetric: 'Users can successfully log in without errors',
        deadline: new Date(Date.now() + 86400000), // Tomorrow
        createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
      };

      const task = await TaskCreationService.createTask(validData);
      
      expect(task._id).toBeDefined();
      expect(task.status).toBe('pending');
      expect(task.title).toBe(validData.title);
      expect(task.goal).toBe(validData.goal);
      expect(task.successMetric).toBe(validData.successMetric);
    });

    test('should handle complex task descriptions', async () => {
      const complexDescription = 'Create a new user dashboard with real-time analytics, implement user authentication, and add notification system. Complete by next Friday.';
      const userId = 'test-user-id';
      
      const parsed = await TaskCreationService.parseTaskDescription(complexDescription, userId);
      
      expect(parsed.title).toContain('Create a new user dashboard');
      expect(parsed.goal).toBe(complexDescription);
      expect(parsed.successMetric).toBe('Feature is implemented and functional');
      expect(parsed.deadline).toBeDefined();
    });
  });

  describe('Message Formatter Integration', () => {
    test('should format task summary correctly', () => {
      const task = {
        title: 'Fix login error',
        goal: 'Resolve authentication issues',
        successMetric: 'Users can log in',
        deadline: new Date(Date.now() + 86400000)
      };

      const summary = taskFormatter.formatTaskSummary(task, 'testuser');
      
      expect(summary).toContain('✅ *Task Summary*');
      expect(summary).toContain('📋 *Title:* Fix login error');
      expect(summary).toContain('🎯 *Goal:* Resolve authentication issues');
      expect(summary).toContain('📏 *Success Metric:* Users can log in');
      expect(summary).toContain('👤 *Created by:* @testuser');
    });

    test('should format success message correctly', () => {
      const task = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        title: 'Fix login error',
        successMetric: 'Users can log in',
        deadline: new Date(Date.now() + 86400000)
      };

      const successMsg = taskFormatter.formatSuccessMessage(task);
      
      expect(successMsg).toContain('✅ *Task Created Successfully!*');
      expect(successMsg).toContain('📋 Fix login error');
      expect(successMsg).toContain('🆔 *Task ID:* #439011');
      expect(successMsg).toContain('🎯 *Success:* Users can log in');
    });

    test('should create proper keyboards', () => {
      const summaryKeyboard = taskFormatter.createTaskSummaryKeyboard();
      const deadlineKeyboard = taskFormatter.createDeadlineKeyboard();
      const editKeyboard = taskFormatter.createEditKeyboard();

      expect(summaryKeyboard.inline_keyboard).toHaveLength(2);
      expect(deadlineKeyboard.inline_keyboard).toHaveLength(2);
      expect(editKeyboard.inline_keyboard).toHaveLength(3);

      // Check specific buttons
      expect(summaryKeyboard.inline_keyboard[0][0].text).toBe('✅ Create Task');
      expect(deadlineKeyboard.inline_keyboard[0][0].text).toBe('📅 Today');
      expect(editKeyboard.inline_keyboard[0][0].text).toBe('✏️ Edit Title');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle missing goal gracefully', () => {
      const dataWithoutGoal = {
        title: 'Some task',
        successMetric: 'Task completed',
        deadline: new Date(Date.now() + 86400000)
      };

      expect(() => {
        TaskCreationService.validateTaskData(dataWithoutGoal);
      }).toThrow('Goal must be clear and specific');
    });

    test('should handle past deadline', () => {
      const dataWithPastDeadline = {
        title: 'Fix urgent bug',
        goal: 'Fix the critical bug affecting users',
        successMetric: 'Bug is resolved',
        deadline: new Date(Date.now() - 86400000) // Yesterday
      };

      expect(() => {
        TaskCreationService.validateTaskData(dataWithPastDeadline);
      }).toThrow('Deadline must be in the future');
    });

    test('should handle task cancellation', async () => {
      const mockBot = {
        editMessageText: jest.fn()
      };

      const mockQuery = {
        data: 'task_cancel',
        message: { chat: { id: 123 }, message_id: 1 },
        from: { id: 456, first_name: 'Test' },
        id: 'callback_query_id'
      };

      // Set up some state
      newtaskCommand.userStates.set(456, {
        step: 'some_step',
        taskData: {}
      });

      await taskCallbacks['task_cancel'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        '❌ Task creation cancelled.',
        { chat_id: 123, message_id: 1 }
      );

      // State should be cleared
      expect(newtaskCommand.userStates.get(456)).toBeUndefined();
    });

    test('should handle validation errors in formatter', () => {
      const errors = 'Goal must be clear and specific. Deadline is required.';
      const errorMsg = taskFormatter.formatValidationError(errors);
      
      expect(errorMsg).toContain('❌ *Task cannot be created:*');
      expect(errorMsg).toContain('Goal must be clear and specific. Deadline is required.');
      expect(errorMsg).toContain('Please provide the missing information.');
    });
  });

  describe('State Management Integration', () => {
    test('should maintain user state throughout flow', async () => {
      const userId = 456;
      
      // Initial state
      expect(newtaskCommand.userStates.has(userId)).toBe(false);
      
      // Set state
      newtaskCommand.userStates.set(userId, {
        step: 'input_method',
        chatId: 123,
        taskData: {}
      });
      
      expect(newtaskCommand.userStates.has(userId)).toBe(true);
      expect(newtaskCommand.userStates.get(userId).step).toBe('input_method');
      
      // Update state
      const state = newtaskCommand.userStates.get(userId);
      state.step = 'awaiting_description';
      state.taskData.title = 'Test Task';
      newtaskCommand.userStates.set(userId, state);
      
      expect(newtaskCommand.userStates.get(userId).step).toBe('awaiting_description');
      expect(newtaskCommand.userStates.get(userId).taskData.title).toBe('Test Task');
      
      // Clear state
      newtaskCommand.userStates.delete(userId);
      expect(newtaskCommand.userStates.has(userId)).toBe(false);
    });

    test('should handle multiple users simultaneously', () => {
      const user1 = 456;
      const user2 = 789;
      
      // Set states for both users
      newtaskCommand.userStates.set(user1, {
        step: 'input_method',
        chatId: 123,
        taskData: { title: 'Task 1' }
      });
      
      newtaskCommand.userStates.set(user2, {
        step: 'awaiting_deadline',
        chatId: 456,
        taskData: { title: 'Task 2' }
      });
      
      expect(newtaskCommand.userStates.get(user1).taskData.title).toBe('Task 1');
      expect(newtaskCommand.userStates.get(user2).taskData.title).toBe('Task 2');
      expect(newtaskCommand.userStates.get(user1).step).toBe('input_method');
      expect(newtaskCommand.userStates.get(user2).step).toBe('awaiting_deadline');
    });
  });

  describe('Database Integration', () => {
    test('should save and retrieve task from database', async () => {
      const taskData = {
        title: 'Integration Test Task',
        description: 'Test task for integration testing',
        goal: 'Verify complete task creation flow works end-to-end',
        successMetric: 'All tests pass and task is saved to database',
        deadline: new Date(Date.now() + 86400000),
        createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
      };

      // Create task
      const createdTask = await TaskCreationService.createTask(taskData);
      expect(createdTask._id).toBeDefined();

      // Retrieve task
      const retrievedTask = await TaskCreationService.getTaskById(createdTask._id);
      expect(retrievedTask.title).toBe(taskData.title);
      expect(retrievedTask.goal).toBe(taskData.goal);
      expect(retrievedTask.successMetric).toBe(taskData.successMetric);
    });

    test('should handle task updates', async () => {
      const taskData = {
        title: 'Original Title',
        description: 'Original description',
        goal: 'Original goal',
        successMetric: 'Original metric',
        deadline: new Date(Date.now() + 86400000),
        createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
      };

      const createdTask = await TaskCreationService.createTask(taskData);
      
      // Update task
      const updates = {
        title: 'Updated Title',
        goal: 'Updated goal with more specific details'
      };
      
      const updatedTask = await TaskCreationService.updateTask(createdTask._id, updates);
      expect(updatedTask.title).toBe('Updated Title');
      expect(updatedTask.goal).toBe('Updated goal with more specific details');
    });
  });
}); 