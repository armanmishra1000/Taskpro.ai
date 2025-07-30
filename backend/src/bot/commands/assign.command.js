const { MESSAGES } = require('../constants/messages');
const { createInlineKeyboard } = require('../../utils/keyboard');
const Task = require('../../models/task.model');
const TaskAssignmentService = require('../../services/task-assignment/task-assignment.service');
const {
  formatTaskSelectionList,
  createTaskSelectionKeyboard
} = require('../formatters/task-assignment.formatter');

// User state management for assignment flow
const assignmentStates = new Map();

module.exports = {
  command: 'assign',
  description: 'Assign tasks to team members',
  handler: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
      // Clear any existing assignment state
      assignmentStates.delete(userId);
      
      // Get unassigned tasks using service
      const unassignedTasks = await TaskAssignmentService.getUnassignedTasks(userId);
      
      const messageText = formatTaskSelectionList(unassignedTasks);
      const keyboard = createTaskSelectionKeyboard(unassignedTasks);
      
      await bot.sendMessage(
        chatId,
        messageText,
        { reply_markup: keyboard }
      );
      
      // Store state for callback handling
      assignmentStates.set(userId, {
        step: 'task_selection',
        chatId,
        availableTasks: unassignedTasks.map(t => t._id.toString())
      });
      
    } catch (error) {
      console.error('Error in /assign command:', error);
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL);
    }
  },
  
  // Export states for callbacks
  assignmentStates
}; 