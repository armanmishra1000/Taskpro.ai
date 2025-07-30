const formatStandupConfig = (team) => {
  const config = team.standupConfig || {};
  const status = config.enabled ? '🟢 Enabled' : '⚪ Disabled';
  const schedule = config.scheduleTime || 'Not set';
  const timezone = config.timezone || 'UTC';
  const participantCount = config.participants?.length || 0;
  const totalMembers = team.members?.length || 0;
  const channel = config.channelId ? 'Configured' : 'Not set';

  return `🌅 Daily Standup Automation

Team: ${team.name}
Current Status: ${status}

Configure your team's daily standup meeting:

📋 Schedule: ${schedule} ${timezone}
👥 Participants: ${participantCount}/${totalMembers} members
📺 Channel: ${channel}`;
};

const createStandupConfigKeyboard = (teamId) => {
  return {
    inline_keyboard: [
      [{ text: "⚙️ Configure Schedule", callback_data: `standup_configure_schedule_${teamId}` }],
      [{ text: "👥 Set Participants", callback_data: `standup_configure_participants_${teamId}` }],
      [{ text: "📺 Set Channel", callback_data: `standup_configure_channel_${teamId}` }],
      [{ text: "🟢 Enable Automation", callback_data: `standup_enable_${teamId}` }],
      [{ text: "🔴 Disable Automation", callback_data: `standup_disable_${teamId}` }],
      [{ text: "📊 View History", callback_data: `standup_history_${teamId}` }]
    ]
  };
};

const createScheduleKeyboard = (teamId) => {
  return {
    inline_keyboard: [
      [{ text: "08:30 AM", callback_data: `standup_schedule_0830_${teamId}` }],
      [{ text: "09:00 AM", callback_data: `standup_schedule_0900_${teamId}` }],
      [{ text: "09:30 AM", callback_data: `standup_schedule_0930_${teamId}` }],
      [{ text: "10:00 AM", callback_data: `standup_schedule_1000_${teamId}` }],
      [{ text: "✏️ Custom Time", callback_data: `standup_schedule_custom_${teamId}` }],
      [{ text: "🔙 Back", callback_data: `standup_back_config_${teamId}` }]
    ]
  };
};

const createTimezoneKeyboard = (teamId) => {
  return {
    inline_keyboard: [
      [{ text: "UTC", callback_data: `standup_timezone_UTC_${teamId}` }],
      [{ text: "America/New_York", callback_data: `standup_timezone_America/New_York_${teamId}` }],
      [{ text: "America/Chicago", callback_data: `standup_timezone_America/Chicago_${teamId}` }],
      [{ text: "America/Denver", callback_data: `standup_timezone_America/Denver_${teamId}` }],
      [{ text: "America/Los_Angeles", callback_data: `standup_timezone_America/Los_Angeles_${teamId}` }],
      [{ text: "Europe/London", callback_data: `standup_timezone_Europe/London_${teamId}` }],
      [{ text: "Europe/Paris", callback_data: `standup_timezone_Europe/Paris_${teamId}` }],
      [{ text: "🔙 Back", callback_data: `standup_back_config_${teamId}` }]
    ]
  };
};

const createParticipantsKeyboard = (members, selectedParticipants, teamId) => {
  const buttons = members.map(member => {
    const isSelected = selectedParticipants?.includes(member.userId.toString());
    const icon = isSelected ? '✅' : '⚪';
    return [{
      text: `${icon} @${member.username} (${member.role})`,
      callback_data: `standup_participant_${member.userId}_${teamId}`
    }];
  });

  buttons.push([
    { text: "✅ Select All", callback_data: `standup_participants_all_${teamId}` },
    { text: "❌ Clear All", callback_data: `standup_participants_none_${teamId}` }
  ]);
  
  buttons.push([{ text: "🔙 Back", callback_data: `standup_back_config_${teamId}` }]);

  return { inline_keyboard: buttons };
};

const formatScheduleConfig = (currentTime, timezone) => {
  return `⏰ Standup Schedule

Current: ${currentTime || 'Not set'} ${timezone}

Set your team's daily standup time:

Choose from common times or set a custom time.`;
};

