# Task Prompts for Team Management

## How to Use:
1. Copy each prompt exactly
2. Paste to AI
3. Report "done" or error
4. Move to next task

<!-- ## Task B1: Team Database Model and Contract

**MANDATORY FIRST:**
1. Read `docs/features/team-management/CURRENT-STATE.md`
2. Read `shared/contracts/models/` - ALL model contracts (base, user, task)
3. Read `docs/features/team-management/spec.md`
4. List what models this feature needs

**YOUR TASK:**
Create team contract and model following existing patterns from user.contract.js and task.contract.js

**FILES TO CREATE:**
- `shared/contracts/models/team.contract.js`
- `backend/src/models/team.model.js`

**REQUIREMENTS:**
- Use EXACT field names from spec.md
- Follow BaseModelContract pattern
- Include validation for required fields
- Add indexes for query performance

**TEAM CONTRACT STRUCTURE:**
```javascript
// shared/contracts/models/team.contract.js
const { BaseModelContract } = require('./base.contract');

module.exports = {
  TeamContract: {
    // Extends BaseModelContract
    ...BaseModelContract,
    
    name: 'String',              // Team name, required, max 100 chars
    description: 'String',       // Team description, optional, max 500 chars
    createdBy: 'ObjectId',       // Creator user ID, required
    members: 'Array',            // Array of member objects
    settings: {
      allowMemberInvite: 'Boolean',   // Default true
      requireApproval: 'Boolean'      // Default false
    }
  }
};
```

**TEAM MODEL STRUCTURE:**
```javascript
// backend/src/models/team.model.js
const mongoose = require('mongoose');
const { BaseModelContract } = require('../../../shared/contracts/models/base.contract');

const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  username: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['member', 'manager', 'admin'], 
    default: 'member' 
  },
  addedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  addedAt: { type: Date, default: Date.now }
});

const teamSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    maxlength: 100,
    trim: true 
  },
  description: { 
    type: String, 
    maxlength: 500,
    trim: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  members: [memberSchema],
  settings: {
    allowMemberInvite: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false }
  },
  
  // Base model fields
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
});

// Indexes for performance
teamSchema.index({ createdBy: 1 });
teamSchema.index({ 'members.userId': 1 });
teamSchema.index({ isDeleted: 1 });

// Update timestamp middleware
teamSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Team', teamSchema);
```

**GIT OPERATIONS:**
```bash
git add shared/contracts/models/team.contract.js
git add backend/src/models/team.model.js
git commit -m "feat(team): add team database model and contract"
git push origin main
```

**UPDATE AFTER:**
- Update `CURRENT-STATE.md` with what was created
- Mark task B1 complete in `TASK-LIST.md` -->

<!-- ## Task B2: Bot Command Handler

**MANDATORY FIRST:**
1. Read `docs/features/team-management/CURRENT-STATE.md`
2. Read `docs/features/team-management/messages.md`
3. Read `docs/features/team-management/BOT-INTERACTIONS.md`
4. Check existing commands in `backend/src/bot/commands/`
5. Read `backend/src/bot/index.js` to understand command registration

**YOUR TASK:**
Create `/team` command handler following the pattern from newtask.command.js

**FILE TO CREATE:**
`backend/src/bot/commands/team.command.js`

**COMMAND HANDLER STRUCTURE:**
```javascript
const { MESSAGES } = require('../constants/messages');
const { createInlineKeyboard } = require('../utils/keyboard');
const Team = require('../../models/team.model');

module.exports = {
  command: 'team',
  description: 'Manage team members and settings',
  handler: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      // Create team menu keyboard
      const keyboard = createInlineKeyboard([
        [{ text: '👤 Add Member', callback_data: 'team_add' }],
        [{ text: '📋 List Members', callback_data: 'team_list' }],
        [{ text: '🗑️ Remove Member', callback_data: 'team_remove' }],
        [{ text: '⚙️ Team Settings', callback_data: 'team_settings' }]
      ]);
      
      await bot.sendMessage(
        chatId,
        MESSAGES.TEAM.WELCOME,
        { reply_markup: keyboard }
      );
      
    } catch (error) {
      console.error('Team command error:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL);
    }
  }
};
```

