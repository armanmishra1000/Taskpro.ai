const formatMembersList = (members) => {
  if (!members || members.length === 0) {
    return '👥 No team members found\n\nUse "Add Member" to start building your team.';
  }
  
  // Group members by role
  const admins = members.filter(m => m.role === 'admin');
  const managers = members.filter(m => m.role === 'manager');
  const regularMembers = members.filter(m => m.role === 'member');
  
  let result = `📋 Team Members (${members.length})\n\n`;
  
  // Admins section
  if (admins.length > 0) {
    result += '👑 **Admins:**\n';
    admins.forEach(member => {
      const currentUserFlag = member.isCurrentUser ? ' (You)' : '';
      result += `• @${member.username}${currentUserFlag}\n`;
    });
    result += '\n';
  }
  
  // Managers section
  if (managers.length > 0) {
    result += '👨‍💼 **Managers:**\n';
    managers.forEach(member => {
      const currentUserFlag = member.isCurrentUser ? ' (You)' : '';
      result += `• @${member.username}${currentUserFlag}\n`;
    });
    result += '\n';
  }
  
  // Members section
  if (regularMembers.length > 0) {
    result += '👥 **Members:**\n';
    regularMembers.forEach(member => {
      const currentUserFlag = member.isCurrentUser ? ' (You)' : '';
      result += `• @${member.username}${currentUserFlag}\n`;
    });
    result += '\n';
  }
  
  result += 'Use /team remove to remove members';
  
  return result;
};

const formatMemberCard = (member) => {
  const roleIcon = getRoleIcon(member.role);
  const roleText = member.role.charAt(0).toUpperCase() + member.role.slice(1);
  
  return `${roleIcon} @${member.username}\n` +
         `🏷️ Role: ${roleText}\n` +
         `📅 Added: ${formatDate(member.addedAt)}`;
};

const formatAddMemberSuccess = (member, totalMembers) => {
  const roleText = member.role.charAt(0).toUpperCase() + member.role.slice(1);
  
  return `✅ Team Member Added!\n\n` +
         `👤 @${member.username}\n` +
         `🏷️ Role: ${roleText}\n` +
         `📅 Added: ${formatDate(member.addedAt)}\n\n` +
         `Total team members: ${totalMembers}`;
};

const formatRemoveMemberSuccess = (username, remainingCount) => {
  return `✅ Member Removed\n\n` +
         `@${username} has been removed from the team.\n\n` +
         `Remaining team members: ${remainingCount}`;
};

const createMainTeamKeyboard = () => {
  return {
    inline_keyboard: [
      [{ text: '👤 Add Member', callback_data: 'team_add' }],
      [{ text: '📋 List Members', callback_data: 'team_list' }],
      [{ text: '🗑️ Remove Member', callback_data: 'team_remove' }],
      [{ text: '⚙️ Team Settings', callback_data: 'team_settings' }]
    ]
  };
};

const createMemberRemovalKeyboard = (members) => {
  if (!members || members.length === 0) {
    return {
      inline_keyboard: [
        [{ text: '❌ Cancel', callback_data: 'team_cancel' }]
      ]
    };
  }
  
  const buttons = members.map(member => [{
    text: `${getRoleIcon(member.role)} @${member.username}`,
    callback_data: `team_remove_${member.username}`
  }]);
  
  // Add cancel button
  buttons.push([{ text: '❌ Cancel', callback_data: 'team_cancel' }]);
  
  return { inline_keyboard: buttons };
};

const createConfirmationKeyboard = (action, username) => {
  return {
    inline_keyboard: [
      [{ text: '✅ Confirm', callback_data: `team_confirm_${action}_${username}` }],
      [{ text: '❌ Cancel', callback_data: 'team_cancel' }]
    ]
  };
};

const createRoleSelectionKeyboard = (username) => {
  return {
    inline_keyboard: [
      [{ text: '👥 Member', callback_data: `team_role_member_${username}` }],
      [{ text: '👨‍💼 Manager', callback_data: `team_role_manager_${username}` }],
      [{ text: '👑 Admin', callback_data: `team_role_admin_${username}` }],
      [{ text: '❌ Cancel', callback_data: 'team_cancel' }]
    ]
  };
};

// Helper functions
const getRoleIcon = (role) => {
  const icons = {
    admin: '👑',
    manager: '👨‍💼',
    member: '👥'
  };
  return icons[role] || '👤';
};

const formatDate = (date) => {
  if (!date) return 'Unknown';
  
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (date) => {
  if (!date) return 'Unknown';
  
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Validation message formatters
const formatValidationError = (error) => {
  const errorMessages = {
    'Invalid role': '❌ Invalid Role\n\nValid roles are:\n• member - Basic team member\n• manager - Can manage members\n• admin - Full team control\n\nExample: @username member',
    'Username must start with @': '❌ Invalid Format\n\nPlease use format: @username role\n\nExample: @john_doe manager',
    'Permission denied': '❌ Permission Denied\n\nYou don\'t have permission for this action.',
    'Cannot remove yourself as the only admin': '❌ Cannot Remove Yourself\n\nYou are the only admin in this team.\nPromote another member to admin first.'
  };
  
  return errorMessages[error] || `❌ Error: ${error}`;
};

const formatPermissionError = (userRole, requiredRole) => {
  return `❌ Permission Denied\n\n` +
         `You don't have permission for this action.\n\n` +
         `Current role: ${userRole}\n` +
         `Required role: ${requiredRole}`;
};

module.exports = {
  formatMembersList,
  formatMemberCard,
  formatAddMemberSuccess,
  formatRemoveMemberSuccess,
  createMainTeamKeyboard,
  createMemberRemovalKeyboard,
  createConfirmationKeyboard,
  createRoleSelectionKeyboard,
  formatValidationError,
  formatPermissionError,
  getRoleIcon,
  formatDate,
  formatDateTime
}; 