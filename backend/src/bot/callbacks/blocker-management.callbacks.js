const Task = require('../../models/task.model');
const Team = require('../../models/team.model');
const blockerService = require('../../services/blocker-management/blocker-management.service');

// State storage for multi-step form (in-memory for now)
const blockerForms = new Map();

// Helper function to get task by short ID
const getTaskByShortId = async (shortId) => {
  return await Task.findOne({
    $expr: {
      $regexMatch: {
        input: { $toString: "$_id" },
        regex: shortId + "$"
      }
    }
  }).populate('assignedTo', 'firstName lastName username')
    .populate('createdBy', 'firstName lastName username')
    .populate('teamId');
};

// Helper function to format blocker form messages
const formatBlockerForm = (step, task) => {
  const taskTitle = task.title;
  const assigneeName = task.assignedTo?.username 
    ? `@${task.assignedTo.username}` 
    : task.assignedTo?.firstName || 'Unassigned';

  switch (step) {
    case 'main':
      return `🚧 Report Task Blocker

📋 Task: ${taskTitle}
👤 Assigned to: ${assigneeName}

This task is blocked and needs management attention.
Please provide complete information for proper escalation:`;

    case 'impact':
      return `📊 Impact Assessment

How is this blocker affecting task progress?

Choose the severity level:`;

    case 'attempts':
      return `🔄 What Have You Tried?

Please describe your attempts to resolve this blocker:

Include:
• Specific actions taken
• Resources consulted  
• People contacted
• Time spent trying

(Minimum 20 characters required)`;

    case 'logs':
      return `📋 Provide Evidence

Please share proof of your attempts:

Examples:
• Error messages or screenshots
• Documentation links checked
• Email threads or chat logs
• Code snippets tried

(Minimum 10 characters required)`;

    default:
      return '🚧 Blocker Report';
  }
};

// Helper function to create blocker keyboards
const createBlockerKeyboard = (taskId, step) => {
  const shortId = taskId.toString().slice(-6);

  switch (step) {
    case 'main':
      return {
        inline_keyboard: [
          [{ text: "📊 Impact Assessment", callback_data: `blocker_impact_${shortId}` }],
          [{ text: "🔄 Attempts Made", callback_data: `blocker_attempts_${shortId}` }],
          [{ text: "📋 Solution Logs", callback_data: `blocker_logs_${shortId}` }],
          [{ text: "❌ Cancel", callback_data: `blocker_cancel_${shortId}` }]
        ]
      };

    case 'impact':
      return {
        inline_keyboard: [
          [{ text: "🔴 Critical - Stops all progress", callback_data: `impact_critical_${shortId}` }],
          [{ text: "🟡 High - Delays completion", callback_data: `impact_high_${shortId}` }],
          [{ text: "🟢 Medium - Slows progress", callback_data: `impact_medium_${shortId}` }],
          [{ text: "⬅️ Back", callback_data: `blocker_main_${shortId}` }]
        ]
      };

    case 'attempts':
      return {
        inline_keyboard: [
          [{ text: "⬅️ Back", callback_data: `blocker_main_${shortId}` }],
          [{ text: "❌ Cancel", callback_data: `blocker_cancel_${shortId}` }]
        ]
      };

    case 'logs':
      return {
        inline_keyboard: [
          [{ text: "⬅️ Back", callback_data: `blocker_attempts_${shortId}` }],
          [{ text: "❌ Cancel", callback_data: `blocker_cancel_${shortId}` }]
        ]
      };

    default:
      return {
        inline_keyboard: [
          [{ text: "❌ Cancel", callback_data: `blocker_cancel_${shortId}` }]
        ]
      };
  }
};