**UPDATE MESSAGES:**
Add to `backend/src/bot/constants/messages.js`:
```javascript
// Add to existing TEAM object
TEAM: {
  // Existing messages...
  WELCOME: '👥 Team Management\n\nChoose an action:',
  ADD_INSTRUCTIONS: '👤 Add Team Member\n\nPlease provide member information:\nFormat: @username Role\n\nExamples:\n• @john_doe manager\n• @jane_smith member\n• @admin_user admin\n\nRoles: member, manager, admin',
  MEMBER_ADDED: '✅ Team Member Added!',
  MEMBER_REMOVED: '✅ Member Removed',
  NO_MEMBERS: '👥 No team members found\n\nUse "Add Member" to start building your team.',
  INVALID_FORMAT: '❌ Invalid Format\n\nPlease use format: @username role\n\nExample: @john_doe manager',
  PERMISSION_DENIED: '❌ Permission Denied\n\nYou don\'t have permission for this action.',
  CANNOT_REMOVE_SELF: '❌ Cannot Remove Yourself\n\nYou are the only admin in this team.\nPromote another member to admin first.',
  MEMBER_EXISTS: '❌ Member Already Added\n\n@{username} is already a team member.\nUse /team list to see all members.'
}
```

**REGISTER COMMAND:**
Update `backend/src/bot/index.js`:
```javascript
// Add after existing imports
const teamCommand = require('./commands/team.command');

// Add after existing command registrations
bot.onText(/\/team/, (msg) => teamCommand.handler(bot, msg));
```

**GIT OPERATIONS:**
```bash
git add backend/src/bot/commands/team.command.js
git add backend/src/bot/constants/messages.js
git add backend/src/bot/index.js
git commit -m "feat(team): add /team command handler"
git push origin main
```

**UPDATE AFTER:**
- Update `CURRENT-STATE.md` with what was created
- Mark task B2 complete in `TASK-LIST.md` -->

<!-- ## Task B3: Callback Query Handlers

**MANDATORY FIRST:**
1. Read `docs/features/team-management/BOT-INTERACTIONS.md`
2. Check callback_data patterns from Task B2
3. Read `docs/features/team-management/messages.md`
4. Check how callbacks are handled in `backend/src/bot/callbacks/task-creation.callbacks.js`

**YOUR TASK:**
Handle all button presses and inline keyboard actions for team management

**FILE TO CREATE:**
`backend/src/bot/callbacks/team.callbacks.js`

**CALLBACK HANDLER STRUCTURE:**
```javascript
const { MESSAGES } = require('../constants/messages');
const TeamService = require('../../services/team/team.service');
const TeamFormatter = require('../formatters/team.formatter');

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
    // Get team members
    const teamMembers = await TeamService.getTeamMembers(userId);
    
    let responseText;
    if (teamMembers.length === 0) {
      responseText = MESSAGES.TEAM.NO_MEMBERS;
    } else {
      responseText = TeamFormatter.formatMembersList(teamMembers);
    }
    
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
    // Get team members that current user can remove
    const teamMembers = await TeamService.getRemovableMembers(userId);
    
    if (teamMembers.length === 0) {
      await bot.editMessageText(
        '👥 No members available to remove.',
        {
          chat_id: chatId,
          message_id: messageId
        }
      );
      return;
    }
    
    const keyboard = TeamFormatter.createMemberRemovalKeyboard(teamMembers);
    
    await bot.editMessageText(
      '🗑️ Remove Team Member\n\nSelect member to remove:',
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: keyboard
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
    await TeamService.removeTeamMember(userId, username);
    
    await bot.editMessageText(
      `✅ Member Removed\n\n@${username} has been removed from the team.`,
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
    
    // Add member
    await TeamService.addTeamMember(userId, username, role.toLowerCase());
    
    await bot.sendMessage(chatId, 
      `✅ Team Member Added!\n\n👤 ${username}\n🏷️ Role: ${role.charAt(0).toUpperCase() + role.slice(1)}\n📅 Added: ${new Date().toDateString()}`
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
```

