const Task = require('../../models/task.model');
const User = require('../../models/user.model');
const { ValidationError } = require('../../utils/errors');

class TaskCardsService {
  
  // Get task summary with counts by urgency
  async getTaskSummary(userId) {
    try {
      return await Task.getTaskSummary(userId);
    } catch (error) {
      throw new Error(`Failed to get task summary: ${error.message}`);
    }
  }
  
  // Get filtered tasks with pagination
  async getFilteredTasks(userId, filter, page = 1, limit = 3) {
    try {
      const skip = (page - 1) * limit;
      
      let query;
      switch (filter) {
        case 'overdue':
          query = Task.getTasksByDeadline(userId, 'overdue');
          break;
        case 'today':
          query = Task.getTasksByDeadline(userId, 'today');
          break;
        case 'tomorrow':
          query = Task.getTasksByDeadline(userId, 'tomorrow');
          break;
        case 'week':
          query = Task.getTasksByDeadline(userId, 'week');
          break;
        case 'assigned':
          query = Task.find({ assignedTo: userId });
          break;
        default:
          query = Task.getTasksByDeadline(userId, 'all');
      }
      
      const [tasks, totalTasks] = await Promise.all([
        query
          .populate('assignedTo', 'firstName lastName username')
          .populate('createdBy', 'firstName lastName username')
          .sort({ deadline: 1, priority: -1 })
          .skip(skip)
          .limit(limit),
        query.countDocuments()
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
  async updateTaskStatus(taskId, newStatus, userId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new ValidationError('Task not found');
      }
      
      // Check permissions
      if (task.createdBy.toString() !== userId && task.assignedTo?.toString() !== userId) {
        // Check if user is admin/manager in team
        const user = await User.findOne({ telegramId: userId });
        if (!user || !['admin', 'manager'].includes(user.role)) {
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
        changedBy: userId,
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
  async addTaskComment(taskId, comment, userId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new ValidationError('Task not found');
      }
      
      // Check permissions
      if (task.createdBy.toString() !== userId && task.assignedTo?.toString() !== userId) {
        throw new ValidationError('Access denied');
      }
      
      if (!task.comments) {
        task.comments = [];
      }
      
      task.comments.push({
        text: comment,
        author: userId,
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
  
  // Mark task as blocked
  async blockTask(taskId, reason, userId) {
    try {
      const result = await this.updateTaskStatus(taskId, 'blocked', userId);
      
      // Add blocker to task
      const task = result.task;
      if (!task.blockers) {
        task.blockers = [];
      }
      
      task.blockers.push({
        reason,
        reportedBy: userId,
        reportedAt: new Date(),
        resolved: false
      });
      
      await task.save();
      
      return { ...result, blockReason: reason };
      
    } catch (error) {
      throw error; // Pass through validation errors
    }
  }
  
  // Get task details for card display
  async getTaskCard(taskId, userId) {
    try {
      const task = await Task.findById(taskId)
        .populate('assignedTo', 'firstName lastName username')
        .populate('createdBy', 'firstName lastName username');
      
      if (!task) {
        throw new ValidationError('Task not found');
      }
      
      // Check permissions
      if (task.createdBy.toString() !== userId && task.assignedTo?.toString() !== userId) {
        throw new ValidationError('Access denied');
      }
      
      return task;
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to get task card: ${error.message}`);
    }
  }
  
  // Helper method for status messages
  getStatusMessage(status) {
    const messages = {
      'ready': 'Task is ready to be worked on.',
      'in_progress': 'Task is now active and being worked on.',
      'review': 'Task is ready for review and feedback.',
      'done': 'Task completed successfully! 🎉',
      'blocked': 'Task has been blocked and needs attention.',
      'pending': 'Task is pending approval or assignment.'
    };
    
    return messages[status] || 'Task status updated.';
  }
}

module.exports = new TaskCardsService(); 