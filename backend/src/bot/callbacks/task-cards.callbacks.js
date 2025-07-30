const Task = require('../../models/task.model');
const statusTrackingService = require('../../services/status-tracking/status-tracking.service');

// Helper function to format task list (temporary until formatter is created)
function formatTaskList(tasks, filter, { currentPage, totalPages, totalTasks }) {
  if (!tasks.length) return 'No tasks found.';
  
  let out = '';
  switch (filter) {
    case 'overdue':
      out += `🔥 OVERDUE TASKS (${totalTasks})\n\n`;
      break;
    case 'today':
      out += `📅 TODAY'S TASKS (${totalTasks})\n\n`;
      break;
    case 'tomorrow':
      out += `📅 TOMORROW'S TASKS (${totalTasks})\n\n`;
      break;
    case 'week':
      out += `📅 THIS WEEK'S TASKS (${totalTasks})\n\n`;
      break;
    case 'all':
      out += `📋 ALL TASKS (${totalTasks})\n\n`;
      break;
    case 'assigned':
      out += `👤 MY ASSIGNED TASKS (${totalTasks})\n\n`;
      break;
  }
  
  tasks.forEach((task, idx) => {
    const taskNum = idx + 1;
    out += `*${taskNum}. ${task.title}*\n`;
    out += `👤 ${task.assignedTo ? `@${task.assignedTo.username || 'Unknown'}` : 'Unassigned'}\n`;
    out += `📅 Due: ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}\n`;
    out += `📊 Status: ${task.status} | ⚡ Priority: ${task.priority}\n\n`;
  });
  
  out += `━━━━━━━━━━━━━━━━━━━━━━━━\nPage ${currentPage} of ${totalPages} | ${totalTasks} tasks shown`;
  return out;
}

// Filter handlers
const handleOverdueFilter = async (bot, query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  
  try {
    const tasks = await Task.getTasksByDeadline(userId, 'overdue')
      .populate('assignedTo', 'firstName lastName username')
      .sort({ deadline: 1 })
      .limit(9); // 3 per page, 3 pages max
    
    if (tasks.length === 0) {
      await bot.editMessageText(
        `🎉 No overdue tasks!\n\nGreat job staying on top of your deadlines.`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Back to Filters', callback_data: 'cards_back_filters' }]
            ]
          }
        }
      );
      return;
    }
    
    const formattedList = formatTaskList(tasks, 'overdue', {
      currentPage: 1,
      totalPages: Math.ceil(tasks.length / 3),
      totalTasks: tasks.length
    });
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '⬅️ Back to Filters', callback_data: 'cards_back_filters' },
          { text: '🔄 Refresh', callback_data: 'cards_filter_overdue' }
        ]
      ]
    };
    
    if (tasks.length > 3) {
      keyboard.inline_keyboard.push([
        { text: '➡️ Next Page', callback_data: 'cards_page_next_overdue' }
      ]);
    }
    
    await bot.editMessageText(formattedList, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
  } catch (error) {
    console.error('Overdue filter error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error loading overdue tasks' });
  }
};

const handleTodayFilter = async (bot, query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  
  try {
    const tasks = await Task.getTasksByDeadline(userId, 'today')
      .populate('assignedTo', 'firstName lastName username')
      .sort({ deadline: 1 })
      .limit(9);
    
    if (tasks.length === 0) {
      await bot.editMessageText(
        `📅 No tasks due today.\n\nEnjoy your lighter schedule!`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Back to Filters', callback_data: 'cards_back_filters' }]
            ]
          }
        }
      );
      return;
    }
    
    const formattedList = formatTaskList(tasks, 'today', {
      currentPage: 1,
      totalPages: Math.ceil(tasks.length / 3),
      totalTasks: tasks.length
    });
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '⬅️ Back to Filters', callback_data: 'cards_back_filters' },
          { text: '🔄 Refresh', callback_data: 'cards_filter_today' }
        ]
      ]
    };
    
    await bot.editMessageText(formattedList, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
  } catch (error) {
    console.error('Today filter error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error loading today tasks' });
  }
};