**UPDATE BOT INDEX:**
Modify `backend/src/bot/index.js` to handle team callbacks:
```javascript
// Add import
const teamCallbacks = require('./callbacks/team.callbacks');

// Update callback query handler
bot.on('callback_query', async (query) => {
  const action = query.data;
  
  try {
    // Handle task callbacks
    if (taskCallbacks[action]) {
      await taskCallbacks[action](bot, query);
    }
    // Handle team callbacks
    else if (teamCallbacks[action]) {
      await teamCallbacks[action](bot, query);
    }
    // Handle dynamic team callbacks
    else if (action.startsWith('team_remove_') && !action.includes('confirm')) {
      await teamCallbacks.handleMemberRemoval(bot, query);
    }
    else if (action.startsWith('team_confirm_remove_')) {
      await teamCallbacks.handleConfirmRemoval(bot, query);
    }
    
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Callback query error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error processing request' });
  }
});

// Add text message handler for team member input
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    // Simple state check - in production, implement proper user state storage
    const recentMessages = []; // You would implement this properly
    
    // For now, handle team member format
    if (msg.text.includes('@') && (msg.text.includes('member') || msg.text.includes('manager') || msg.text.includes('admin'))) {
      await teamCallbacks.handleMemberInput(bot, msg);
    }
  }
});
```

**GIT OPERATIONS:**
```bash
git add backend/src/bot/callbacks/team.callbacks.js
git add backend/src/bot/index.js
git commit -m "feat(team): add callback query handlers"
git push origin main
```

**UPDATE AFTER:**
- Update `CURRENT-STATE.md` with what was created
- Mark task B3 complete in `TASK-LIST.md` -->

<!-- ## Task B4: Service Layer

**MANDATORY FIRST:**
1. Read `shared/contracts/models/team.contract.js` (created in B1)
2. Read `docs/features/team-management/spec.md`
3. Check validation rules and permission requirements
4. Look at existing service pattern in `backend/src/services/task-creation/task-creation.service.js`

**YOUR TASK:**
Create business logic for team management with proper validation and permissions

**FILE TO CREATE:**
`backend/src/services/team/team.service.js`

