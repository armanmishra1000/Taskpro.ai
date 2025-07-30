const formatBlockerForm = (step, task, formData = {}) => {
  const taskInfo = `📋 *${task.title}*\n👤 Assigned: ${task.assignedTo?.name || 'Unassigned'}`;
  
  switch (step) {
    case 'main':
      return `🚧 *Report Task Blocker*\n\n${taskInfo}\n\nThis task is blocked and needs management attention.\nPlease provide complete information for proper escalation:`;
      
    case 'impact':
      return `📊 *Impact Assessment*\n\n${taskInfo}\n\nHow is this blocker affecting task progress?\n\nChoose the severity level:`;
      
    case 'attempts':
      return `🔄 *What Have You Tried?*\n\n${taskInfo}\n\nPlease describe your attempts to resolve this blocker:\n\nInclude:\n• Specific actions taken\n• Resources consulted\n• People contacted\n• Time spent trying\n\n_(Minimum 20 characters required)_`;
      
    case 'logs':
      return `📋 *Provide Evidence*\n\n${taskInfo}\n\nPlease share proof of your attempts:\n\nExamples:\n• Error messages or screenshots\n• Documentation links checked\n• Email threads or chat logs\n• Code snippets tried\n\n_(Minimum 10 characters required)_`;
      
    default:
      return 'Unknown step';
  }
};

const formatValidationError = (missingFields) => {
  const fieldList = missingFields.map(f => `• ${f} ❌`).join('\n');
  return `❌ *Incomplete Blocker Report*\n\nMissing required information:\n${fieldList}\n\nAll sections must be completed for manager escalation.`;
};

const formatBlockerSuccess = (blocker, task, manager) => {
  const managerInfo = manager ? 
    `\n🔔 Manager ${manager.name} has been notified` : 
    '\n⚠️ No manager found - manual review required';
    
  return `✅ *Blocker Reported Successfully!*\n\n` +
    `📋 Task: ${task.title}\n` +
    `👤 Reporter: ${blocker.reportedBy?.name || 'Unknown'}\n` +
    `📊 Impact: ${blocker.impact.toUpperCase()}\n` +
    `🔄 Attempts: Documented\n` +
    `📋 Evidence: Provided\n` +
    `⏰ Reported: ${blocker.reportedAt.toLocaleString()}\n` +
    `${managerInfo}\n` +
    `📈 Task status updated to: 🚧 Blocked\n\n` +
    `Your manager will review and respond soon.`;
};

const formatManagerNotification = (blocker, task, reporter) => {
  return `🚨 *Task Blocker Escalation*\n\n` +
    `📋 Task: ${task.title}\n` +
    `👤 Blocked by: ${reporter.name || reporter.username}\n` +
    `📊 Impact: ${blocker.impact.toUpperCase()}\n` +
    `⏰ Reported: ${blocker.reportedAt.toLocaleString()}\n\n` +
    `📄 *Details:*\n` +
    `*Attempts:* ${blocker.attempts}\n\n` +
    `*Evidence:* ${blocker.logs}\n\n` +
    `Choose action:`;
};

const createBlockerKeyboard = (taskId, step) => {
  switch (step) {
    case 'main':
      return {
        inline_keyboard: [
          [{ text: "📊 Impact Assessment", callback_data: `blocker_impact_${taskId}` }],
          [{ text: "❌ Cancel", callback_data: `blocker_cancel_${taskId}` }]
        ]
      };
      
    case 'impact':
      return {
        inline_keyboard: [
          [{ text: "🔴 Critical - Stops all progress", callback_data: `impact_critical_${taskId}` }],
          [{ text: "🟡 High - Delays completion", callback_data: `impact_high_${taskId}` }],
          [{ text: "🟢 Medium - Slows progress", callback_data: `impact_medium_${taskId}` }],
          [{ text: "⬅️ Back", callback_data: `blocker_report_${taskId}` }]
        ]
      };
      
    default:
      return { inline_keyboard: [] };
  }
};

const createManagerActionKeyboard = (blockerId) => {
  return {
    inline_keyboard: [
      [
        { text: "✅ Accept & Resolve", callback_data: `manager_resolve_${blockerId}` },
        { text: "⬆️ Escalate Further", callback_data: `manager_escalate_${blockerId}` }
      ],
      [
        { text: "📝 Request More Info", callback_data: `manager_info_${blockerId}` },
        { text: "🔍 Review Task", callback_data: `manager_review_${blockerId}` }
      ]
    ]
  };
};

const formatBlockerStatus = (blocker) => {
  const statusEmojis = {
    active: '🔴',
    escalated: '🟡', 
    resolved: '✅'
  };
  
  const impactEmojis = {
    critical: '🔴',
    high: '🟡',
    medium: '🟢'
  };
  
  return `${statusEmojis[blocker.status]} *${blocker.status.toUpperCase()}* | ` +
    `${impactEmojis[blocker.impact]} ${blocker.impact} impact | ` +
    `📅 ${blocker.reportedAt.toLocaleDateString()}`;
};

const formatBlockerHistory = (blockers) => {
  if (!blockers || blockers.length === 0) {
    return '📝 No blockers reported for this task.';
  }
  
  const history = blockers.map((blocker, index) => {
    const status = formatBlockerStatus(blocker);
    const attempts = blocker.attempts.substring(0, 100) + (blocker.attempts.length > 100 ? '...' : '');
    
    return `*${index + 1}.* ${status}\n_Attempts:_ ${attempts}`;
  }).join('\n\n');
  
  return `📋 *Blocker History*\n\n${history}`;
};

module.exports = {
  formatBlockerForm,
  formatValidationError,
  formatBlockerSuccess,
  formatManagerNotification,
  createBlockerKeyboard,
  createManagerActionKeyboard,
  formatBlockerStatus,
  formatBlockerHistory
}; 