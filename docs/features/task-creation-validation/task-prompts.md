# Task Prompts for Task Creation & Validation

## How to Use:
1. Copy each prompt exactly
2. Paste to AI
3. Report "done" or error
4. Move to next task

<!-- ## Task B1: Database Models

**MANDATORY FIRST:**
1. Read `docs/features/task-creation-validation/CURRENT-STATE.md`
2. Read `shared/contracts/models/task.contract.js` - ALL task contract fields
3. Read `docs/features/task-creation-validation/spec.md`
4. List what models this feature needs

**YOUR TASK:**
Check if Task model exists in backend/src/models/. If not, create it using the TaskContract.
Ensure all contract fields are properly implemented with Mongoose.

**FILES TO CHECK/CREATE:**
- `shared/contracts/models/task.contract.js` (should exist)
- `backend/src/models/task.model.js` (create if missing)

**REQUIREMENTS:**
- Use EXACT field names from TaskContract
- Add Mongoose validation rules from spec
- Include indexes for telegramId, assignedTo, status, deadline
- Add timestamps and soft delete functionality

**CODE STRUCTURE:**
```javascript
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // Use EXACT field names from TaskContract
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  goal: { type: String, required: true, maxlength: 500 },
  successMetric: { type: String, required: true, maxlength: 300 },
  deadline: { type: Date, required: true },
  
  // References
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'ready', 'in_progress', 'review', 'done'],
    default: 'pending'
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Tracking
  startedAt: Date,
  completedAt: Date,
  
  // Arrays
  blockers: [{ type: mongoose.Schema.Types.Mixed }],
  comments: [{ type: mongoose.Schema.Types.Mixed }],
  statusHistory: [{ type: mongoose.Schema.Types.Mixed }]
}, {
  timestamps: true  // Adds createdAt and updatedAt
});

// Add indexes
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ deadline: 1 });

module.exports = mongoose.model('Task', taskSchema);
```

**GIT OPERATIONS:**
```bash
git add backend/src/models/
git commit -m "feat(task-creation): add Task model with validation"
git push origin main
```

**UPDATE AFTER:**
- Update `CURRENT-STATE.md` with "Task model created"
- Mark B1 complete in `TASK-LIST.md` -->

<!-- ## Task B2: Bot Command Handler

**MANDATORY FIRST:**
1. Read `docs/features/task-creation-validation/CURRENT-STATE.md`
2. Read `docs/features/task-creation-validation/messages.md`
3. Read `docs/features/task-creation-validation/BOT-INTERACTIONS.md`
4. Check existing commands in `backend/src/bot/commands/`

**YOUR TASK:**
Create /newtask command handler with initial message and keyboard

**FILE TO CREATE:**
`backend/src/bot/commands/newtask.command.js`

**TEMPLATE:**
```javascript
const { MESSAGES } = require('../constants/messages');
const { createInlineKeyboard } = require('../../utils/keyboard');

// User state management
const userStates = new Map();

module.exports = {
  command: 'newtask',
  description: 'Create a new task with AI validation',
  handler: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      // Clear any existing state
      userStates.delete(userId);
      
      // Create input method keyboard
      const keyboard = createInlineKeyboard([
        [{ text: '📝 Type Description', callback_data: 'task_input_text' }],
        [{ text: '🎤 Voice Note', callback_data: 'task_input_voice' }],
        [{ text: '❌ Cancel', callback_data: 'task_cancel' }]
      ]);
      
      await bot.sendMessage(
        chatId,
        MESSAGES.TASK.WELCOME,
        { reply_markup: keyboard }
      );
      
      // Store initial state
      userStates.set(userId, {
        step: 'input_method',
        chatId,
        taskData: {}
      });
      
    } catch (error) {
      console.error('Error in /newtask command:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL);
    }
  },
  
  // Export user states for callbacks
  userStates
};
```

**REGISTER COMMAND:**
Add to `backend/src/bot/index.js`:
```javascript
const newtaskCommand = require('./commands/newtask.command');
bot.onText(/\/newtask/, (msg) => newtaskCommand.handler(bot, msg));
```

**GIT OPERATIONS:**
```bash
git add backend/src/bot/commands/
git add backend/src/bot/index.js
git commit -m "feat(task-creation): add /newtask command handler"
git push origin main
``` -->

<!-- ## Task B3: Callback Query Handlers

