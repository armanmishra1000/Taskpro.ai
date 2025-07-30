const { createInlineKeyboard } = require('../../utils/keyboard');

class ManagerDashboardFormatter {
  /**
   * Format main dashboard overview
   */
  formatDashboardOverview(dashboardData) {
    return `📊 *Manager Dashboard*

🏢 *Team:* ${dashboardData.team.name} (${dashboardData.team.memberCount} members)

🔍 *Active Tasks:* ${dashboardData.activeTasks.total} total (${dashboardData.activeTasks.overdue} overdue)
⚡ *Team Velocity:* ${dashboardData.velocity.completionRate}% completion rate
🚧 *Active Blockers:* ${dashboardData.blockers.count} requiring attention
⏰ *Overdue Tasks:* ${dashboardData.overdue.count} need immediate action

Select a section to explore:`;
  }

  /**
   * Create main dashboard keyboard
   */
  createDashboardKeyboard() {
    return createInlineKeyboard([
      [
        { text: '📋 Active Tasks', callback_data: 'dashboard_active_tasks' },
        { text: '📈 Velocity Metrics', callback_data: 'dashboard_velocity' }
      ],
      [
        { text: '🚧 Blocker Alerts', callback_data: 'dashboard_blockers' },
        { text: '⏰ Overdue Tasks', callback_data: 'dashboard_overdue' }
      ],
      [
        { text: '🔄 Refresh Data', callback_data: 'dashboard_refresh' }
      ]
    ]);
  }

  /**
   * Format active tasks view
   */
  formatActiveTasksView(activeTasksData) {
    const { team, activeTasks, recentTasks } = activeTasksData;
    
    let message = `📋 *Active Tasks Overview*

🏢 *Team:* ${team.name}

📊 *Status Breakdown:*\n`;
    
    // Add status breakdown
    Object.entries(activeTasks.statusBreakdown).forEach(([status, count]) => {
      const statusEmoji = this.getStatusEmoji(status);
      const statusName = this.formatStatusName(status);
      message += `${statusEmoji} ${statusName}: ${count} tasks\n`;
    });
    
    message += `\n🎯 *Priority Distribution:*\n`;
    
    // Add priority breakdown
    Object.entries(activeTasks.priorityBreakdown).forEach(([priority, count]) => {
      const priorityEmoji = this.getPriorityEmoji(priority);
      const priorityName = this.formatPriorityName(priority);
      message += `${priorityEmoji} ${priorityName}: ${count} tasks\n`;
    });
    
    if (recentTasks && recentTasks.length > 0) {
      message += `\n📌 *Top ${Math.min(recentTasks.length, 5)} Recent Tasks:*\n`;
      recentTasks.slice(0, 5).forEach(task => {
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const dueDate = this.formatDueDate(task.deadline);
        const statusEmoji = this.getStatusEmoji(task.status);
        message += `\n📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Due: ${dueDate}\n`;
        message += `   ${statusEmoji} ${this.formatStatusName(task.status)}\n`;
      });
    }
    
    return message;
  }

  /**
   * Create active tasks section keyboard
   */
  createSectionKeyboard(section) {
    const keyboards = {
      active_tasks: createInlineKeyboard([
        [
          { text: '📋 All Tasks', callback_data: 'dashboard_all_tasks' },
          { text: '🔥 High Priority', callback_data: 'dashboard_high_priority' }
        ],
        [
          { text: '⬅️ Back to Dashboard', callback_data: 'dashboard_main' }
        ]
      ]),
      
      velocity: createInlineKeyboard([
        [
          { text: '📊 Performance Report', callback_data: 'dashboard_performance_report' },
          { text: '🏆 Top Performers', callback_data: 'dashboard_top_performers' }
        ],
        [
          { text: '⬅️ Back to Dashboard', callback_data: 'dashboard_main' }
        ]
      ]),
      
      blockers: createInlineKeyboard([
        [
          { text: '🚨 Critical Blockers', callback_data: 'dashboard_critical_blockers' },
          { text: '⚠️ All Blockers', callback_data: 'dashboard_all_blockers' }
        ],
        [
          { text: '⬅️ Back to Dashboard', callback_data: 'dashboard_main' }
        ]
      ]),
      
      overdue: createInlineKeyboard([
        [
          { text: '🔴 Critical Overdue', callback_data: 'dashboard_critical_overdue' },
          { text: '⏰ All Overdue', callback_data: 'dashboard_all_overdue' }
        ],
        [
          { text: '⬅️ Back to Dashboard', callback_data: 'dashboard_main' }
        ]
      ])
    };
    
    return keyboards[section] || this.createDashboardKeyboard();
  }