const formatParticipantsConfig = (members, selectedParticipants) => {
  const selectedCount = selectedParticipants?.length || 0;
  const totalCount = members?.length || 0;

  return `👥 Standup Participants

Select team members for daily standup:

Current participants: ${selectedCount}/${totalCount}

Click on members to select/deselect them for daily standup participation.`;
};

const formatChannelConfig = (channelId) => {
  const channelStatus = channelId ? 'Configured' : 'Not set';
  
  return `📺 Channel Configuration

Where should summaries be posted?

Current: ${channelStatus}

Send me the channel where summaries should be posted, or use the button below to configure.`;
};

const formatStandupEnabled = (team, config) => {
  return `✅ Standup Automation Enabled!

Team: ${team.name}
Schedule: ${config.scheduleTime} ${config.timezone}
Participants: ${config.participants?.length || 0} members
Channel: Configured

First standup: ${config.scheduleTime} ${config.timezone} tomorrow

Team members will be notified about the new schedule.`;
};

const formatStandupDisabled = (team) => {
  return `⚪ Daily Standup Automation Disabled

Team: ${team.name}

Daily standup automation has been disabled.

Use /standup to reconfigure and enable again.`;
};



const formatPermissionError = () => {
  return `❌ Only team managers and admins can configure standup automation.

Contact your team manager for access.`;
};

const formatNoTeamError = () => {
  return `❌ You must be part of a team to use standup features.

Join a team with /team first.`;
};

const formatValidationError = (field, message) => {
  return `❌ Invalid ${field}

${message}

Please check your input and try again.`;
};

// Question and response formatters
const formatStandupQuestion = (questionNumber, memberName, questionText) => {
  const questionIcons = {
    1: '📅',
    2: '🎯', 
    3: '🚧'
  };
  
  const questionLabels = {
    1: 'What did you accomplish yesterday?',
    2: 'What will you work on today?',
    3: 'Any blockers or help needed?'
  };
  
  const icon = questionIcons[questionNumber];
  const label = questionLabels[questionNumber];
  
  if (questionNumber === 1) {
    return `🌅 Daily Standup Time!

Hi ${memberName}! Time for your daily standup.

${icon} Question ${questionNumber}/3: ${label}

Choose quick response or provide custom answer:`;
  }
  
  return `${icon} Question ${questionNumber}/3: ${label}

Hi ${memberName}, ${questionText}

Choose your main focus or describe your plans:`;
};

const createQuestionKeyboard = (questionNumber, userId, teamId) => {
  const quickResponses = {
    1: [ // Yesterday accomplishments
      { text: '✅ Completed tasks', callback_data: `standup_q1_completed_${userId}_${teamId}` },
      { text: '🔄 In progress', callback_data: `standup_q1_progress_${userId}_${teamId}` },
      { text: '🚧 Blocked', callback_data: `standup_q1_blocked_${userId}_${teamId}` },
      { text: '✏️ Custom Answer', callback_data: `standup_q1_custom_${userId}_${teamId}` }
    ],
    2: [ // Today's focus
      { text: '🎯 Continue current tasks', callback_data: `standup_q2_continue_${userId}_${teamId}` },
      { text: '🆕 Start new task', callback_data: `standup_q2_new_${userId}_${teamId}` },
      { text: '🔍 Review/Planning', callback_data: `standup_q2_review_${userId}_${teamId}` },
      { text: '✏️ Custom Answer', callback_data: `standup_q2_custom_${userId}_${teamId}` }
    ],
    3: [ // Blockers
      { text: '✅ No blockers', callback_data: `standup_q3_clear_${userId}_${teamId}` },
      { text: '🚧 Have blockers', callback_data: `standup_q3_blocked_${userId}_${teamId}` },
      { text: '🙋 Need help', callback_data: `standup_q3_help_${userId}_${teamId}` },
      { text: '✏️ Custom Answer', callback_data: `standup_q3_custom_${userId}_${teamId}` }
    ]
  };
  
  return {
    inline_keyboard: quickResponses[questionNumber].map(response => [response])
  };
};