// Placeholder handlers for other filters (TODO: implement similar pattern)
const handleTomorrowFilter = async (bot, query) => {
  await bot.answerCallbackQuery(query.id, { text: 'Tomorrow filter coming soon' });
};

const handleWeekFilter = async (bot, query) => {
  await bot.answerCallbackQuery(query.id, { text: 'Week filter coming soon' });
};

const handleAllTasksFilter = async (bot, query) => {
  await bot.answerCallbackQuery(query.id, { text: 'All tasks filter coming soon' });
};

const handleMyTasksFilter = async (bot, query) => {
  await bot.answerCallbackQuery(query.id, { text: 'My tasks filter coming soon' });
};

// Status update handler (dynamic callback)
const handleStatusUpdate = async (bot, query) => {
  const action = query.data;
  const [, , status, taskId] = action.split('_');
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  
  try {
    const task = await Task.findById(taskId);
    if (!task) {
      await bot.answerCallbackQuery(query.id, { text: 'Task not found' });
      return;
    }
    
    // Check permissions
    if (task.createdBy.toString() !== userId && task.assignedTo?.toString() !== userId) {
      await bot.answerCallbackQuery(query.id, { text: '🚫 Access denied' });
      return;
    }
    
    // Validate status transition
    const validTransitions = {
      'pending': ['ready'],
      'ready': ['in_progress', 'pending'],
      'in_progress': ['review', 'ready', 'blocked'],
      'review': ['done', 'in_progress'],
      'done': ['review'],
      'blocked': ['ready', 'in_progress']
    };
    
    const statusMap = {
      'progress': 'in_progress'
    };
    
    const newStatus = statusMap[status] || status;
    
    if (!validTransitions[task.status]?.includes(newStatus)) {
      await bot.answerCallbackQuery(query.id, { 
        text: `❌ Cannot change from ${task.status} to ${newStatus}` 
      });
      return;
    }
    
    // Update task
    const oldStatus = task.status;
    task.status = newStatus;
    if (newStatus === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date();
    }
    if (newStatus === 'done' && !task.completedAt) {
      task.completedAt = new Date();
    }
    
    await task.save();
    
    // Send confirmation
    const statusMessages = {
      'ready': 'Task is ready to be worked on.',
      'in_progress': 'Task is now active and being worked on.',
      'review': 'Task is ready for review and feedback.',
      'done': 'Task completed successfully! 🎉',
      'blocked': 'Task has been blocked.'
    };
    
    const confirmationText = `✅ Status Updated!

📋 *${task.title}*
📊 Status: ${oldStatus} → ${newStatus}

${statusMessages[newStatus]}`;
    
    await bot.editMessageText(confirmationText, {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⬅️ Back to Cards', callback_data: 'cards_back_filters' }]
        ]
      }
    });
    
  } catch (error) {
    console.error('Status update error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error updating status' });
  }
};

