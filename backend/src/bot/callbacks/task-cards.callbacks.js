const Task = require('../../models/task.model');

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

// Dynamic callback handler
const handleDynamicCallback = async (bot, query) => {
  const action = query.data;
  
  if (action.startsWith('task_status_')) {
    return await handleStatusUpdate(bot, query);
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
  
  // Dynamic callback handler
  handleDynamicCallback
}; 