const { MESSAGES } = require('../constants/messages');
const { createInlineKeyboard } = require('../../utils/keyboard');
const Task = require('../../models/task.model');
const Team = require('../../models/team.model');
const { assignmentStates } = require('../commands/assign.command');

// Handle task selection from /assign command
const handleTaskSelection = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  const taskId = query.data.replace('assign_task_', '');
  
  try {
    // Get task details
    const task = await Task.findById(taskId);
    if (!task) {
      return await bot.editMessageText(
        MESSAGES.ERRORS.NOT_FOUND,
        { chat_id: chatId, message_id: messageId }
      );
    }
    
    // Get team members for selection
    // For now, get first team user belongs to
    const team = await Team.findOne({ 'members.userId': userId });
    if (!team || team.members.length === 0) {
      return await bot.editMessageText(
        '❌ No team members found. Use /team to manage your team.',
        { chat_id: chatId, message_id: messageId }
      );
    }
    
    // Create member selection keyboard
    const memberButtons = team.members.map(member => [{
      text: `👤 @${member.username} (${member.role})`,
      callback_data: `assign_to_${member.username}_${taskId}`
    }]);
    
    // Add navigation buttons
    memberButtons.push([
      { text: '🔙 Back', callback_data: 'assign_back' },
      { text: '❌ Cancel', callback_data: 'assign_cancel' }
    ]);
    
    const keyboard = createInlineKeyboard(memberButtons);
    
    const messageText = MESSAGES.ASSIGNMENT.SELECT_MEMBER
      .replace('{taskTitle}', task.title);
    
    await bot.editMessageText(
      messageText,
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: keyboard
      }
    );
    
    // Update state
    const state = assignmentStates.get(userId) || {};
    state.step = 'member_selection';
    state.selectedTask = taskId;
    assignmentStates.set(userId, state);
    
  } catch (error) {
    console.error('Task selection error:', error);
    await bot.editMessageText(
      MESSAGES.ERRORS.GENERAL,
      { chat_id: chatId, message_id: messageId }
    );
  }
};

// Handle member assignment
const handleMemberAssignment = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  // Parse callback data: assign_to_username_taskId
  const parts = query.data.split('_');
  const username = parts[2];
  const taskId = parts[3];
  
  try {
    // Get task and validate
    const task = await Task.findById(taskId);
    if (!task) {
      return await bot.editMessageText(
        MESSAGES.ERRORS.NOT_FOUND,
        { chat_id: chatId, message_id: messageId }
      );
    }
    
    // Find team member details
    const team = await Team.findOne({ 'members.userId': userId });
    const assignee = team.members.find(m => m.username === username);
    
    if (!assignee) {
      return await bot.editMessageText(
        '❌ Team member not found.',
        { chat_id: chatId, message_id: messageId }
      );
    }
    
    // For now, directly assign (later add confirmation step)
    task.assignedTo = assignee.userId;
    await task.save();
    
    // Show success message
    const successMessage = `${MESSAGES.ASSIGNMENT.SUCCESS}

📋 ${task.title}
👤 Assigned to: @${username}
📅 Deadline: ${task.deadline ? task.deadline.toDateString() : 'Not set'}
🎯 Success metric: ${task.successMetric || 'Not specified'}

Task ID: #${task._id.toString().slice(-4)}

✉️ Notification sent to @${username}`;
    
    await bot.editMessageText(
      successMessage,
      { chat_id: chatId, message_id: messageId }
    );
    
    // Clear state
    assignmentStates.delete(userId);
    
    // TODO: Send notification to assignee (implement in B4)
    
  } catch (error) {
    console.error('Member assignment error:', error);
    await bot.editMessageText(
      MESSAGES.ERRORS.GENERAL,
      { chat_id: chatId, message_id: messageId }
    );
  }
};

// Handle back navigation
const handleBack = async (bot, query) => {
  // For now, just cancel - can implement proper back navigation later
  await handleCancel(bot, query);
};

// Handle cancel
const handleCancel = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  // Clear state
  assignmentStates.delete(userId);
  
  await bot.editMessageText(
    '❌ Assignment cancelled.',
    { chat_id: chatId, message_id: messageId }
  );
};

// Handle search (placeholder)
const handleSearch = async (bot, query) => {
  const chatId = query.message.chat.id;  
  const messageId = query.message.message_id;
  
  await bot.editMessageText(
    '🔍 Task Search\n\nThis feature will be implemented in a future update.\n\nFor now, use /assign to see available tasks.',
    { chat_id: chatId, message_id: messageId }
  );
};

module.exports = {
  'assign_task_': handleTaskSelection,     // Dynamic - matches assign_task_[id]
  'assign_to_': handleMemberAssignment,    // Dynamic - matches assign_to_[username]_[taskId]
  'assign_search': handleSearch,
  'assign_back': handleBack,
  'assign_cancel': handleCancel,
  
  // Helper function for dynamic callback matching
  handleDynamicCallback: async (bot, query) => {
    const action = query.data;
    
    if (action.startsWith('assign_task_')) {
      return await handleTaskSelection(bot, query);
    }
    
    if (action.startsWith('assign_to_')) {
      return await handleMemberAssignment(bot, query);
    }
    
    return false; // Not handled
  }
}; 