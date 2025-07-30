const { MESSAGES } = require('../constants/messages');
const { createInlineKeyboard } = require('../../utils/keyboard');

// Add member workflow
const handleTeamAdd = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    // Switch to text input mode
    await bot.editMessageText(
      MESSAGES.TEAM.ADD_INSTRUCTIONS,
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
    // Store user state for text input handling
    // Note: You'll need to implement user state storage
    console.log(`User ${query.from.id} awaiting team member input`);
    
  } catch (error) {
    console.error('Team add error:', error);
    await bot.editMessageText(MESSAGES.ERRORS.GENERAL, {
      chat_id: chatId,
      message_id: messageId
    });
  }
};

// List team members
const handleTeamList = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // TODO: Get team members from service (will be implemented in B4)
    // For now, show placeholder
    const responseText = MESSAGES.TEAM.NO_MEMBERS;
    
    await bot.editMessageText(responseText, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    });
    
  } catch (error) {
    console.error('Team list error:', error);
    await bot.editMessageText(MESSAGES.ERRORS.GENERAL, {
      chat_id: chatId,
      message_id: messageId
    });
  }
};

// Remove member workflow
const handleTeamRemove = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // TODO: Get team members that current user can remove (will be implemented in B4)
    // For now, show placeholder
    await bot.editMessageText(
      '🗑️ Remove Team Member\n\nSelect member to remove:\n\nNote: Team service will be implemented in the next task.',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
  } catch (error) {
    console.error('Team remove error:', error);
    await bot.editMessageText(MESSAGES.ERRORS.GENERAL, {
      chat_id: chatId,
      message_id: messageId
    });
  }
};

// Handle specific member removal
const handleMemberRemoval = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  // Extract username from callback_data: team_remove_username
  const username = query.data.replace('team_remove_', '');
  
  try {
    // Show confirmation dialog
    const keyboard = {
      inline_keyboard: [
        [{ text: '✅ Confirm', callback_data: `team_confirm_remove_${username}` }],
        [{ text: '❌ Cancel', callback_data: 'team_cancel' }]
      ]
    };
    
    await bot.editMessageText(
      `⚠️ Confirm Removal\n\nRemove @${username} from team?\nThis action cannot be undone.`,
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: keyboard
      }
    );
    
  } catch (error) {
    console.error('Member removal error:', error);
    await bot.editMessageText(MESSAGES.ERRORS.GENERAL, {
      chat_id: chatId,
      message_id: messageId
    });
  }
};

// Confirm removal
const handleConfirmRemoval = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  // Extract username from callback_data: team_confirm_remove_username
  const username = query.data.replace('team_confirm_remove_', '');
  
  try {
    // TODO: Remove member via service (will be implemented in B4)
    await bot.editMessageText(
      `✅ Member Removed\n\n@${username} has been removed from the team.\n\nNote: Team service will be implemented in the next task.`,
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
  } catch (error) {
    console.error('Confirm removal error:', error);
    const errorMessage = error.message || MESSAGES.ERRORS.GENERAL;
    await bot.editMessageText(errorMessage, {
      chat_id: chatId,
      message_id: messageId
    });
  }
};

// Cancel operation
const handleTeamCancel = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  // Return to main team menu
  const keyboard = {
    inline_keyboard: [
      [{ text: '👤 Add Member', callback_data: 'team_add' }],
      [{ text: '📋 List Members', callback_data: 'team_list' }],
      [{ text: '🗑️ Remove Member', callback_data: 'team_remove' }],
      [{ text: '⚙️ Team Settings', callback_data: 'team_settings' }]
    ]
  };
  
  await bot.editMessageText(
    MESSAGES.TEAM.WELCOME,
    {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    }
  );
};

// Handle text input for adding members
const handleMemberInput = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const input = msg.text.trim();
  
  try {
    // Parse input: @username role
    const parts = input.split(' ');
    if (parts.length !== 2) {
      await bot.sendMessage(chatId, MESSAGES.TEAM.INVALID_FORMAT);
      return;
    }
    
    const [username, role] = parts;
    
    if (!username.startsWith('@')) {
      await bot.sendMessage(chatId, MESSAGES.TEAM.INVALID_FORMAT);
      return;
    }
    
    if (!['member', 'manager', 'admin'].includes(role.toLowerCase())) {
      await bot.sendMessage(chatId, 
        '❌ Invalid Role\n\nValid roles are:\n• member - Basic team member\n• manager - Can manage members\n• admin - Full team control\n\nExample: @username member'
      );
      return;
    }
    
    // TODO: Add member via service (will be implemented in B4)
    await bot.sendMessage(chatId, 
      `✅ Team Member Added!\n\n👤 ${username}\n🏷️ Role: ${role.charAt(0).toUpperCase() + role.slice(1)}\n📅 Added: ${new Date().toDateString()}\n\nNote: Team service will be implemented in the next task.`
    );
    
  } catch (error) {
    console.error('Member input error:', error);
    const errorMessage = error.message || MESSAGES.ERRORS.GENERAL;
    await bot.sendMessage(chatId, errorMessage);
  }
};

// Team settings placeholder
const handleTeamSettings = async (bot, query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  await bot.editMessageText(
    '⚙️ Team Settings\n\nSettings feature coming soon!',
    {
      chat_id: chatId,
      message_id: messageId
    }
  );
};

// Export all callbacks with their action names
module.exports = {
  'team_add': handleTeamAdd,
  'team_list': handleTeamList,
  'team_remove': handleTeamRemove,
  'team_settings': handleTeamSettings,
  'team_cancel': handleTeamCancel,
  
  // Dynamic callbacks - handle with pattern matching in main handler
  handleMemberRemoval,  // For team_remove_* patterns
  handleConfirmRemoval, // For team_confirm_remove_* patterns
  handleMemberInput     // For text input handling
}; 