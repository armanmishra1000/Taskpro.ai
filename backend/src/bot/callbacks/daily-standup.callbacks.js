const standupService = require('../../services/daily-standup/daily-standup.service');
const { 
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
  formatPermissionError,
  formatNoTeamError,
  formatValidationError
} = require('../formatters/daily-standup.formatter');

// Store conversation states for multi-step flows
const userStates = new Map();

// Configuration handlers
const handleConfigureSchedule = async (bot, query) => {
  const teamId = query.data.split('_')[3]; // standup_configure_schedule_teamId
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Verify permissions
    const team = await standupService.getUserTeam(userId);
    if (!team || !standupService.hasConfigPermission(userId, team)) {
      await bot.editMessageText(formatPermissionError(), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    const config = team.standupConfig || {};
    const message = formatScheduleConfig(config.scheduleTime, config.timezone);
    const keyboard = createScheduleKeyboard(teamId);
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Configure schedule error:', error);
    await bot.editMessageText('Error loading schedule configuration.', {
      chat_id: chatId,
      message_id: messageId
    });
  }
  
  await bot.answerCallbackQuery(query.id);
};

const handleConfigureParticipants = async (bot, query) => {
  const teamId = query.data.split('_')[3]; // standup_configure_participants_teamId
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Verify permissions
    const team = await standupService.getUserTeam(userId);
    if (!team || !standupService.hasConfigPermission(userId, team)) {
      await bot.editMessageText(formatPermissionError(), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    const members = await standupService.getTeamMembers(teamId);
    const config = team.standupConfig || {};
    const message = formatParticipantsConfig(members, config.participants);
    const keyboard = createParticipantsKeyboard(members, config.participants, teamId);
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Configure participants error:', error);
    await bot.editMessageText('Error loading participants configuration.', {
      chat_id: chatId,
      message_id: messageId
    });
  }
  
  await bot.answerCallbackQuery(query.id);
};

const handleConfigureChannel = async (bot, query) => {
  const teamId = query.data.split('_')[3]; // standup_configure_channel_teamId
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Verify permissions
    const team = await standupService.getUserTeam(userId);
    if (!team || !standupService.hasConfigPermission(userId, team)) {
      await bot.editMessageText(formatPermissionError(), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    const config = team.standupConfig || {};
    const message = formatChannelConfig(config.channelId);
    const keyboard = {
      inline_keyboard: [
        [{ text: '📝 Enter Channel ID', callback_data: `standup_channel_input_${teamId}` }],
        [{ text: '🔙 Back to Config', callback_data: `standup_back_config_${teamId}` }]
      ]
    };
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Configure channel error:', error);
    await bot.editMessageText('Error loading channel configuration.', {
      chat_id: chatId,
      message_id: messageId
    });
  }
  
  await bot.answerCallbackQuery(query.id);
};

const handleChannelInput = async (bot, query) => {
  const teamId = query.data.split('_')[3]; // standup_channel_input_teamId
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    await bot.editMessageText(
      '📺 Channel Configuration\n\nPlease send me the channel ID where standup summaries should be posted.\n\nFormat: @channelname or -1001234567890\n\nNote: The bot must be added to the channel with posting permissions.',
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back to Config', callback_data: `standup_back_config_${teamId}` }]
          ]
        }
      }
    );
    
    // Set user state for text input
    userStates.set(userId, { 
      action: 'channel_input', 
      teamId, 
      messageId,
      chatId 
    });
    
  } catch (error) {
    console.error('Channel input error:', error);
    await bot.editMessageText('Error setting up channel input.', {
      chat_id: chatId,
      message_id: messageId
    });
  }
  
  await bot.answerCallbackQuery(query.id);
};

