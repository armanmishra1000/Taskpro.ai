const User = require('../../models/user.model');
const Team = require('../../models/team.model');

class StatusNotificationService {
  /**
   * Notify stakeholders of status change
   * @param {Task} task - Updated task object
   * @param {string} changedBy - UserID who made the change
   * @param {string} oldStatus - Previous status
   * @param {Object} bot - Telegram bot instance
   */
  async notifyStatusChange(task, changedBy, oldStatus, bot) {
    try {
      // Identify stakeholders
      const stakeholders = await this.identifyStakeholders(task, task.status, changedBy);
      
      // Get user who made the change
      const changer = await User.findById(changedBy);
      
      // Send notifications to each stakeholder
      for (const stakeholder of stakeholders) {
        const notification = await this.formatStatusNotification(
          task, oldStatus, task.status, changer, stakeholder.type
        );
        
        await this.sendNotificationToUser(stakeholder.userId, notification, bot);
      }
      
      console.log(`Status change notifications sent for task ${task._id} to ${stakeholders.length} stakeholders`);
      
    } catch (error) {
      console.error('Error sending status notifications:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Identify who should be notified
   * @param {Task} task - Task object
   * @param {string} newStatus - New status
   * @param {string} changedBy - User who made change
   * @returns {Array} Stakeholders to notify
   */
  async identifyStakeholders(task, newStatus, changedBy) {
    const stakeholders = [];
    
    // Always notify assignee (if different from changer)
    if (task.assignedTo && task.assignedTo.toString() !== changedBy) {
      stakeholders.push({
        userId: task.assignedTo,
        type: 'assignee',
        priority: 'high'
      });
    }
    
    // Notify creator for review/completion status  
    if (['review', 'done'].includes(newStatus) && 
        task.createdBy && task.createdBy.toString() !== changedBy) {
      stakeholders.push({
        userId: task.createdBy,
        type: 'creator', 
        priority: 'high'
      });
    }
    
    // Notify team managers for blocked status
    if (newStatus === 'blocked' && task.teamId) {
      try {
        const team = await Team.findById(task.teamId);
        if (team) {
          const managers = team.members.filter(member => 
            ['admin', 'manager'].includes(member.role) && 
            member.userId.toString() !== changedBy
          );
          
          managers.forEach(manager => {
            stakeholders.push({
              userId: manager.userId,
              type: 'manager',
              priority: 'urgent'
            });
          });
        }
      } catch (error) {
        console.error('Error fetching team managers:', error);
      }
    }
    
    return stakeholders;
  }

  /**
   * Format notification message
   * @param {Task} task - Task object
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {User} changedBy - User who made change
   * @param {string} stakeholderType - Type of recipient
   * @returns {Object} Formatted notification
   */
  async formatStatusNotification(task, oldStatus, newStatus, changedBy, stakeholderType) {
    const timestamp = new Date().toLocaleString();
    
    let message = `📬 Task Status Changed\n\n`;
    message += `📋 ${task.title}\n`;
    message += `📊 Status: ${oldStatus} → ${newStatus}\n`;
    message += `👤 Changed by: @${changedBy.username || 'Unknown'}\n`;
    message += `⏰ ${timestamp}\n\n`;
    
    // Add stakeholder-specific message
    message += this.getStakeholderSpecificMessage(newStatus, stakeholderType);
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: "👁️ View Task", callback_data: `task_view_${task._id}` },
          { text: "📊 View History", callback_data: `status_history_${task._id}` }
        ]
      ]
    };
    
    return { message, keyboard };
  }

  /**
   * Get stakeholder-specific message
   * @param {string} newStatus - New task status
   * @param {string} stakeholderType - Type of stakeholder
   * @returns {string} Specific message
   */
  getStakeholderSpecificMessage(newStatus, stakeholderType) {
    switch (stakeholderType) {
      case 'assignee':
        if (newStatus === 'ready') return '💼 This task is assigned to you and ready to start.';
        if (newStatus === 'review') return '👀 Your work is being reviewed.';
        if (newStatus === 'done') return '🎉 Great job! Task completed successfully.';
        if (newStatus === 'blocked') return '⚠️ Your assigned task has been blocked.';
        return '📋 Your assigned task status has changed.';
        
      case 'creator':
        if (newStatus === 'review') return '👀 Your task is ready for review. Please check and approve.';
        if (newStatus === 'done') return '✅ Your task has been completed successfully!';
        if (newStatus === 'blocked') return '🚧 Your task has been blocked and needs attention.';
        return '📋 Your created task status has changed.';
        
      case 'manager':
        if (newStatus === 'blocked') return '🚨 Team task is blocked and needs management attention.';
        return '👥 Team task status has changed.';
        
      default:
        return '📋 Task status has been updated.';
    }
  }

  /**
   * Send notification to user
   * @param {string} userId - User ID to notify
   * @param {Object} notification - Formatted notification
   * @param {Object} bot - Telegram bot instance
   */
  async sendNotificationToUser(userId, notification, bot) {
    try {
      // Get user's Telegram ID (using telegramId field from user model)
      const user = await User.findById(userId);
      if (!user || !user.telegramId) {
        console.log(`No Telegram ID for user ${userId}`);
        return;
      }
      
      await bot.sendMessage(
        user.telegramId,
        notification.message,
        {
          reply_markup: notification.keyboard,
          parse_mode: 'Markdown'
        }
      );
      
    } catch (error) {
      console.error(`Error sending notification to user ${userId}:`, error);
    }
  }
}

module.exports = new StatusNotificationService(); 