  /**
   * Format velocity metrics
   */
  formatVelocityMetrics(velocityData) {
    const { team, velocity, recentCompleted } = velocityData;
    
    let message = `📈 *Team Velocity Metrics*

🏢 *Team:* ${team.name}

⚡ *Current Velocity:* ${velocity.completionRate}%
📊 *Tasks Completed:* ${velocity.totalCompleted} this week
⏱️ *Avg Completion Time:* ${velocity.avgCompletionDays} days\n`;
    
    if (velocity.trend && velocity.trend.length > 0) {
      message += `📈 *Trend:* ${this.calculateTrend(velocity.trend)} vs last week\n`;
    }
    
    if (recentCompleted && recentCompleted.length > 0) {
      message += `\n🏆 *Recent Completions:*\n`;
      recentCompleted.slice(0, 5).forEach(task => {
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const completedDate = new Date(task.completedAt).toLocaleDateString();
        message += `\n✅ ${task.title}\n`;
        message += `   👤 ${assignee} • Completed: ${completedDate}\n`;
      });
    }
    
    return message;
  }

  /**
   * Format blocker alerts
   */
  formatBlockerAlerts(blockersData) {
    const { team, blockers } = blockersData;
    
    let message = `🚧 *Active Blocker Alerts*

🏢 *Team:* ${team.name}

⚠️ *${blockers.total} blockers requiring attention:*\n`;
    
    if (blockers.grouped.critical.length > 0) {
      message += `\n🚨 *CRITICAL PRIORITY*\n`;
      blockers.grouped.critical.forEach(task => {
        const blocker = task.blockers.find(b => b.impact === 'critical' && b.status === 'active');
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const reportedTime = this.formatTimeAgo(blocker.reportedAt);
        message += `📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Reported: ${reportedTime}\n`;
        message += `   🔥 Impact: Critical\n`;
        message += `   📝 "${blocker.attempts.substring(0, 100)}..."\n\n`;
      });
    }
    
    if (blockers.grouped.high.length > 0) {
      message += `\n⚠️ *HIGH PRIORITY*\n`;
      blockers.grouped.high.forEach(task => {
        const blocker = task.blockers.find(b => b.impact === 'high' && b.status === 'active');
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const reportedTime = this.formatTimeAgo(blocker.reportedAt);
        message += `📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Reported: ${reportedTime}\n`;
        message += `   🔥 Impact: High\n`;
        message += `   📝 "${blocker.attempts.substring(0, 100)}..."\n\n`;
      });
    }
    
    if (blockers.grouped.medium.length > 0) {
      message += `\n⚠️ *MEDIUM PRIORITY*\n`;
      blockers.grouped.medium.forEach(task => {
        const blocker = task.blockers.find(b => b.impact === 'medium' && b.status === 'active');
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const reportedTime = this.formatTimeAgo(blocker.reportedAt);
        message += `📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Reported: ${reportedTime}\n`;
        message += `   🔥 Impact: Medium\n`;
        message += `   📝 "${blocker.attempts.substring(0, 100)}..."\n\n`;
      });
    }
    
    message += `\n📊 *Blocker Stats:*\n`;
    message += `Active: ${blockers.total} blockers\n`;
    
    return message;
  }

