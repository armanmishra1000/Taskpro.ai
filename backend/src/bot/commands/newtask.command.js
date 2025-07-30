const { MESSAGES } = require('../constants/messages');
const { createInlineKeyboard } = require('../../utils/keyboard');

// User state management
const userStates = new Map();

module.exports = {
  command: 'newtask',
  description: 'Create a new task with AI validation',
  handler: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      // Clear any existing state
      userStates.delete(userId);
      
      // Create input method keyboard
      const keyboard = createInlineKeyboard([
        [{ text: '📝 Type Description', callback_data: 'task_input_text' }],
        [{ text: '🎤 Voice Note', callback_data: 'task_input_voice' }],
        [{ text: '❌ Cancel', callback_data: 'task_cancel' }]
      ]);
      
      await bot.sendMessage(
        chatId,
        MESSAGES.TASK.WELCOME,
        { reply_markup: keyboard }
      );
      
      // Store initial state
      userStates.set(userId, {
        step: 'input_method',
        chatId,
        taskData: {}
      });
      
    } catch (error) {
      console.error('Error in /newtask command:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL);
    }
  },
  
  // Export user states for callbacks
  userStates
}; 