const formatCustomResponsePrompt = (questionNumber, questionText) => {
  const questionLabels = {
    1: 'What did you accomplish yesterday?',
    2: 'What will you work on today?',
    3: 'Any blockers or help needed?'
  };
  
  return `✏️ Custom Response

Please type your answer to:
"${questionLabels[questionNumber]}"

Your response will be included in today's team summary.`;
};

const formatResponseConfirmation = (memberName, responses, timestamp) => {
  return `✅ Standup Complete!

Thanks ${memberName}! Your responses:

📅 Yesterday: ${responses.yesterday}
🎯 Today: ${responses.today}
🚧 Blockers: ${responses.blockers}

Submitted at: ${timestamp}
Team summary will be generated once everyone responds.`;
};

const createResponseEditKeyboard = (userId, teamId) => {
  return {
    inline_keyboard: [
      [{ text: '✏️ Edit Responses', callback_data: `standup_edit_${userId}_${teamId}` }],
      [{ text: '👀 View Team Status', callback_data: `standup_team_status_${teamId}` }]
    ]
  };
};

// Summary formatters
const formatTeamSummary = (summary) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const accomplishments = summary.accomplishments
    .map(a => `• ${a.member}: ${a.text}`)
    .join('\n');
    
  const todayFocus = summary.todayFocus
    .map(f => `• ${f.member}: ${f.text}`)
    .join('\n');
    
  const blockers = summary.blockers.length > 0 
    ? summary.blockers.map(b => `• ${b.member}: ${b.text}`).join('\n')
    : '• No blockers reported';
  
  const nonRespondents = summary.nonRespondents > 0 
    ? `\n\n💤 Non-respondents: ${summary.nonRespondents} members`
    : '';
  
  return `🌅 *Daily Standup Summary* - ${formatDate(summary.date)}
👥 Team: ${summary.team}

📊 Participation: ${summary.participation.responded}/${summary.participation.total} (${summary.participation.percentage}%)

📅 *YESTERDAY'S ACCOMPLISHMENTS:*
${accomplishments}

🎯 *TODAY'S FOCUS:*
${todayFocus}

🚧 *BLOCKERS & HELP NEEDED:*
${blockers}${nonRespondents}

⏰ Generated at: ${new Date().toLocaleString()}`;
};

const formatManagerSummaryNotification = (summary, channelName) => {
  return `📊 Standup Summary Generated

Team: ${summary.team}
Date: ${new Date(summary.date).toLocaleDateString()}
Participation: ${summary.participation.responded}/${summary.participation.total}

Summary posted to: ${channelName}

View full summary or make adjustments:`;
};

// Status and history formatters
const formatTeamStatus = (status, date, timeRemaining = null) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const timeRemainingText = timeRemaining 
    ? `\n⏱️ Time remaining: ${timeRemaining}`
    : '';
  
  return `👥 Team Standup Status - ${formatDate(date)}

✅ Completed (${status.submitted}):
• ${status.submitted} members responded

⏳ Pending (${status.pending}):
• ${status.pending} members waiting

❌ Missed (${status.missed}):
• ${status.missed} members missed deadline${timeRemainingText}`;
};

const formatStandupHistory = (teamName, history) => {
  if (!history || history.length === 0) {
    return `📊 Standup History - ${teamName}

No standup history available yet.

Complete your first standup to see history here.`;
  }
  
  const historyItems = history.map(item => 
    `📅 ${new Date(item.date).toLocaleDateString()} - ${item.percentage}% participation`
  ).join('\n');
  
  const averageParticipation = history.length > 0 
    ? Math.round(history.reduce((sum, item) => sum + item.percentage, 0) / history.length)
    : 0;
  
  return `📊 Standup History - ${teamName}

Recent summaries:

${historyItems}

Average participation: ${averageParticipation}%
Total summaries: ${history.length}`;
};

// Reminder formatters
const formatStandupReminder = (memberName, deadline, isFinal = false) => {
  if (isFinal) {
    return `⏰ Final Standup Reminder

Hi ${memberName}! This is your final reminder.

📋 Today's standup expires in 30 minutes.
👥 Your team is waiting for your update.

Please complete your standup now!`;
  }
  
  return `⏰ Standup Reminder

Hi ${memberName}! You haven't completed today's standup yet.

📋 Daily standup takes just 2 minutes.
⏱️ Deadline: ${deadline}

Complete now to help your team stay synchronized!`;
};