**MANDATORY FIRST:**
1. Read `docs/features/task-creation-validation/BOT-INTERACTIONS.md`
2. Check callback_data patterns from Task B2
3. Read `docs/features/task-creation-validation/messages.md`

**YOUR TASK:**
Handle all button presses and inline keyboard actions for task creation flow

**FILE TO CREATE:**
`backend/src/bot/callbacks/task-creation.callbacks.js`

**STRUCTURE:**
```javascript
const { MESSAGES } = require('../constants/messages');
const { createInlineKeyboard } = require('../../utils/keyboard');
const { userStates } = require('../commands/newtask.command');

const handleTaskInputText = async (bot, query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;
  
  try {
    await bot.editMessageText(
      '📝 Type your task description:\n\nExample: "Fix login error on mobile app by tomorrow"',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
    // Update user state
    const state = userStates.get(userId) || {};
    state.step = 'awaiting_description';
    userStates.set(userId, state);
    
  } catch (error) {
    console.error('Error handling text input:', error);
  }
};

const handleTaskCancel = async (bot, query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;
  
  try {
    await bot.editMessageText(
      '❌ Task creation cancelled.',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
    // Clear user state
    userStates.delete(userId);
    
  } catch (error) {
    console.error('Error cancelling task:', error);
  }
};

const handleDeadlineToday = async (bot, query) => {
  const userId = query.from.id;
  const state = userStates.get(userId);
  
  if (state) {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    state.taskData.deadline = today;
    userStates.set(userId, state);
    
    // Continue to next missing field or confirmation
    await checkTaskCompletion(bot, query);
  }
};

const checkTaskCompletion = async (bot, query) => {
  const userId = query.from.id;
  const state = userStates.get(userId);
  
  if (!state) return;
  
  const { taskData } = state;
  
  // Check for missing required fields
  if (!taskData.goal) {
    await promptForGoal(bot, query);
  } else if (!taskData.successMetric) {
    await promptForSuccessMetric(bot, query);
  } else if (!taskData.deadline) {
    await promptForDeadline(bot, query);
  } else {
    await showTaskSummary(bot, query);
  }
};

module.exports = {
  'task_input_text': handleTaskInputText,
  'task_input_voice': handleTaskInputVoice,
  'task_cancel': handleTaskCancel,
  'deadline_today': handleDeadlineToday,
  'deadline_tomorrow': handleDeadlineTomorrow,
  'deadline_week': handleDeadlineWeek,
  'deadline_custom': handleDeadlineCustom,
  'task_confirm_create': handleTaskConfirmCreate,
  'task_edit': handleTaskEdit
};
```

**REGISTER CALLBACKS:**
In `backend/src/bot/index.js`:
```javascript
const taskCallbacks = require('./callbacks/task-creation.callbacks');

bot.on('callback_query', async (query) => {
  const action = query.data;
  if (taskCallbacks[action]) {
    await taskCallbacks[action](bot, query);
    await bot.answerCallbackQuery(query.id);
  }
});
```

**GIT OPERATIONS:**
```bash
git add backend/src/bot/callbacks/
git commit -m "feat(task-creation): add callback query handlers"
git push origin main
``` -->

<!-- ## Task B4: Service Layer

**MANDATORY FIRST:**
1. Read contracts in `shared/contracts/services/`
2. Read `docs/features/task-creation-validation/spec.md`
3. Check validation rules and AI parsing requirements

**YOUR TASK:**
Create business logic for task creation with validation and AI parsing

**FILE TO CREATE:**
`backend/src/services/task-creation/task-creation.service.js`