**SERVICE STRUCTURE:**
```javascript
const Team = require('../../models/team.model');
const User = require('../../models/user.model'); // Assuming this exists
const { ValidationError } = require('../../utils/errors');

class TeamService {
  
  async getOrCreateTeam(userId) {
    try {
      // First, find existing team where user is a member
      let team = await Team.findOne({
        'members.userId': userId,
        isDeleted: false
      });
      
      if (!team) {
        // Create new team with user as admin
        team = new Team({
          name: 'My Team',
          description: 'Default team',
          createdBy: userId,
          members: [{
            userId: userId,
            username: '', // Will be filled when we have user data
            role: 'admin',
            addedBy: userId,
            addedAt: new Date()
          }]
        });
        
        await team.save();
      }
      
      return team;
    } catch (error) {
      console.error('Get or create team error:', error);
      throw new Error('Failed to access team');
    }
  }
  
  async addTeamMember(userId, username, role) {
    try {
      // Validate inputs
      if (!username.startsWith('@')) {
        throw new ValidationError('Username must start with @');
      }
      
      const cleanUsername = username.substring(1); // Remove @
      
      if (!['member', 'manager', 'admin'].includes(role)) {
        throw new ValidationError('Invalid role');
      }
      
      // Get or create team
      const team = await this.getOrCreateTeam(userId);
      
      // Check if member already exists
      const existingMember = team.members.find(
        member => member.username === cleanUsername
      );
      
      if (existingMember) {
        throw new ValidationError(`@${cleanUsername} is already a team member`);
      }
      
      // Check permissions - get current user's role
      const currentMember = team.members.find(
        member => member.userId.toString() === userId.toString()
      );
      
      if (!currentMember) {
        throw new ValidationError('You are not a team member');
      }
      
      // Permission checks
      const canAdd = this.checkAddPermission(currentMember.role, role);
      if (!canAdd) {
        throw new ValidationError(`You cannot add ${role}s to the team`);
      }
      
      // Add new member
      team.members.push({
        userId: null, // Will be populated when user joins
        username: cleanUsername,
        role: role,
        addedBy: userId,
        addedAt: new Date()
      });
      
      await team.save();
      
      return {
        username: cleanUsername,
        role: role,
        addedAt: new Date()
      };
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('Add team member error:', error);
      throw new Error('Failed to add team member');
    }
  }
  
  async removeTeamMember(userId, targetUsername) {
    try {
      const cleanUsername = targetUsername.replace('@', '');
      
      const team = await Team.findOne({
        'members.userId': userId,
        isDeleted: false
      });
      
      if (!team) {
        throw new ValidationError('Team not found');
      }
      
      // Find current user and target member
      const currentMember = team.members.find(
        member => member.userId.toString() === userId.toString()
      );
      
      const targetMember = team.members.find(
        member => member.username === cleanUsername
      );
      
      if (!currentMember) {
        throw new ValidationError('You are not a team member');
      }
      
      if (!targetMember) {
        throw new ValidationError('Member not found');
      }
      
      // Check if trying to remove self and is only admin
      if (currentMember.username === cleanUsername) {
        const adminCount = team.members.filter(m => m.role === 'admin').length;
        if (adminCount === 1 && currentMember.role === 'admin') {
          throw new ValidationError('Cannot remove yourself as the only admin');
        }
      }
      
      // Check permissions
      const canRemove = this.checkRemovePermission(currentMember.role, targetMember.role);
      if (!canRemove) {
        throw new ValidationError('You don\'t have permission to remove this member');
      }
      
      // Remove member
      team.members = team.members.filter(
        member => member.username !== cleanUsername
      );
      
      await team.save();
      
      return {
        username: cleanUsername,
        removedAt: new Date()
      };
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('Remove team member error:', error);
      throw new Error('Failed to remove team member');
    }
  }
  
  async getTeamMembers(userId) {
    try {
      const team = await Team.findOne({
        'members.userId': userId,
        isDeleted: false
      });
      
      if (!team) {
        return [];
      }
      
      // Add flag for current user
      return team.members.map(member => ({
        ...member.toObject(),
        isCurrentUser: member.userId && member.userId.toString() === userId.toString()
      }));
      
    } catch (error) {
      console.error('Get team members error:', error);
      throw new Error('Failed to get team members');
    }
  }
  
  async getRemovableMembers(userId) {
    try {
      const team = await Team.findOne({
        'members.userId': userId,
        isDeleted: false
      });
      
      if (!team) {
        return [];
      }
      
      const currentMember = team.members.find(
        member => member.userId.toString() === userId.toString()
      );
      
      if (!currentMember) {
        return [];
      }
      
      // Filter members that current user can remove
      return team.members.filter(member => {
        // Don't include self if only admin
        if (member.userId.toString() === userId.toString()) {
          const adminCount = team.members.filter(m => m.role === 'admin').length;
          return !(adminCount === 1 && member.role === 'admin');
        }
        
        // Check if current user can remove this member
        return this.checkRemovePermission(currentMember.role, member.role);
      });
      
    } catch (error) {
      console.error('Get removable members error:', error);
      throw new Error('Failed to get removable members');
    }
  }
  
  // Permission helper methods
  checkAddPermission(userRole, targetRole) {
    const roleHierarchy = { admin: 3, manager: 2, member: 1 };
    return roleHierarchy[userRole] >= roleHierarchy[targetRole];
  }
  
  checkRemovePermission(userRole, targetRole) {
    if (userRole === 'admin') return true;
    if (userRole === 'manager' && targetRole === 'member') return true;
    return false;
  }
}

module.exports = new TeamService();
```

**CREATE DIRECTORY:**
First create the service directory:
```bash
mkdir -p backend/src/services/team
```

**GIT OPERATIONS:**
```bash
git add backend/src/services/team/team.service.js
git commit -m "feat(team): add service layer with validation and permissions"
git push origin main
```

**UPDATE AFTER:**
- Update `CURRENT-STATE.md` with what was created
- Mark task B4 complete in `TASK-LIST.md` -->

<!-- ## Task B5: Message Formatters

**MANDATORY FIRST:**
1. Read `docs/features/team-management/messages.md`
2. Check existing formatter pattern in `backend/src/bot/formatters/task-creation.formatter.js`
3. Review message formatting requirements from spec

**YOUR TASK:**
Create message formatters for clean, consistent team UI display

**FILE TO CREATE:**
`backend/src/bot/formatters/team.formatter.js`

**FORMATTER STRUCTURE:**
```javascript
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
```

**CREATE DIRECTORY:**
```bash
mkdir -p backend/src/bot/formatters
```

