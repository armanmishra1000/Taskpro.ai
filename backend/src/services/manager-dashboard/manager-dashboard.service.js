const User = require('../../models/user.model');
const Team = require('../../models/team.model');
const Task = require('../../models/task.model');
const StandupResponse = require('../../models/standup-response.model');

class ManagerDashboardService {
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

      return {
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
    } catch (error) {
      console.error('Error getting dashboard overview:', error);
      throw new Error('Failed to load dashboard data');
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
   * Get team velocity metrics
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
}

module.exports = new ManagerDashboardService(); 