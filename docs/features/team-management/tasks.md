# Team Management Implementation Tasks

## Task B1: Team Database Model and Contract
**Files:** 
- Create: `shared/contracts/models/team.contract.js`
- Create: `backend/src/models/team.model.js`

**Requirements:**
- Create new team contract following existing patterns
- Implement mongoose model with proper validation
- Add team reference to user model if needed
- Maintain contract compatibility with base model

**Contract Structure:**
```javascript
// shared/contracts/models/team.contract.js
module.exports = {
  TeamContract: {
    // Extends BaseModelContract
    name: 'String',              // Team name, required
    description: 'String',       // Team description, optional
    createdBy: 'ObjectId',       // Creator user ID
    members: 'Array',            // Array of member objects
    settings: {
      allowMemberInvite: 'Boolean',
      requireApproval: 'Boolean'
    }
  }
};
```

## Task B2: Bot Command Handler
**File:** `backend/src/bot/commands/team.command.js`

**Structure:**
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
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL);
    }
  }
};
```

**Integration:**
- Register command in `backend/src/bot/index.js`
- Add message constants to `backend/src/bot/constants/messages.js`

## Task B3: Callback Query Handlers
**File:** `backend/src/bot/callbacks/team.callbacks.js`

**Handle:**
- `team_add`: Add member workflow
- `team_list`: Display team members
- `team_remove`: Remove member workflow
- `team_settings`: Team configuration
- `team_remove_{username}`: Specific member removal
- `team_confirm_{action}_{username}`: Confirmation dialogs
- `team_cancel`: Cancel operations

**Key Methods:**
```javascript
const handleTeamAdd = async (bot, query) => {
  // Switch to text input mode for @username role
  await bot.editMessageText(
    MESSAGES.TEAM.ADD_INSTRUCTIONS,
    {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id
    }
  );
  
  // Set user state to await text input
  await storeUserState(query.from.id, 'awaiting_team_member');
};

const handleTeamList = async (bot, query) => {
  // Format and display all team members by role
  const teamMembers = await TeamService.getTeamMembers(query.from.id);
  const formattedList = TeamFormatter.formatMembersList(teamMembers);
  
  await bot.editMessageText(formattedList, {
    chat_id: query.message.chat.id,
    message_id: query.message.message_id,
    parse_mode: 'Markdown'
  });
};
```

## Task B4: Service Layer
**File:** `backend/src/services/team/team.service.js`

**Methods:**
- `addTeamMember(userId, username, role)`
- `removeTeamMember(userId, targetUsername)`
- `getTeamMembers(userId)`
- `updateMemberRole(userId, targetUsername, newRole)`
- `validateMemberPermissions(userId, action, targetRole)`

**Key Features:**
- Role-based permission checking
- Telegram username validation
- Member existence validation
- Team creation if not exists

**Business Logic:**
```javascript
class TeamService {
  async addTeamMember(userId, username, role) {
    // Validate role
    if (!['member', 'manager', 'admin'].includes(role)) {
      throw new ValidationError('Invalid role');
    }
    
    // Check permissions
    await this.validatePermissions(userId, 'add', role);
    
    // Validate username format
    if (!username.startsWith('@')) {
      throw new ValidationError('Username must start with @');
    }
    
    // Add member to team
    const team = await this.getOrCreateTeam(userId);
    // Implementation...
  }
}
```

## Task B5: Message Formatters
**File:** `backend/src/bot/formatters/team.formatter.js`

**Functions:**
- `formatMembersList(members)` - Team members grouped by role
- `formatMemberCard(member)` - Individual member display
- `createTeamKeyboard(action)` - Dynamic keyboards
- `formatAddMemberSuccess(member)` - Success messages

**Key Formatters:**
```javascript
const formatMembersList = (members) => {
  const adminList = members.filter(m => m.role === 'admin')
    .map(m => `• @${m.username}${m.isCurrentUser ? ' (You)' : ''}`)
    .join('\n');
    
  const managerList = members.filter(m => m.role === 'manager')
    .map(m => `• @${m.username}`)
    .join('\n');
    
  const memberList = members.filter(m => m.role === 'member')
    .map(m => `• @${m.username}`)
    .join('\n');
    
  return `📋 Team Members (${members.length})\n\n` +
         `👑 **Admins:**\n${adminList}\n\n` +
         `👨‍💼 **Managers:**\n${managerList}\n\n` +
         `👥 **Members:**\n${memberList}`;
};