**GIT OPERATIONS:**
```bash
git add backend/src/bot/formatters/team.formatter.js
git commit -m "feat(team): add message formatters for clean UI display"
git push origin main
```

**UPDATE AFTER:**
- Update `CURRENT-STATE.md` with what was created
- Mark task B5 complete in `TASK-LIST.md` -->

## Task B6: Integration Tests

**MANDATORY FIRST:**
1. Test each component manually first using actual bot
2. Review test patterns in `backend/tests/bot/`
3. Note test scenarios from spec.md
4. Check existing test setup in `backend/tests/setup.js`

**YOUR TASK:**
Create comprehensive automated tests for all team management functionality

**FILES TO CREATE:**
- `backend/tests/bot/team.test.js` - Main integration tests
- `backend/tests/models/team.model.test.js` - Model tests
- `backend/tests/services/team.service.test.js` - Service tests
- `backend/tests/bot/formatters/team.formatter.test.js` - Formatter tests
- `backend/tests/bot/callbacks/team.callbacks.test.js` - Callback tests

**MAIN INTEGRATION TEST:**
`backend/tests/bot/team.test.js`
```javascript
const request = require('supertest');
const TeamService = require('../../src/services/team/team.service');
const TeamFormatter = require('../../src/bot/formatters/team.formatter');
const teamCallbacks = require('../../src/bot/callbacks/team.callbacks');

describe('Team Management Integration Tests', () => {
  let mockBot;
  let mockQuery;
  let mockMsg;

  beforeEach(() => {
    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({}),
      editMessageText: jest.fn().mockResolvedValue({}),
      answerCallbackQuery: jest.fn().mockResolvedValue({})
    };

    mockQuery = {
      data: '',
      from: { id: 123, username: 'testuser' },
      message: { 
        chat: { id: 456 }, 
        message_id: 789 
      }
    };

    mockMsg = {
      chat: { id: 456 },
      from: { id: 123, username: 'testuser' },
      text: ''
    };
  });

  describe('/team command', () => {
    test('should show team management menu', async () => {
      const teamCommand = require('../../src/bot/commands/team.command');
      
      await teamCommand.handler(mockBot, mockMsg);
      
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        456,
        expect.stringContaining('👥 Team Management'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ 
                  text: '👤 Add Member',
                  callback_data: 'team_add'
                })
              ])
            ])
          })
        })
      );
    });

    test('should handle command errors gracefully', async () => {
      const teamCommand = require('../../src/bot/commands/team.command');
      
      // Mock service to throw error
      jest.spyOn(TeamService, 'getTeamMembers').mockRejectedValue(new Error('DB Error'));
      
      await teamCommand.handler(mockBot, mockMsg);
      
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        456,
        expect.stringContaining('Team Management')
      );
    });
  });

  describe('Team callbacks', () => {
    test('team_add should show add member instructions', async () => {
      mockQuery.data = 'team_add';
      
      await teamCallbacks['team_add'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('👤 Add Team Member'),
        expect.objectContaining({
          chat_id: 456,
          message_id: 789
        })
      );
    });

    test('team_list should display team members', async () => {
      mockQuery.data = 'team_list';
      
      // Mock service response
      jest.spyOn(TeamService, 'getTeamMembers').mockResolvedValue([
        { username: 'testuser', role: 'admin', isCurrentUser: true },
        { username: 'member1', role: 'member', isCurrentUser: false }
      ]);
      
      await teamCallbacks['team_list'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('📋 Team Members'),
        expect.objectContaining({
          chat_id: 456,
          message_id: 789,
          parse_mode: 'Markdown'
        })
      );
    });

    test('team_remove should show removable members', async () => {
      mockQuery.data = 'team_remove';
      
      jest.spyOn(TeamService, 'getRemovableMembers').mockResolvedValue([
        { username: 'member1', role: 'member' }
      ]);
      
      await teamCallbacks['team_remove'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('🗑️ Remove Team Member'),
        expect.objectContaining({
          chat_id: 456,
          message_id: 789,
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );
    });

    test('should handle callback errors gracefully', async () => {
      mockQuery.data = 'team_list';
      
      jest.spyOn(TeamService, 'getTeamMembers').mockRejectedValue(new Error('Service Error'));
      
      await teamCallbacks['team_list'](mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('❌'),
        expect.any(Object)
      );
    });
  });

  describe('Member input handling', () => {
    test('should add valid team member', async () => {
      mockMsg.text = '@newuser member';
      
      jest.spyOn(TeamService, 'addTeamMember').mockResolvedValue({
        username: 'newuser',
        role: 'member',
        addedAt: new Date()
      });
      
      await teamCallbacks.handleMemberInput(mockBot, mockMsg);
      
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        456,
        expect.stringContaining('✅ Team Member Added!')
      );
    });

    test('should reject invalid input format', async () => {
      mockMsg.text = 'invalid input';
      
      await teamCallbacks.handleMemberInput(mockBot, mockMsg);
      
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        456,
        expect.stringContaining('❌ Invalid Format')
      );
    });

    test('should reject invalid role', async () => {
      mockMsg.text = '@user invalidrole';
      
      await teamCallbacks.handleMemberInput(mockBot, mockMsg);
      
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        456,
        expect.stringContaining('❌ Invalid Role')
      );
    });
  });

  describe('Permission validation', () => {
    test('should allow admin to remove manager', async () => {
      jest.spyOn(TeamService, 'removeTeamMember').mockResolvedValue({
        username: 'manager1',
        removedAt: new Date()
      });
      
      mockQuery.data = 'team_confirm_remove_manager1';
      
      await teamCallbacks.handleConfirmRemoval(mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('✅ Member Removed'),
        expect.any(Object)
      );
    });

    test('should prevent member from removing other members', async () => {
      jest.spyOn(TeamService, 'removeTeamMember')
        .mockRejectedValue(new Error('You don\'t have permission to remove this member'));
      
      mockQuery.data = 'team_confirm_remove_othermember';
      
      await teamCallbacks.handleConfirmRemoval(mockBot, mockQuery);
      
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('You don\'t have permission'),
        expect.any(Object)
      );
    });
  });
});
```