**STRUCTURE:**
```javascript
const Task = require('../../models/task.model');
const { ValidationError } = require('../../utils/errors');

class TaskCreationService {
  async parseTaskDescription(description, userId) {
    // Simple AI parsing (can be enhanced with actual AI later)
    const parsed = {
      title: this.extractTitle(description),
      goal: this.extractGoal(description),
      successMetric: this.extractSuccessMetric(description),
      deadline: this.extractDeadline(description),
      description: description.trim()
    };
    
    return parsed;
  }
  
  extractTitle(text) {
    // Extract first sentence or first 50 chars as title
    const firstSentence = text.split('.')[0];
    return firstSentence.length > 50 ? 
      firstSentence.substring(0, 50) + '...' : 
      firstSentence;
  }
  
  extractGoal(text) {
    // Look for goal indicators
    const goalKeywords = ['fix', 'create', 'implement', 'solve', 'build'];
    for (const keyword of goalKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        return text; // Return full text as goal for now
      }
    }
    return '';
  }
  
  extractSuccessMetric(text) {
    // Look for success indicators
    const successKeywords = ['works', 'completed', 'error-free', 'successful'];
    for (const keyword of successKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        return `Task is ${keyword}`;
      }
    }
    return '';
  }
  
  extractDeadline(text) {
    // Simple deadline parsing
    const today = new Date();
    
    if (text.toLowerCase().includes('today')) {
      today.setHours(23, 59, 59, 999);
      return today;
    }
    
    if (text.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      return tomorrow;
    }
    
    if (text.toLowerCase().includes('week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);
      return nextWeek;
    }
    
    return null;
  }
  
  validateTaskData(data) {
    const errors = [];
    
    // Apply Elon Musk principles
    if (!data.goal || data.goal.length < 10) {
      errors.push('Goal must be clear and specific (minimum 10 characters)');
    }
    
    if (!data.successMetric || data.successMetric.length < 5) {
      errors.push('Success metric must be measurable');
    }
    
    if (!data.deadline) {
      errors.push('Deadline is required');
    } else if (new Date(data.deadline) <= new Date()) {
      errors.push('Deadline must be in the future');
    }
    
    if (!data.title || data.title.length < 3) {
      errors.push('Title must be descriptive');
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors.join('. '));
    }
    
    return true;
  }
  
  async createTask(taskData) {
    // Validate before creating
    this.validateTaskData(taskData);
    
    // Create task with exact contract fields
    const task = new Task({
      title: taskData.title,
      description: taskData.description,
      goal: taskData.goal,
      successMetric: taskData.successMetric,
      deadline: taskData.deadline,
      createdBy: taskData.createdBy,
      status: 'pending',
      priority: taskData.priority || 'medium'
    });
    
    return await task.save();
  }
}

module.exports = new TaskCreationService();
```

**GIT OPERATIONS:**
```bash
git add backend/src/services/
git commit -m "feat(task-creation): add service layer with validation"
git push origin main
``` -->

<!-- ## Task B5: Message Formatters

**MANDATORY FIRST:**
1. Read `docs/features/task-creation-validation/messages.md`
2. Check Telegram formatting options
3. Review task card requirements

**YOUR TASK:**
Create message formatters for beautiful task display

**FILE TO CREATE:**
`backend/src/bot/formatters/task-creation.formatter.js`

**STRUCTURE:**
```javascript
const { createInlineKeyboard } = require('../../utils/keyboard');

const formatTaskSummary = (task, username) => {
  return `✅ *Task Summary*

📋 *Title:* ${task.title}
🎯 *Goal:* ${task.goal}
📏 *Success Metric:* ${task.successMetric}
📅 *Deadline:* ${formatDate(task.deadline)}
👤 *Created by:* @${username}

Is this correct?`;
};

const formatSuccessMessage = (task) => {
  return `✅ *Task Created Successfully!*

📋 ${task.title}
🆔 *Task ID:* #${task._id.toString().slice(-6)}
📅 *Due:* ${formatDate(task.deadline)}
🎯 *Success:* ${task.successMetric}

The task is ready to be assigned to a team member.`;
};

const formatValidationError = (errors) => {
  return `❌ *Task cannot be created:*

${errors}

Please provide the missing information.`;
};

const formatDate = (date) => {
  const now = new Date();
  const taskDate = new Date(date);
  const diffTime = taskDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  
  return taskDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

const createTaskSummaryKeyboard = () => {
  return createInlineKeyboard([
    [
      { text: '✅ Create Task', callback_data: 'task_confirm_create' },
      { text: '✏️ Edit Details', callback_data: 'task_edit' }
    ],
    [
      { text: '❌ Cancel', callback_data: 'task_cancel' }
    ]
  ]);
};

const createDeadlineKeyboard = () => {
  return createInlineKeyboard([
    [
      { text: '📅 Today', callback_data: 'deadline_today' },
      { text: '📅 Tomorrow', callback_data: 'deadline_tomorrow' }
    ],
    [
      { text: '📅 This Week', callback_data: 'deadline_week' },
      { text: '📅 Custom', callback_data: 'deadline_custom' }
    ]
  ]);
};

const createEditKeyboard = () => {
  return createInlineKeyboard([
    [
      { text: '✏️ Edit Title', callback_data: 'edit_title' },
      { text: '🎯 Edit Goal', callback_data: 'edit_goal' }
    ],
    [
      { text: '📏 Edit Metric', callback_data: 'edit_metric' },
      { text: '📅 Edit Deadline', callback_data: 'edit_deadline' }
    ],
    [
      { text: '✅ Save Changes', callback_data: 'task_confirm_create' },
      { text: '❌ Cancel', callback_data: 'task_cancel' }
    ]
  ]);
};

module.exports = {
  formatTaskSummary,
  formatSuccessMessage,
  formatValidationError,
  formatDate,
  createTaskSummaryKeyboard,
  createDeadlineKeyboard,
  createEditKeyboard
};
```

