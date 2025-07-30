const { MESSAGES } = require('../constants/messages');
const { createInlineKeyboard, keyboards } = require('../../utils/keyboard');
const { userStates } = require('../commands/newtask.command');

const handleTaskInputText = async (bot, query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;
  
  try {
    await bot.editMessageText(
      '📝 Type your task description:\n\nExample: "Fix login error on mobile app by tomorrow"',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
    // Update user state
    const state = userStates.get(userId) || {};
    state.step = 'awaiting_description';
    userStates.set(userId, state);
    
  } catch (error) {
    console.error('Error handling text input:', error);
  }
};

const handleTaskInputVoice = async (bot, query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;
  
  try {
    await bot.editMessageText(
      '🎤 Send a voice note with your task description.\n\nI\'ll process it and extract the details.',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
    // Update user state
    const state = userStates.get(userId) || {};
    state.step = 'awaiting_voice';
    userStates.set(userId, state);
    
  } catch (error) {
    console.error('Error handling voice input:', error);
  }
};

const handleTaskCancel = async (bot, query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;
  
  try {
    await bot.editMessageText(
      '❌ Task creation cancelled.',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
    // Clear user state
    userStates.delete(userId);
    
  } catch (error) {
    console.error('Error cancelling task:', error);
  }
};

const handleDeadlineToday = async (bot, query) => {
  const userId = query.from.id;
  const state = userStates.get(userId);
  
  if (state) {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    state.taskData.deadline = today;
    userStates.set(userId, state);
    
    // Continue to next missing field or confirmation
    await checkTaskCompletion(bot, query);
  }
};

const handleDeadlineTomorrow = async (bot, query) => {
  const userId = query.from.id;
  const state = userStates.get(userId);
  
  if (state) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999); // End of tomorrow
    
    state.taskData.deadline = tomorrow;
    userStates.set(userId, state);
    
    await checkTaskCompletion(bot, query);
  }
};

const handleDeadlineWeek = async (bot, query) => {
  const userId = query.from.id;
  const state = userStates.get(userId);
  
  if (state) {
    const endOfWeek = new Date();
    const daysUntilSunday = 7 - endOfWeek.getDay();
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);
    
    state.taskData.deadline = endOfWeek;
    userStates.set(userId, state);
    
    await checkTaskCompletion(bot, query);
  }
};

const handleDeadlineCustom = async (bot, query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;
  
  try {
    await bot.editMessageText(
      '📅 Enter custom deadline:\nFormat: YYYY-MM-DD or "in 3 days" or "next Monday"\n\nExamples:\n• 2024-12-25\n• in 1 week\n• next Friday',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
    // Update user state
    const state = userStates.get(userId) || {};
    state.step = 'awaiting_custom_deadline';
    userStates.set(userId, state);
    
  } catch (error) {
    console.error('Error handling custom deadline:', error);
  }
};

const handleTaskConfirmCreate = async (bot, query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;
  
  try {
    const state = userStates.get(userId);
    if (!state || !state.taskData) {
      await bot.editMessageText('❌ No task data found. Please start over.', {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }
    
    // TODO: Create task in database (will be implemented in B4)
    await bot.editMessageText(
      '✅ Task created successfully!\n\n📋 Task details saved.\n\nNote: Database integration will be added in the next task.',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
    // Clear user state
    userStates.delete(userId);
    
  } catch (error) {
    console.error('Error creating task:', error);
  }
};

const handleTaskEdit = async (bot, query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;
  
  try {
    const state = userStates.get(userId);
    if (!state || !state.taskData) {
      await bot.editMessageText('❌ No task data found. Please start over.', {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }
    
    const { taskData } = state;
    const editKeyboard = createInlineKeyboard([
      [{ text: '✏️ Edit Title', callback_data: 'edit_title' }],
      [{ text: '🎯 Edit Goal', callback_data: 'edit_goal' }],
      [{ text: '📏 Edit Success Metric', callback_data: 'edit_metric' }],
      [{ text: '📅 Edit Deadline', callback_data: 'edit_deadline' }],
      [{ text: '✅ Save Changes', callback_data: 'task_confirm_create' }],
      [{ text: '❌ Cancel', callback_data: 'task_cancel' }]
    ]);
    
    await bot.editMessageText(
      `✏️ What would you like to edit?\n\nCurrent task:\n📋 ${taskData.title || 'Not set'}\n🎯 ${taskData.goal || 'Not set'}\n📏 ${taskData.successMetric || 'Not set'}\n📅 ${taskData.deadline ? taskData.deadline.toLocaleDateString() : 'Not set'}`,
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: editKeyboard
      }
    );
    
  } catch (error) {
    console.error('Error editing task:', error);
  }
};

const promptForGoal = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    await bot.editMessageText(
      MESSAGES.TASK.MISSING_GOAL,
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
  } catch (error) {
    console.error('Error prompting for goal:', error);
  }
};

const promptForSuccessMetric = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    await bot.editMessageText(
      MESSAGES.TASK.MISSING_METRIC,
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
  } catch (error) {
    console.error('Error prompting for success metric:', error);
  }
};

const promptForDeadline = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    await bot.editMessageText(
      MESSAGES.TASK.MISSING_DEADLINE,
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: keyboards.deadline
      }
    );
  } catch (error) {
    console.error('Error prompting for deadline:', error);
  }
};

const showTaskSummary = async (bot, query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;
  
  try {
    const state = userStates.get(userId);
    if (!state || !state.taskData) return;
    
    const { taskData } = state;
    const summaryKeyboard = createInlineKeyboard([
      [
        { text: '✅ Create Task', callback_data: 'task_confirm_create' },
        { text: '✏️ Edit', callback_data: 'task_edit' }
      ],
      [{ text: '❌ Cancel', callback_data: 'task_cancel' }]
    ]);
    
    const summaryText = `✅ Task Summary\n\n📋 Title: ${taskData.title || 'Not set'}\n🎯 Goal: ${taskData.goal || 'Not set'}\n📏 Success Metric: ${taskData.successMetric || 'Not set'}\n📅 Deadline: ${taskData.deadline ? taskData.deadline.toLocaleDateString() : 'Not set'}\n👤 Created by: @${query.from.username || query.from.first_name}\n\nIs this correct?`;
    
    await bot.editMessageText(summaryText, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: summaryKeyboard
    });
    
  } catch (error) {
    console.error('Error showing task summary:', error);
  }
};

const checkTaskCompletion = async (bot, query) => {
  const userId = query.from.id;
  const state = userStates.get(userId);
  
  if (!state) return;
  
  const { taskData } = state;
  
  // Check for missing required fields
  if (!taskData.goal) {
    await promptForGoal(bot, query);
  } else if (!taskData.successMetric) {
    await promptForSuccessMetric(bot, query);
  } else if (!taskData.deadline) {
    await promptForDeadline(bot, query);
  } else {
    await showTaskSummary(bot, query);
  }
};

module.exports = {
  'task_input_text': handleTaskInputText,
  'task_input_voice': handleTaskInputVoice,
  'task_cancel': handleTaskCancel,
  'deadline_today': handleDeadlineToday,
  'deadline_tomorrow': handleDeadlineTomorrow,
  'deadline_week': handleDeadlineWeek,
  'deadline_custom': handleDeadlineCustom,
  'task_confirm_create': handleTaskConfirmCreate,
  'task_edit': handleTaskEdit
}; 