  /**
   * Format overdue tasks warnings
   */
  formatOverdueWarnings(overdueData) {
    const { team, overdue } = overdueData;
    
    let message = `⏰ *Overdue Task Warnings*

🏢 *Team:* ${team.name}

🚨 *${overdue.total} tasks require immediate attention:*\n`;
    
    if (overdue.grouped.critical.length > 0) {
      message += `\n🔴 *CRITICAL - 3+ days overdue*\n`;
      overdue.grouped.critical.forEach(task => {
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const dueDate = new Date(task.deadline).toLocaleDateString();
        const daysOverdue = Math.floor((new Date() - task.deadline) / (1000 * 60 * 60 * 24));
        message += `📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Due: ${dueDate} (${daysOverdue} days overdue)\n`;
        message += `   🎯 ${task.goal}\n\n`;
      });
    }
    
    if (overdue.grouped.high.length > 0) {
      message += `\n🟠 *HIGH - 1-2 days overdue*\n`;
      overdue.grouped.high.forEach(task => {
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const dueDate = new Date(task.deadline).toLocaleDateString();
        const daysOverdue = Math.floor((new Date() - task.deadline) / (1000 * 60 * 60 * 24));
        message += `📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Due: ${dueDate} (${daysOverdue} days overdue)\n`;
        message += `   🎯 ${task.goal}\n\n`;
      });
    }
    
    if (overdue.grouped.medium.length > 0) {
      message += `\n🟡 *MEDIUM - Due today*\n`;
      overdue.grouped.medium.forEach(task => {
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const dueDate = new Date(task.deadline).toLocaleDateString();
        message += `📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Due: ${dueDate}\n`;
        message += `   🎯 ${task.goal}\n\n`;
      });
    }
    
    message += `\n📊 *Overdue Summary:*\n`;
    message += `Total: ${overdue.total} tasks\n`;
    message += `Critical: ${overdue.grouped.critical.length} tasks\n`;
    message += `High: ${overdue.grouped.high.length} tasks\n`;
    message += `Medium: ${overdue.grouped.medium.length} tasks\n`;
    
    return message;
  }

  // Helper methods
  getStatusEmoji(status) {
    const emojis = {
      'pending': '⏳',
      'ready': '✅',
      'in_progress': '🔄',
      'review': '👀',
      'done': '🎉',
      'blocked': '🚧'
    };
    return emojis[status] || '📋';
  }

  formatStatusName(status) {
    const names = {
      'pending': 'Pending',
      'ready': 'Ready',
      'in_progress': 'In Progress',
      'review': 'Review',
      'done': 'Done',
      'blocked': 'Blocked'
    };
    return names[status] || status;
  }

  getPriorityEmoji(priority) {
    const emojis = {
      'low': '🟢',
      'medium': '🟡',
      'high': '🟠',
      'critical': '🔴'
    };
    return emojis[priority] || '📋';
  }

  formatPriorityName(priority) {
    const names = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'critical': 'Critical'
    };
    return names[priority] || priority;
  }

  formatDueDate(deadline) {
    if (!deadline) return 'No deadline';
    
    const now = new Date();
    const due = new Date(deadline);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays <= 7) {
      return `In ${diffDays} days`;
    } else {
      return due.toLocaleDateString();
    }
  }

  formatTimeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const diffTime = now - past;
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return '1 day ago';
    } else {
      return `${diffDays} days ago`;
    }
  }

  calculateTrend(trendData) {
    if (!trendData || trendData.length < 2) return 'No trend data';
    
    const current = trendData[trendData.length - 1]?.completed || 0;
    const previous = trendData[trendData.length - 2]?.completed || 0;
    
    if (previous === 0) return 'New baseline';
    
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${Math.round(change)}%`;
  }
}

module.exports = new ManagerDashboardFormatter(); 