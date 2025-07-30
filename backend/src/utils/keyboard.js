// Utility for creating inline keyboards
const createInlineKeyboard = (buttons) => {
  return {
    inline_keyboard: buttons
  };
};

// Common keyboard layouts
const keyboards = {
  deadline: createInlineKeyboard([
    [
      { text: '📅 Today', callback_data: 'deadline_today' },
      { text: '📅 Tomorrow', callback_data: 'deadline_tomorrow' }
    ],
    [
      { text: '📅 This Week', callback_data: 'deadline_week' },
      { text: '📅 Custom', callback_data: 'deadline_custom' }
    ]
  ]),
  
  confirmation: createInlineKeyboard([
    [
      { text: '✅ Confirm', callback_data: 'confirm_yes' },
      { text: '❌ Cancel', callback_data: 'confirm_no' }
    ]
  ])
};

module.exports = {
  createInlineKeyboard,
  keyboards
}; 