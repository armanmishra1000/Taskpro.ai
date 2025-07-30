# Task Creation & Validation Specification

## Overview
This feature allows team members to create well-structured tasks using natural language input. The system applies Elon Musk's delegation principles by ensuring every task has a clear goal, measurable success metric, and realistic deadline before it can be assigned.

## Elon Musk Principles Applied
- **Clear Goal**: Every task must have a specific, unambiguous objective
- **Measurable Success**: Tasks require defined success metrics to avoid ambiguity
- **Realistic Deadlines**: All tasks must have concrete deadlines to ensure accountability
- **Complete Information**: No task is created without all required details

## User Flow
1. User types `/newtask` or clicks "🆕 New Task" button
2. Bot responds with input options (text/voice)
3. User provides task description
4. AI parser extracts goal, metric, and deadline from description
5. Bot prompts for any missing critical information
6. Bot shows formatted task summary for confirmation
7. User confirms or edits the task details
8. Bot creates task in database and shows success message

## Bot Commands
- `/newtask` - Start task creation process
- Callback queries: `task_*`, `deadline_*`

## Database Requirements
- Model: TaskContract from shared/contracts/models/task.contract.js
- New fields: None needed (contract is complete)

## Message Templates
- Welcome: "🆕 Creating New Task\n\nWhat needs to be done?"
- Missing Goal: "❓ I need more details: What's the specific goal?"
- Missing Deadline: "📅 When should this be completed?"
- Missing Metric: "🎯 How will we measure success?"
- Success: "✅ Task created successfully! Task ID: #{taskId}"

## Validation Rules
- title: Required, max 200 chars, must be clear and specific
- goal: Required, max 500 chars, must describe specific objective
- successMetric: Required, max 300 chars, must be measurable
- deadline: Required, must be future date, realistic timeframe
- description: Optional, max 1000 chars for additional context

## AI Parsing Requirements
- Extract goal from natural language description
- Identify success metrics or suggest measurable outcomes
- Parse deadline information (relative or absolute dates)
- Flag incomplete or ambiguous task descriptions
- Suggest improvements for clarity 