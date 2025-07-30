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
      { text: "🔄 In Progress", callback_data: `task_status_progress_${shortId}` }
    ],
    [
      { text: "👀 Review", callback_data: `task_status_review_${shortId}` },
      { text: "✔️ Done", callback_data: `task_status_done_${shortId}` }
    ],
    [
      { text: "🚧 Blocked", callback_data: `task_blocked_${shortId}` },
      { text: "💬 Comment", callback_data: `task_comment_${shortId}` }
    ]
  ];
  
  // Disable current status button by changing style
  actionButtons.forEach(row => {
    row.forEach(button => {
      const status = button.callback_data.split('_')[2];
      if (status === currentStatus || (status === 'progress' && currentStatus === 'in_progress')) {
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

// Format status update confirmation
const formatStatusUpdate = (task, oldStatus, newStatus, statusMessage) => {
  const urgencyIcon = getUrgencyIcon(task.deadline);
  const priorityIcon = getPriorityIcon(task.priority);
  
  return `✅ Status Updated!

📋 *${task.title}*
📊 Status: ${oldStatus} → ${newStatus}
📅 ${formatDeadline(task.deadline)} | ${priorityIcon} ${task.priority}

${statusMessage}`;
};

module.exports = {
  formatTaskCard,
  formatTaskList,
  createTaskActionKeyboard,
  createFilterKeyboard,
  createPaginationKeyboard,
  formatStatusUpdate,
  getUrgencyIcon,
  getPriorityIcon,
  getStatusIcon,
  formatDeadline
}; 