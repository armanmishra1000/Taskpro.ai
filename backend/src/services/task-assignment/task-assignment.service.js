const Task = require('../../models/task.model');
const Team = require('../../models/team.model');
const User = require('../../models/user.model');
const { ValidationError } = require('../../utils/errors');

class TaskAssignmentService {
  
  // Get tasks available for assignment
  async getUnassignedTasks(userId, teamId = null) {
    try {
      const query = {
        assignedTo: null,
        status: { $in: ['pending', 'ready'] },
        createdBy: userId // Initially only user's own tasks
      };
      
      if (teamId) {
        query.teamId = teamId;
      }
      
      return await Task.find(query)
        .sort({ createdAt: -1 })
        .limit(20);
        
    } catch (error) {
      throw new Error(`Failed to fetch unassigned tasks: ${error.message}`);
    }
  }
  
  // Get team members available for assignment
  async getAssignableMembers(teamId, excludeUserId = null) {
    try {
      const team = await Team.findById(teamId);
      if (!team) {
        throw new ValidationError('Team not found');
      }
      
      let members = team.members.filter(member => member.isActive !== false);
      
      if (excludeUserId) {
        members = members.filter(member => member.userId.toString() !== excludeUserId);
      }
      
      return members;
      
    } catch (error) {
      throw new Error(`Failed to fetch team members: ${error.message}`);
    }
  }
  
  // Assign task to team member
  async assignTask(taskId, assigneeId, assignerId) {
    try {
      // Validate task exists and can be assigned
      const task = await Task.findById(taskId);
      if (!task) {
        throw new ValidationError('Task not found');
      }
      
      if (task.assignedTo) {
        throw new ValidationError('Task is already assigned');
      }
      
      if (task.status === 'done' || task.status === 'cancelled') {
        throw new ValidationError('Cannot assign completed or cancelled task');
      }
      
      // Validate assignment permissions and constraints
      await this.validateAssignment(task, assigneeId, assignerId);
      
      // Perform assignment
      task.assignedTo = assigneeId;
      if (task.status === 'pending') {
        task.status = 'ready'; // Move to ready when assigned
      }
      
      await task.save();
      
      // Send notification to assignee
      await this.sendAssignmentNotification(task, assigneeId, assignerId);
      
      return task;
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Assignment failed: ${error.message}`);
    }
  }
  
  // Reassign existing task
  async reassignTask(taskId, newAssigneeId, assignerId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new ValidationError('Task not found');
      }
      
      const oldAssigneeId = task.assignedTo;
      
      // Validate new assignment
      await this.validateAssignment(task, newAssigneeId, assignerId);
      
      // Perform reassignment
      task.assignedTo = newAssigneeId;
      await task.save();
      
      // Notify both old and new assignees
      if (oldAssigneeId) {
        await this.sendReassignmentNotification(task, oldAssigneeId, newAssigneeId, assignerId, 'removed');
      }
      await this.sendReassignmentNotification(task, newAssigneeId, oldAssigneeId, assignerId, 'assigned');
      
      return task;
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Reassignment failed: ${error.message}`);
    }
  }
  
  // Validate assignment permissions and constraints
  async validateAssignment(task, assigneeId, assignerId) {
    // Check if assigner has permission (for now, only creator can assign)
    if (task.createdBy.toString() !== assignerId) {
      throw new ValidationError('Only task creator can assign this task');
    }
    
    // Check if assignee is valid team member
    if (task.teamId) {
      const team = await Team.findById(task.teamId);
      if (!team) {
        throw new ValidationError('Task team not found');
      }
      
      const isMember = team.members.some(member => 
        member.userId.toString() === assigneeId && member.isActive !== false
      );
      
      if (!isMember) {
        throw new ValidationError('Assignee is not an active team member');
      }
    }
    
    return true;
  }
  
  // Send notification to assignee
  async sendAssignmentNotification(task, assigneeId, assignerId) {
    try {
      // For now, just log the notification
      // In production, this would send Telegram message to assignee
      console.log(`Assignment notification: Task ${task._id} assigned to ${assigneeId} by ${assignerId}`);
      
      // TODO: Implement actual Telegram notification
      // const assigneeUser = await User.findById(assigneeId);
      // const assignerUser = await User.findById(assignerId);
      // await bot.sendMessage(assigneeUser.telegramId, notificationMessage);
      
      return true;
      
    } catch (error) {
      console.error('Failed to send assignment notification:', error);
      // Don't throw - assignment should still succeed even if notification fails
      return false;
    } 
  }
  
  // Send reassignment notification
  async sendReassignmentNotification(task, userId, otherUserId, assignerId, type) {
    try {
      console.log(`Reassignment notification: Task ${task._id} ${type} for ${userId}`);
      // TODO: Implement actual notifications
      return true;
    } catch (error) {
      console.error('Failed to send reassignment notification:', error);
      return false;
    }
  }
  
  // Post task card to team channel (future feature)
  async postTaskCardToChannel(task, channelId) {
    try {
      console.log(`Channel posting: Task ${task._id} to channel ${channelId}`);
      // TODO: Implement channel posting
      return true;
    } catch (error) {
      console.error('Failed to post task card:', error);
      return false;
    }
  }
  
  // Get task assignment history
  async getAssignmentHistory(taskId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new ValidationError('Task not found');
      }
      
      // For now, return basic assignment info
      // In future, could track assignment history in separate collection
      return {
        currentAssignee: task.assignedTo,
        assignedAt: task.updatedAt,
        status: task.status
      };
      
    } catch (error) {
      throw new Error(`Failed to get assignment history: ${error.message}`);
    }
  }
  
  // Bulk assign multiple tasks
  async bulkAssignTasks(taskIds, assigneeId, assignerId) {
    try {
      const results = [];
      
      for (const taskId of taskIds) {
        try {
          const result = await this.assignTask(taskId, assigneeId, assignerId);
          results.push({ taskId, success: true, task: result });
        } catch (error) {
          results.push({ taskId, success: false, error: error.message });
        }
      }
      
      return results;
      
    } catch (error) {
      throw new Error(`Bulk assignment failed: ${error.message}`);
    }
  }
}

module.exports = new TaskAssignmentService(); 