const handleScheduleSelection = async (bot, query) => {
  const [action, schedule, time, teamId] = query.data.split('_'); // standup_schedule_0830_teamId
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Verify permissions
    const team = await standupService.getUserTeam(userId);
    if (!team || !standupService.hasConfigPermission(userId, team)) {
      await bot.editMessageText(formatPermissionError(), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    if (time === 'custom') {
      // Handle custom time input
      await bot.editMessageText(
        '⏰ Custom Schedule Time\n\nPlease enter time in HH:MM format (24-hour)\nExample: 08:30, 09:00\n\nRecommended: 07:00 - 10:00',
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Back to Schedule', callback_data: `standup_configure_schedule_${teamId}` }]
            ]
          }
        }
      );
      
      // Set user state for text input
      userStates.set(userId, { 
        action: 'schedule_time', 
        teamId, 
        messageId,
        chatId 
      });
    } else {
      // Handle predefined time selection
      const scheduleTime = `${time.substring(0, 2)}:${time.substring(2, 4)}`;
      
      if (!standupService.validateScheduleTime(scheduleTime)) {
        await bot.editMessageText(formatValidationError('time', 'Invalid time format. Please use HH:MM.'), {
          chat_id: chatId,
          message_id: messageId
        });
        return;
      }
      
      await standupService.updateStandupConfig(teamId, { scheduleTime });
      
      await bot.editMessageText(
        `✅ Schedule Updated!\n\nStandup time set to: ${scheduleTime}\n\nUse /standup to continue configuration.`,
        {
          chat_id: chatId,
          message_id: messageId
        }
      );
    }
    
  } catch (error) {
    console.error('Schedule selection error:', error);
    await bot.editMessageText('Error updating schedule.', {
      chat_id: chatId,
      message_id: messageId
    });
  }
  
  await bot.answerCallbackQuery(query.id);
};

