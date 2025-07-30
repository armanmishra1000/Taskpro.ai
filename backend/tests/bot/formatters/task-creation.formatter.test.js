const taskFormatter = require('../../../src/bot/formatters/task-creation.formatter');
const mongoose = require('mongoose');

describe('Task Creation Formatter', () => {
  const mockTask = {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    title: 'Fix login error on mobile app',
    goal: 'Resolve authentication issues on mobile app',
    successMetric: 'Users can log in without errors',
    deadline: new Date('2024-12-25'),
    description: 'Fix the login error that users are experiencing'
  };

  const mockUser = {
    username: 'testuser',
    first_name: 'Test'
  };

  describe('formatTaskSummary', () => {
    it('should format task summary correctly', () => {
      const result = taskFormatter.formatTaskSummary(mockTask, mockUser.username);
      
      expect(result).toContain('✅ *Task Summary*');
      expect(result).toContain('📋 *Title:* Fix login error on mobile app');
      expect(result).toContain('🎯 *Goal:* Resolve authentication issues on mobile app');
      expect(result).toContain('📏 *Success Metric:* Users can log in without errors');
      expect(result).toContain('👤 *Created by:* @testuser');
      expect(result).toContain('Is this correct?');
    });

    it('should handle task with missing fields', () => {
      const incompleteTask = {
        title: 'Test Task',
        goal: 'Test Goal'
        // Missing other fields
      };
      
      const result = taskFormatter.formatTaskSummary(incompleteTask, mockUser.username);
      
      expect(result).toContain('📋 *Title:* Test Task');
      expect(result).toContain('🎯 *Goal:* Test Goal');
      expect(result).toContain('📏 *Success Metric:* undefined');
      expect(result).toContain('📅 *Deadline:* Not set');
    });
  });

  describe('formatSuccessMessage', () => {
    it('should format success message correctly', () => {
      const result = taskFormatter.formatSuccessMessage(mockTask);
      
      expect(result).toContain('✅ *Task Created Successfully!*');
      expect(result).toContain('📋 Fix login error on mobile app');
      expect(result).toContain('🆔 *Task ID:* #439011'); // Last 6 chars of ObjectId
      expect(result).toContain('🎯 *Success:* Users can log in without errors');
      expect(result).toContain('The task is ready to be assigned to a team member.');
    });
  });

  describe('formatValidationError', () => {
    it('should format validation error correctly', () => {
      const errors = 'Goal must be clear and specific. Deadline is required.';
      const result = taskFormatter.formatValidationError(errors);
      
      expect(result).toContain('❌ *Task cannot be created:*');
      expect(result).toContain('Goal must be clear and specific. Deadline is required.');
      expect(result).toContain('Please provide the missing information.');
    });
  });

  describe('formatDate', () => {
    it('should format today correctly', () => {
      const today = new Date();
      const result = taskFormatter.formatDate(today);
      expect(result).toBe('Today');
    });

    it('should format tomorrow correctly', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = taskFormatter.formatDate(tomorrow);
      expect(result).toBe('Tomorrow');
    });

    it('should format future date within week correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const result = taskFormatter.formatDate(futureDate);
      expect(result).toBe('In 3 days');
    });

    it('should format distant future date correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
      const result = taskFormatter.formatDate(futureDate);
      expect(result).toMatch(/^[A-Za-z]{3}, [A-Za-z]{3} \d{1,2}$/); // e.g., "Wed, Dec 25"
    });

    it('should handle null date', () => {
      const result = taskFormatter.formatDate(null);
      expect(result).toBe('Not set');
    });

    it('should handle undefined date', () => {
      const result = taskFormatter.formatDate(undefined);
      expect(result).toBe('Not set');
    });
  });

  describe('formatMissingGoalMessage', () => {
    it('should format missing goal message correctly', () => {
      const result = taskFormatter.formatMissingGoalMessage();
      
      expect(result).toContain('❓ *I need more details:*');
      expect(result).toContain('What\'s the specific goal?');
      expect(result).toContain('*Example:* "Fix login error on mobile app"');
    });
  });

  describe('formatMissingDeadlineMessage', () => {
    it('should format missing deadline message correctly', () => {
      const result = taskFormatter.formatMissingDeadlineMessage();
      
      expect(result).toContain('📅 *When should this be completed?*');
      expect(result).toContain('Please choose a deadline:');
    });
  });

  describe('formatMissingMetricMessage', () => {
    it('should format missing metric message correctly', () => {
      const result = taskFormatter.formatMissingMetricMessage();
      
      expect(result).toContain('🎯 *How will we measure success?*');
      expect(result).toContain('*Example:* "Users can log in without errors"');
    });
  });

  describe('formatUnclearDescriptionMessage', () => {
    it('should format unclear description message correctly', () => {
      const userInput = 'Fix something';
      const result = taskFormatter.formatUnclearDescriptionMessage(userInput);
      
      expect(result).toContain('❓ *I need more clarity:*');
      expect(result).toContain('Can you be more specific about what needs to be done?');
      expect(result).toContain('*Current:* "Fix something"');
    });
  });

  describe('formatCustomDeadlinePrompt', () => {
    it('should format custom deadline prompt correctly', () => {
      const result = taskFormatter.formatCustomDeadlinePrompt();
      
      expect(result).toContain('📅 *Enter custom deadline:*');
      expect(result).toContain('Format: YYYY-MM-DD or "in 3 days" or "next Monday"');
      expect(result).toContain('*Examples:*');
      expect(result).toContain('• 2024-12-25');
      expect(result).toContain('• in 1 week');
      expect(result).toContain('• next Friday');
    });
  });

  describe('formatEditTaskPrompt', () => {
    it('should format edit task prompt correctly', () => {
      const result = taskFormatter.formatEditTaskPrompt(mockTask);
      
      expect(result).toContain('✏️ *What would you like to edit?*');
      expect(result).toContain('*Current task:*');
      expect(result).toContain('📋 Fix login error on mobile app');
      expect(result).toContain('🎯 Resolve authentication issues on mobile app');
      expect(result).toContain('📏 Users can log in without errors');
    });

    it('should handle task with missing fields in edit prompt', () => {
      const incompleteTask = {
        title: 'Test Task'
        // Missing other fields
      };
      
      const result = taskFormatter.formatEditTaskPrompt(incompleteTask);
      
      expect(result).toContain('📋 Test Task');
      expect(result).toContain('🎯 Not set');
      expect(result).toContain('📏 Not set');
      expect(result).toContain('📅 Not set');
    });
  });

  describe('formatVoiceNoteReceived', () => {
    it('should format voice note received message correctly', () => {
      const result = taskFormatter.formatVoiceNoteReceived();
      
      expect(result).toContain('🎤 *Voice note received!*');
      expect(result).toContain('Processing your task description...');
      expect(result).toContain('⏳ Please wait while I analyze the details.');
    });
  });

  describe('formatInvalidInputMessage', () => {
    it('should format invalid input message correctly', () => {
      const result = taskFormatter.formatInvalidInputMessage();
      
      expect(result).toContain('❌ *I couldn\'t understand that.*');
      expect(result).toContain('Please provide a clear task description or use /help for guidance.');
    });
  });

  describe('formatNetworkErrorMessage', () => {
    it('should format network error message correctly', () => {
      const result = taskFormatter.formatNetworkErrorMessage();
      
      expect(result).toContain('❌ *Connection issue occurred.*');
      expect(result).toContain('Please try again in a moment.');
    });
  });

  describe('Keyboard Creation', () => {
    describe('createTaskSummaryKeyboard', () => {
      it('should create task summary keyboard correctly', () => {
        const keyboard = taskFormatter.createTaskSummaryKeyboard();
        
        expect(keyboard).toHaveProperty('inline_keyboard');
        expect(keyboard.inline_keyboard).toHaveLength(2);
        expect(keyboard.inline_keyboard[0]).toHaveLength(2);
        expect(keyboard.inline_keyboard[0][0]).toEqual({
          text: '✅ Create Task',
          callback_data: 'task_confirm_create'
        });
        expect(keyboard.inline_keyboard[0][1]).toEqual({
          text: '✏️ Edit Details',
          callback_data: 'task_edit'
        });
        expect(keyboard.inline_keyboard[1]).toHaveLength(1);
        expect(keyboard.inline_keyboard[1][0]).toEqual({
          text: '❌ Cancel',
          callback_data: 'task_cancel'
        });
      });
    });

    describe('createDeadlineKeyboard', () => {
      it('should create deadline keyboard correctly', () => {
        const keyboard = taskFormatter.createDeadlineKeyboard();
        
        expect(keyboard).toHaveProperty('inline_keyboard');
        expect(keyboard.inline_keyboard).toHaveLength(2);
        expect(keyboard.inline_keyboard[0]).toHaveLength(2);
        expect(keyboard.inline_keyboard[0][0]).toEqual({
          text: '📅 Today',
          callback_data: 'deadline_today'
        });
        expect(keyboard.inline_keyboard[0][1]).toEqual({
          text: '📅 Tomorrow',
          callback_data: 'deadline_tomorrow'
        });
        expect(keyboard.inline_keyboard[1]).toHaveLength(2);
        expect(keyboard.inline_keyboard[1][0]).toEqual({
          text: '📅 This Week',
          callback_data: 'deadline_week'
        });
        expect(keyboard.inline_keyboard[1][1]).toEqual({
          text: '📅 Custom',
          callback_data: 'deadline_custom'
        });
      });
    });

    describe('createEditKeyboard', () => {
      it('should create edit keyboard correctly', () => {
        const keyboard = taskFormatter.createEditKeyboard();
        
        expect(keyboard).toHaveProperty('inline_keyboard');
        expect(keyboard.inline_keyboard).toHaveLength(3);
        expect(keyboard.inline_keyboard[0]).toHaveLength(2);
        expect(keyboard.inline_keyboard[0][0]).toEqual({
          text: '✏️ Edit Title',
          callback_data: 'edit_title'
        });
        expect(keyboard.inline_keyboard[0][1]).toEqual({
          text: '🎯 Edit Goal',
          callback_data: 'edit_goal'
        });
        expect(keyboard.inline_keyboard[1]).toHaveLength(2);
        expect(keyboard.inline_keyboard[1][0]).toEqual({
          text: '📏 Edit Metric',
          callback_data: 'edit_metric'
        });
        expect(keyboard.inline_keyboard[1][1]).toEqual({
          text: '📅 Edit Deadline',
          callback_data: 'edit_deadline'
        });
        expect(keyboard.inline_keyboard[2]).toHaveLength(2);
        expect(keyboard.inline_keyboard[2][0]).toEqual({
          text: '✅ Save Changes',
          callback_data: 'task_confirm_create'
        });
        expect(keyboard.inline_keyboard[2][1]).toEqual({
          text: '❌ Cancel',
          callback_data: 'task_cancel'
        });
      });
    });

    describe('createInputMethodKeyboard', () => {
      it('should create input method keyboard correctly', () => {
        const keyboard = taskFormatter.createInputMethodKeyboard();
        
        expect(keyboard).toHaveProperty('inline_keyboard');
        expect(keyboard.inline_keyboard).toHaveLength(2);
        expect(keyboard.inline_keyboard[0]).toHaveLength(2);
        expect(keyboard.inline_keyboard[0][0]).toEqual({
          text: '📝 Type Description',
          callback_data: 'task_input_text'
        });
        expect(keyboard.inline_keyboard[0][1]).toEqual({
          text: '🎤 Voice Note',
          callback_data: 'task_input_voice'
        });
        expect(keyboard.inline_keyboard[1]).toHaveLength(1);
        expect(keyboard.inline_keyboard[1][0]).toEqual({
          text: '❌ Cancel',
          callback_data: 'task_cancel'
        });
      });
    });
  });

  describe('Module Exports', () => {
    it('should export all required functions', () => {
      const expectedExports = [
        'formatTaskSummary',
        'formatSuccessMessage',
        'formatValidationError',
        'formatDate',
        'formatMissingGoalMessage',
        'formatMissingDeadlineMessage',
        'formatMissingMetricMessage',
        'formatUnclearDescriptionMessage',
        'formatCustomDeadlinePrompt',
        'formatEditTaskPrompt',
        'formatVoiceNoteReceived',
        'formatInvalidInputMessage',
        'formatNetworkErrorMessage',
        'createTaskSummaryKeyboard',
        'createDeadlineKeyboard',
        'createEditKeyboard',
        'createInputMethodKeyboard'
      ];

      expectedExports.forEach(exportName => {
        expect(taskFormatter[exportName]).toBeDefined();
        expect(typeof taskFormatter[exportName]).toBe('function');
      });
    });
  });
}); 