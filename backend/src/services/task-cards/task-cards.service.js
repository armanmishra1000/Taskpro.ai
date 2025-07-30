const Task = require('../../models/task.model');
const User = require('../../models/user.model');
const { ValidationError } = require('../../utils/errors');
const mongoose = require('mongoose');

class TaskCardsService {
  
  // Get task summary with counts by urgency
  async getTaskSummary(telegramId) {
    try {
      // Convert telegramId to ObjectId for Task model methods
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new ValidationError('User not found');
      }
      return await Task.getTaskSummary(user._id);
    } catch (error) {
      throw new Error(`Failed to get task summary: ${error.message}`);
    }
  }
  
  // Get filtered tasks with pagination
  async getFilteredTasks(telegramId, filter, page = 1, limit = 3) {
    try {
      // Convert telegramId to ObjectId for Task model methods
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new ValidationError('User not found');
      }
      
      const skip = (page - 1) * limit;
      
      let baseQuery;
      switch (filter) {
        case 'overdue':
          baseQuery = { $or: [{ createdBy: user._id }, { assignedTo: user._id }], deadline: { $lt: new Date() }, status: { $ne: 'done' } };
          break;
        case 'today': {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);
          baseQuery = { $or: [{ createdBy: user._id }, { assignedTo: user._id }], deadline: { $gte: startOfDay, $lte: endOfDay } };
          break;
        }
        case 'tomorrow': {
          const startOfTomorrow = new Date();
          startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
          startOfTomorrow.setHours(0, 0, 0, 0);
          const endOfTomorrow = new Date(startOfTomorrow);
          endOfTomorrow.setHours(23, 59, 59, 999);
          baseQuery = { $or: [{ createdBy: user._id }, { assignedTo: user._id }], deadline: { $gte: startOfTomorrow, $lte: endOfTomorrow } };
          break;
        }
        case 'week': {
          const now = new Date();
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          baseQuery = { $or: [{ createdBy: user._id }, { assignedTo: user._id }], deadline: { $gte: now, $lte: nextWeek } };
          break;
        }
        case 'assigned':
          baseQuery = { assignedTo: user._id };
          break;
        default:
          baseQuery = { $or: [{ createdBy: user._id }, { assignedTo: user._id }] };
      }
      
      const [tasks, totalTasks] = await Promise.all([
        Task.find(baseQuery)
          .populate('assignedTo', 'firstName lastName username')
          .populate('createdBy', 'firstName lastName username')
          .sort({ deadline: 1, priority: -1 })
          .skip(skip)
          .limit(limit),
        Task.countDocuments(baseQuery)
      ]);
      
      const totalPages = Math.ceil(totalTasks / limit);
      
      return {
        tasks,
        currentPage: page,
        totalPages,
        totalTasks,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
      
    } catch (error) {
      throw new Error(`Failed to get filtered tasks: ${error.message}`);
    }
  }
  
  // Update task status with validation
  async updateTaskStatus(taskId, newStatus, telegramId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new ValidationError('Task not found');
      }
      
      // Get user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new ValidationError('User not found');
      }
      
      // Check permissions
      if (task.createdBy.toString() !== user._id.toString() && task.assignedTo?.toString() !== user._id.toString()) {
        if (!['admin', 'manager'].includes(user.role)) {
          throw new ValidationError('Access denied: You can only update tasks you created or are assigned to');
        }
      }
      
      // Validate status transition
      const validTransitions = {
        'pending': ['ready'],
        'ready': ['in_progress', 'pending'],
        'in_progress': ['review', 'ready', 'blocked'],
        'review': ['done', 'in_progress'],
        'done': ['review'],
        'blocked': ['ready', 'in_progress']
      };
      
      if (!validTransitions[task.status]?.includes(newStatus)) {
        throw new ValidationError(`Invalid status transition from ${task.status} to ${newStatus}`);
      }
      
      // Update task with timestamps
      const oldStatus = task.status;
      task.status = newStatus;
      
      // Update timestamps based on status
      switch (newStatus) {
        case 'in_progress':
          if (!task.startedAt) {
            task.startedAt = new Date();
          }
          break;
        case 'done':
          if (!task.completedAt) {
            task.completedAt = new Date();
          }
          break;
        case 'ready':
          // Reset started timestamp if going back to ready
          if (oldStatus === 'blocked') {
            task.startedAt = null;
          }
          break;
      }
      
      // Add to status history
      if (!task.statusHistory) {
        task.statusHistory = [];
      }
      
      task.statusHistory.push({
        status: newStatus,
        changedBy: user._id,
        changedAt: new Date(),
        previousStatus: oldStatus
      });
      
      await task.save();
      
      return {
        task,
        oldStatus,
        newStatus,
        statusMessage: this.getStatusMessage(newStatus)
      };
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to update task status: ${error.message}`);
    }
  }
  
  // Add task comment
  async addTaskComment(taskId, comment, telegramId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new ValidationError('Task not found');
      }
      
      // Get user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new ValidationError('User not found');
      }
      
      // Check permissions
      if (task.createdBy.toString() !== user._id.toString() && task.assignedTo?.toString() !== user._id.toString()) {
        throw new ValidationError('Access denied');
      }
      
      if (!task.comments) {
        task.comments = [];
      }
      
      task.comments.push({
        text: comment,
        author: user._id,
        createdAt: new Date()
      });
      
      await task.save();
      return task;
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }
  
  // Block task with reason
  async blockTask(taskId, reason, telegramId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new ValidationError('Task not found');
      }
      
      // Get user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new ValidationError('User not found');
      }
      
      // Check permissions
      if (task.createdBy.toString() !== user._id.toString() && task.assignedTo?.toString() !== user._id.toString()) {
        if (!['admin', 'manager'].includes(user.role)) {
          throw new ValidationError('Access denied: You can only block tasks you created or are assigned to');
        }
      }
      
      // Update task status to blocked
      const oldStatus = task.status;
      task.status = 'blocked';
      
      // Add blocker information
      if (!task.blockers) {
        task.blockers = [];
      }
      
      task.blockers.push({
        reason,
        reportedBy: user._id,
        reportedAt: new Date()
      });
      
      // Add to status history
      if (!task.statusHistory) {
        task.statusHistory = [];
      }
      
      task.statusHistory.push({
        status: 'blocked',
        changedBy: user._id,
        changedAt: new Date(),
        previousStatus: oldStatus
      });
      
      await task.save();
      
      return {
        task,
        blockReason: reason,
        oldStatus,
        newStatus: 'blocked'
      };
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to block task: ${error.message}`);
    }
  }
  
  // Get single task card
  async getTaskCard(taskId, telegramId) {
    try {
      const task = await Task.findById(taskId)
        .populate('assignedTo', 'firstName lastName username')
        .populate('createdBy', 'firstName lastName username');
      
      if (!task) {
        throw new ValidationError('Task not found');
      }
      
      // Get user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new ValidationError('User not found');
      }
      
      // Check permissions
      if (task.createdBy.toString() !== user._id.toString() && task.assignedTo?.toString() !== user._id.toString()) {
        if (!['admin', 'manager'].includes(user.role)) {
          throw new ValidationError('Access denied');
        }
      }
      
      return task;
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to get task card: ${error.message}`);
    }
  }
  
  // Get status message
  getStatusMessage(status) {
    const messages = {
      'ready': 'Task is ready to be worked on.',
      'in_progress': 'Task is now active and being worked on.',
      'review': 'Task is ready for review and feedback.',
      'done': 'Task completed successfully! 🎉',
      'blocked': 'Task is blocked and needs attention.'
    };
    return messages[status] || 'Status updated successfully.';
  }
}

module.exports = new TaskCardsService(); 