const { MESSAGES } = require('../constants/messages');
const { createInlineKeyboard } = require('../../utils/keyboard');
const Task = require('../../models/task.model');
const TaskAssignmentService = require('../../services/task-assignment/task-assignment.service');

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
      
      if (unassignedTasks.length === 0) {
        return await bot.sendMessage(
          chatId,
          MESSAGES.ASSIGNMENT.NO_TASKS
        );
      }
      
      // Create task selection keyboard
      const taskButtons = unassignedTasks.map(task => [{
        text: `📋 Task #${task._id.toString().slice(-4)}: ${task.title.substring(0, 30)}...`,
        callback_data: `assign_task_${task._id}`
      }]);
      
      // Add additional options
      taskButtons.push([
        { text: '🔍 Search Task by ID', callback_data: 'assign_search' },
        { text: '❌ Cancel', callback_data: 'assign_cancel' }
      ]);
      
      const keyboard = createInlineKeyboard(taskButtons);
      
      await bot.sendMessage(
        chatId,
        MESSAGES.ASSIGNMENT.WELCOME,
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