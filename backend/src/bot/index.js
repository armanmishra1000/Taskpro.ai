const TelegramBot = require('node-telegram-bot-api');
const connectDB = require('../config/database');
const newtaskCommand = require('./commands/newtask.command');
const teamCommand = require('./commands/team.command');
const taskCallbacks = require('./callbacks/task-creation.callbacks');
const teamCallbacks = require('./callbacks/team.callbacks');
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
    `/mytasks - View your tasks\n` +
    `/team - Manage team members\n` +
    `/help - Show this help message\n\n` +
    `More features coming soon!`,
    { parse_mode: 'Markdown' }
  );
});

// /newtask command
bot.onText(/\/newtask/, (msg) => newtaskCommand.handler(bot, msg));

// /team command
bot.onText(/\/team/, (msg) => teamCommand.handler(bot, msg));

// Callback query handlers
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

// Text message handler for team member input
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    // Simple state check - in production, implement proper user state storage
    // For now, handle team member format
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