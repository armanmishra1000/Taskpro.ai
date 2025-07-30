const Team = require('../../models/team.model');
const User = require('../../models/user.model');
const StandupResponse = require('../../models/standup-response.model');

class DailyStandupService {
  /**
   * Get the team that the user belongs to
   */
  async getUserTeam(userId) {
    try {
      const team = await Team.findOne({
        'members.userId': userId,
        isDeleted: false
      });
      
      return team;
    } catch (error) {
      console.error('Error getting user team:', error);
      throw error;
    }
  }

  /**
   * Check if user has permission to configure standup automation
   */
  hasConfigPermission(userId, team) {
    if (!team || !team.members) {
      return false;
    }

    const member = team.members.find(m => m.userId.toString() === userId.toString());
    if (!member) {
      return false;
    }

    // Only managers and admins can configure standup
    return ['manager', 'admin'].includes(member.role);
  }

  /**
   * Get standup configuration for a team
   */
  async getStandupConfig(teamId) {
    try {
      const team = await Team.findById(teamId);
      return team?.standupConfig || null;
    } catch (error) {
      console.error('Error getting standup config:', error);
      throw error;
    }
  }

  /**
   * Update standup configuration
   */
  async updateStandupConfig(teamId, config) {
    try {
      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      team.standupConfig = {
        ...team.standupConfig,
        ...config
      };

      await team.save();
      return team.standupConfig;
    } catch (error) {
      console.error('Error updating standup config:', error);
      throw error;
    }
  }

  /**
   * Enable standup automation
   */
  async enableStandup(teamId) {
    try {
      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      if (!team.standupConfig.scheduleTime) {
        throw new Error('Schedule time must be set before enabling standup');
      }

      if (!team.standupConfig.channelId) {
        throw new Error('Channel must be set before enabling standup');
      }

      if (!team.standupConfig.participants || team.standupConfig.participants.length === 0) {
        throw new Error('Participants must be set before enabling standup');
      }

      team.standupConfig.enabled = true;
      await team.save();

      return team.standupConfig;
    } catch (error) {
      console.error('Error enabling standup:', error);
      throw error;
    }
  }

  /**
   * Disable standup automation
   */
  async disableStandup(teamId) {
    try {
      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      team.standupConfig.enabled = false;
      await team.save();

      return team.standupConfig;
    } catch (error) {
      console.error('Error disabling standup:', error);
      throw error;
    }
  }

  /**
   * Get team members for standup participation
   */
  async getTeamMembers(teamId) {
    try {
      const team = await Team.findById(teamId).populate('members.userId');
      if (!team) {
        throw new Error('Team not found');
      }

      return team.members.map(member => ({
        userId: member.userId._id,
        username: member.username,
        role: member.role,
        isActive: member.userId.isActive
      }));
    } catch (error) {
      console.error('Error getting team members:', error);
      throw error;
    }
  }

  /**
   * Trigger immediate standup for testing
   */
  async triggerStandupNow(teamId) {
    try {
      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      if (!team.standupConfig.enabled) {
        throw new Error('Standup automation is not enabled');
      }

      // This would trigger the standup process
      // For now, just return success
      return {
        success: true,
        message: 'Test standup triggered successfully',
        participants: team.standupConfig.participants?.length || 0
      };
    } catch (error) {
      console.error('Error triggering standup:', error);
      throw error;
    }
  }

  /**
   * Validate schedule time format
   */
  validateScheduleTime(time) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Validate timezone
   */
  validateTimezone(timezone) {
    // Basic timezone validation - could be enhanced
    const validTimezones = [
      'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
      'Australia/Sydney', 'Pacific/Auckland'
    ];
    
    return validTimezones.includes(timezone);
  }
}

module.exports = new DailyStandupService(); 