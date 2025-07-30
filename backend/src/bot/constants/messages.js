module.exports = {
  MESSAGES: {
    ERRORS: {
      GENERAL: '❌ Something went wrong. Please try again.',
      INVALID_INPUT: '❌ Invalid input. Please check and try again.',
      NOT_FOUND: '❌ Not found. Please check your request.',
      UNAUTHORIZED: '❌ You are not authorized for this action.'
    },
    
    TASK: {
      WELCOME: '🆕 Creating New Task\n\nWhat needs to be done?\nYou can type or send a voice note.',
      MISSING_GOAL: '❓ I need more details:\nWhat\'s the specific goal?\n\nExample: "Fix login error on mobile app"',
      MISSING_DEADLINE: '📅 When should this be completed?',
      MISSING_METRIC: '🎯 How will we measure success?\n\nExample: "Users can log in without errors"',
      CREATED: '✅ Task created successfully!',
      UPDATED: '✅ Task updated successfully!'
    },
    
    TEAM: {
      WELCOME: '👥 Team Management\n\nChoose an action:',
      ADD_INSTRUCTIONS: '👤 Add Team Member\n\nPlease provide member information:\nFormat: @username Role\n\nExamples:\n• @john_doe manager\n• @jane_smith member\n• @admin_user admin\n\nRoles: member, manager, admin',
      MEMBER_ADDED: '✅ Team Member Added!',
      MEMBER_REMOVED: '✅ Member Removed',
      NO_MEMBERS: '👥 No team members found\n\nUse "Add Member" to start building your team.',
      INVALID_FORMAT: '❌ Invalid Format\n\nPlease use format: @username role\n\nExample: @john_doe manager',
      PERMISSION_DENIED: '❌ Permission Denied\n\nYou don\'t have permission for this action.',
      CANNOT_REMOVE_SELF: '❌ Cannot Remove Yourself\n\nYou are the only admin in this team.\nPromote another member to admin first.',
      MEMBER_EXISTS: '❌ Member Already Added\n\n@{username} is already a team member.\nUse /team list to see all members.'
    },
    
    ASSIGNMENT: {
      WELCOME: '👤 Task Assignment\n\nChoose a task to assign:',
      NO_TASKS: '✅ All Tasks Assigned\n\nGreat news! All your tasks are already assigned to team members.\n\nCreate a new task with /newtask or check task status with /mytasks.',
      SELECT_MEMBER: '👤 Select Team Member\n\nAssigning: {taskTitle}\n\nChoose who should work on this task:',
      SUCCESS: '✅ Task Assigned Successfully!',
      CONFIRMATION: '🤔 Confirm Assignment',
      NOTIFICATION: '📬 New Task Assigned to You'
    },
    
    BLOCKER: {
      ATTEMPTS_PROMPT: '🔄 *What Have You Tried?*\n\nPlease describe your attempts to resolve this blocker:\n\n_(Minimum 20 characters required)_',
      ATTEMPTS_TOO_SHORT: '❌ Description too short. Please provide at least 20 characters describing your attempts.',
      LOGS_PROMPT: '📋 *Provide Evidence*\n\nPlease share proof of your attempts:\n\n_(Minimum 10 characters required)_',
      LOGS_TOO_SHORT: '❌ Evidence too short. Please provide at least 10 characters of evidence.',
      DUPLICATE_BLOCKER: '⚠️ *Blocker Already Reported*\n\nThis task already has an active blocker.\nContact your manager or wait for resolution.',
      INVALID_STATUS: '❌ *Cannot Report Blocker*\n\nBlockers can only be reported for Ready or In Progress tasks.'
    }
  }
}; 