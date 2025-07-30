const { MESSAGES } = require('../constants/messages');
const { createInlineKeyboard } = require('../../utils/keyboard');
const dashboardService = require('../../services/manager-dashboard/manager-dashboard.service');

module.exports = {
  command: 'dashboard',
  description: 'Manager dashboard with team metrics and task overview',
  handler: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      // Validate manager permissions
      const hasPermission = await dashboardService.validateManagerPermissions(userId);
      
      if (!hasPermission) {
        await bot.sendMessage(
          chatId,
          MESSAGES.DASHBOARD.ACCESS_DENIED,
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      // Get dashboard overview data
      const dashboardData = await dashboardService.getDashboardOverview(userId);
      
      if (!dashboardData.hasTeams) {
        await bot.sendMessage(
          chatId,
          MESSAGES.DASHBOARD.NO_TEAM,
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      // Check if there's any data to show
      if (dashboardData.activeTasks.total === 0 && 
          dashboardData.velocity.totalCompleted === 0 && 
          dashboardData.blockers.count === 0) {
        await bot.sendMessage(
          chatId,
          MESSAGES.DASHBOARD.NO_DATA,
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      // Format main dashboard message
      const message = `📊 *Manager Dashboard*

🏢 *Team:* ${dashboardData.team.name} (${dashboardData.team.memberCount} members)

🔍 *Active Tasks:* ${dashboardData.activeTasks.total} total (${dashboardData.activeTasks.overdue} overdue)
⚡ *Team Velocity:* ${dashboardData.velocity.completionRate}% completion rate
🚧 *Active Blockers:* ${dashboardData.blockers.count} requiring attention
⏰ *Overdue Tasks:* ${dashboardData.overdue.count} need immediate action

Select a section to explore:`;
      
      // Create main navigation keyboard
      const keyboard = createInlineKeyboard([
        [
          { text: '📋 Active Tasks', callback_data: 'dashboard_active_tasks' },
          { text: '📈 Velocity Metrics', callback_data: 'dashboard_velocity' }
        ],
        [
          { text: '🚧 Blocker Alerts', callback_data: 'dashboard_blockers' },
          { text: '⏰ Overdue Tasks', callback_data: 'dashboard_overdue' }
        ],
        [
          { text: '🔄 Refresh Data', callback_data: 'dashboard_refresh' }
        ]
      ]);
      
      await bot.sendMessage(
        chatId,
        message,
        { 
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        }
      );
      
    } catch (error) {
      console.error('Dashboard command error:', error);
      await bot.sendMessage(chatId, MESSAGES.DASHBOARD.DATA_ERROR);
    }
  }
}; 