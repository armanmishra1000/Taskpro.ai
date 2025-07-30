const dashboardService = require('../../services/manager-dashboard/manager-dashboard.service');
const dashboardFormatter = require('../formatters/manager-dashboard.formatter');
const { MESSAGES } = require('../constants/messages');

const handleActiveTasksView = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Get user's primary team
    const teams = await dashboardService.getTeamsForManager(userId);
    if (teams.length === 0) {
      await bot.answerCallbackQuery(query.id, { text: 'No teams found' });
      return;
    }
    
    const teamId = teams[0]._id;
    const activeTasksData = await dashboardService.getActiveTasksDetails(teamId, 10);
    
    // Format data for the formatter
    const formattedData = {
      team: teams[0],
      activeTasks: {
        statusBreakdown: {},
        priorityBreakdown: {}
      },
      recentTasks: activeTasksData
    };
    
    // Calculate breakdowns
    activeTasksData.forEach(task => {
      formattedData.activeTasks.statusBreakdown[task.status] = 
        (formattedData.activeTasks.statusBreakdown[task.status] || 0) + 1;
      formattedData.activeTasks.priorityBreakdown[task.priority] = 
        (formattedData.activeTasks.priorityBreakdown[task.priority] || 0) + 1;
    });
    
    const message = dashboardFormatter.formatActiveTasksView(formattedData);
    const keyboard = dashboardFormatter.createSectionKeyboard('active_tasks');
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Active tasks view error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error loading active tasks' });
  }
};

const handleVelocityMetrics = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Get user's primary team
    const teams = await dashboardService.getTeamsForManager(userId);
    if (teams.length === 0) {
      await bot.answerCallbackQuery(query.id, { text: 'No teams found' });
      return;
    }
    
    const teamId = teams[0]._id;
    const velocityData = await dashboardService.getTeamVelocityMetrics(teamId, 7);
    
    // Format data for the formatter
    const formattedData = {
      team: teams[0],
      velocity: {
        completionRate: 0,
        totalCompleted: velocityData.recentCompleted.length,
        avgCompletionDays: 0,
        trend: velocityData.trend
      },
      recentCompleted: velocityData.recentCompleted
    };
    
    // Calculate completion rate (simplified)
    const dashboardData = await dashboardService.getDashboardOverview(userId);
    formattedData.velocity.completionRate = dashboardData.velocity.completionRate;
    formattedData.velocity.avgCompletionDays = dashboardData.velocity.avgCompletionDays;
    
    const message = dashboardFormatter.formatVelocityMetrics(formattedData);
    const keyboard = dashboardFormatter.createSectionKeyboard('velocity');
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Velocity metrics error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error loading velocity metrics' });
  }
};

const handleBlockerAlerts = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Get user's primary team
    const teams = await dashboardService.getTeamsForManager(userId);
    if (teams.length === 0) {
      await bot.answerCallbackQuery(query.id, { text: 'No teams found' });
      return;
    }
    
    const teamId = teams[0]._id;
    const blockersData = await dashboardService.getBlockerAlerts(teamId);
    
    // Format data for the formatter
    const formattedData = {
      team: teams[0],
      blockers: blockersData
    };
    
    const message = dashboardFormatter.formatBlockerAlerts(formattedData);
    const keyboard = dashboardFormatter.createSectionKeyboard('blockers');
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Blocker alerts error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error loading blocker alerts' });
  }
};

const handleOverdueTasks = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Get user's primary team
    const teams = await dashboardService.getTeamsForManager(userId);
    if (teams.length === 0) {
      await bot.answerCallbackQuery(query.id, { text: 'No teams found' });
      return;
    }
    
    const teamId = teams[0]._id;
    const overdueData = await dashboardService.getOverdueTasksAnalysis(teamId);
    
    // Format data for the formatter
    const formattedData = {
      team: teams[0],
      overdue: overdueData
    };
    
    const message = dashboardFormatter.formatOverdueWarnings(formattedData);
    const keyboard = dashboardFormatter.createSectionKeyboard('overdue');
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Overdue tasks error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error loading overdue tasks' });
  }
};

const handleRefreshData = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Get fresh dashboard data
    const dashboardData = await dashboardService.getDashboardOverview(userId);
    
    if (!dashboardData.hasTeams) {
      await bot.editMessageText(
        MESSAGES.DASHBOARD.NO_TEAM,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        }
      );
      await bot.answerCallbackQuery(query.id, { text: 'No team data available' });
      return;
    }
    
    const message = dashboardFormatter.formatDashboardOverview(dashboardData);
    const keyboard = dashboardFormatter.createDashboardKeyboard();
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    const timestamp = new Date().toLocaleString();
    await bot.answerCallbackQuery(query.id, { 
      text: `✅ Dashboard refreshed! Updated: ${timestamp}` 
    });
  } catch (error) {
    console.error('Refresh data error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error refreshing data' });
  }
};

