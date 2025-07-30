const { MESSAGES } = require('../constants/messages');
const { createInlineKeyboard } = require('../../utils/keyboard');
const Team = require('../../models/team.model');

module.exports = {
  command: 'team',
  description: 'Manage team members and settings',
  handler: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      // Create team menu keyboard
      const keyboard = createInlineKeyboard([
        [{ text: '👤 Add Member', callback_data: 'team_add' }],
        [{ text: '📋 List Members', callback_data: 'team_list' }],
        [{ text: '🗑️ Remove Member', callback_data: 'team_remove' }],
        [{ text: '⚙️ Team Settings', callback_data: 'team_settings' }]
      ]);
      
      await bot.sendMessage(
        chatId,
        MESSAGES.TEAM.WELCOME,
        { reply_markup: keyboard }
      );
      
    } catch (error) {
      console.error('Team command error:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL);
    }
  }
}; 