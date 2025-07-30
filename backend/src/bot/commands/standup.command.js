const standupService = require('../../services/daily-standup/daily-standup.service');
const { formatStandupConfig, createStandupConfigKeyboard } = require('../formatters/daily-standup.formatter');

module.exports = {
  command: 'standup',
  description: 'Configure daily standup automation',
  handler: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      // Verify team membership and permissions
      const team = await standupService.getUserTeam(userId);
      if (!team) {
        return await bot.sendMessage(chatId, 'You must be part of a team to configure standups.');
      }
      
      // Check manager/admin permissions
      if (!standupService.hasConfigPermission(userId, team)) {
        return await bot.sendMessage(chatId, 'Only team managers and admins can configure standup automation.');
      }
      
      // Show configuration interface
      const configMessage = formatStandupConfig(team);
      const keyboard = createStandupConfigKeyboard(team._id);
      
      await bot.sendMessage(chatId, configMessage, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
      
    } catch (error) {
      console.error('Standup command error:', error);
      await bot.sendMessage(chatId, 'Something went wrong. Please try again.');
    }
  }
}; 