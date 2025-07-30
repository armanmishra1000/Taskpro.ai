const User = require('../../models/user.model');
const Team = require('../../models/team.model');
const Task = require('../../models/task.model');
const StandupResponse = require('../../models/standup-response.model');
const { ValidationError, UnauthorizedError } = require('../../utils/errors');

class ManagerDashboardService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Validate if user has manager permissions
   */
  async validateManagerPermissions(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.isActive || user.isDeleted) {
        return false;
      }
      
      // Check if user has manager/admin role
      if (user.hasManagerPermissions()) {
        return true;
      }
      
      // Check if user is manager/admin in any team
      const teams = await Team.getTeamsForManager(userId);
      return teams.length > 0;
    } catch (error) {
      console.error('Error validating manager permissions:', error);
      return false;
    }
  }

  /**
   * Get dashboard overview data for a manager
   */
  async getDashboardOverview(userId) {
    try {
      // Validate permissions
      const hasPermission = await this.validateManagerPermissions(userId);
      if (!hasPermission) {
        throw new UnauthorizedError('User does not have manager permissions');
      }

      // Check cache first
      const cacheKey = `dashboard_overview_${userId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Get user's teams where they have manager permissions
      const teams = await Team.getTeamsForManager(userId);
      
      if (teams.length === 0) {
        return {
          hasTeams: false,
          message: 'No teams found where you have manager permissions'
        };
      }

      // For now, use the first team (can be enhanced to show multi-team dashboard)
      const primaryTeam = teams[0];
      const teamId = primaryTeam._id;

      // Get comprehensive dashboard metrics
      const [
        taskMetrics,
        velocityTrend,
        activeBlockers,
        teamActivity
      ] = await Promise.all([
        Task.getTeamDashboardMetrics(teamId),
        Task.getTeamVelocityTrend(teamId, 7), // Last 7 days
        Task.getActiveBlockersForTeam(teamId),
        StandupResponse.getTeamActivityMetrics(teamId, 7) // Last 7 days
      ]);

      // Calculate completion rate
      const completionRate = taskMetrics.velocityMetrics.totalCompleted > 0 
        ? Math.round((taskMetrics.velocityMetrics.totalCompleted / (taskMetrics.activeTasks + taskMetrics.velocityMetrics.totalCompleted)) * 100)
        : 0;

      // Calculate average completion time in days
      const avgCompletionDays = taskMetrics.velocityMetrics.avgCompletionTime > 0
        ? Math.round(taskMetrics.velocityMetrics.avgCompletionTime / (1000 * 60 * 60 * 24) * 10) / 10
        : 0;

      const result = {
        hasTeams: true,
        team: {
          id: teamId,
          name: primaryTeam.name,
          memberCount: primaryTeam.getActiveMemberCount()
        },
        activeTasks: {
          total: taskMetrics.activeTasks,
          overdue: taskMetrics.overdueTasks,
          statusBreakdown: taskMetrics.statusBreakdown,
          priorityBreakdown: taskMetrics.priorityBreakdown
        },
        velocity: {
          completionRate,
          avgCompletionDays,
          totalCompleted: taskMetrics.velocityMetrics.totalCompleted,
          trend: velocityTrend
        },
        blockers: {
          count: taskMetrics.activeBlockers,
          details: activeBlockers
        },
        overdue: {
          count: taskMetrics.overdueTasks,
          details: await Task.getOverdueTasksForTeam(teamId, 5) // Top 5 overdue
        },
        teamActivity: {
          metrics: teamActivity,
          recentActivity: await StandupResponse.getRecentTeamActivity(teamId, 3)
        }
      };

      // Cache the result
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error getting dashboard overview:', error);
      throw new Error('Failed to load dashboard data');
    }
  }

  /**
   * Get active tasks breakdown with enhanced metrics
   */
  async getActiveTasksBreakdown(userId) {
    try {
      const teams = await this.getManagedTeams(userId);
      if (teams.length === 0) {
        throw new ValidationError('No managed teams found');
      }

      const teamIds = teams.map(team => team._id);
      
      const activeTasks = await Task.find({
        teamId: { $in: teamIds },
        status: { $ne: 'done' },
        isDeleted: false
      }).populate('assignedTo', 'username firstName lastName');
      
      // Status breakdown
      const statusBreakdown = {
        ready: activeTasks.filter(t => t.status === 'ready').length,
        in_progress: activeTasks.filter(t => t.status === 'in_progress').length,
        review: activeTasks.filter(t => t.status === 'review').length,
        blocked: activeTasks.filter(t => t.status === 'blocked').length,
        pending: activeTasks.filter(t => t.status === 'pending').length
      };
      
      // Priority breakdown
      const priorityBreakdown = {
        high: activeTasks.filter(t => t.priority === 'high').length,
        medium: activeTasks.filter(t => t.priority === 'medium').length,
        low: activeTasks.filter(t => t.priority === 'low').length,
        critical: activeTasks.filter(t => t.priority === 'critical').length
      };
      
      // Recent tasks (top 5 by creation date)
      const recentTasks = activeTasks
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      
      return {
        statusBreakdown,
        priorityBreakdown,
        recentTasks,
        total: activeTasks.length
      };
    } catch (error) {
      console.error('Active tasks breakdown error:', error);
      throw new Error('Failed to load active tasks data');
    }
  }

  /**
   * Get detailed active tasks for dashboard
   */
  async getActiveTasksDetails(teamId, limit = 10) {
    try {
      return await Task.find({
        teamId,
        isDeleted: false,
        status: { $nin: ['done'] }
      })
      .populate('assignedTo', 'firstName lastName username')
      .populate('createdBy', 'firstName lastName username')
      .sort({ deadline: 1 })
      .limit(limit);
    } catch (error) {
      console.error('Error getting active tasks details:', error);
      throw new Error('Failed to load active tasks');
    }
  }

  /**
   * Get team velocity metrics with enhanced calculations
   */
  async getTeamVelocityMetrics(userId) {
    try {
      const teams = await this.getManagedTeams(userId);
      if (teams.length === 0) {
        throw new ValidationError('No managed teams found');
      }

      const teamIds = teams.map(team => team._id);
      
      // Get completed tasks in last 4 weeks
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      
      const completedTasks = await Task.find({
        teamId: { $in: teamIds },
        status: 'done',
        completedAt: { $gte: fourWeeksAgo },
        isDeleted: false
      });
      
      // Calculate current week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const thisWeekCompleted = completedTasks.filter(task => 
        new Date(task.completedAt) >= oneWeekAgo
      );
      
      // Calculate completion rate (completed vs total created)
      const totalTasks = await Task.countDocuments({
        teamId: { $in: teamIds },
        createdAt: { $gte: fourWeeksAgo },
        isDeleted: false
      });
      
      const completionRate = totalTasks > 0 ? 
        Math.round((completedTasks.length / totalTasks) * 100) : 0;
      
      // Calculate average completion time
      const avgCompletionTime = this.calculateAverageCompletionTime(completedTasks);
      
      // Get top performers
      const topPerformers = await this.getTopPerformers(teamIds, oneWeekAgo);
      
      // Get velocity trend
      const velocityTrend = await Task.getTeamVelocityTrend(teamIds[0], 7);
      
      return {
        completionRate,
        tasksCompletedThisWeek: thisWeekCompleted.length,
        avgCompletionTime,
        topPerformers,
        trend: velocityTrend
      };
    } catch (error) {
      console.error('Velocity metrics error:', error);
      throw new Error('Failed to load velocity metrics');
    }
  }

  /**
   * Get team velocity metrics for specific team
   */
  async getTeamVelocityMetrics(teamId, days = 30) {
    try {
      const [velocityTrend, recentCompleted] = await Promise.all([
        Task.getTeamVelocityTrend(teamId, days),
        Task.find({
          teamId,
          isDeleted: false,
          status: 'done',
          completedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
        })
        .populate('assignedTo', 'firstName lastName username')
        .sort({ completedAt: -1 })
        .limit(10)
      ]);

      return {
        trend: velocityTrend,
        recentCompleted
      };
    } catch (error) {
      console.error('Error getting velocity metrics:', error);
      throw new Error('Failed to load velocity data');
    }
  }

  /**
   * Get active blockers with enhanced analysis
   */
  async getActiveBlockers(userId) {
    try {
      const teams = await this.getManagedTeams(userId);
      if (teams.length === 0) {
        throw new ValidationError('No managed teams found');
      }

      const teamIds = teams.map(team => team._id);
      
      const blockedTasks = await Task.find({
        teamId: { $in: teamIds },
        status: 'blocked',
        'blockers.0': { $exists: true },
        isDeleted: false
      }).populate('assignedTo', 'username firstName lastName');
      
      // Sort by priority and reported date
      const prioritizedBlockers = blockedTasks
        .map(task => ({
          ...task.toObject(),
          latestBlocker: task.blockers[task.blockers.length - 1]
        }))
        .sort((a, b) => {
          // Sort by impact level first, then by reported date
          const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const aImpact = impactOrder[a.latestBlocker.impact] || 0;
          const bImpact = impactOrder[b.latestBlocker.impact] || 0;
          
          if (aImpact !== bImpact) return bImpact - aImpact;
          return new Date(b.latestBlocker.reportedAt) - new Date(a.latestBlocker.reportedAt);
        });
      
      return {
        blockers: prioritizedBlockers,
        count: prioritizedBlockers.length,
        avgResolutionTime: await this.calculateAvgBlockerResolution(teamIds)
      };
    } catch (error) {
      console.error('Active blockers error:', error);
      throw new Error('Failed to load blocker data');
    }
  }

  /**
   * Get blocker alerts for dashboard
   */
  async getBlockerAlerts(teamId) {
    try {
      const blockers = await Task.getActiveBlockersForTeam(teamId);
      
      // Group blockers by impact level
      const groupedBlockers = {
        critical: blockers.filter(task => 
          task.blockers.some(b => b.impact === 'critical' && b.status === 'active')
        ),
        high: blockers.filter(task => 
          task.blockers.some(b => b.impact === 'high' && b.status === 'active')
        ),
        medium: blockers.filter(task => 
          task.blockers.some(b => b.impact === 'medium' && b.status === 'active')
        )
      };

      return {
        total: blockers.length,
        grouped: groupedBlockers,
        all: blockers
      };
    } catch (error) {
      console.error('Error getting blocker alerts:', error);
      throw new Error('Failed to load blocker data');
    }
  }

  /**
   * Get overdue tasks with enhanced urgency analysis
   */
  async getOverdueTasks(userId) {
    try {
      const teams = await this.getManagedTeams(userId);
      if (teams.length === 0) {
        throw new ValidationError('No managed teams found');
      }

      const teamIds = teams.map(team => team._id);
      
      const now = new Date();
      const overdueTasks = await Task.find({
        teamId: { $in: teamIds },
        status: { $ne: 'done' },
        deadline: { $lt: now },
        isDeleted: false
      }).populate('assignedTo', 'username firstName lastName');
      
      // Calculate urgency levels based on how overdue
      const categorizedTasks = overdueTasks.map(task => {
        const daysOverdue = Math.floor((now - new Date(task.deadline)) / (1000 * 60 * 60 * 24));
        let urgencyLevel = 'medium';
        
        if (daysOverdue >= 3) urgencyLevel = 'critical';
        else if (daysOverdue >= 1) urgencyLevel = 'high';
        else if (daysOverdue >= 0) urgencyLevel = 'medium';
        
        return {
          ...task.toObject(),
          daysOverdue,
          urgencyLevel
        };
      });
      
      // Sort by urgency level and days overdue
      const sortedTasks = categorizedTasks.sort((a, b) => {
        const urgencyOrder = { critical: 3, high: 2, medium: 1 };
        const aUrgency = urgencyOrder[a.urgencyLevel];
        const bUrgency = urgencyOrder[b.urgencyLevel];
        
        if (aUrgency !== bUrgency) return bUrgency - aUrgency;
        return b.daysOverdue - a.daysOverdue;
      });
      
      return {
        tasks: sortedTasks,
        count: sortedTasks.length,
        breakdown: {
          critical: sortedTasks.filter(t => t.urgencyLevel === 'critical').length,
          high: sortedTasks.filter(t => t.urgencyLevel === 'high').length,
          medium: sortedTasks.filter(t => t.urgencyLevel === 'medium').length
        }
      };
    } catch (error) {
      console.error('Overdue tasks error:', error);
      throw new Error('Failed to load overdue tasks');
    }
  }

  /**
   * Get overdue tasks analysis
   */
  async getOverdueTasksAnalysis(teamId) {
    try {
      const overdueTasks = await Task.getOverdueTasksForTeam(teamId);
      
      // Group by urgency (days overdue)
      const now = new Date();
      const grouped = {
        critical: [], // 3+ days overdue
        high: [],     // 1-2 days overdue
        medium: []    // Due today
      };

      overdueTasks.forEach(task => {
        const daysOverdue = Math.floor((now - task.deadline) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue >= 3) {
          grouped.critical.push(task);
        } else if (daysOverdue >= 1) {
          grouped.high.push(task);
        } else {
          grouped.medium.push(task);
        }
      });

      return {
        total: overdueTasks.length,
        grouped,
        all: overdueTasks
      };
    } catch (error) {
      console.error('Error getting overdue tasks analysis:', error);
      throw new Error('Failed to load overdue tasks data');
    }
  }

  /**
   * Refresh dashboard cache
   */
  async refreshDashboardCache(userId) {
    try {
      // Clear all cache entries for this user
      const cacheKeys = Array.from(this.cache.keys()).filter(key => key.includes(`_${userId}`));
      cacheKeys.forEach(key => this.cache.delete(key));
      
      // Pre-warm cache with fresh data
      await this.getDashboardOverview(userId);
      
      return true;
    } catch (error) {
      console.error('Cache refresh error:', error);
      return false;
    }
  }

  /**
   * Get teams where user has manager permissions
   */
  async getTeamsForManager(userId) {
    try {
      const Team = require('../../models/team.model');
      return await Team.getTeamsForManager(userId);
    } catch (error) {
      console.error('Error getting teams for manager:', error);
      throw new Error('Failed to load team data');
    }
  }

  // Helper methods
  async getManagedTeams(userId) {
    return await Team.find({
      'members.userId': userId,
      'members.role': { $in: ['manager', 'admin'] },
      isDeleted: false
    });
  }
  
  calculateAverageCompletionTime(completedTasks) {
    if (completedTasks.length === 0) return 0;
    
    const totalTime = completedTasks.reduce((sum, task) => {
      const completionTime = new Date(task.completedAt) - new Date(task.createdAt);
      return sum + completionTime;
    }, 0);
    
    const avgMilliseconds = totalTime / completedTasks.length;
    return Math.round(avgMilliseconds / (1000 * 60 * 60 * 24) * 10) / 10; // Days with 1 decimal
  }
  
  async getTopPerformers(teamIds, since) {
    const pipeline = [
      {
        $match: {
          teamId: { $in: teamIds },
          status: 'done',
          completedAt: { $gte: since },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          completedCount: { $sum: 1 }
        }
      },
      {
        $sort: { completedCount: -1 }
      },
      {
        $limit: 3
      }
    ];
    
    const performers = await Task.aggregate(pipeline);
    
    // Populate user details
    for (let performer of performers) {
      const user = await User.findById(performer._id).select('username firstName lastName');
      performer.user = user;
    }
    
    return performers;
  }
  
  async calculateAvgBlockerResolution(teamIds) {
    // Calculate average blocker resolution time from resolved blockers
    const resolvedBlockers = await Task.find({
      teamId: { $in: teamIds },
      'blockers.resolvedAt': { $exists: true },
      isDeleted: false
    });
    
    if (resolvedBlockers.length === 0) return 0;
    
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    
    resolvedBlockers.forEach(task => {
      task.blockers.forEach(blocker => {
        if (blocker.resolvedAt) {
          const resolutionTime = new Date(blocker.resolvedAt) - new Date(blocker.reportedAt);
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }
      });
    });
    
    if (resolvedCount === 0) return 0;
    
    const avgMilliseconds = totalResolutionTime / resolvedCount;
    return Math.round(avgMilliseconds / (1000 * 60 * 60 * 24) * 10) / 10; // Days with 1 decimal
  }

  // Cache management methods
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = new ManagerDashboardService(); 