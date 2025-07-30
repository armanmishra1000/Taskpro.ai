const Task = require('../../models/task.model');
const Team = require('../../models/team.model');
const User = require('../../models/user.model');
const { ValidationError, NotFoundError } = require('../../utils/errors');

class BlockerManagementService {
  
  /**
   * Report a new blocker for a task
   * @param {string} taskId - Task ID
   * @param {Object} reporterData - Reporter information
   * @param {Object} blockerData - Blocker information
   * @returns {Promise<Object>} Created blocker, task, and manager info
   */
  async reportBlocker(taskId, reporterData, blockerData) {
    // Validate inputs
    this.validateBlockerReport(blockerData);
    
    // Get task and validate state
    const task = await Task.findById(taskId)
      .populate('assignedTo', 'username firstName lastName')
      .populate('createdBy', 'username firstName lastName')
      .populate('teamId');
    
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    // Check for existing active blockers
    const hasActiveBlocker = task.blockers && 
      task.blockers.some(b => b.status === 'active');
    
    if (hasActiveBlocker) {
      throw new ValidationError('Task already has an active blocker');
    }
    
    // Validate task status
    if (!['ready', 'in_progress'].includes(task.status)) {
      throw new ValidationError('Can only report blockers for ready or in-progress tasks');
    }
    
    // Find manager for escalation
    const manager = await this.findTaskManager(task);
    
    // Create blocker object
    const blocker = {
      reportedBy: reporterData.userId,
      reportedAt: new Date(),
      impact: blockerData.impact,
      attempts: blockerData.attempts,
      logs: blockerData.logs,
      status: 'active',
      managerNotified: manager ? manager._id : null
    };
    
    // Add blocker to task
    if (!task.blockers) {
      task.blockers = [];
    }
    task.blockers.push(blocker);
    
    // Update task status to blocked
    task.status = 'blocked';
    await task.save();
    
    // Notify manager if found
    if (manager) {
      await this.notifyManager(manager, blocker, task, reporterData);
    }
    
    return {
      blocker: task.blockers[task.blockers.length - 1],
      task,
      manager
    };
  }
  
