const newtaskCommand = require('../../src/bot/commands/newtask.command');

// Mock bot object
const mockBot = {
  sendMessage: jest.fn()
};

// Mock message object
const createMockMessage = (chatId = 123456, userId = 789) => ({
  chat: { id: chatId },
  from: { id: userId, first_name: 'TestUser' },
  text: '/newtask'
});

describe('NewTask Command Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear user states before each test
    newtaskCommand.userStates.clear();
  });

  it('should send welcome message with keyboard', async () => {
    const mockMsg = createMockMessage();
    
    await newtaskCommand.handler(mockBot, mockMsg);
    
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      123456,
      '🆕 Creating New Task\n\nWhat needs to be done?\nYou can type or send a voice note.',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 Type Description', callback_data: 'task_input_text' }],
            [{ text: '🎤 Voice Note', callback_data: 'task_input_voice' }],
            [{ text: '❌ Cancel', callback_data: 'task_cancel' }]
          ]
        }
      }
    );
  });

  it('should clear existing user state', async () => {
    const mockMsg = createMockMessage();
    const userId = mockMsg.from.id;
    
    // Set existing state
    newtaskCommand.userStates.set(userId, {
      step: 'some_step',
      chatId: 123456,
      taskData: { some: 'data' }
    });
    
    await newtaskCommand.handler(mockBot, mockMsg);
    
    // Check that new state was set
    const newState = newtaskCommand.userStates.get(userId);
    expect(newState).toEqual({
      step: 'input_method',
      chatId: 123456,
      taskData: {}
    });
  });

  it('should set initial user state', async () => {
    const mockMsg = createMockMessage();
    const userId = mockMsg.from.id;
    
    await newtaskCommand.handler(mockBot, mockMsg);
    
    const state = newtaskCommand.userStates.get(userId);
    expect(state).toBeDefined();
    expect(state.step).toBe('input_method');
    expect(state.chatId).toBe(123456);
    expect(state.taskData).toEqual({});
  });

  it('should handle errors gracefully', async () => {
    const mockMsg = createMockMessage();
    
    // Mock bot.sendMessage to throw error
    mockBot.sendMessage.mockRejectedValueOnce(new Error('Network error'));
    
    await newtaskCommand.handler(mockBot, mockMsg);
    
    // Should call sendMessage twice - once for welcome, once for error
    expect(mockBot.sendMessage).toHaveBeenCalledTimes(2);
    expect(mockBot.sendMessage).toHaveBeenLastCalledWith(
      123456,
      '❌ Something went wrong. Please try again.'
    );
  });

  it('should export userStates for callbacks', () => {
    expect(newtaskCommand.userStates).toBeDefined();
    expect(newtaskCommand.userStates instanceof Map).toBe(true);
  });

  it('should have correct command metadata', () => {
    expect(newtaskCommand.command).toBe('newtask');
    expect(newtaskCommand.description).toBe('Create a new task with AI validation');
  });
}); 