// Status change handler
const handleStatusChange = async (bot, query) => {
  const [, , status, shortId] = query.data.split('_');
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    // Map callback status to actual status
    const statusMap = {
      'progress': 'in_progress'
    };
    const newStatus = statusMap[status] || status;
    
    // Find task by short ID
    const task = await Task.findOne({
      $expr: {
        $regexMatch: {
          input: { $toString: "$_id" },
          regex: shortId + "$"
        }
      }
    });
    
    if (!task) {
      await bot.answerCallbackQuery(query.id, { text: 'Task not found', show_alert: true });
      return true;
    }
    
    // Change status using service
    const updatedTask = await statusTrackingService.changeTaskStatus(
      task._id, newStatus, userId
    );
    
    // Format success message
    const { formatStatusUpdate, createTaskActionKeyboard } = require('../formatters/task-cards.formatter');
    const lastHistoryEntry = updatedTask.statusHistory[updatedTask.statusHistory.length - 1];
    const fromStatus = lastHistoryEntry?.fromStatus || 'unknown';
    const statusMessage = `👤 Changed by: @${query.from.username || 'Unknown'}\n⏰ ${new Date().toLocaleString()}`;
    
    const successMessage = formatStatusUpdate(updatedTask, fromStatus, newStatus, statusMessage);
    const keyboard = createTaskActionKeyboard(shortId, newStatus, updatedTask);
    
    // Update message
    await bot.editMessageText(successMessage, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    return true;
    
  } catch (error) {
    console.error('Status change error:', error);
    
    let errorMessage = '❌ Status Change Failed';
    if (error.message.includes('Invalid status transition')) {
      errorMessage = `❌ Invalid Status Change\n\n${error.message}`;
    } else if (error.message.includes('Permission')) {
      errorMessage = `❌ Permission Denied\n\n${error.message}`;
    } else if (error.message.includes('required')) {
      errorMessage = `❌ Missing Information\n\n${error.message}`;
    }
    
    await bot.answerCallbackQuery(query.id, { text: errorMessage, show_alert: true });
    return true;
  }
};

// Status history handler
const handleStatusHistory = async (bot, query) => {
  const shortId = query.data.split('_')[2];
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    // Find task by short ID
    const task = await Task.findOne({
      $expr: {
        $regexMatch: {
          input: { $toString: "$_id" },
          regex: shortId + "$"
        }
      }
    });
    
    if (!task) {
      await bot.answerCallbackQuery(query.id, { text: 'Task not found', show_alert: true });
      return true;
    }
    
    const taskWithHistory = await statusTrackingService.getStatusHistory(task._id);
    const historyMessage = formatStatusHistory(taskWithHistory);
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '⬅️ Back to Task', callback_data: `task_view_${shortId}` },
          { text: '🔄 Refresh', callback_data: `status_history_${shortId}` }
        ]
      ]
    };
    
    await bot.editMessageText(historyMessage, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    return true;
    
  } catch (error) {
    console.error('Status history error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error loading status history' });
    return true;
  }
};

// Blocker details handler
const handleBlockerAdd = async (bot, query) => {
  const shortId = query.data.split('_')[2];
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  // Set user state for text input (implement user state management as needed)
  // For now, send instruction message
  
  const blockerPrompt = `📝 Add Blocker Details

📋 Task will be marked as blocked.

Please describe what's blocking this task:

💡 Examples:
• "Waiting for API documentation from backend team"
• "Need approval from product manager"  
• "Blocked by Bug #1234 in login system"

Type your blocker description and I'll update the task.`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '❌ Cancel', callback_data: `task_view_${shortId}` }]
    ]
  };
  
  await bot.editMessageText(blockerPrompt, {
    chat_id: chatId, 
    message_id: messageId,
    reply_markup: keyboard
  });
  
  return true;
};

// Format status history for display
const formatStatusHistory = (task) => {
  const { getStatusIcon, formatDeadline } = require('../formatters/task-cards.formatter');
  
  let historyText = `📊 Status History - ${task.title}\n\n`;
  historyText += `📋 Task #${task._id.toString().slice(-6)}\n`;
  historyText += `👤 Created by: @${task.createdBy?.username || 'Unknown'}\n`;
  historyText += `📅 Created: ${task.createdAt.toLocaleString()}\n\n`;
  
  if (task.statusHistory.length === 0) {
    historyText += `📊 No status changes yet.\n`;
    historyText += `Current status: ${getStatusIcon(task.status)} ${task.status}`;
    return historyText;
  }
  
  historyText += `📊 Status Changes:\n`;
  
  task.statusHistory.forEach((change, index) => {
    const fromIcon = getStatusIcon(change.fromStatus);
    const toIcon = getStatusIcon(change.toStatus);
    const changedBy = change.changedBy?.username || 'Unknown';
    const changedAt = new Date(change.changedAt).toLocaleString();
    
    historyText += `\n• ${fromIcon} ${change.fromStatus} → ${toIcon} ${change.toStatus}\n`;
    historyText += `  👤 @${changedBy} at ${changedAt}\n`;
    
    if (change.reason) {
      historyText += `  📝 Reason: ${change.reason}\n`;
    }
    
    if (change.duration) {
      const durationHours = Math.floor(change.duration / (1000 * 60 * 60));
      const durationMinutes = Math.floor((change.duration % (1000 * 60 * 60)) / (1000 * 60));
      if (durationHours > 0 || durationMinutes > 0) {
        historyText += `  ⏱️ Duration: ${durationHours}h ${durationMinutes}m\n`;
      }
    }
  });
  
  // Add current status info
  const currentDuration = statusTrackingService.calculateCurrentStatusDuration(task);
  const currentHours = Math.floor(currentDuration / (1000 * 60 * 60));
  const currentMinutes = Math.floor((currentDuration % (1000 * 60 * 60)) / (1000 * 60));
  
  historyText += `\n📊 Current Status: ${getStatusIcon(task.status)} ${task.status}`;
  if (currentHours > 0 || currentMinutes > 0) {
    historyText += `\n⏱️ Time in current status: ${currentHours}h ${currentMinutes}m`;
  }
  
  return historyText;
};

