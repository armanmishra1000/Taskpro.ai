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

const formatTestStandupSuccess = (participantCount) => {
  return `✅ Test Standup Completed!

${participantCount} members received test standup DMs.
Summary generated successfully.

Ready to enable daily automation!`;
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

module.exports = {
  formatStandupConfig,
  createStandupConfigKeyboard,
  createScheduleKeyboard,
  createTimezoneKeyboard,
  createParticipantsKeyboard,
  formatScheduleConfig,
  formatParticipantsConfig,
  formatChannelConfig,
  formatStandupEnabled,
  formatStandupDisabled,
  formatTestStandupSuccess,
  formatPermissionError,
  formatNoTeamError,
  formatValidationError
}; 