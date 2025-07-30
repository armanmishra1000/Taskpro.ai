const { createInlineKeyboard } = require('../../utils/keyboard');

// Format list of tasks for selection
const formatTaskSelectionList = (tasks) => {
  if (!tasks || tasks.length === 0) {
    return '✅ All Tasks Assigned\n\nGreat news! All your tasks are already assigned to team members.\n\nCreate a new task with /newtask or check task status with /mytasks.';
  }
  
  let message = '👤 Task Assignment\n\nChoose a task to assign:\n\n';
  
  tasks.forEach(task => {
    const taskId = task._id.toString().slice(-4);
    const status = task.status.charAt(0).toUpperCase() + task.status.slice(1);
    const timeAgo = getTimeAgo(task.createdAt);
    
    message += `📋 Task #${taskId}: ${task.title}\n`;
    message += `   Status: ${status} | Created: ${timeAgo}\n\n`;
  });
  
  return message.trim();
};

// Create keyboard for task selection
const createTaskSelectionKeyboard = (tasks) => {
  const buttons = tasks.map(task => [{
    text: `📋 #${task._id.toString().slice(-4)}: ${task.title.substring(0, 25)}...`,
    callback_data: `assign_task_${task._id}`
  }]);
  
  // Add utility buttons
  buttons.push([
    { text: '🔍 Search Task by ID', callback_data: 'assign_search' },
    { text: '❌ Cancel', callback_data: 'assign_cancel' }
  ]);
  
  return createInlineKeyboard(buttons);
};

// Format member selection message
const formatMemberSelectionMessage = (task) => {
  const taskId = task._id.toString().slice(-4);
  const deadline = task.deadline ? `📅 Deadline: ${formatDate(task.deadline)}` : '';
  
  return `👤 Select Team Member

Assigning: Task #${taskId} - ${task.title}
${deadline}

Choose who should work on this task:

👨‍💻 Available Members:`;
};

// Create keyboard for member selection
const createMemberSelectionKeyboard = (members, taskId) => {
  const buttons = members.map(member => {
    const roleIcon = getRoleIcon(member.role);
    return [{
      text: `${roleIcon} @${member.username} (${member.role})`,
      callback_data: `assign_to_${member.username}_${taskId}`
    }];
  });
  
  // Add navigation buttons
  buttons.push([
    { text: '🔙 Back', callback_data: 'assign_back' },
    { text: '❌ Cancel', callback_data: 'assign_cancel' }
  ]);
  
  return createInlineKeyboard(buttons);
};

// Format assignment confirmation
const formatAssignmentConfirmation = (task, assignee) => {
  const taskId = task._id.toString().slice(-4);
  const deadline = task.deadline ? formatDate(task.deadline) : 'Not set';
  const roleIcon = getRoleIcon(assignee.role);
  
  return `🤔 Confirm Assignment

📋 Task: ${task.title}
👤 Assign to: ${roleIcon} @${assignee.username} (${assignee.role})
📅 Deadline: ${deadline}
🎯 Success: ${task.successMetric || 'Not specified'}

This will notify @${assignee.username} immediately.`;
};

// Format successful assignment message
const formatAssignmentSuccess = (task, assignee) => {
  const taskId = task._id.toString().slice(-4);
  const deadline = task.deadline ? formatDate(task.deadline) : 'Not set';
  const roleIcon = getRoleIcon(assignee.role);
  
  return `✅ Task Assigned Successfully!

📋 ${task.title}
👤 Assigned to: ${roleIcon} @${assignee.username}
📅 Deadline: ${deadline}
🎯 Success metric: ${task.successMetric || 'Not specified'}

Task ID: #${taskId}

✉️ Notification sent to @${assignee.username}
📢 Task card posted to team channel`;
};

// Format notification message for assignee
const formatAssignmentNotification = (task, assigner) => {
  const taskId = task._id.toString().slice(-4);
  const deadline = task.deadline ? formatDate(task.deadline) : 'Not set';
  
  return `📬 New Task Assigned to You

📋 ${task.title}
👤 Assigned by: @${assigner.username || 'Team Admin'}
📅 Due: ${deadline}
🎯 Goal: ${task.goal || 'Not specified'}
📝 Description: ${task.description || 'No description provided'}

Task ID: #${taskId}

Reply with:
• /accept_${taskId.slice(-4)} to accept task
• /mytasks to view all your tasks
• /task_${taskId.slice(-4)} to see full details`;
};

// Format task card for channel posting
const formatTaskCard = (task, assignee) => {
  const taskId = task._id.toString().slice(-4);
  const deadline = task.deadline ? formatDate(task.deadline) : 'Not set';
  const roleIcon = getRoleIcon(assignee.role);
  
  return `📋 New Task Assignment

**${task.title}** (#${taskId})
👤 Assigned to: ${roleIcon} @${assignee.username}
👤 By: @${task.createdBy?.username || 'Team Admin'}
📅 Due: ${deadline}
🎯 Success: ${task.successMetric || 'Not specified'}

🔗 View details: /task_${taskId.slice(-4)}`;
};

// Format error messages
const formatErrorMessage = (errorType, context = {}) => {
  const errorMessages = {
    'task_not_found': '❌ Task Not Found\n\nTask #' + (context.taskId || 'unknown') + ' doesn\'t exist or has been deleted.\n\nUse /assign to see available tasks.',
    
    'permission_denied': '❌ Permission Denied\n\nYou don\'t have permission to assign tasks in this team.\n\nContact your team admin for access.',
    
    'member_not_found': '❌ Team Member Not Found\n\n@' + (context.username || 'user') + ' is not a member of your team.\n\nUse /team list to see current members.',
    
    'already_assigned': '⚠️ Task Already Assigned\n\nTask #' + (context.taskId || 'unknown') + ' is currently assigned to @' + (context.currentAssignee || 'someone') + '.\n\nChoose an option:\n• Reassign to someone else\n• Leave current assignment\n• Cancel',
    
    'invalid_status': '❌ Cannot Assign Task\n\nTask #' + (context.taskId || 'unknown') + ' is already completed and cannot be reassigned.\n\nOnly pending or ready tasks can be assigned.',
    
    'no_team_members': '❌ No Team Members\n\nYour team has no active members to assign tasks to.\n\nUse /team add to add team members first.'
  };
  
  return errorMessages[errorType] || '❌ Something went wrong. Please try again.';
};

// Helper functions
const getTimeAgo = (date) => {
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Less than 1 hour ago';
};

const getRoleIcon = (role) => {
  const icons = {
    'admin': '👨‍💼',
    'manager': '👨‍💻',
    'member': '👤'
  };
  return icons[role] || '👤';
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

module.exports = {
  formatTaskSelectionList,
  createTaskSelectionKeyboard,
  formatMemberSelectionMessage,
  createMemberSelectionKeyboard,
  formatAssignmentConfirmation,
  formatAssignmentSuccess,
  formatAssignmentNotification,
  formatTaskCard,
  formatErrorMessage,
  
  // Export helper functions for testing
  getTimeAgo,
  getRoleIcon,
  formatDate
}; 