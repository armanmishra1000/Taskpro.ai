const Task = require('../../models/task.model');
const { createInlineKeyboard } = require('../../utils/keyboard');

module.exports = {
  command: 'cards',
  description: 'Display task cards with visual formatting and quick actions',
  handler: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    try {
      // Get user task summary
      const summary = await Task.getTaskSummary(userId);
      if (summary.total === 0) {
        await bot.sendMessage(
          chatId,
          `📭 You have no tasks yet.\n\nCreate your first task with /newtask`,
          {
            reply_markup: createInlineKeyboard([
              [{ text: '🆕 Create Task', callback_data: 'task_new' }]
            ])
          }
        );
        return;
      }
      // Create summary message
      const summaryText = `📋 Your Task Cards\n\n🔥 OVERDUE (${summary.overdue})\n📅 TODAY (${summary.today}) \n📅 TOMORROW (${summary.tomorrow})\n📅 THIS WEEK (${summary.week})\n\nChoose view:`;
      // Create filter keyboard
      const keyboard = createInlineKeyboard([
        [
          { text: `🔥 Overdue (${summary.overdue})`, callback_data: 'cards_filter_overdue' },
          { text: `📅 Today (${summary.today})`, callback_data: 'cards_filter_today' }
        ],
        [
          { text: `📅 Tomorrow (${summary.tomorrow})`, callback_data: 'cards_filter_tomorrow' },
          { text: `📅 This Week (${summary.week})`, callback_data: 'cards_filter_week' }
        ],
        [
          { text: `📋 All Tasks (${summary.total})`, callback_data: 'cards_filter_all' },
          { text: '👤 My Tasks', callback_data: 'cards_filter_assigned' }
        ]
      ]);
      await bot.sendMessage(chatId, summaryText, { reply_markup: keyboard });
    } catch (error) {
      console.error('Cards command error:', error);
      await bot.sendMessage(chatId, 'Error loading task cards. Please try again.');
    }
  }
};