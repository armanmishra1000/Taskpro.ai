const newtaskCommand = require('../../src/bot/commands/newtask.command');

describe('Command Handler Integration', () => {
  it('should export the command handler correctly', () => {
    expect(newtaskCommand).toBeDefined();
    expect(newtaskCommand.handler).toBeDefined();
    expect(typeof newtaskCommand.handler).toBe('function');
  });

  it('should have correct command properties', () => {
    expect(newtaskCommand.command).toBe('newtask');
    expect(newtaskCommand.description).toBe('Create a new task with AI validation');
  });

  it('should export userStates for callback handlers', () => {
    expect(newtaskCommand.userStates).toBeDefined();
    expect(newtaskCommand.userStates instanceof Map).toBe(true);
  });

  it('should be able to create keyboard markup', () => {
    const { createInlineKeyboard } = require('../../src/utils/keyboard');
    const keyboard = createInlineKeyboard([
      [{ text: '📝 Type Description', callback_data: 'task_input_text' }],
      [{ text: '🎤 Voice Note', callback_data: 'task_input_voice' }],
      [{ text: '❌ Cancel', callback_data: 'task_cancel' }]
    ]);
    
    expect(keyboard).toEqual({
      inline_keyboard: [
        [{ text: '📝 Type Description', callback_data: 'task_input_text' }],
        [{ text: '🎤 Voice Note', callback_data: 'task_input_voice' }],
        [{ text: '❌ Cancel', callback_data: 'task_cancel' }]
      ]
    });
  });

  it('should have access to message constants', () => {
    const { MESSAGES } = require('../../src/bot/constants/messages');
    expect(MESSAGES.TASK.WELCOME).toBeDefined();
    expect(MESSAGES.ERRORS.GENERAL).toBeDefined();
  });
}); 