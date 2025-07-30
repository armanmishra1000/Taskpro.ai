# Task Creation & Validation Bot Interactions

## User Flow:
1. User types `/newtask` or clicks "🆕 New Task" button
2. Bot asks: "What needs to be done?"
3. User provides task description (text or voice)
4. Bot uses AI to extract goal, metric, deadline
5. If missing info, bot prompts for specific details
6. Bot shows task summary for confirmation
7. User confirms or edits the task
8. Bot creates task and shows success message

## Messages:
### Command: /newtask
**Bot Response:**
```
🆕 Creating New Task

What needs to be done?
You can type or send a voice note.
```
**Keyboard:**
```javascript
{
  inline_keyboard: [
    [{ text: "📝 Type Description", callback_data: "task_input_text" }],
    [{ text: "🎤 Voice Note", callback_data: "task_input_voice" }],
    [{ text: "❌ Cancel", callback_data: "task_cancel" }]
  ]
}
```

### Missing Information Prompts:
**Missing Goal:**
```
❓ I need more details:
What's the specific goal?

Example: "Fix login error on mobile app"
```

**Missing Deadline:**
```
📅 When should this be completed?
```
**Keyboard:**
```javascript
{
  inline_keyboard: [
    [
      { text: "📅 Today", callback_data: "deadline_today" },
      { text: "📅 Tomorrow", callback_data: "deadline_tomorrow" }
    ],
    [
      { text: "📅 This Week", callback_data: "deadline_week" },
      { text: "📅 Custom", callback_data: "deadline_custom" }
    ]
  ]
}
```

**Missing Success Metric:**
```
🎯 How will we measure success?

Example: "Users can log in without errors"
```

### Task Summary Confirmation:
```
✅ Task Summary

📋 Title: Fix mobile login error
🎯 Goal: Resolve authentication issues on mobile app
📏 Success Metric: Users can log in without errors
📅 Deadline: Tomorrow (Dec 20, 2024)
👤 Created by: @username

Is this correct?
```
**Keyboard:**
```javascript
{
  inline_keyboard: [
    [
      { text: "✅ Create Task", callback_data: "task_confirm_create" },
      { text: "✏️ Edit", callback_data: "task_edit" }
    ],
    [
      { text: "❌ Cancel", callback_data: "task_cancel" }
    ]
  ]
}
```

## Callback Handlers:
- `task_input_text`: Start text input flow
- `task_input_voice`: Start voice input flow
- `task_cancel`: Cancel task creation
- `deadline_today`: Set deadline to today
- `deadline_tomorrow`: Set deadline to tomorrow
- `deadline_week`: Set deadline to end of week
- `deadline_custom`: Show custom date picker
- `task_confirm_create`: Create the task
- `task_edit`: Allow editing of task details 