**MODEL TESTS:**
`backend/tests/models/team.model.test.js`
```javascript
const mongoose = require('mongoose');
const Team = require('../../src/models/team.model');

describe('Team Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Team.deleteMany({});
  });

  test('should create team with valid data', async () => {
    const teamData = {
      name: 'Test Team',
      description: 'Test Description',
      createdBy: new mongoose.Types.ObjectId(),
      members: [{
        userId: new mongoose.Types.ObjectId(),
        username: 'testuser',
        role: 'admin',
        addedBy: new mongoose.Types.ObjectId(),
        addedAt: new Date()
      }]
    };

    const team = new Team(teamData);
    const savedTeam = await team.save();

    expect(savedTeam.name).toBe('Test Team');
    expect(savedTeam.members).toHaveLength(1);
    expect(savedTeam.members[0].role).toBe('admin');
  });

  test('should require name field', async () => {
    const team = new Team({
      createdBy: new mongoose.Types.ObjectId()
    });

    await expect(team.save()).rejects.toThrow();
  });

  test('should validate member role enum', async () => {
    const team = new Team({
      name: 'Test Team',
      createdBy: new mongoose.Types.ObjectId(),
      members: [{
        userId: new mongoose.Types.ObjectId(),
        username: 'testuser',
        role: 'invalidrole',
        addedBy: new mongoose.Types.ObjectId()
      }]
    });

    await expect(team.save()).rejects.toThrow();
  });

  test('should update timestamp on save', async () => {
    const team = new Team({
      name: 'Test Team',
      createdBy: new mongoose.Types.ObjectId()
    });

    const savedTeam = await team.save();
    const originalUpdatedAt = savedTeam.updatedAt;

    // Wait a bit and update
    await new Promise(resolve => setTimeout(resolve, 10));
    savedTeam.description = 'Updated description';
    await savedTeam.save();

    expect(savedTeam.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
```