const createReminderKeyboard = (userId, teamId) => {
  return {
    inline_keyboard: [
      [{ text: '✅ Complete Standup', callback_data: `standup_start_${userId}_${teamId}` }],
      [{ text: '⏰ Remind Later', callback_data: `standup_remind_later_${userId}_${teamId}` }]
    ]
  };
};

// Error formatters
const formatConfigurationError = (field, details) => {
  const errorMessages = {
    scheduleTime: `❌ Invalid Schedule Time

Please provide time in HH:MM format (24-hour).
Example: 08:30, 09:00, 07:45

Recommended: 07:00 - 10:00`,
    
    channel: `❌ Channel Access Error

Cannot post to the selected channel.

Possible issues:
• Bot not added to channel
• Insufficient permissions
• Invalid channel ID

Please check channel settings and try again.`,
    
    participants: `❌ No Participants Selected

At least one team member must be selected for standup participation.

Please select participants and try again.`
  };
  
  return errorMessages[field] || `❌ Invalid ${field}

${details}

Please check your input and try again.`;
};

const formatResponseError = (errorType, details = {}) => {
  const errorMessages = {
    tooLong: `❌ Response Too Long

Your response exceeds the 500 character limit.
Current length: ${details.currentLength}/500

Please shorten your response and try again.`,
    
    tooShort: `❌ Response Too Short

Your response must be at least 3 characters long.
Current length: ${details.currentLength}/3

Please provide a more detailed response.`,
    
    notFound: `❌ No Standup Found

No active standup found for today.

Please contact your team manager if you believe this is an error.`,
    
    alreadySubmitted: `❌ Already Submitted

You have already completed today's standup.

Use the edit option if you need to update your responses.`
  };
  
  return errorMessages[errorType] || `❌ Response Error

${details.message || 'An error occurred while processing your response.'}

Please try again or contact support.`;
};

// Success formatters
const formatConfigurationSuccess = (team, config) => {
  const nextStandupDate = new Date();
  nextStandupDate.setDate(nextStandupDate.getDate() + 1);
  
  return `✅ Standup Automation Enabled!

Team: ${team.name}
Schedule: ${config.scheduleTime} ${config.timezone}
Participants: ${config.participants?.length || 0} members
Channel: Configured

First standup: ${config.scheduleTime} ${config.timezone} ${nextStandupDate.toLocaleDateString()}

Team members will be notified about the new schedule.`;
};

const formatTestStandupSuccess = (participantCount, teamName) => {
  return `✅ Test Standup Completed!

${participantCount} members received test standup DMs.
Summary generated successfully.

Team: ${teamName}
Ready to enable daily automation!`;
};

// Utility formatters
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (time) => {
  return new Date(time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

module.exports = {
  // Configuration formatters
  formatStandupConfig,
  formatScheduleConfig,
  formatParticipantsConfig,
  formatChannelConfig,
  formatStandupEnabled,
  formatStandupDisabled,
  formatConfigurationSuccess,
  formatTestStandupSuccess,
  
  // Question and response formatters
  formatStandupQuestion,
  formatCustomResponsePrompt,
  formatResponseConfirmation,
  
  // Summary formatters
  formatTeamSummary,
  formatManagerSummaryNotification,
  
  // Status and history formatters
  formatTeamStatus,
  formatStandupHistory,
  
  // Reminder formatters
  formatStandupReminder,
  
  // Error formatters
  formatPermissionError,
  formatNoTeamError,
  formatValidationError,
  formatConfigurationError,
  formatResponseError,
  
  // Keyboard creators
  createStandupConfigKeyboard,
  createScheduleKeyboard,
  createTimezoneKeyboard,
  createParticipantsKeyboard,
  createQuestionKeyboard,
  createResponseEditKeyboard,
  createReminderKeyboard,
  
  // Utility formatters
  formatDate,
  formatTime
}; 