**GIT OPERATIONS:**
```bash
git add backend/src/bot/formatters/
git commit -m "feat(task-creation): add message formatters"
git push origin main
``` -->

## Task B6: Integration Tests

**MANDATORY FIRST:**
1. Test each component manually first
2. Note test scenarios from spec
3. Review error cases

**YOUR TASK:**
Create automated tests for the complete task creation flow

**FILE TO CREATE:**
`backend/tests/bot/task-creation.test.js`

**STRUCTURE:**
```javascript
const TaskCreationService = require('../../src/services/task-creation/task-creation.service');
const Task = require('../../src/models/task.model');

describe('Task Creation & Validation', () => {
  beforeEach(async () => {
    // Clear test data
    await Task.deleteMany({});
  });

  describe('TaskCreationService', () => {
    test('should parse task description correctly', async () => {
      const description = 'Fix login bug by tomorrow';
      const userId = 'test-user-id';
      
      const parsed = await TaskCreationService.parseTaskDescription(description, userId);
      
      expect(parsed.title).toContain('Fix login bug');
      expect(parsed.deadline).toBeDefined();
    });

    test('should validate required fields', () => {
      const invalidData = {
        title: 'Short',
        goal: '',
        successMetric: '',
        deadline: null
      };

      expect(() => {
        TaskCreationService.validateTaskData(invalidData);
      }).toThrow();
    });

    test('should create task with valid data', async () => {
      const validData = {
        title: 'Fix login authentication error',
        description: 'Users cannot log in on mobile app',
        goal: 'Resolve authentication issues on mobile platform',
        successMetric: 'Users can successfully log in without errors',
        deadline: new Date(Date.now() + 86400000), // Tomorrow
        createdBy: 'test-user-id'
      };

      const task = await TaskCreationService.createTask(validData);
      
      expect(task._id).toBeDefined();
      expect(task.status).toBe('pending');
      expect(task.title).toBe(validData.title);
    });
  });

  describe('Command Flow', () => {
    test('should handle complete task creation flow', async () => {
      // Mock bot interaction
      const mockBot = {
        sendMessage: jest.fn(),
        editMessageText: jest.fn()
      };

      const mockMsg = {
        chat: { id: 123 },
        from: { id: 456, first_name: 'Test' }
      };

      // Test command handler
      const newtaskCommand = require('../../src/bot/commands/newtask.command');
      await newtaskCommand.handler(mockBot, mockMsg);

      expect(mockBot.sendMessage).toHaveBeenCalled();
      expect(newtaskCommand.userStates.has(456)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing goal gracefully', () => {
      const dataWithoutGoal = {
        title: 'Some task',
        successMetric: 'Task completed',
        deadline: new Date(Date.now() + 86400000)
      };

      expect(() => {
        TaskCreationService.validateTaskData(dataWithoutGoal);
      }).toThrow('Goal must be clear and specific');
    });

    test('should handle past deadline', () => {
      const dataWithPastDeadline = {
        title: 'Fix urgent bug',
        goal: 'Fix the critical bug affecting users',
        successMetric: 'Bug is resolved',
        deadline: new Date(Date.now() - 86400000) // Yesterday
      };

      expect(() => {
        TaskCreationService.validateTaskData(dataWithPastDeadline);
      }).toThrow('Deadline must be in the future');
    });
  });
});
```

**GIT OPERATIONS:**
```bash
git add backend/tests/
git commit -m "feat(task-creation): add integration tests"
git push origin main
```

## Error Handling Prompt

If you encounter an error during any task:

1. Read `PROBLEMS-LOG.md` for similar issues
2. Check exact error message
3. Verify contract compliance  
4. Update PROBLEMS-LOG.md with solution

**Log Format:**
```
Date: 2024-12-19
Task: B[X]
Error: [exact error message]
Cause: [why it happened] 
Fix: [how fixed]
Prevention: [avoid in future]
``` 