// Dynamic callback handler
const handleDynamicCallback = async (bot, query) => {
  const action = query.data;
  
  // Handle status change callbacks
  if (action.startsWith('task_status_')) {
    return await handleStatusChange(bot, query);
  }
  
  // Handle status history callbacks
  if (action.startsWith('status_history_')) {
    return await handleStatusHistory(bot, query);
  }
  
  // Handle blocker details callbacks
  if (action.startsWith('blocker_report_')) {
    return await handleBlockerAdd(bot, query);
  }
  
  if (action.startsWith('task_blocked_')) {
    // Handle blocked task - placeholder for now
    await bot.answerCallbackQuery(query.id, { text: 'Blocked feature coming soon' });
    return true;
  }
  
  if (action.startsWith('task_comment_')) {
    // Handle task comment - placeholder for now
    await bot.answerCallbackQuery(query.id, { text: 'Comments feature coming soon' });
    return true;
  }
  
  return false; // Not handled
};

// Back to filters handler
const handleBackToFilters = async (bot, query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  
  try {
    const summary = await Task.getTaskSummary(userId);
    
    const summaryText = `📋 Your Task Cards

🔥 OVERDUE (${summary.overdue})
📅 TODAY (${summary.today}) 
📅 TOMORROW (${summary.tomorrow})
📅 THIS WEEK (${summary.week})

Choose view:`;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: `🔥 Overdue (${summary.overdue})`, callback_data: "cards_filter_overdue" },
          { text: `📅 Today (${summary.today})`, callback_data: "cards_filter_today" }
        ],
        [
          { text: `📅 Tomorrow (${summary.tomorrow})`, callback_data: "cards_filter_tomorrow" },
          { text: `📅 This Week (${summary.week})`, callback_data: "cards_filter_week" }
        ],
        [
          { text: `📋 All Tasks (${summary.total})`, callback_data: "cards_filter_all" },
          { text: "👤 My Tasks", callback_data: "cards_filter_assigned" }
        ]
      ]
    };
    
    await bot.editMessageText(summaryText, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Back to filters error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error loading filters' });
  }
};

module.exports = {
  // Filter handlers
  'cards_filter_overdue': handleOverdueFilter,
  'cards_filter_today': handleTodayFilter,
  'cards_filter_tomorrow': handleTomorrowFilter,
  'cards_filter_week': handleWeekFilter,
  'cards_filter_all': handleAllTasksFilter,
  'cards_filter_assigned': handleMyTasksFilter,
  
  // Navigation handlers
  'cards_back_filters': handleBackToFilters,
  'cards_refresh': handleBackToFilters, // Same as back to filters
  
  // Add new handlers
  handleStatusChange,
  handleStatusHistory,
  handleBlockerAdd,
  
  // Enhanced dynamic handler
  handleDynamicCallback
}; 