**SERVICE TESTS:**
`backend/tests/services/team.service.test.js`
```javascript
const TeamService = require('../../src/services/team/team.service');
const Team = require('../../src/models/team.model');
const { ValidationError } = require('../../src/utils/errors');

jest.mock('../../src/models/team.model');

describe('TeamService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addTeamMember', () => {
    test('should add valid team member', async () => {
      const mockTeam = {
        members: [{
          userId: 'user123',
          username: 'admin',
          role: 'admin'
        }],
        save: jest.fn().mockResolvedValue(true)
      };

      Team.findOne.mockResolvedValue(mockTeam);

      const result = await TeamService.addTeamMember('user123', '@newuser', 'member');

      expect(result.username).toBe('newuser');
      expect(result.role).toBe('member');
      expect(mockTeam.save).toHaveBeenCalled();
    });

    test('should validate username format', async () => {
      await expect(
        TeamService.addTeamMember('user123', 'invalidusername', 'member')
      ).rejects.toThrow('Username must start with @');
    });

    test('should validate role', async () => {
      await expect(
        TeamService.addTeamMember('user123', '@user', 'invalidrole')
      ).rejects.toThrow('Invalid role');
    });

    test('should prevent duplicate members', async () => {
      const mockTeam = {
        members: [{
          userId: 'user123',
          username: 'admin',
          role: 'admin'
        }, {
          userId: 'user456',
          username: 'existing',
          role: 'member'
        }],
        save: jest.fn()
      };

      Team.findOne.mockResolvedValue(mockTeam);

      await expect(
        TeamService.addTeamMember('user123', '@existing', 'member')
      ).rejects.toThrow('is already a team member');
    });
  });

  describe('removeTeamMember', () => {
    test('should remove team member with valid permissions', async () => {
      const mockTeam = {
        members: [
          { userId: 'admin123', username: 'admin', role: 'admin' },
          { userId: 'member456', username: 'member1', role: 'member' }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      Team.findOne.mockResolvedValue(mockTeam);

      const result = await TeamService.removeTeamMember('admin123', 'member1');

      expect(result.username).toBe('member1');
      expect(mockTeam.members).toHaveLength(1);
      expect(mockTeam.save).toHaveBeenCalled();
    });

    test('should prevent removing only admin', async () => {
      const mockTeam = {
        members: [
          { userId: 'admin123', username: 'admin', role: 'admin' }
        ]
      };

      Team.findOne.mockResolvedValue(mockTeam);

      await expect(
        TeamService.removeTeamMember('admin123', 'admin')
      ).rejects.toThrow('Cannot remove yourself as the only admin');
    });

    test('should check remove permissions', async () => {
      const mockTeam = {
        members: [
          { userId: 'member123', username: 'member1', role: 'member' },
          { userId: 'member456', username: 'member2', role: 'member' }
        ]
      };

      Team.findOne.mockResolvedValue(mockTeam);

      await expect(
        TeamService.removeTeamMember('member123', 'member2')
      ).rejects.toThrow('You don\'t have permission to remove this member');
    });
  });

  describe('permission checking', () => {
    test('checkAddPermission should work correctly', () => {
      expect(TeamService.checkAddPermission('admin', 'admin')).toBe(true);
      expect(TeamService.checkAddPermission('admin', 'member')).toBe(true);
      expect(TeamService.checkAddPermission('member', 'admin')).toBe(false);
      expect(TeamService.checkAddPermission('manager', 'member')).toBe(true);
    });

    test('checkRemovePermission should work correctly', () => {
      expect(TeamService.checkRemovePermission('admin', 'manager')).toBe(true);
      expect(TeamService.checkRemovePermission('manager', 'member')).toBe(true);
      expect(TeamService.checkRemovePermission('member', 'admin')).toBe(false);
      expect(TeamService.checkRemovePermission('member', 'member')).toBe(false);
    });
  });
});
```

