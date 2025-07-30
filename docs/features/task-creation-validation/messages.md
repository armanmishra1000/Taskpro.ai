# Task Creation & Validation Bot Messages

## Command: /newtask

### Initial Message
```
🆕 Creating New Task

What needs to be done? 
You can type or send a voice note.
```

### Input Method Selection
**Keyboard:**
- 📝 Type Description
- 🎤 Voice Note
- ❌ Cancel

### Validation Messages
**Missing Goal:**
```
❓ I need more details:
What's the specific goal?

Example: "Fix login error on mobile app"
```

**Missing Deadline:**
```
📅 When should this be completed?

Please choose a deadline:
```
**Keyboard:**
- 📅 Today
- 📅 Tomorrow  
- 📅 This Week
- 📅 Custom Date

**Missing Success Metric:**
```
🎯 How will we measure success?

Example: "Users can log in without errors"
```

**Unclear Description:**
```
❓ I need more clarity:
Can you be more specific about what needs to be done?

Current: "{user_input}"
```

### Confirmation Messages
**Task Summary:**
```
✅ Task Summary

📋 Title: {title}
🎯 Goal: {goal}
📏 Success Metric: {successMetric}
📅 Deadline: {formattedDeadline}
👤 Created by: @{username}

Is this correct?
```
**Keyboard:**
- ✅ Create Task
- ✏️ Edit Details
- ❌ Cancel

### Success Messages
**Task Created:**
```
✅ Task Created Successfully!

📋 {title}
🆔 Task ID: #{taskId}
📅 Due: {deadline}
🎯 Success: {successMetric}

The task is ready to be assigned to a team member.
```

**Voice Note Processed:**
```
🎤 Voice note received!
Processing your task description...

⏳ Please wait while I analyze the details.
```

## Error Messages
**Invalid Input:**
```
❌ I couldn't understand that.
Please provide a clear task description or use /help for guidance.
```

**Network Error:**
```
❌ Connection issue occurred.
Please try again in a moment.
```

**Missing Required Info:**
```
❌ Task cannot be created without:
{missing_fields}

Please provide the missing information.
```

## Interactive Prompts
**Custom Deadline Input:**
```
📅 Enter custom deadline:
Format: YYYY-MM-DD or "in 3 days" or "next Monday"

Examples:
• 2024-12-25
• in 1 week
• next Friday
```

**Edit Task Details:**
```
✏️ What would you like to edit?

Current task:
📋 {title}
🎯 {goal}
📏 {successMetric}
📅 {deadline}
```
**Keyboard:**
- ✏️ Edit Title
- 🎯 Edit Goal
- 📏 Edit Success Metric
- 📅 Edit Deadline
- ✅ Save Changes
- ❌ Cancel 