// Main blocker report handler
const handleBlockerReport = async (bot, query) => {
  const shortId = query.data.split('_')[2];
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;
  
  try {
    // Get task details
    const task = await getTaskByShortId(shortId);
    if (!task) {
      await bot.answerCallbackQuery(query.id, { text: "Task not found" });
      return true;
    }

    // Check if task can have blockers
    const canReport = await blockerService.canReportBlocker(task._id);
    if (!canReport.canReport) {
      await bot.answerCallbackQuery(query.id, { 
        text: canReport.reason 
      });
      return true;
    }

    // Initialize form state
    blockerForms.set(userId, {
      taskId: task._id,
      shortId,
      impact: null,
      attempts: null,
      logs: null,
      step: 'main'
    });
    
    // Show blocker form
    const message = formatBlockerForm('main', task);
    const keyboard = createBlockerKeyboard(task._id, 'main');
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    await bot.answerCallbackQuery(query.id);
    return true;
    
  } catch (error) {
    console.error('Blocker report error:', error);
    await bot.answerCallbackQuery(query.id, { text: "Error occurred" });
    return true;
  }
};

// Impact selection handler
const handleImpactSelection = async (bot, query) => {
  const [, impact, shortId] = query.data.split('_');
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    // Update form state
    const form = blockerForms.get(userId);
    if (!form) {
      await bot.answerCallbackQuery(query.id, { text: "Form session expired" });
      return true;
    }

    form.impact = impact;
    form.step = 'attempts';
    blockerForms.set(userId, form);
    
    // Show attempts collection
    const message = formatBlockerForm('attempts', { title: 'Task' });
    const keyboard = createBlockerKeyboard(form.taskId, 'attempts');
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    await bot.answerCallbackQuery(query.id, { text: `Impact set to ${impact}` });
    return true;
    
  } catch (error) {
    console.error('Impact selection error:', error);
    await bot.answerCallbackQuery(query.id, { text: "Error occurred" });
    return true;
  }
};

// Navigation handlers
const handleBlockerMain = async (bot, query) => {
  const shortId = query.data.split('_')[2];
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    const form = blockerForms.get(userId);
    if (!form) {
      await bot.answerCallbackQuery(query.id, { text: "Form session expired" });
      return true;
    }

    const task = await getTaskByShortId(shortId);
    if (!task) {
      await bot.answerCallbackQuery(query.id, { text: "Task not found" });
      return true;
    }

    form.step = 'main';
    blockerForms.set(userId, form);
    
    const message = formatBlockerForm('main', task);
    const keyboard = createBlockerKeyboard(task._id, 'main');
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    await bot.answerCallbackQuery(query.id);
    return true;
    
  } catch (error) {
    console.error('Blocker main error:', error);
    await bot.answerCallbackQuery(query.id, { text: "Error occurred" });
    return true;
  }
};

const handleBlockerAttempts = async (bot, query) => {
  const shortId = query.data.split('_')[2];
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    const form = blockerForms.get(userId);
    if (!form) {
      await bot.answerCallbackQuery(query.id, { text: "Form session expired" });
      return true;
    }

    form.step = 'attempts';
    blockerForms.set(userId, form);
    
    const message = formatBlockerForm('attempts', { title: 'Task' });
    const keyboard = createBlockerKeyboard(form.taskId, 'attempts');
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    await bot.answerCallbackQuery(query.id);
    return true;
    
  } catch (error) {
    console.error('Blocker attempts error:', error);
    await bot.answerCallbackQuery(query.id, { text: "Error occurred" });
    return true;
  }
};

const handleBlockerLogs = async (bot, query) => {
  const shortId = query.data.split('_')[2];
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    const form = blockerForms.get(userId);
    if (!form) {
      await bot.answerCallbackQuery(query.id, { text: "Form session expired" });
      return true;
    }

    form.step = 'logs';
    blockerForms.set(userId, form);
    
    const message = formatBlockerForm('logs', { title: 'Task' });
    const keyboard = createBlockerKeyboard(form.taskId, 'logs');
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    await bot.answerCallbackQuery(query.id);
    return true;
    
  } catch (error) {
    console.error('Blocker logs error:', error);
    await bot.answerCallbackQuery(query.id, { text: "Error occurred" });
    return true;
  }
};

