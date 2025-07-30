const taskCallbacks = require('../../src/bot/callbacks/task-creation.callbacks');
const { userStates } = require('../../src/bot/commands/newtask.command');

// Mock bot object
const mockBot = {
  editMessageText: jest.fn(),
  answerCallbackQuery: jest.fn()
};

// Mock query object
const createMockQuery = (callbackData, chatId = 123456, userId = 789, messageId = 1) => ({
  data: callbackData,
  message: {
    chat: { id: chatId },
    message_id: messageId
  },
  from: { 
    id: userId, 
    first_name: 'TestUser',
    username: 'testuser'
  },
  id: 'callback_query_id'
});

describe('Task Creation Callbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userStates.clear();
  });

  describe('Input Method Handlers', () => {
    it('should handle text input selection', async () => {
      const mockQuery = createMockQuery('task_input_text');
      
      await taskCallbacks['task_input_text'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        '📝 Type your task description:\n\nExample: "Fix login error on mobile app by tomorrow"',
        {
          chat_id: 123456,
          message_id: 1
        }
      );
      
      const state = userStates.get(789);
      expect(state.step).toBe('awaiting_description');
    });

    it('should handle voice input selection', async () => {
      const mockQuery = createMockQuery('task_input_voice');
      
      await taskCallbacks['task_input_voice'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        '🎤 Send a voice note with your task description.\n\nI\'ll process it and extract the details.',
        {
          chat_id: 123456,
          message_id: 1
        }
      );
      
      const state = userStates.get(789);
      expect(state.step).toBe('awaiting_voice');
    });
  });

  describe('Deadline Handlers', () => {
    beforeEach(() => {
      // Set up initial state with some task data
      userStates.set(789, {
        step: 'some_step',
        chatId: 123456,
        taskData: {
          title: 'Test Task',
          goal: 'Test Goal',
          successMetric: 'Test Metric'
        }
      });
    });

    it('should handle today deadline', async () => {
      const mockQuery = createMockQuery('deadline_today');
      
      await taskCallbacks['deadline_today'](mockBot, mockQuery);
      
      const state = userStates.get(789);
      expect(state.taskData.deadline).toBeDefined();
      expect(state.taskData.deadline.getDate()).toBe(new Date().getDate());
      expect(state.taskData.deadline.getHours()).toBe(23);
      expect(state.taskData.deadline.getMinutes()).toBe(59);
    });

    it('should handle tomorrow deadline', async () => {
      const mockQuery = createMockQuery('deadline_tomorrow');
      
      await taskCallbacks['deadline_tomorrow'](mockBot, mockQuery);
      
      const state = userStates.get(789);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      expect(state.taskData.deadline.getDate()).toBe(tomorrow.getDate());
    });

    it('should handle week deadline', async () => {
      const mockQuery = createMockQuery('deadline_week');
      
      await taskCallbacks['deadline_week'](mockBot, mockQuery);
      
      const state = userStates.get(789);
      expect(state.taskData.deadline).toBeDefined();
      expect(state.taskData.deadline.getDay()).toBe(0); // Sunday
    });

    it('should handle custom deadline', async () => {
      const mockQuery = createMockQuery('deadline_custom');
      
      await taskCallbacks['deadline_custom'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        '📅 Enter custom deadline:\nFormat: YYYY-MM-DD or "in 3 days" or "next Monday"\n\nExamples:\n• 2024-12-25\n• in 1 week\n• next Friday',
        {
          chat_id: 123456,
          message_id: 1
        }
      );
      
      const state = userStates.get(789);
      expect(state.step).toBe('awaiting_custom_deadline');
    });
  });

  describe('Task Management Handlers', () => {
    it('should handle task cancellation', async () => {
      const mockQuery = createMockQuery('task_cancel');
      
      // Set up some state first
      userStates.set(789, { step: 'some_step', taskData: {} });
      
      await taskCallbacks['task_cancel'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        '❌ Task creation cancelled.',
        {
          chat_id: 123456,
          message_id: 1
        }
      );
      
      // State should be cleared
      expect(userStates.get(789)).toBeUndefined();
    });

    it('should handle task confirmation without data', async () => {
      const mockQuery = createMockQuery('task_confirm_create');
      
      await taskCallbacks['task_confirm_create'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        '❌ No task data found. Please start over.',
        {
          chat_id: 123456,
          message_id: 1
        }
      );
    });

    it('should handle task confirmation with data', async () => {
      const mockQuery = createMockQuery('task_confirm_create');
      
      // Set up state with task data
      userStates.set(789, {
        step: 'confirmation',
        chatId: 123456,
        taskData: {
          title: 'Test Task',
          goal: 'Test Goal',
          successMetric: 'Test Metric',
          deadline: new Date()
        }
      });
      
      await taskCallbacks['task_confirm_create'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        '✅ Task created successfully!\n\n📋 Task details saved.\n\nNote: Database integration will be added in the next task.',
        {
          chat_id: 123456,
          message_id: 1
        }
      );
      
      // State should be cleared
      expect(userStates.get(789)).toBeUndefined();
    });

    it('should handle task edit without data', async () => {
      const mockQuery = createMockQuery('task_edit');
      
      await taskCallbacks['task_edit'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        '❌ No task data found. Please start over.',
        {
          chat_id: 123456,
          message_id: 1
        }
      );
    });

    it('should handle task edit with data', async () => {
      const mockQuery = createMockQuery('task_edit');
      
      // Set up state with task data
      userStates.set(789, {
        step: 'confirmation',
        chatId: 123456,
        taskData: {
          title: 'Test Task',
          goal: 'Test Goal',
          successMetric: 'Test Metric',
          deadline: new Date('2024-12-25')
        }
      });
      
      await taskCallbacks['task_edit'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('✏️ What would you like to edit?'),
        {
          chat_id: 123456,
          message_id: 1,
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: '✏️ Edit Title', callback_data: 'edit_title' })
              ]),
              expect.arrayContaining([
                expect.objectContaining({ text: '🎯 Edit Goal', callback_data: 'edit_goal' })
              ])
            ])
          })
        }
      );
    });
  });

  describe('Callback Registration', () => {
    it('should export all required callback handlers', () => {
      const expectedCallbacks = [
        'task_input_text',
        'task_input_voice',
        'task_cancel',
        'deadline_today',
        'deadline_tomorrow',
        'deadline_week',
        'deadline_custom',
        'task_confirm_create',
        'task_edit'
      ];
      
      expectedCallbacks.forEach(callback => {
        expect(taskCallbacks[callback]).toBeDefined();
        expect(typeof taskCallbacks[callback]).toBe('function');
      });
    });
  });
}); 