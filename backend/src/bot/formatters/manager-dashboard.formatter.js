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
      const statusEmoji = this.getStatusIcon(status);
      const statusName = this.formatStatusName(status);
      message += `${statusEmoji} ${statusName}: ${count} tasks\n`;
    });
    
    message += `\n🎯 *Priority Distribution:*\n`;
    
    // Add priority breakdown
    Object.entries(activeTasks.priorityBreakdown).forEach(([priority, count]) => {
      const priorityEmoji = this.getPriorityIcon(priority);
      const priorityName = this.formatPriorityName(priority);
      message += `${priorityEmoji} ${priorityName}: ${count} tasks\n`;
    });
    
    if (recentTasks && recentTasks.length > 0) {
      message += `\n📌 *Top ${Math.min(recentTasks.length, 5)} Recent Tasks:*\n`;
      recentTasks.slice(0, 5).forEach(task => {
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const dueDate = this.formatDueDate(task.deadline);
        const statusIcon = this.getStatusIcon(task.status);
        message += `\n📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Due: ${dueDate}\n`;
        message += `   ${statusIcon} ${this.formatStatusName(task.status)}\n`;
      });
    }
    
    return message;
  }

  /**
   * Format velocity metrics with enhanced display
   */
  formatVelocityMetrics(velocityData) {
    const { team, velocity, recentCompleted } = velocityData;
    
    let message = `📈 *Team Velocity Metrics*

🏢 *Team:* ${team.name}

⚡ *Current Velocity:* ${velocity.completionRate}%
📊 *Tasks Completed:* ${velocity.totalCompleted} this week
⏱️ *Avg Completion Time:* ${velocity.avgCompletionDays} days\n`;
    
    if (velocity.trend && velocity.trend.length > 0) {
      const trend = this.calculateTrend(velocity.trend);
      message += `📈 *Trend:* ${trend} vs last week\n`;
    }
    
    if (recentCompleted && recentCompleted.length > 0) {
      message += `\n🏆 *Recent Completions:*\n`;
      recentCompleted.slice(0, 5).forEach(task => {
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const completedDate = this.formatDate(task.completedAt);
        message += `\n✅ ${task.title}\n`;
        message += `   👤 ${assignee} • Completed: ${completedDate}\n`;
      });
    }
    
    // Add performance indicator
    message += `\n📉 *Performance Indicator:*\n`;
    if (velocity.completionRate >= 80) {
      message += `✅ Team is performing well!`;
    } else if (velocity.completionRate >= 60) {
      message += `⚠️ Team velocity could be improved`;
    } else {
      message += `🚨 Team velocity needs attention`;
    }
    
    return message;
  }

  /**
   * Format blocker alerts with enhanced visual indicators
   */
  formatBlockerAlerts(blockersData) {
    const { team, blockers } = blockersData;
    
    if (blockers.total === 0) {
      return `🚧 *Active Blocker Alerts*

🏢 *Team:* ${team.name}

✅ No active blockers found!

Your team is working smoothly without impediments.`;
    }
    
    let message = `🚧 *Active Blocker Alerts*

🏢 *Team:* ${team.name}

⚠️ *${blockers.total} blockers requiring attention:*\n`;
    
    if (blockers.grouped.critical.length > 0) {
      message += `\n🚨 *CRITICAL PRIORITY*\n`;
      blockers.grouped.critical.forEach(task => {
        const blocker = task.blockers.find(b => b.impact === 'critical' && b.status === 'active');
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const reportedTime = this.formatTimeAgo(blocker.reportedAt);
        const impactIcon = this.getImpactIcon(blocker.impact);
        message += `📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Reported: ${reportedTime}\n`;
        message += `   ${impactIcon} Impact: Critical\n`;
        message += `   📝 "${blocker.attempts.substring(0, 100)}..."\n\n`;
      });
    }
    
    if (blockers.grouped.high.length > 0) {
      message += `\n⚠️ *HIGH PRIORITY*\n`;
      blockers.grouped.high.forEach(task => {
        const blocker = task.blockers.find(b => b.impact === 'high' && b.status === 'active');
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const reportedTime = this.formatTimeAgo(blocker.reportedAt);
        const impactIcon = this.getImpactIcon(blocker.impact);
        message += `📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Reported: ${reportedTime}\n`;
        message += `   ${impactIcon} Impact: High\n`;
        message += `   📝 "${blocker.attempts.substring(0, 100)}..."\n\n`;
      });
    }
    
    if (blockers.grouped.medium.length > 0) {
      message += `\n⚠️ *MEDIUM PRIORITY*\n`;
      blockers.grouped.medium.forEach(task => {
        const blocker = task.blockers.find(b => b.impact === 'medium' && b.status === 'active');
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const reportedTime = this.formatTimeAgo(blocker.reportedAt);
        const impactIcon = this.getImpactIcon(blocker.impact);
        message += `📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Reported: ${reportedTime}\n`;
        message += `   ${impactIcon} Impact: Medium\n`;
        message += `   📝 "${blocker.attempts.substring(0, 100)}..."\n\n`;
      });
    }
    
    message += `\n📊 *Blocker Stats:*\n`;
    message += `Active: ${blockers.total} blockers\n`;
    
    return message;
  }

  /**
   * Format overdue tasks warnings with enhanced urgency indicators
   */
  formatOverdueWarnings(overdueData) {
    const { team, overdue } = overdueData;
    
    if (overdue.total === 0) {
      return `⏰ *Overdue Tasks*

🏢 *Team:* ${team.name}

✅ Great job! No overdue tasks.

Your team is staying on top of deadlines. Keep up the excellent work!`;
    }
    
    let message = `⏰ *Overdue Task Warnings*

🏢 *Team:* ${team.name}

🚨 *${overdue.total} tasks require immediate attention:*\n`;
    
    if (overdue.grouped.critical.length > 0) {
      message += `\n🔴 *CRITICAL - 3+ days overdue*\n`;
      overdue.grouped.critical.forEach(task => {
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const dueDate = this.formatDate(task.deadline);
        const daysOverdue = Math.floor((new Date() - task.deadline) / (1000 * 60 * 60 * 24));
        const urgencyIcon = this.getUrgencyIcon('critical');
        message += `📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Due: ${dueDate} (${daysOverdue} days overdue)\n`;
        message += `   ${urgencyIcon} ${task.goal}\n\n`;
      });
    }
    
    if (overdue.grouped.high.length > 0) {
      message += `\n🟠 *HIGH - 1-2 days overdue*\n`;
      overdue.grouped.high.forEach(task => {
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const dueDate = this.formatDate(task.deadline);
        const daysOverdue = Math.floor((new Date() - task.deadline) / (1000 * 60 * 60 * 24));
        const urgencyIcon = this.getUrgencyIcon('high');
        message += `📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Due: ${dueDate} (${daysOverdue} days overdue)\n`;
        message += `   ${urgencyIcon} ${task.goal}\n\n`;
      });
    }
    
    if (overdue.grouped.medium.length > 0) {
      message += `\n🟡 *MEDIUM - Due today*\n`;
      overdue.grouped.medium.forEach(task => {
        const assignee = task.assignedTo ? `@${task.assignedTo.username || task.assignedTo.firstName}` : 'Unassigned';
        const dueDate = this.formatDate(task.deadline);
        const urgencyIcon = this.getUrgencyIcon('medium');
        message += `📌 ${task.title}\n`;
        message += `   👤 ${assignee} • Due: ${dueDate}\n`;
        message += `   ${urgencyIcon} ${task.goal}\n\n`;
      });
    }
    
    message += `\n📊 *Overdue Summary:*\n`;
    message += `Total: ${overdue.total} tasks\n`;
    message += `Critical: ${overdue.grouped.critical.length} tasks\n`;
    message += `High: ${overdue.grouped.high.length} tasks\n`;
    message += `Medium: ${overdue.grouped.medium.length} tasks\n`;
    
    return message;
  }

  /**
   * Create section-specific keyboards
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
          { text: '�� Critical Overdue', callback_data: 'dashboard_critical_overdue' },
          { text: '⏰ All Overdue', callback_data: 'dashboard_all_overdue' }
        ],
        [
          { text: '⬅️ Back to Dashboard', callback_data: 'dashboard_main' }
        ]
      ])
    };
    
    return keyboards[section] || this.createDashboardKeyboard();
  }

  // Enhanced helper methods with visual indicators
  getStatusIcon(status) {
    const icons = {
      'pending': '⏳',
      'ready': '✅',
      'in_progress': '🔄',
      'review': '👀',
      'done': '🎉',
      'blocked': '🚧'
    };
    return icons[status] || '📋';
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

  getPriorityIcon(priority) {
    const icons = {
      'low': '🟢',
      'medium': '🟡',
      'high': '🟠',
      'critical': '🔴'
    };
    return icons[priority] || '📋';
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

  getImpactIcon(impact) {
    const icons = {
      'critical': '🚨',
      'high': '⚠️',
      'medium': '🟡',
      'low': '🟢'
    };
    return icons[impact] || '⚠️';
  }

  getUrgencyIcon(urgency) {
    const icons = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡'
    };
    return icons[urgency] || '🟡';
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
      return this.formatDate(deadline);
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
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return '1 day ago';
    } else {
      return `${diffDays} days ago`;
    }
  }

  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
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