const handleParticipantSelection = async (bot, query) => {
  const [action, participant, userId, teamId] = query.data.split('_'); // standup_participant_userId_teamId
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const currentUserId = query.from.id;
  
  try {
    // Verify permissions
    const team = await standupService.getUserTeam(currentUserId);
    if (!team || !standupService.hasConfigPermission(currentUserId, team)) {
      await bot.editMessageText(formatPermissionError(), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    const config = team.standupConfig || {};
    const participants = config.participants || [];
    const participantId = userId;
    
    // Toggle participant selection
    const index = participants.indexOf(participantId);
    if (index > -1) {
      participants.splice(index, 1);
    } else {
      participants.push(participantId);
    }
    
    await standupService.updateStandupConfig(teamId, { participants });
    
    // Refresh the participants view
    const members = await standupService.getTeamMembers(teamId);
    const updatedConfig = await standupService.getStandupConfig(teamId);
    const message = formatParticipantsConfig(members, updatedConfig.participants);
    const keyboard = createParticipantsKeyboard(members, updatedConfig.participants, teamId);
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Participant selection error:', error);
    await bot.editMessageText('Error updating participants.', {
      chat_id: chatId,
      message_id: messageId
    });
  }
  
  await bot.answerCallbackQuery(query.id);
};

const handleSelectAllParticipants = async (bot, query) => {
  const teamId = query.data.split('_')[3]; // standup_participants_all_teamId
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Verify permissions
    const team = await standupService.getUserTeam(userId);
    if (!team || !standupService.hasConfigPermission(userId, team)) {
      await bot.editMessageText(formatPermissionError(), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    const members = await standupService.getTeamMembers(teamId);
    const participantIds = members.map(m => m.userId.toString());
    
    await standupService.updateStandupConfig(teamId, { participants: participantIds });
    
    // Refresh the participants view
    const message = formatParticipantsConfig(members, participantIds);
    const keyboard = createParticipantsKeyboard(members, participantIds, teamId);
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Select all participants error:', error);
    await bot.editMessageText('Error selecting all participants.', {
      chat_id: chatId,
      message_id: messageId
    });
  }
  
  await bot.answerCallbackQuery(query.id);
};

const handleClearAllParticipants = async (bot, query) => {
  const teamId = query.data.split('_')[3]; // standup_participants_none_teamId
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Verify permissions
    const team = await standupService.getUserTeam(userId);
    if (!team || !standupService.hasConfigPermission(userId, team)) {
      await bot.editMessageText(formatPermissionError(), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    await standupService.updateStandupConfig(teamId, { participants: [] });
    
    // Refresh the participants view
    const members = await standupService.getTeamMembers(teamId);
    const message = formatParticipantsConfig(members, []);
    const keyboard = createParticipantsKeyboard(members, [], teamId);
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Clear all participants error:', error);
    await bot.editMessageText('Error clearing participants.', {
      chat_id: chatId,
      message_id: messageId
    });
  }
  
  await bot.answerCallbackQuery(query.id);
};

const handleEnableStandup = async (bot, query) => {
  const teamId = query.data.split('_')[2]; // standup_enable_teamId
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Verify permissions
    const team = await standupService.getUserTeam(userId);
    if (!team || !standupService.hasConfigPermission(userId, team)) {
      await bot.editMessageText(formatPermissionError(), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    await standupService.enableStandup(teamId);
    
    const message = formatStandupEnabled(team, team.standupConfig);
    const keyboard = {
      inline_keyboard: [
        [{ text: '🔙 Back to Config', callback_data: `standup_back_config_${teamId}` }]
      ]
    };
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Enable standup error:', error);
    await bot.editMessageText(`Error enabling standup: ${error.message}`, {
      chat_id: chatId,
      message_id: messageId
    });
  }
  
  await bot.answerCallbackQuery(query.id);
};

const handleDisableStandup = async (bot, query) => {
  const teamId = query.data.split('_')[2]; // standup_disable_teamId
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Verify permissions
    const team = await standupService.getUserTeam(userId);
    if (!team || !standupService.hasConfigPermission(userId, team)) {
      await bot.editMessageText(formatPermissionError(), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    await standupService.disableStandup(teamId);
    
    const message = formatStandupDisabled(team);
    const keyboard = {
      inline_keyboard: [
        [{ text: '🔙 Back to Config', callback_data: `standup_back_config_${teamId}` }]
      ]
    };
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Disable standup error:', error);
    await bot.editMessageText('Error disabling standup.', {
      chat_id: chatId,
      message_id: messageId
    });
  }
  
  await bot.answerCallbackQuery(query.id);
};

const handleBackToConfig = async (bot, query) => {
  const teamId = query.data.split('_')[3]; // standup_back_config_teamId
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Verify permissions
    const team = await standupService.getUserTeam(userId);
    if (!team || !standupService.hasConfigPermission(userId, team)) {
      await bot.editMessageText(formatPermissionError(), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    const configMessage = formatStandupConfig(team);
    const keyboard = createStandupConfigKeyboard(team._id);
    
    await bot.editMessageText(configMessage, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
  } catch (error) {
    console.error('Back to config error:', error);
    await bot.editMessageText('Error returning to configuration.', {
      chat_id: chatId,
      message_id: messageId
    });
  }
  
  await bot.answerCallbackQuery(query.id);
};

const handleStandupHistory = async (bot, query) => {
  const teamId = query.data.split('_')[2]; // standup_history_teamId
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Verify permissions
    const team = await standupService.getUserTeam(userId);
    if (!team || !standupService.hasConfigPermission(userId, team)) {
      await bot.editMessageText(formatPermissionError(), {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    // TODO: Implement standup history retrieval
    const message = `📊 Standup History - ${team.name}\n\nRecent summaries:\n\n📅 No standup history available yet.\n\nComplete your first standup to see history here.`;
    const keyboard = {
      inline_keyboard: [
        [{ text: '🔙 Back to Config', callback_data: `standup_back_config_${teamId}` }]
      ]
    };
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Standup history error:', error);
    await bot.editMessageText('Error loading standup history.', {
      chat_id: chatId,
      message_id: messageId
    });
  }
  
  await bot.answerCallbackQuery(query.id);
};

// Text input handler for custom responses and configuration
const handleTextInput = async (bot, msg) => {
  const userId = msg.from.id;
  const userState = userStates.get(userId);
  
  if (!userState) return false; // Not handled by this callback
  
  try {
    switch (userState.action) {
      case 'schedule_time':
        await handleScheduleTimeInput(bot, msg, userState);
        break;
      case 'channel_input':
        await handleChannelInputText(bot, msg, userState);
        break;
      default:
        return false; // Not handled
    }
    
    // Clear user state after handling
    userStates.delete(userId);
    return true; // Handled by this callback
    
  } catch (error) {
    console.error('Text input error:', error);
    await bot.sendMessage(msg.chat.id, 'Error processing your input. Please try again.');
    userStates.delete(userId);
    return true; // Handled (even if error)
  }
};

const handleScheduleTimeInput = async (bot, msg, userState) => {
  const { teamId, chatId, messageId } = userState;
  const timeInput = msg.text.trim();
  
  try {
    if (!standupService.validateScheduleTime(timeInput)) {
      await bot.sendMessage(chatId, formatValidationError('time', 'Please use HH:MM format (e.g., 08:30, 09:00)'));
      return;
    }
    
    await standupService.updateStandupConfig(teamId, { scheduleTime: timeInput });
    
    await bot.sendMessage(chatId, `✅ Schedule Updated!\n\nStandup time set to: ${timeInput}\n\nUse /standup to continue configuration.`);
    
  } catch (error) {
    console.error('Schedule time input error:', error);
    await bot.sendMessage(chatId, 'Error updating schedule time. Please try again.');
  }
};

const handleChannelInputText = async (bot, msg, userState) => {
  const { teamId, chatId, messageId } = userState;
  const channelInput = msg.text.trim();
  
  try {
    // Basic channel ID validation
    if (!channelInput.startsWith('@') && !channelInput.startsWith('-100')) {
      await bot.sendMessage(chatId, formatValidationError('channel', 'Please provide a valid channel ID (e.g., @channelname or -1001234567890)'));
      return;
    }
    
    await standupService.updateStandupConfig(teamId, { channelId: channelInput });
    
    await bot.sendMessage(chatId, `✅ Channel Updated!\n\nStandup summaries will be posted to: ${channelInput}\n\nUse /standup to continue configuration.`);
    
  } catch (error) {
    console.error('Channel input error:', error);
    await bot.sendMessage(chatId, 'Error updating channel. Please try again.');
  }
};

// Dynamic callback handler for pattern matching
const handleDynamicCallback = async (bot, query) => {
  const action = query.data;
  
  // Handle schedule selection patterns
  if (action.startsWith('standup_schedule_')) {
    await handleScheduleSelection(bot, query);
    return true;
  }
  
  // Handle participant selection patterns
  if (action.startsWith('standup_participant_')) {
    await handleParticipantSelection(bot, query);
    return true;
  }
  
  // Handle select all participants
  if (action.startsWith('standup_participants_all_')) {
    await handleSelectAllParticipants(bot, query);
    return true;
  }
  
  // Handle clear all participants
  if (action.startsWith('standup_participants_none_')) {
    await handleClearAllParticipants(bot, query);
    return true;
  }
  
  // Handle back to config
  if (action.startsWith('standup_back_config_')) {
    await handleBackToConfig(bot, query);
    return true;
  }
  
  return false; // Not handled by this callback
};

module.exports = {
  // Configuration handlers
  'standup_configure_schedule': handleConfigureSchedule,
  'standup_configure_participants': handleConfigureParticipants,
  'standup_configure_channel': handleConfigureChannel,
  'standup_channel_input': handleChannelInput,
  'standup_enable': handleEnableStandup,
  'standup_disable': handleDisableStandup,
  'standup_history': handleStandupHistory,
  
  // Dynamic callback handler
  handleDynamicCallback,
  
  // Text input handler
  handleTextInput
}; 