const Task = require('../../models/task.model');
const User = require('../../models/user.model');
const { ValidationError } = require('../../utils/errors');

class StatusTrackingService {
  /**
   * Change task status with validation and history logging
   * @param {string} taskId - Task ID
   * @param {string} newStatus - New status to set
   * @param {string} changedBy - User ID making the change
   * @param {string} reason - Optional reason (required for blocked)
   * @returns {Promise<Task>} Updated task
   */
  async changeTaskStatus(taskId, newStatus, changedBy, reason = null) {
    // Find task with populated references
    const task = await Task.findById(taskId)
      .populate('createdBy', 'username firstName')
      .populate('assignedTo', 'username firstName');
    
    if (!task) {
      throw new ValidationError('Task not found');
    }

    const oldStatus = task.status;
    
    // Validate transition
    await this.validateStatusTransition(task, newStatus, changedBy, reason);
    
    // Calculate duration in previous status
    const duration = this.calculateCurrentStatusDuration(task);
    
    // Log status change to history
    await this.logStatusChange(task, oldStatus, newStatus, changedBy, reason, duration);
    
    // Update task status
    task.status = newStatus;
    
    // Save with middleware handling timestamps
    const updatedTask = await task.save();
    
    return updatedTask;
  }

  /**
   * Validate if status transition is allowed
   * @param {Task} task - Task object
   * @param {string} newStatus - Target status
   * @param {string} userId - User making change
   * @param {string} reason - Reason for change
   */
  async validateStatusTransition(task, newStatus, userId, reason) {
    // Prevent moving from done status first
    if (task.status === 'done') {
      throw new ValidationError('Cannot change status of completed tasks');
    }

    // Check if transition is valid
    if (!Task.isValidStatusTransition(task.status, newStatus)) {
      const validTransitions = this.getValidNextStatuses(task.status);
      throw new ValidationError(
        `Invalid status transition from ${task.status} to ${newStatus}. Valid transitions: ${validTransitions.join(', ')}`
      );
    }

    // Business logic validation
    const assignedToId = task.assignedTo?._id || task.assignedTo;
    const createdById = task.createdBy?._id || task.createdBy;
    
    if (newStatus === 'in_progress' && assignedToId?.toString() !== userId.toString()) {
      throw new ValidationError('Only the assigned user can start work on this task');
    }

    if (newStatus === 'done' && createdById?.toString() !== userId.toString()) {
      // Allow team admins/managers to complete tasks (extend this logic as needed)
      throw new ValidationError('Only the task creator can mark task as done');
    }

    if (newStatus === 'blocked' && !reason) {
      throw new ValidationError('Reason is required when blocking a task');
    }
  }

  /**
   * Log status change to task history
   * @param {Task} task - Task object
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {string} changedBy - User ID
   * @param {string} reason - Optional reason
   * @param {number} duration - Duration in previous status
   */
  async logStatusChange(task, oldStatus, newStatus, changedBy, reason, duration) {
    const historyEntry = {
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedBy: changedBy,
      changedAt: new Date(),
      reason: reason,
      duration: duration
    };

    task.statusHistory.push(historyEntry);
  }

  /**
   * Calculate how long task has been in current status
   * @param {Task} task - Task object
   * @returns {number} Duration in milliseconds
   */
  calculateCurrentStatusDuration(task) {
    if (task.statusHistory.length === 0) {
      // Use createdAt if no status changes yet
      return new Date() - new Date(task.createdAt);
    }

    // Get last status change
    const lastChange = task.statusHistory[task.statusHistory.length - 1];
    return new Date() - new Date(lastChange.changedAt);
  }

  /**
   * Get valid next statuses for current status
   * @param {string} currentStatus - Current task status
   * @returns {Array<string>} Valid next statuses
   */
  getValidNextStatuses(currentStatus) {
    const validTransitions = {
      'pending': ['ready'],
      'ready': ['in_progress', 'blocked'],
      'in_progress': ['review', 'blocked'],
      'review': ['done', 'in_progress'],
      'blocked': ['ready', 'in_progress'],
      'done': []
    };
    return validTransitions[currentStatus] || [];
  }