**FORMATTER TESTS:**
`backend/tests/bot/formatters/team.formatter.test.js`
```javascript
const TeamFormatter = require('../../../src/bot/formatters/team.formatter');

describe('TeamFormatter', () => {
  describe('formatMembersList', () => {
    test('should format empty team', () => {
      const result = TeamFormatter.formatMembersList([]);
      
      expect(result).toContain('👥 No team members found');
      expect(result).toContain('Use "Add Member"');
    });

    test('should format team with mixed roles', () => {
      const members = [
        { username: 'admin1', role: 'admin', isCurrentUser: true },
        { username: 'manager1', role: 'manager', isCurrentUser: false },
        { username: 'member1', role: 'member', isCurrentUser: false }
      ];

      const result = TeamFormatter.formatMembersList(members);

      expect(result).toContain('📋 Team Members (3)');
      expect(result).toContain('👑 **Admins:**');
      expect(result).toContain('• @admin1 (You)');
      expect(result).toContain('👨‍💼 **Managers:**');
      expect(result).toContain('• @manager1');
      expect(result).toContain('👥 **Members:**');
      expect(result).toContain('• @member1');
    });

    test('should handle current user flag correctly', () => {
      const members = [
        { username: 'user1', role: 'admin', isCurrentUser: false },
        { username: 'user2', role: 'member', isCurrentUser: true }
      ];

      const result = TeamFormatter.formatMembersList(members);

      expect(result).toContain('• @user1');
      expect(result).not.toContain('• @user1 (You)');
      expect(result).toContain('• @user2 (You)');
    });
  });

  describe('createMemberRemovalKeyboard', () => {
    test('should create keyboard with member options', () => {
      const members = [
        { username: 'member1', role: 'member' },
        { username: 'manager1', role: 'manager' }
      ];

      const keyboard = TeamFormatter.createMemberRemovalKeyboard(members);

      expect(keyboard.inline_keyboard).toHaveLength(3); // 2 members + cancel
      expect(keyboard.inline_keyboard[0][0].text).toContain('@member1');
      expect(keyboard.inline_keyboard[0][0].callback_data).toBe('team_remove_member1');
      expect(keyboard.inline_keyboard[2][0].text).toBe('❌ Cancel');
    });

    test('should handle empty members list', () => {
      const keyboard = TeamFormatter.createMemberRemovalKeyboard([]);

      expect(keyboard.inline_keyboard).toHaveLength(1);
      expect(keyboard.inline_keyboard[0][0].text).toBe('❌ Cancel');
    });
  });

  describe('helper functions', () => {
    test('getRoleIcon should return correct icons', () => {
      expect(TeamFormatter.getRoleIcon('admin')).toBe('👑');
      expect(TeamFormatter.getRoleIcon('manager')).toBe('👨‍💼');
      expect(TeamFormatter.getRoleIcon('member')).toBe('👥');
      expect(TeamFormatter.getRoleIcon('unknown')).toBe('👤');
    });

    test('formatDate should format dates correctly', () => {
      const date = new Date('2024-12-27');
      const result = TeamFormatter.formatDate(date);
      
      expect(result).toMatch(/Dec 27, 2024/);
    });
  });
});
```

**RUN TESTS:**
```bash
npm test -- --testPathPattern=team
```

**GIT OPERATIONS:**
```bash
git add backend/tests/bot/team.test.js
git add backend/tests/models/team.model.test.js  
git add backend/tests/services/team.service.test.js
git add backend/tests/bot/formatters/team.formatter.test.js
git commit -m "feat(team): add comprehensive integration tests"
git push origin main
```

**UPDATE AFTER:**
- Update `CURRENT-STATE.md` with what was created
- Mark task B6 complete in `TASK-LIST.md`
- Update project-progress.md to mark Team Management as complete

## Error Handling Prompt

If you encounter an error during any task:

1. **Read `PROBLEMS-LOG.md`** for similar issues
2. **Check exact error message** and trace the root cause
3. **Verify contract compliance** - ensure field names match exactly
4. **Test incrementally** - test each component before moving to next
5. **Update PROBLEMS-LOG.md** with the solution

**Common Issues:**
- **Import errors**: Check file paths and module exports
- **Database connection**: Ensure MongoDB is running and connection string is correct
- **Callback registration**: Verify callback handlers are properly registered in bot index
- **Permission errors**: Check role hierarchy and permission logic
- **Validation errors**: Ensure input validation matches contract requirements

**Error Documentation Format:**
```markdown
Date: 2024-12-27
Task: B3 - Callback Handlers
Error: TypeError: Cannot read property 'username' of undefined
Cause: Member object structure mismatch in service response
Fix: Added null checks and proper object structure validation
Prevention: Add comprehensive input validation in service layer
```

**Final Integration Test:**
After completing all tasks, test the complete flow:
1. Start bot: `npm run dev`
2. Open Telegram and find your bot
3. Type `/team`
4. Test each button: Add Member, List Members, Remove Member
5. Verify error handling with invalid inputs
6. Test role permissions with different user roles