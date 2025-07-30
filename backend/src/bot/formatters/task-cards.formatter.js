// Visual helper functions
const getUrgencyIcon = (deadline) => {
  const now = new Date();
  const due = new Date(deadline);
  
  if (due < now) return '🔥'; // Overdue
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  if (due >= today && due < tomorrow) return '⚠️'; // Today
  if (due >= tomorrow && due < new Date(tomorrow.getTime() + 24*60*60*1000)) return '📅'; // Tomorrow
  return '🗓️'; // Future
};

const getPriorityIcon = (priority) => {
  switch (priority) {
    case 'critical': return '🚨';
    case 'high': return '⚡';
    case 'medium': return '📌';
    case 'low': return '📋';
    default: return '📋';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'pending': return '⏳';
    case 'ready': return '✅';
    case 'in_progress': return '🔄';
    case 'review': return '👀';
    case 'done': return '✔️';
    case 'blocked': return '🚧';
    default: return '📋';
  }
};

const formatDeadline = (deadline) => {
  const due = new Date(deadline);
  const now = new Date();
  
  // Check if overdue
  if (due < now) {
    const diffTime = Math.abs(now - due);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }
  
  // Check if today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  if (due >= today && due < tomorrow) {
    return `Today ${due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  
  // Check if tomorrow
  if (due >= tomorrow && due < new Date(tomorrow.getTime() + 24*60*60*1000)) {
    return `Tomorrow ${due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  
  // Future date
  return due.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Main formatting functions
const formatTaskCard = (task, showDetails = true) => {
  const urgencyIcon = getUrgencyIcon(task.deadline);
  const priorityIcon = getPriorityIcon(task.priority);
  const statusIcon = getStatusIcon(task.status);
  const assigneeName = task.assignedTo?.username 
    ? `@${task.assignedTo.username}` 
    : task.assignedTo?.firstName || 'Unassigned';
  
  if (!showDetails) {
    // Compact format for lists
    return `📋 *${task.title}*
👤 ${assigneeName} | Due: ${formatDeadline(task.deadline)} ${urgencyIcon}
📊 ${statusIcon} ${task.status} | ${priorityIcon} ${task.priority}`;
  }
  
  // Full format for single card
  return `📋 *${task.title}*

👤 Assigned: ${assigneeName}
📅 Due: ${formatDeadline(task.deadline)} ${urgencyIcon}
🎯 Success: ${task.successMetric}
📊 Status: ${statusIcon} ${task.status}
⚡ Priority: ${priorityIcon} ${task.priority}

🆔 Task #${task._id.toString().slice(-6)} | Created ${task.getTimeAgo()}`;
};

const formatTaskList = (tasks, filter, pagination) => {
  const filterNames = {
    'overdue': 'OVERDUE TASKS',
    'today': 'TODAY\'S TASKS',
    'tomorrow': 'TOMORROW\'S TASKS', 
    'week': 'THIS WEEK\'S TASKS',
    'all': 'ALL TASKS',
    'assigned': 'MY ASSIGNED TASKS'
  };
  
  const filterIcons = {
    'overdue': '🔥',
    'today': '📅',
    'tomorrow': '📅',
    'week': '📅',
    'all': '📋',
    'assigned': '👤'
  };
  
  const filterName = filterNames[filter] || 'TASKS';
  const filterIcon = filterIcons[filter] || '📋';
  
  let header = `${filterIcon} ${filterName} (${pagination.totalTasks})`;
  if (pagination.totalPages > 1) {
    header += `\n\nPage ${pagination.currentPage} of ${pagination.totalPages}`;
  }
  
  if (tasks.length === 0) {
    return `${header}\n\n📭 No tasks found for this filter.`;
  }
  
  const taskList = tasks.map((task, index) => {
    const urgencyIcon = getUrgencyIcon(task.deadline);
    const statusIcon = getStatusIcon(task.status);
    const priorityIcon = getPriorityIcon(task.priority);
    const assigneeName = task.assignedTo?.username 
      ? `@${task.assignedTo.username}` 
      : task.assignedTo?.firstName || 'Unassigned';
    
    return `📋 *${task.title}*
👤 ${assigneeName} | Due: ${formatDeadline(task.deadline)} ${urgencyIcon}
📊 ${statusIcon} ${task.status} | ${priorityIcon} ${task.priority}`;
  }).join('\n\n');
  
  let footer = '';
  if (pagination.totalPages > 1) {
    footer = `\n━━━━━━━━━━━━━━━━━━━━━━━━\nPage ${pagination.currentPage} of ${pagination.totalPages} | ${tasks.length} tasks shown`;
  }
  
  return `${header}\n\n${taskList}${footer}`;
};

const createTaskActionKeyboard = (taskId, currentStatus) => {
  const shortId = taskId.toString().slice(-6);
  
  // Base action buttons available for all statuses
  const actionButtons = [
    [
      { text: "✅ Ready", callback_data: `task_status_ready_${shortId}` },
      { text: "🔄 In Progress", callback_data: `task_status_in_progress_${shortId}` }
    ],
    [
      { text: "👀 Review", callback_data: `task_status_review_${shortId}` },
      { text: "✔️ Done", callback_data: `task_status_done_${shortId}` }
    ],
    [
      { text: "🚧 Blocked", callback_data: `blocker_add_${shortId}` },
      { text: "📊 History", callback_data: `status_history_${shortId}` }
    ]
  ];
  
  // Disable current status button by changing style
  actionButtons.forEach(row => {
    row.forEach(button => {
      const status = button.callback_data.split('_')[2];
      if (status === currentStatus || (status === 'in' && currentStatus === 'in_progress')) {
        button.text = `● ${button.text}`; // Mark current status
      }
    });
  });
  
  // Add navigation and additional actions
  actionButtons.push([
    { text: "✏️ Edit", callback_data: `task_edit_${shortId}` },
    { text: "🔄 Reassign", callback_data: `task_reassign_${shortId}` }
  ]);
  
  actionButtons.push([
    { text: "⬅️ Back to Filters", callback_data: "cards_back_filters" },
    { text: "🔄 Refresh", callback_data: "cards_refresh" }
  ]);
  
  return { inline_keyboard: actionButtons };
};

const createFilterKeyboard = (taskSummary) => {
  return {
    inline_keyboard: [
      [
        { text: `🔥 Overdue (${taskSummary.overdue})`, callback_data: "cards_filter_overdue" },
        { text: `📅 Today (${taskSummary.today})`, callback_data: "cards_filter_today" }
      ],
      [
        { text: `📅 Tomorrow (${taskSummary.tomorrow})`, callback_data: "cards_filter_tomorrow" },
        { text: `📅 This Week (${taskSummary.week})`, callback_data: "cards_filter_week" }
      ],
      [
        { text: `📋 All Tasks (${taskSummary.total})`, callback_data: "cards_filter_all" },
        { text: "👤 My Tasks", callback_data: "cards_filter_assigned" }
      ]
    ]
  };
};

const createPaginationKeyboard = (filter, currentPage, totalPages) => {
  const buttons = [];
  
  if (currentPage > 1) {
    buttons.push({ text: "⬅️ Previous", callback_data: `cards_page_prev_${filter}` });
  }
  
  buttons.push({ text: "🏠 Filters", callback_data: "cards_back_filters" });
  
  if (currentPage < totalPages) {
    buttons.push({ text: "➡️ Next", callback_data: `cards_page_next_${filter}` });
  }
  
  return { inline_keyboard: [buttons] };
};

// Enhanced status update formatter  
const formatStatusUpdate = (task, oldStatus, newStatus, changedBy) => {
  const timestamp = new Date().toLocaleString();
  const statusIcon = getStatusIcon(newStatus);
  
  let message = `✅ Status Updated Successfully!\n\n`;
  message += `📋 ${task.title}\n`;
  message += `📊 Status: ${oldStatus} → ${newStatus}\n`;
  message += `👤 Changed by: @${changedBy.username || 'Unknown'}\n`;
  message += `⏰ ${timestamp}\n\n`;
  message += getStatusSpecificMessage(newStatus, task);

  return message;
};

// Status-specific messages
const getStatusSpecificMessage = (status, task) => {
  switch (status) {
    case 'ready':
      return '🚀 Task is now ready for work to begin.';
    case 'in_progress':
      return '💪 Task is now in active development.\nTimer started for progress tracking.';
    case 'review':
      return '✨ Work completed and ready for review.\nReview requested from task creator.';
    case 'done':
      const duration = task.completedAt && task.startedAt 
        ? formatDuration(new Date(task.completedAt) - new Date(task.startedAt))
        : 'Unknown';
      return `🎉 Task successfully completed!\nTotal time: ${duration}`;
    case 'blocked':
      return '⚠️ Task cannot proceed due to blockers.\nPlease add blocker details for resolution.';
    default:
      return '';
  }
};

// Status history formatter
const formatStatusHistory = (task) => {
  const shortId = task._id.toString().slice(-6);
  const createdDate = new Date(task.createdAt).toLocaleDateString();
  
  let message = `📊 Status History - ${task.title}\n\n`;
  message += `📋 Task #${shortId}\n`;
  message += `👤 Created by: @${task.createdBy?.username || 'Unknown'}\n`;
  message += `📅 Created: ${createdDate}\n\n`;
  message += `📊 Status Changes:`;

  if (!task.statusHistory || task.statusHistory.length === 0) {
    message += '\n📝 No status changes yet.\n\n';
    message += `Current status: ${getStatusIcon(task.status)} ${task.status}`;
    const currentDuration = new Date() - new Date(task.createdAt);
    message += `\nDuration: ${formatDuration(currentDuration)}`;
    return message;
  }

  // Format each status change
  task.statusHistory.forEach((change, index) => {
    const duration = formatDuration(change.duration || 0);
    const timestamp = new Date(change.changedAt).toLocaleString();
    
    message += `\n• ${change.fromStatus} → ${change.toStatus}`;
    message += `\n  👤 @${change.changedBy?.username || 'Unknown'} at ${timestamp}`;
    if (change.duration) {
      message += `\n  ⏱️ Duration: ${duration}`;
    }
    if (change.reason) {
      message += `\n  📝 ${change.reason}`;
    }
    message += '\n';
  });

  // Add summary
  const totalDuration = calculateTotalDuration(task.statusHistory);
  message += `\n📈 Summary:`;
  message += `\n⏱️ Total Duration: ${formatDuration(totalDuration)}`;
  message += `\n🔄 Status Changes: ${task.statusHistory.length}`;
  
  return message;
};

// Progress indicator formatter
const formatProgressIndicator = (status) => {
  const statusFlow = ['pending', 'ready', 'in_progress', 'review', 'done'];
  const currentIndex = statusFlow.indexOf(status);
  
  if (currentIndex === -1) return '🚧 Blocked'; // Handle blocked status
  
  const progress = Math.round((currentIndex / (statusFlow.length - 1)) * 100);
  const progressBar = '█'.repeat(Math.floor(progress / 10)) + 
                     '░'.repeat(10 - Math.floor(progress / 10));
  
  return `📊 Progress: ${progress}% [${progressBar}]`;
};

// Enhanced duration formatter
const formatDuration = (milliseconds) => {
  if (!milliseconds || milliseconds <= 0) return '0m';
  
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
};

// Calculate total duration from status history
const calculateTotalDuration = (statusHistory) => {
  return statusHistory.reduce((total, change) => {
    return total + (change.duration || 0);
  }, 0);
};

module.exports = {
  formatTaskCard,
  formatTaskList,
  createTaskActionKeyboard,
  createFilterKeyboard,
  createPaginationKeyboard,
  formatStatusUpdate, // Enhanced function
  formatStatusHistory, // New function
  formatProgressIndicator, // New function
  formatDuration, // Enhanced function
  getStatusSpecificMessage, // New function
  getUrgencyIcon,
  getPriorityIcon,
  getStatusIcon,
  formatDeadline
}; 