  /**
   * Validate blocker report data
   * @param {Object} blockerData - Blocker data to validate
   * @throws {ValidationError} If validation fails
   */
  validateBlockerReport(blockerData) {
    const errors = [];
    
    if (!blockerData.impact || !['critical', 'high', 'medium'].includes(blockerData.impact)) {
      errors.push('Valid impact level required (critical, high, or medium)');
    }
    
    if (!blockerData.attempts || blockerData.attempts.length < 20) {
      errors.push('Attempts description must be at least 20 characters');
    }
    
    if (!blockerData.logs || blockerData.logs.length < 10) {
      errors.push('Evidence/logs must be at least 10 characters');
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }
  
  /**
   * Find the appropriate manager for a task
   * @param {Task} task - Task object with team information
   * @returns {Promise<User|null>} Manager user or null
   */
  async findTaskManager(task) {
    if (!task.teamId) {
      return null;
    }
    
    const team = await Team.findById(task.teamId).populate('members.userId');
    if (!team) {
      return null;
    }
    
    // Find manager or admin (prioritize manager over admin)
    const manager = team.members.find(m => m.role === 'manager');
    if (manager) {
      return manager.userId;
    }
    
    const admin = team.members.find(m => m.role === 'admin');
    if (admin) {
      return admin.userId;
    }
    
    return null;
  }
  
  /**
   * Notify manager about a new blocker
   * @param {User} manager - Manager user object
   * @param {Object} blocker - Blocker object
   * @param {Task} task - Task object
   * @param {Object} reporter - Reporter information
   */
  async notifyManager(manager, blocker, task, reporter) {
    // This would integrate with notification system
    // For now, we'll store the notification data
    console.log('Manager notification:', {
      managerId: manager._id,
      managerUsername: manager.username,
      taskId: task._id,
      taskTitle: task.title,
      blockerId: blocker._id,
      reporterId: reporter.userId,
      reporterUsername: reporter.username,
      impact: blocker.impact,
      reportedAt: blocker.reportedAt
    });
    
    // TODO: Implement actual notification (email, bot message, etc.)
    // This will be integrated with the notification service in future tasks
  }
  
  /**
   * Resolve an active blocker
   * @param {string} taskId - Task ID
   * @param {string} blockerId - Blocker ID
   * @param {Object} resolverData - Resolver information
   * @param {string} resolution - Resolution description
   * @returns {Promise<Object>} Updated blocker and task
   */
  async resolveBlocker(taskId, blockerId, resolverData, resolution) {
    const task = await Task.findById(taskId)
      .populate('assignedTo', 'username firstName lastName')
      .populate('createdBy', 'username firstName lastName');
    
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    const blocker = task.blockers.id(blockerId);
    if (!blocker) {
      throw new NotFoundError('Blocker not found');
    }
    
    if (blocker.status !== 'active') {
      throw new ValidationError('Blocker is not active');
    }
    
    // Update blocker
    blocker.status = 'resolved';
    blocker.resolvedBy = resolverData.userId;
    blocker.resolvedAt = new Date();
    blocker.resolution = resolution;
    
    // Update task status back to in_progress
    task.status = 'in_progress';
    
    await task.save();
    
    return { blocker, task };
  }
  
  /**
   * Get active blockers for a task
   * @param {string} taskId - Task ID
   * @returns {Promise<Array>} Array of active blockers
   */
  async getActiveBlockers(taskId) {
    const task = await Task.findById(taskId);
    if (!task || !task.blockers) {
      return [];
    }
    
    return task.blockers.filter(b => b.status === 'active');
  }
  
  /**
   * Get all tasks with active blockers for a manager
   * @param {string} managerId - Manager user ID
   * @returns {Promise<Array>} Array of tasks with active blockers
   */
  async getManagerBlockers(managerId) {
    const tasks = await Task.find({
      'blockers.managerNotified': managerId,
      'blockers.status': 'active'
    }).populate('assignedTo', 'username firstName lastName')
      .populate('createdBy', 'username firstName lastName')
      .populate('teamId');
    
    return tasks;
  }
  
  /**
   * Get blocker statistics for a task
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Blocker statistics
   */
  async getBlockerStatistics(taskId) {
    const task = await Task.findById(taskId);
    if (!task || !task.blockers) {
      return {
        total: 0,
        active: 0,
        resolved: 0,
        escalated: 0,
        averageResolutionTime: 0
      };
    }
    
    const total = task.blockers.length;
    const active = task.blockers.filter(b => b.status === 'active').length;
    const resolved = task.blockers.filter(b => b.status === 'resolved').length;
    const escalated = task.blockers.filter(b => b.status === 'escalated').length;
    
    // Calculate average resolution time
    const resolvedBlockers = task.blockers.filter(b => b.status === 'resolved' && b.resolvedAt);
    let averageResolutionTime = 0;
    
    if (resolvedBlockers.length > 0) {
      const totalTime = resolvedBlockers.reduce((sum, blocker) => {
        return sum + (new Date(blocker.resolvedAt) - new Date(blocker.reportedAt));
      }, 0);
      averageResolutionTime = totalTime / resolvedBlockers.length;
    }
    
    return {
      total,
      active,
      resolved,
      escalated,
      averageResolutionTime
    };
  }
  
  /**
   * Escalate a blocker to a higher level manager
   * @param {string} taskId - Task ID
   * @param {string} blockerId - Blocker ID
   * @param {Object} escalatorData - Escalator information
   * @param {string} escalationReason - Reason for escalation
   * @returns {Promise<Object>} Updated blocker
   */
  async escalateBlocker(taskId, blockerId, escalatorData, escalationReason) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    const blocker = task.blockers.id(blockerId);
    if (!blocker) {
      throw new NotFoundError('Blocker not found');
    }
    
    if (blocker.status !== 'active') {
      throw new ValidationError('Blocker is not active');
    }
    
    // Update blocker status
    blocker.status = 'escalated';
    blocker.escalatedBy = escalatorData.userId;
    blocker.escalatedAt = new Date();
    blocker.escalationReason = escalationReason;
    
    await task.save();
    
    return { blocker, task };
  }
  
  /**
   * Get all blockers for a user (reported by them)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of tasks with blockers reported by user
   */
  async getUserBlockers(userId) {
    const tasks = await Task.find({
      'blockers.reportedBy': userId
    }).populate('assignedTo', 'username firstName lastName')
      .populate('createdBy', 'username firstName lastName')
      .populate('teamId');
    
    return tasks;
  }
  
  /**
   * Check if a task can have blockers reported
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Validation result
   */
  async canReportBlocker(taskId) {
    const task = await Task.findById(taskId);
    if (!task) {
      return { canReport: false, reason: 'Task not found' };
    }
    
    // Check task status
    if (!['ready', 'in_progress'].includes(task.status)) {
      return { canReport: false, reason: `Cannot report blockers for ${task.status} tasks` };
    }
    
    // Check for existing active blockers
    const hasActiveBlocker = task.blockers && 
      task.blockers.some(b => b.status === 'active');
    
    if (hasActiveBlocker) {
      return { canReport: false, reason: 'Task already has an active blocker' };
    }
    
    return { canReport: true };
  }
}

module.exports = new BlockerManagementService(); 