const handleMainDashboard = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    const dashboardData = await dashboardService.getDashboardOverview(userId);
    
    if (!dashboardData.hasTeams) {
      await bot.editMessageText(
        MESSAGES.DASHBOARD.NO_TEAM,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        }
      );
      await bot.answerCallbackQuery(query.id, { text: 'No team data available' });
      return;
    }
    
    const message = dashboardFormatter.formatDashboardOverview(dashboardData);
    const keyboard = dashboardFormatter.createDashboardKeyboard();
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Main dashboard error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error loading dashboard' });
  }
};

// Quick action handlers
const handleAllTasks = async (bot, query) => {
  await bot.answerCallbackQuery(query.id, { text: 'Opening task cards...' });
  // This would trigger the existing /cards command functionality
  // For now, just show a message
  const chatId = query.message.chat.id;
  await bot.sendMessage(
    chatId,
    '📋 Use /cards to view all tasks with filters and quick actions.',
    { parse_mode: 'Markdown' }
  );
};

const handleHighPriority = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Get user's primary team
    const teams = await dashboardService.getTeamsForManager(userId);
    if (teams.length === 0) {
      await bot.answerCallbackQuery(query.id, { text: 'No teams found' });
      return;
    }
    
    const teamId = teams[0]._id;
    const highPriorityTasks = await dashboardService.getActiveTasksDetails(teamId, 20);
    const filteredTasks = highPriorityTasks.filter(task => 
      task.priority === 'high' || task.priority === 'critical'
    );
    
    if (filteredTasks.length === 0) {
      await bot.editMessageText(
        '🔥 *High Priority Tasks*\n\n✅ No high priority tasks found!\n\nYour team is managing priorities well.',
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Back to Active Tasks', callback_data: 'dashboard_active_tasks' }]
            ]
          },
          parse_mode: 'Markdown'
        }
      );
      await bot.answerCallbackQuery(query.id, { text: 'No high priority tasks' });
      return;
    }
    
    let message = `🔥 *High Priority Tasks*\n\n🏢 *Team:* ${teams[0].name}\n\n`;
    
    filteredTasks.forEach((task, index) => {
      const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
      const dueDate = dashboardFormatter.formatDueDate(task.deadline);
      const priorityEmoji = dashboardFormatter.getPriorityEmoji(task.priority);
      const statusEmoji = dashboardFormatter.getStatusEmoji(task.status);
      
      message += `${index + 1}. ${priorityEmoji} *${task.title}*\n`;
      message += `   👤 ${assignee} • Due: ${dueDate}\n`;
      message += `   ${statusEmoji} ${dashboardFormatter.formatStatusName(task.status)}\n\n`;
    });
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '⬅️ Back to Active Tasks', callback_data: 'dashboard_active_tasks' }]
        ]
      },
      parse_mode: 'Markdown'
    });
    
    await bot.answerCallbackQuery(query.id, { text: `Found ${filteredTasks.length} high priority tasks` });
  } catch (error) {
    console.error('High priority tasks error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error loading high priority tasks' });
  }
};

// Additional section handlers for future expansion
const handleCriticalBlockers = async (bot, query) => {
  await bot.answerCallbackQuery(query.id, { text: 'Critical blockers feature coming soon!' });
};

const handleAllBlockers = async (bot, query) => {
  await bot.answerCallbackQuery(query.id, { text: 'All blockers feature coming soon!' });
};

const handleCriticalOverdue = async (bot, query) => {
  await bot.answerCallbackQuery(query.id, { text: 'Critical overdue feature coming soon!' });
};

const handleAllOverdue = async (bot, query) => {
  await bot.answerCallbackQuery(query.id, { text: 'All overdue feature coming soon!' });
};

const handlePerformanceReport = async (bot, query) => {
  await bot.answerCallbackQuery(query.id, { text: 'Performance report feature coming soon!' });
};

const handleTopPerformers = async (bot, query) => {
  await bot.answerCallbackQuery(query.id, { text: 'Top performers feature coming soon!' });
};

module.exports = {
  dashboard_active_tasks: handleActiveTasksView,
  dashboard_velocity: handleVelocityMetrics,
  dashboard_blockers: handleBlockerAlerts,
  dashboard_overdue: handleOverdueTasks,
  dashboard_refresh: handleRefreshData,
  dashboard_main: handleMainDashboard,
  dashboard_all_tasks: handleAllTasks,
  dashboard_high_priority: handleHighPriority,
  dashboard_critical_blockers: handleCriticalBlockers,
  dashboard_all_blockers: handleAllBlockers,
  dashboard_critical_overdue: handleCriticalOverdue,
  dashboard_all_overdue: handleAllOverdue,
  dashboard_performance_report: handlePerformanceReport,
  dashboard_top_performers: handleTopPerformers
}; 