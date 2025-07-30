const TelegramBot = require('node-telegram-bot-api');
const connectDB = require('../config/database');
const newtaskCommand = require('./commands/newtask.command');
const teamCommand = require('./commands/team.command');
const assignCommand = require('./commands/assign.command');
const taskCallbacks = require('./callbacks/task-creation.callbacks');
const teamCallbacks = require('./callbacks/team.callbacks');
const assignmentCallbacks = require('./callbacks/task-assignment.callbacks');
const cardsCommand = require('./commands/cards.command');
const mytasksCommand = require('./commands/mytasks.command');
const taskCardsCallbacks = require('./callbacks/task-cards.callbacks');
const blockerCallbacks = require('./callbacks/blocker-management.callbacks');
const standupCommand = require('./commands/standup.command');
const standupnowCommand = require('./commands/standupnow.command');
require('dotenv').config();

// Connect to MongoDB
connectDB();

// Create bot instance
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

console.log('🤖 Bot started successfully!');

// Basic /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'there';
  
  bot.sendMessage(chatId, 
    `👋 Hello ${userName}!\n\n` +
    `I'm your AI-powered task manager using Elon Musk's delegation principles.\n\n` +
    `Use /help to see all commands.`
  );
});

// Basic /help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId,
    `📋 *Available Commands:*\n\n` +
    `/start - Initialize bot\n` +
    `/newtask - Create a new task\n` +
    `/assign - Assign tasks to team members\n` +
    `/cards - View task cards with filters\n` +
    `/mytasks - View your assigned tasks\n` +
    `/team - Manage team members\n` +
    `/standup - Configure daily standup automation\n` +
    `/standupnow - Trigger immediate standup test\n` +
    `/help - Show this help message\n\n` +
    `More features coming soon!`,
    { parse_mode: 'Markdown' }
  );
});

// /newtask command
bot.onText(/\/newtask/, (msg) => newtaskCommand.handler(bot, msg));

// /team command
bot.onText(/\/team/, (msg) => teamCommand.handler(bot, msg));

// /assign command
bot.onText(/\/assign/, (msg) => assignCommand.handler(bot, msg));

// /cards command
bot.onText(/\/cards/, (msg) => cardsCommand.handler(bot, msg));

// /mytasks command
bot.onText(/\/mytasks/, (msg) => mytasksCommand.handler(bot, msg));

// /standup command
bot.onText(/\/standup/, (msg) => standupCommand.handler(bot, msg));

// /standupnow command
bot.onText(/\/standupnow/, (msg) => standupnowCommand.handler(bot, msg));

// Callback query handlers
bot.on('callback_query', async (query) => {
  const action = query.data;
  
  try {
    // Handle assignment dynamic callbacks first
    if (action.startsWith('assign_')) {
      const handled = await assignmentCallbacks.handleDynamicCallback(bot, query);
      if (handled) {
        await bot.answerCallbackQuery(query.id);
        return; // Exit if handled
      }
    }
    
    // Handle static assignment callbacks
    if (assignmentCallbacks[action]) {
      await assignmentCallbacks[action](bot, query);
    }
    // Handle task callbacks
    else if (taskCallbacks[action]) {
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

    // Handle task cards dynamic callbacks first
    if (action.startsWith('task_status_') || action.startsWith('task_blocked_') || action.startsWith('task_comment_')) {
      const handled = await taskCardsCallbacks.handleDynamicCallback(bot, query);
      if (handled) {
        await bot.answerCallbackQuery(query.id);
        return;
      }
    }

    // Handle blocker callbacks first
    if (action.startsWith('blocker_') || action.startsWith('impact_')) {
      if (blockerCallbacks[action]) {
        await blockerCallbacks[action](bot, query);
        await bot.answerCallbackQuery(query.id);
        return;
      }
    }

    // Handle static task cards callbacks
    if (taskCardsCallbacks[action]) {
      await taskCardsCallbacks[action](bot, query);
    }
    
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Callback query error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Error processing request' });
  }
});

// Text message handler for team member input and blocker forms
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    // Handle blocker form text input first
    const handled = await blockerCallbacks.handleTextInput(bot, msg);
    if (handled) {
      return; // Exit if blocker form handled the message
    }
    
    // Handle team member format
    if (msg.text.includes('@') && (msg.text.includes('member') || msg.text.includes('manager') || msg.text.includes('admin'))) {
      await teamCallbacks.handleMemberInput(bot, msg);
    }
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

module.exports = bot; 