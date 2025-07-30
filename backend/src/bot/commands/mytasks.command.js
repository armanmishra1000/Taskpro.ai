const Task = require('../../models/task.model');

// Minimal formatter for assigned tasks
function formatTaskList(tasks, filter, { currentPage, totalPages, totalTasks }) {
  if (!tasks.length) return 'No tasks assigned.';
  let out = `👤 *Your Assigned Tasks*\n\n`;
  tasks.forEach((task, idx) => {
    out += `*${idx + 1}. ${task.title}*\n`;
    out += `🗓️ Due: ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}\n`;
    out += `📈 Status: ${task.status} | ⚡ Priority: ${task.priority}\n`;
    out += `\n`;
  });
  out += `━━━\nPage ${currentPage} of ${totalPages} | ${totalTasks} tasks shown`;
  return out;
}

module.exports = {
  command: 'mytasks',
  description: 'View your assigned tasks in card format',
  handler: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    try {
      // Get tasks assigned to user
      const tasks = await Task.find({ assignedTo: userId })
        .populate('createdBy', 'firstName lastName username')
        .populate('assignedTo', 'firstName lastName username')
        .sort({ deadline: 1 })
        .limit(10);
      if (tasks.length === 0) {
        await bot.sendMessage(
          chatId,
          `👤 No tasks assigned to you.\n\nTasks assigned to you will appear here.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📋 View All Tasks', callback_data: 'cards_filter_all' }]
              ]
            }
          }
        );
        return;
      }
      // Format task list
      const formattedList = formatTaskList(tasks, 'assigned', {
        currentPage: 1,
        totalPages: 1,
        totalTasks: tasks.length
      });
      const keyboard = {
        inline_keyboard: [
          [
            { text: '📋 All Tasks', callback_data: 'cards_filter_all' },
            { text: '🔄 Refresh', callback_data: 'cards_refresh' }
          ]
        ]
      };
      await bot.sendMessage(chatId, formattedList, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('MyTasks command error:', error);
      await bot.sendMessage(chatId, 'Error loading your tasks. Please try again.');
    }
  }
};