  /**
   * Get task status history with populated user data
   * @param {string} taskId - Task ID
   * @returns {Promise<Task>} Task with populated history
   */
  async getStatusHistory(taskId) {
    const task = await Task.findById(taskId)
      .populate('createdBy', 'username firstName')
      .populate('statusHistory.changedBy', 'username firstName');
    
    if (!task) {
      throw new ValidationError('Task not found');
    }

    return task;
  }

  /**
   * Get status change statistics for a task
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Status statistics
   */
  async getStatusStatistics(taskId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ValidationError('Task not found');
    }

    const stats = {
      totalChanges: task.statusHistory.length,
      currentStatus: task.status,
      timeInCurrentStatus: this.calculateCurrentStatusDuration(task),
      totalTime: 0,
      statusBreakdown: {}
    };

    // Calculate total time and status breakdown
    task.statusHistory.forEach(entry => {
      stats.totalTime += entry.duration || 0;
      
      if (!stats.statusBreakdown[entry.fromStatus]) {
        stats.statusBreakdown[entry.fromStatus] = 0;
      }
      stats.statusBreakdown[entry.fromStatus] += entry.duration || 0;
    });

    // Add current status time
    if (!stats.statusBreakdown[task.status]) {
      stats.statusBreakdown[task.status] = 0;
    }
    stats.statusBreakdown[task.status] += stats.timeInCurrentStatus;

    return stats;
  }

  /**
   * Get progress percentage for task
   * @param {string} taskId - Task ID
   * @returns {Promise<number>} Progress percentage (0-100)
   */
  async getTaskProgress(taskId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ValidationError('Task not found');
    }

    // Check for blocked status first
    if (task.status === 'blocked') {
      // If blocked, return progress from previous status
      const statusOrder = ['pending', 'ready', 'in_progress', 'review', 'done'];
      const previousStatus = task.statusHistory.length > 0 
        ? task.statusHistory[task.statusHistory.length - 1].fromStatus 
        : 'pending';
      const previousIndex = statusOrder.indexOf(previousStatus);
      return Math.max(0, (previousIndex / (statusOrder.length - 1)) * 100);
    }

    // For non-blocked statuses, use normal progress calculation
    const statusOrder = ['pending', 'ready', 'in_progress', 'review', 'done'];
    const currentIndex = statusOrder.indexOf(task.status);
    
    if (currentIndex === -1) {
      return 0; // Unknown status
    }

    return (currentIndex / (statusOrder.length - 1)) * 100;
  }

  /**
   * Get tasks by status for a user
   * @param {string} userId - User ID
   * @param {string} status - Status to filter by
   * @returns {Promise<Array<Task>>} Tasks with specified status
   */
  async getTasksByStatus(userId, status) {
    const tasks = await Task.find({
      $or: [{ createdBy: userId }, { assignedTo: userId }],
      status: status
    })
    .populate('assignedTo', 'username firstName')
    .populate('createdBy', 'username firstName')
    .sort({ updatedAt: -1 });

    return tasks;
  }

  /**
   * Get recent status changes for a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of recent changes to return
   * @returns {Promise<Array<Object>>} Recent status changes
   */
  async getRecentStatusChanges(userId, limit = 10) {
    const tasks = await Task.find({
      $or: [{ createdBy: userId }, { assignedTo: userId }],
      'statusHistory.0': { $exists: true }
    })
    .populate('assignedTo', 'username firstName')
    .populate('createdBy', 'username firstName')
    .populate('statusHistory.changedBy', 'username firstName')
    .sort({ updatedAt: -1 });

    const recentChanges = [];
    tasks.forEach(task => {
      if (task.statusHistory.length > 0) {
        // Get all status changes for this task
        task.statusHistory.forEach(change => {
          recentChanges.push({
            taskId: task._id,
            taskTitle: task.title,
            fromStatus: change.fromStatus,
            toStatus: change.toStatus,
            changedBy: change.changedBy,
            changedAt: change.changedAt,
            reason: change.reason
          });
        });
      }
    });

    return recentChanges
      .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
      .slice(0, limit);
  }
}

module.exports = new StatusTrackingService(); 