const createMemberRemovalKeyboard = (members, currentUserRole) => {
  const buttons = members
    .filter(member => canRemove(currentUserRole, member.role))
    .map(member => [{
      text: `${getRoleIcon(member.role)} @${member.username}`,
      callback_data: `team_remove_${member.username}`
    }]);
    
  buttons.push([{ text: '❌ Cancel', callback_data: 'team_cancel' }]);
  
  return { inline_keyboard: buttons };
};
```

## Task B6: Integration Tests
**File:** `backend/tests/bot/team.test.js`

**Test Coverage:**
- Command responses and keyboard display
- Add member validation and success flows
- List members formatting for different team sizes
- Remove member permissions and confirmation
- Error handling for invalid inputs
- Role-based permission enforcement

**Test Structure:**
```javascript
describe('Team Management Bot Commands', () => {
  test('/team shows team management menu', async () => {
    // Test command response with keyboard
  });
  
  test('team_add validates username format', async () => {
    // Test validation for @username format
  });
  
  test('team_list displays members by role hierarchy', async () => {
    // Test member list formatting
  });
  
  test('admins can remove managers and members', async () => {
    // Test role permissions
  });
  
  test('members cannot remove other members', async () => {
    // Test permission denial
  });
  
  test('cannot remove self as only admin', async () => {
    // Test self-removal protection
  });
  
  test('handles database errors gracefully', async () => {
    // Test error handling
  });
});
```

**Additional Test Files:**
- `backend/tests/models/team.model.test.js` - Model validation tests
- `backend/tests/services/team.service.test.js` - Service layer tests
- `backend/tests/bot/formatters/team.formatter.test.js` - Formatter tests
- `backend/tests/bot/callbacks/team.callbacks.test.js` - Callback tests

## Integration Requirements:

### Update Constants:
**File:** `backend/src/bot/constants/messages.js`
```javascript
TEAM: {
  WELCOME: '👥 Team Management\n\nChoose an action:',
  ADD_INSTRUCTIONS: '👤 Add Team Member\n\nFormat: @username role\n\nRoles: member, manager, admin',
  MEMBER_ADDED: '✅ Team Member Added!',
  MEMBER_REMOVED: '✅ Member Removed',
  NO_MEMBERS: '👥 No team members found',
  INVALID_FORMAT: '❌ Please use format: @username role',
  PERMISSION_DENIED: '❌ You don\'t have permission for this action',
  CANNOT_REMOVE_SELF: '❌ Cannot remove yourself as the only admin'
}
```

### Register Command:
**File:** `backend/src/bot/index.js`
```javascript
const teamCommand = require('./commands/team.command');
const teamCallbacks = require('./callbacks/team.callbacks');

// Add team command
bot.onText(/\/team/, (msg) => teamCommand.handler(bot, msg));

// Update callback handler to include team callbacks
bot.on('callback_query', async (query) => {
  const action = query.data;
  if (taskCallbacks[action]) {
    await taskCallbacks[action](bot, query);
  } else if (teamCallbacks[action]) {
    await teamCallbacks[action](bot, query);
  }
  await bot.answerCallbackQuery(query.id);
});
```

### Text Message Handler:
Add text input handling for member addition:
```javascript
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    const userState = await getUserState(msg.from.id);
    
    if (userState === 'awaiting_team_member') {
      await teamCallbacks.handleMemberInput(bot, msg);
    }
  }
});
```