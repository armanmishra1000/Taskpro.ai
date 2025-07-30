const TelegramBot = require('node-telegram-bot-api');
const connectDB = require('../config/database');
const newtaskCommand = require('./commands/newtask.command');
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

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

module.exports = bot; 