// Cancel handler
const handleBlockerCancel = async (bot, query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    // Clean up form state
    blockerForms.delete(userId);
    
    await bot.editMessageText(
      "❌ Blocker report cancelled.\n\nYou can report a blocker again anytime.",
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅️ Back to Tasks", callback_data: "cards_back_filters" }]
          ]
        }
      }
    );
    
    await bot.answerCallbackQuery(query.id, { text: "Cancelled" });
    return true;
    
  } catch (error) {
    console.error('Blocker cancel error:', error);
    await bot.answerCallbackQuery(query.id, { text: "Error occurred" });
    return true;
  }
};

// Handle text input for attempts and logs
const handleTextInput = async (bot, msg) => {
  const userId = msg.from.id;
  const form = blockerForms.get(userId);
  
  if (!form) return false; // Not handling this message
  
  try {
    if (form.step === 'attempts') {
      if (msg.text.length < 20) {
        await bot.sendMessage(
          msg.chat.id, 
          "❌ Attempts description too short\n\nPlease provide at least 20 characters describing what you've tried."
        );
        return true;
      }
      
      form.attempts = msg.text;
      form.step = 'logs';
      blockerForms.set(userId, form);
      
      const message = formatBlockerForm('logs', { title: 'Task' });
      const keyboard = createBlockerKeyboard(form.taskId, 'logs');
      
      await bot.sendMessage(msg.chat.id, message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
      
    } else if (form.step === 'logs') {
      if (msg.text.length < 10) {
        await bot.sendMessage(
          msg.chat.id, 
          "❌ Evidence too short\n\nPlease provide at least 10 characters of evidence."
        );
        return true;
      }
      
      form.logs = msg.text;
      blockerForms.set(userId, form);
      
      // Submit complete form
      await submitBlockerReport(bot, msg, form);
    }
    
    return true; // Handled this message
    
  } catch (error) {
    console.error('Text input error:', error);
    await bot.sendMessage(msg.chat.id, "❌ Error processing input. Please try again.");
    return true;
  }
};

// Submit complete blocker report
const submitBlockerReport = async (bot, msg, form) => {
  try {
    // Use service to report blocker
    const result = await blockerService.reportBlocker(
      form.taskId,
      { userId: msg.from.id, username: msg.from.username },
      {
        impact: form.impact,
        attempts: form.attempts,
        logs: form.logs
      }
    );

    // Clean up form state
    blockerForms.delete(msg.from.id);

    // Format success message
    const impactIcons = {
      'critical': '🔴',
      'high': '🟡',
      'medium': '🟢'
    };

    const managerName = result.manager ? 
      `@${result.manager.username || 'Manager'}` : 
      'Team Admin';

    const successMessage = `✅ Blocker Reported Successfully!

📋 Task: ${result.task.title}
👤 Reporter: @${msg.from.username || 'Unknown'}  
📊 Impact: ${impactIcons[form.impact]} ${form.impact}
🔄 Attempts: Documented
📋 Evidence: Provided
⏰ Reported: ${new Date().toLocaleString()}

🔔 ${managerName} has been notified
📈 Task status updated to: 🚧 Blocked

Your manager will review and respond soon.`;

    await bot.sendMessage(msg.chat.id, successMessage, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬅️ Back to Tasks", callback_data: "cards_back_filters" }]
        ]
      }
    });

  } catch (error) {
    console.error('Submit blocker error:', error);
    await bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
  }
};

module.exports = {
  // Main handlers
  'blocker_report': handleBlockerReport,
  
  // Impact handlers
  'blocker_impact': handleBlockerAttempts,
  'impact_critical': handleImpactSelection,
  'impact_high': handleImpactSelection,
  'impact_medium': handleImpactSelection,
  
  // Navigation handlers
  'blocker_main': handleBlockerMain,
  'blocker_attempts': handleBlockerAttempts,
  'blocker_logs': handleBlockerLogs,
  
  // Cancel handler
  'blocker_cancel': handleBlockerCancel,
  
  // Text input handler
  handleTextInput
}; 