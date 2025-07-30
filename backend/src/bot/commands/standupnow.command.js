const standupService = require('../../services/daily-standup/daily-standup.service');

module.exports = {
  command: 'standupnow',
  description: 'Trigger immediate standup for testing',
  handler: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      // Verify team membership and permissions
      const team = await standupService.getUserTeam(userId);
      if (!team) {
        return await bot.sendMessage(chatId, 'You must be part of a team to trigger standups.');
      }
      
      // Check manager/admin permissions
      if (!standupService.hasConfigPermission(userId, team)) {
        return await bot.sendMessage(chatId, 'Only team managers and admins can trigger standup automation.');
      }
      
      // Check if standup is enabled
      if (!team.standupConfig?.enabled) {
        return await bot.sendMessage(chatId, 'Standup automation must be enabled first. Use /standup to configure.');
      }
      
      // Trigger immediate standup
      const result = await standupService.triggerStandupNow(team._id);
      
      await bot.sendMessage(chatId, 
        `✅ Test Standup Triggered!\n\n` +
        `${result.message}\n` +
        `Participants: ${result.participants} members\n\n` +
        `Check your team channel for the summary.`
      );
      
    } catch (error) {
      console.error('Standupnow command error:', error);
      await bot.sendMessage(chatId, `Error: ${error.message}`);
    }
  }
}; 