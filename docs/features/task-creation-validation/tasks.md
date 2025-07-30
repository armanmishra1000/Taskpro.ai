# Task Creation & Validation Implementation Tasks

## Task B1: Database Models
**Files:** 
- Check: `shared/contracts/models/task.contract.js`
- Create: `backend/src/models/task.model.js`

**Requirements:**
- Use existing TaskContract from shared/contracts
- Create Mongoose schema with exact field names
- Add validation rules from spec
- Include indexes for performance

**Expected Outcome:**
- Task model ready to store validated task data
- All contract fields properly implemented

## Task B2: Bot Command Handler
**File:** `backend/src/bot/commands/newtask.command.js`

**Structure:**
```javascript
module.exports = {
  command: 'newtask',
  description: 'Create a new task with validation',
  handler: async (bot, msg) => {
    // Implementation
  }
}
```

**Requirements:**
- Handle /newtask command
- Show initial message with input options
- Store user state for multi-step flow
- Handle both text and voice input paths

## Task B3: Callback Query Handlers
**File:** `backend/src/bot/callbacks/task-creation.callbacks.js`

**Handle:**
- task_input_text: Start text input flow
- task_input_voice: Start voice input flow
- task_cancel: Cancel task creation
- deadline_*: Handle deadline selection
- task_confirm_create: Create the task
- task_edit: Edit task details

**Requirements:**
- Manage user state between steps
- Validate input at each stage
- Provide clear feedback for each action

## Task B4: Service Layer
**File:** `backend/src/services/task-creation/task-creation.service.js`

**Methods:**
- parseTaskDescription(text): Extract goal, metric, deadline
- validateTaskData(data): Check completeness and validity
- createTask(taskData): Save validated task to database
- suggestImprovements(task): AI-powered suggestions

**Requirements:**
- Apply Elon Musk validation principles
- Handle natural language processing
- Provide meaningful validation errors

## Task B5: Message Formatters
**File:** `backend/src/bot/formatters/task-creation.formatter.js`

**Functions:**
- formatTaskSummary(task): Pretty task summary
- formatValidationError(errors): User-friendly error messages
- createTaskCreationKeyboard(): Dynamic inline keyboards
- formatSuccessMessage(task): Success confirmation

**Requirements:**
- Beautiful, emoji-rich formatting
- Clear visual hierarchy
- Responsive keyboard layouts

## Task B6: Integration Tests
**File:** `backend/tests/bot/task-creation.test.js`

**Test Scenarios:**
- Complete task creation flow
- Missing information handling
- Voice note processing
- Error cases and edge conditions
- Validation rule enforcement

**Requirements:**
- Mock bot interactions
- Test database operations
- Verify message formatting
- Check error handling 