const { createInlineKeyboard } = require('../../utils/keyboard');

const formatTaskSummary = (task, username) => {
  return `✅ *Task Summary*

📋 *Title:* ${task.title}
🎯 *Goal:* ${task.goal}
📏 *Success Metric:* ${task.successMetric}
📅 *Deadline:* ${formatDate(task.deadline)}
👤 *Created by:* @${username}

Is this correct?`;
};

const formatSuccessMessage = (task) => {
  return `✅ *Task Created Successfully!*

📋 ${task.title}
🆔 *Task ID:* #${task._id.toString().slice(-6)}
📅 *Due:* ${formatDate(task.deadline)}
🎯 *Success:* ${task.successMetric}

The task is ready to be assigned to a team member.`;
};

const formatValidationError = (errors) => {
  return `❌ *Task cannot be created:*

${errors}

Please provide the missing information.`;
};

const formatDate = (date) => {
  if (!date) return 'Not set';
  
  const now = new Date();
  const taskDate = new Date(date);
  const diffTime = taskDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  
  return taskDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

const formatMissingGoalMessage = () => {
  return `❓ *I need more details:*
What's the specific goal?

*Example:* "Fix login error on mobile app"`;
};

const formatMissingDeadlineMessage = () => {
  return `📅 *When should this be completed?*

Please choose a deadline:`;
};

const formatMissingMetricMessage = () => {
  return `🎯 *How will we measure success?*

*Example:* "Users can log in without errors"`;
};

const formatUnclearDescriptionMessage = (userInput) => {
  return `❓ *I need more clarity:*
Can you be more specific about what needs to be done?

*Current:* "${userInput}"`;
};

const formatCustomDeadlinePrompt = () => {
  return `📅 *Enter custom deadline:*
Format: YYYY-MM-DD or "in 3 days" or "next Monday"

*Examples:*
• 2024-12-25
• in 1 week
• next Friday`;
};

const formatEditTaskPrompt = (task) => {
  return `✏️ *What would you like to edit?*

*Current task:*
📋 ${task.title || 'Not set'}
🎯 ${task.goal || 'Not set'}
📏 ${task.successMetric || 'Not set'}
📅 ${task.deadline ? formatDate(task.deadline) : 'Not set'}`;
};

const formatVoiceNoteReceived = () => {
  return `🎤 *Voice note received!*
Processing your task description...

⏳ Please wait while I analyze the details.`;
};

const formatInvalidInputMessage = () => {
  return `❌ *I couldn't understand that.*
Please provide a clear task description or use /help for guidance.`;
};

const formatNetworkErrorMessage = () => {
  return `❌ *Connection issue occurred.*
Please try again in a moment.`;
};

const createTaskSummaryKeyboard = () => {
  return createInlineKeyboard([
    [
      { text: '✅ Create Task', callback_data: 'task_confirm_create' },
      { text: '✏️ Edit Details', callback_data: 'task_edit' }
    ],
    [
      { text: '❌ Cancel', callback_data: 'task_cancel' }
    ]
  ]);
};

const createDeadlineKeyboard = () => {
  return createInlineKeyboard([
    [
      { text: '📅 Today', callback_data: 'deadline_today' },
      { text: '📅 Tomorrow', callback_data: 'deadline_tomorrow' }
    ],
    [
      { text: '📅 This Week', callback_data: 'deadline_week' },
      { text: '📅 Custom', callback_data: 'deadline_custom' }
    ]
  ]);
};

const createEditKeyboard = () => {
  return createInlineKeyboard([
    [
      { text: '✏️ Edit Title', callback_data: 'edit_title' },
      { text: '🎯 Edit Goal', callback_data: 'edit_goal' }
    ],
    [
      { text: '📏 Edit Metric', callback_data: 'edit_metric' },
      { text: '📅 Edit Deadline', callback_data: 'edit_deadline' }
    ],
    [
      { text: '✅ Save Changes', callback_data: 'task_confirm_create' },
      { text: '❌ Cancel', callback_data: 'task_cancel' }
    ]
  ]);
};

const createInputMethodKeyboard = () => {
  return createInlineKeyboard([
    [
      { text: '📝 Type Description', callback_data: 'task_input_text' },
      { text: '🎤 Voice Note', callback_data: 'task_input_voice' }
    ],
    [
      { text: '❌ Cancel', callback_data: 'task_cancel' }
    ]
  ]);
};

module.exports = {
  formatTaskSummary,
  formatSuccessMessage,
  formatValidationError,
  formatDate,
  formatMissingGoalMessage,
  formatMissingDeadlineMessage,
  formatMissingMetricMessage,
  formatUnclearDescriptionMessage,
  formatCustomDeadlinePrompt,
  formatEditTaskPrompt,
  formatVoiceNoteReceived,
  formatInvalidInputMessage,
  formatNetworkErrorMessage,
  createTaskSummaryKeyboard,
  createDeadlineKeyboard,
  createEditKeyboard,
  createInputMethodKeyboard
}; 