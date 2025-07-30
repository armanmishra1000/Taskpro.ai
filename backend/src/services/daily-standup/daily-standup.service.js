const Team = require('../../models/team.model');
const User = require('../../models/user.model');
const StandupResponse = require('../../models/standup-response.model');
const { ValidationError } = require('../../utils/errors');

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
      // Check if standup can be started
      const canStart = await this.canStartStandup(teamId);
      if (!canStart.canStart) {
        throw new ValidationError(canStart.reason);
      }

      // Start the standup process
      const result = await this.startDailyStandup(teamId);
      
      return {
        success: true,
        message: 'Test standup triggered successfully',
        participants: result.participantCount,
        standupDate: result.standupDate,
        team: result.team.name
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

  /**
   * Configure standup with comprehensive validation
   */
  async configureStandup(teamId, config) {
    try {
      const team = await Team.findById(teamId);
      if (!team) {
        throw new ValidationError('Team not found');
      }
      
      // Validate configuration
      this.validateStandupConfig(config);
      
      // Update team standup configuration
      team.standupConfig = { 
        ...team.standupConfig, 
        ...config,
        enabled: team.standupConfig?.enabled || false // Preserve enabled status
      };
      
      await team.save();
      
      return team;
    } catch (error) {
      console.error('Error configuring standup:', error);
      throw error;
    }
  }

  /**
   * Start daily standup process
   */
  async startDailyStandup(teamId) {
    try {
      const team = await Team.findById(teamId).populate('standupConfig.participants');
      if (!team) {
        throw new ValidationError('Team not found');
      }
      
      if (!team.standupConfig?.enabled) {
        throw new ValidationError('Standup automation is not enabled for this team');
      }
      
      const standupDate = this.getStandupDate();
      
      // Check if standup already exists for today
      const existingStandup = await StandupResponse.findOne({
        teamId,
        date: standupDate
      });
      
      if (existingStandup) {
        throw new ValidationError('Standup already started for today');
      }
      
      // Create pending responses for all participants
      const participantIds = team.standupConfig.participants || [];
      const createdResponses = [];
      
      for (const participantId of participantIds) {
        const response = await this.createPendingResponse(teamId, participantId, standupDate);
        createdResponses.push(response);
      }
      
      // Update last run timestamp
      team.standupConfig.lastRun = new Date();
      await team.save();
      
      return { 
        team, 
        participantCount: participantIds.length,
        standupDate,
        responses: createdResponses
      };
    } catch (error) {
      console.error('Error starting daily standup:', error);
      throw error;
    }
  }

  /**
   * Create pending response for a participant
   */
  async createPendingResponse(teamId, userId, date) {
    try {
      const response = new StandupResponse({
        teamId,
        userId,
        date,
        status: 'pending',
        responses: {
          yesterday: '',
          today: '',
          blockers: ''
        }
      });
      
      await response.save();
      return response;
    } catch (error) {
      console.error('Error creating pending response:', error);
      throw error;
    }
  }

  /**
   * Record standup response from user
   */
  async recordResponse(userId, questionNumber, response, teamId = null) {
    try {
      const today = this.getStandupDate();
      
      // Find the user's pending response for today
      const query = {
        userId,
        date: today,
        status: 'pending'
      };
      
      if (teamId) {
        query.teamId = teamId;
      }
      
      const standupResponse = await StandupResponse.findOne(query);
      if (!standupResponse) {
        throw new ValidationError('No pending standup found for today');
      }
      
      // Map question number to response field
      const responseFields = {
        1: 'yesterday',
        2: 'today', 
        3: 'blockers'
      };
      
      const field = responseFields[questionNumber];
      if (!field) {
        throw new ValidationError('Invalid question number');
      }
      
      // Validate response length
      if (response.length < 3) {
        throw new ValidationError('Response must be at least 3 characters long');
      }
      
      if (response.length > 500) {
        throw new ValidationError('Response must be 500 characters or less');
      }
      
      // Update response
      standupResponse.responses[field] = response;
      standupResponse.submittedAt = new Date();
      
      // Check if all questions are answered
      const allAnswered = Object.values(standupResponse.responses).every(r => r.length >= 3);
      if (allAnswered) {
        standupResponse.status = 'submitted';
      }
      
      await standupResponse.save();
      
      return standupResponse;
    } catch (error) {
      console.error('Error recording response:', error);
      throw error;
    }
  }

  /**
   * Generate team summary for a specific date
   */
  async generateTeamSummary(teamId, date = null) {
    try {
      const standupDate = date || this.getStandupDate();
      
      const responses = await StandupResponse.find({
        teamId,
        date: standupDate,
        status: { $in: ['submitted', 'late'] }
      }).populate('userId', 'firstName lastName username');
      
      const team = await Team.findById(teamId);
      if (!team) {
        throw new ValidationError('Team not found');
      }
      
      const totalParticipants = team.standupConfig?.participants?.length || 0;
      const respondedCount = responses.length;
      const participationPercentage = totalParticipants > 0 ? 
        Math.round((respondedCount / totalParticipants) * 100) : 0;
      
      // Group responses by type
      const accomplishments = responses.map(r => ({
        member: r.userId.firstName || r.userId.username,
        text: r.responses.yesterday
      }));
      
      const todayFocus = responses.map(r => ({
        member: r.userId.firstName || r.userId.username,
        text: r.responses.today
      }));
      
      const blockers = responses
        .filter(r => {
          const blockerText = r.responses.blockers.toLowerCase();
          return !blockerText.includes('no blocker') && 
                 !blockerText.includes('none') && 
                 !blockerText.includes('clear') &&
                 blockerText.length > 3;
        })
        .map(r => ({
          member: r.userId.firstName || r.userId.username,
          text: r.responses.blockers
        }));
      
      // Get non-respondents
      const respondentIds = responses.map(r => r.userId._id.toString());
      const nonRespondents = team.standupConfig?.participants?.filter(
        p => !respondentIds.includes(p.toString())
      ) || [];
      
      return {
        team: team.name,
        date: standupDate,
        participation: {
          responded: respondedCount,
          total: totalParticipants,
          percentage: participationPercentage
        },
        accomplishments,
        todayFocus,
        blockers,
        nonRespondents: nonRespondents.length,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating team summary:', error);
      throw error;
    }
  }

  /**
   * Get standup responses for a team and date
   */
  async getStandupResponses(teamId, date = null) {
    try {
      const standupDate = date || this.getStandupDate();
      
      const responses = await StandupResponse.find({
        teamId,
        date: standupDate
      }).populate('userId', 'firstName lastName username');
      
      return responses;
    } catch (error) {
      console.error('Error getting standup responses:', error);
      throw error;
    }
  }

  /**
   * Get standup status for a team
   */
  async getStandupStatus(teamId, date = null) {
    try {
      const standupDate = date || this.getStandupDate();
      
      const responses = await StandupResponse.find({
        teamId,
        date: standupDate
      });
      
      const status = {
        pending: responses.filter(r => r.status === 'pending').length,
        submitted: responses.filter(r => r.status === 'submitted').length,
        late: responses.filter(r => r.status === 'late').length,
        missed: responses.filter(r => r.status === 'missed').length,
        total: responses.length
      };
      
      return status;
    } catch (error) {
      console.error('Error getting standup status:', error);
      throw error;
    }
  }

  /**
   * Mark overdue responses as late
   */
  async markOverdueResponses(teamId, date = null) {
    try {
      const standupDate = date || this.getStandupDate();
      const timeoutMinutes = 120; // 2 hours default
      
      const cutoffTime = new Date(standupDate);
      cutoffTime.setMinutes(cutoffTime.getMinutes() + timeoutMinutes);
      
      const result = await StandupResponse.updateMany(
        {
          teamId,
          date: standupDate,
          status: 'pending',
          submittedAt: { $lt: cutoffTime }
        },
        {
          $set: { status: 'late' }
        }
      );
      
      return result.modifiedCount;
    } catch (error) {
      console.error('Error marking overdue responses:', error);
      throw error;
    }
  }

  /**
   * Get standup date (midnight UTC)
   */
  getStandupDate() {
    const now = new Date();
    const standupDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return standupDate;
  }

  /**
   * Validate standup configuration
   */
  validateStandupConfig(config) {
    if (config.scheduleTime && !this.validateScheduleTime(config.scheduleTime)) {
      throw new ValidationError('Invalid schedule time format. Use HH:MM (24-hour)');
    }
    
    if (config.scheduleTime) {
      const [hours, minutes] = config.scheduleTime.split(':').map(Number);
      if (hours < 6 || hours > 10) {
        throw new ValidationError('Schedule time should be between 06:00 and 10:00');
      }
    }
    
    if (config.timezone && !this.validateTimezone(config.timezone)) {
      throw new ValidationError('Invalid timezone');
    }
    
    if (config.participants && config.participants.length === 0) {
      throw new ValidationError('At least one participant is required');
    }
    
    if (config.responseTimeout && (config.responseTimeout < 30 || config.responseTimeout > 480)) {
      throw new ValidationError('Response timeout must be between 30 and 480 minutes');
    }
  }

  /**
   * Check if standup can be started
   */
  async canStartStandup(teamId) {
    try {
      const team = await Team.findById(teamId);
      if (!team || !team.standupConfig?.enabled) {
        return { canStart: false, reason: 'Standup automation is not enabled' };
      }
      
      const standupDate = this.getStandupDate();
      const existingStandup = await StandupResponse.findOne({
        teamId,
        date: standupDate
      });
      
      if (existingStandup) {
        return { canStart: false, reason: 'Standup already started for today' };
      }
      
      if (!team.standupConfig.participants || team.standupConfig.participants.length === 0) {
        return { canStart: false, reason: 'No participants configured' };
      }
      
      return { canStart: true };
    } catch (error) {
      console.error('Error checking if standup can start:', error);
      return { canStart: false, reason: 'Error checking standup status' };
    }
  }

  /**
   * Get standup history for a team
   */
  async getStandupHistory(teamId, limit = 10) {
    try {
      const responses = await StandupResponse.aggregate([
        { $match: { teamId: teamId } },
        { $group: {
          _id: '$date',
          totalResponses: { $sum: 1 },
          submittedResponses: { 
            $sum: { $cond: [{ $in: ['$status', ['submitted', 'late']] }, 1, 0] }
          },
          date: { $first: '$date' }
        }},
        { $sort: { date: -1 } },
        { $limit: limit }
      ]);
      
      return responses.map(r => ({
        date: r.date,
        total: r.totalResponses,
        submitted: r.submittedResponses,
        percentage: Math.round((r.submittedResponses / r.totalResponses) * 100)
      }));
    } catch (error) {
      console.error('Error getting standup history:', error);
      throw error;
    }
  }
}

module.exports = new DailyStandupService(); 