const mongoose = require('mongoose');
const Task = require('../../src/models/task.model');
const Team = require('../../src/models/team.model');
const User = require('../../src/models/user.model');
const StandupResponse = require('../../src/models/standup-response.model');
const dashboardService = require('../../src/services/manager-dashboard/manager-dashboard.service');
const dashboardFormatter = require('../../src/bot/formatters/manager-dashboard.formatter');

describe('Manager Dashboard Integration Tests', () => {
  let testManager, testTeam, testTasks, testMember;
  
  beforeEach(async () => {
    // Create test manager
    testManager = await User.create({
      telegramId: '12345',
      firstName: 'Test',
      lastName: 'Manager',
      username: 'testmanager',
      role: 'manager',
      isActive: true
    });

    // Create test member
    testMember = await User.create({
      telegramId: '67890',
      firstName: 'Test',
      lastName: 'Member',
      username: 'testmember',
      role: 'member',
      isActive: true
    });
    
    // Create test team with manager
    testTeam = await Team.create({
      name: 'Test Team',
      description: 'Test team for dashboard',
      createdBy: testManager._id,
      members: [
        {
          userId: testManager._id,
          username: testManager.username,
          role: 'manager',
          addedBy: testManager._id,
          addedAt: new Date()
        },
        {
          userId: testMember._id,
          username: testMember.username,
          role: 'member',
          addedBy: testManager._id,
          addedAt: new Date()
        }
      ]
    });
    
    // Create test tasks
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    testTasks = await Task.create([
      {
        title: 'Active Task 1',
        description: 'Test active task',
        goal: 'Complete active task',
        successMetric: 'Task completed',
        status: 'ready',
        priority: 'high',
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: testMember._id,
        deadline: tomorrow
      },
      {
        title: 'Overdue Task',
        description: 'Overdue test task',
        goal: 'Complete overdue task',
        successMetric: 'Task completed',
        status: 'in_progress',
        priority: 'medium',
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: testMember._id,
        deadline: yesterday
      },
      {
        title: 'Blocked Task',
        description: 'Blocked test task',
        goal: 'Resolve blocker',
        successMetric: 'Blocker resolved',
        status: 'blocked',
        priority: 'high',
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: testMember._id,
        deadline: tomorrow, // Add deadline for blocked task
        blockers: [{
          reportedBy: testMember._id,
          reportedAt: new Date(),
          impact: 'high',
          attempts: 'Tried multiple approaches but still blocked',
          logs: 'Error logs and debugging information',
          status: 'active'
        }]
      },
      {
        title: 'Completed Task',
        description: 'Completed test task',
        goal: 'Complete task',
        successMetric: 'Task completed',
        status: 'done',
        priority: 'medium',
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: testMember._id,
        deadline: yesterday, // Add deadline for completed task
        startedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }
    ]);
  });
  
  afterEach(async () => {
    await Task.deleteMany({});
    await Team.deleteMany({});
    await User.deleteMany({});
    await StandupResponse.deleteMany({});
  });
  
  describe('Permission Validation', () => {
    test('validates manager permissions correctly', async () => {
      const hasPermission = await dashboardService.validateManagerPermissions(testManager._id);
      expect(hasPermission).toBe(true);
    });
    
    test('denies access to regular members', async () => {
      const hasPermission = await dashboardService.validateManagerPermissions(testMember._id);
      expect(hasPermission).toBe(false);
    });

    test('handles invalid user ID', async () => {
      const hasPermission = await dashboardService.validateManagerPermissions('99999');
      expect(hasPermission).toBe(false);
    });

    test('handles inactive user', async () => {
      await User.findByIdAndUpdate(testManager._id, { isActive: false });
      const hasPermission = await dashboardService.validateManagerPermissions(testManager._id);
      expect(hasPermission).toBe(false);
    });
  });
  
  describe('Dashboard Overview', () => {
    test('calculates dashboard overview correctly', async () => {
      const overview = await dashboardService.getDashboardOverview(testManager._id);
      
      expect(overview.hasTeams).toBe(true);
      expect(overview.team.name).toBe('Test Team');
      expect(overview.team.memberCount).toBe(2);
      expect(overview.activeTasks.total).toBe(3); // ready, in_progress, blocked
      expect(overview.activeTasks.overdue).toBe(1); // overdue task
      expect(overview.blockers.count).toBe(1); // blocked task
      expect(overview.overdue.count).toBe(1); // overdue task
      expect(overview.velocity).toBeDefined();
    });
    
    test('handles empty team data', async () => {
      await Task.deleteMany({});
      
      const overview = await dashboardService.getDashboardOverview(testManager._id);
      
      expect(overview.hasTeams).toBe(true);
      expect(overview.activeTasks.total).toBe(0);
      expect(overview.activeTasks.overdue).toBe(0);
      expect(overview.blockers.count).toBe(0);
      expect(overview.overdue.count).toBe(0);
    });

    test('handles user with no teams', async () => {
      await Team.deleteMany({});
      
      const overview = await dashboardService.getDashboardOverview(testManager._id);
      
      expect(overview.hasTeams).toBe(false);
      expect(overview.message).toContain('No teams found where you have manager permissions');
    });
  });
  
  describe('Active Tasks Breakdown', () => {
    test('calculates status breakdown correctly', async () => {
      const breakdown = await dashboardService.getActiveTasksBreakdown(testManager.telegramId);
      
      expect(breakdown.statusBreakdown.ready).toBe(1);
      expect(breakdown.statusBreakdown.in_progress).toBe(1);
      expect(breakdown.statusBreakdown.blocked).toBe(1);
      expect(breakdown.statusBreakdown.pending).toBe(0);
      expect(breakdown.total).toBe(3);
    });
    
    test('calculates priority distribution correctly', async () => {
      const breakdown = await dashboardService.getActiveTasksBreakdown(testManager.telegramId);
      
      expect(breakdown.priorityBreakdown.high).toBe(2); // ready task + blocked task
      expect(breakdown.priorityBreakdown.medium).toBe(1); // overdue task
      expect(breakdown.priorityBreakdown.low).toBe(0);
      expect(breakdown.priorityBreakdown.critical).toBe(0);
    });
    
    test('returns recent tasks in correct order', async () => {
      const breakdown = await dashboardService.getActiveTasksBreakdown(testManager.telegramId);
      
      expect(breakdown.recentTasks).toHaveLength(3);
      // Should be sorted by creation date (most recent first)
      expect(breakdown.recentTasks[0].title).toBe('Blocked Task');
    });
  });
  
  describe('Team Velocity Metrics', () => {
    test('calculates velocity metrics for completed tasks', async () => {
      const velocity = await dashboardService.getTeamVelocityMetrics(testManager.telegramId);
      
      expect(velocity.completionRate).toBeGreaterThan(0);
      expect(velocity.tasksCompletedThisWeek).toBe(1); // 1 completed task
      expect(velocity.avgCompletionTime).toBeGreaterThan(0);
      expect(velocity.topPerformers).toBeDefined();
      expect(velocity.trend).toBeDefined();
    });
    
    test('handles no completed tasks', async () => {
      await Task.updateMany({}, { status: 'in_progress' }); // Make all tasks active
      
      const velocity = await dashboardService.getTeamVelocityMetrics(testManager.telegramId);
      
      expect(velocity.completionRate).toBe(0);
      expect(velocity.tasksCompletedThisWeek).toBe(0);
      expect(velocity.avgCompletionTime).toBe(0);
    });

    test('calculates average completion time correctly', async () => {
      // Create another completed task with different completion time
      await Task.create({
        title: 'Another Completed Task',
        description: 'Another completed task',
        goal: 'Complete task',
        successMetric: 'Task completed',
        status: 'done',
        priority: 'low',
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: testMember._id,
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      });

      const velocity = await dashboardService.getTeamVelocityMetrics(testManager.telegramId);
      
      expect(velocity.tasksCompletedThisWeek).toBe(2);
      expect(velocity.avgCompletionTime).toBeGreaterThan(0);
    });
  });
  
  describe('Active Blockers', () => {
    test('returns active blockers correctly', async () => {
      const blockers = await dashboardService.getActiveBlockers(testManager.telegramId);
      
      expect(blockers.count).toBe(1);
      expect(blockers.blockers[0].title).toBe('Blocked Task');
      expect(blockers.blockers[0].latestBlocker.impact).toBe('high');
    });
    
    test('sorts blockers by priority and date', async () => {
      // Create another blocked task with lower priority
      await Task.create({
        title: 'Low Priority Blocked',
        description: 'Low priority blocked task',
        goal: 'Resolve low priority blocker',
        successMetric: 'Blocker resolved',
        status: 'blocked',
        priority: 'low',
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: testMember._id,
        blockers: [{
          reportedBy: testMember._id,
          reportedAt: new Date(),
          impact: 'low',
          attempts: 'Tried basic approach',
          logs: 'Basic error logs',
          status: 'active'
        }]
      });
      
      const blockers = await dashboardService.getActiveBlockers(testManager.telegramId);
      
      expect(blockers.count).toBe(2);
      expect(blockers.blockers[0].latestBlocker.impact).toBe('high'); // High priority first
      expect(blockers.blockers[1].latestBlocker.impact).toBe('low'); // Low priority second
    });

    test('handles no active blockers', async () => {
      await Task.updateMany({ status: 'blocked' }, { status: 'ready' }); // Make all tasks ready
      
      const blockers = await dashboardService.getActiveBlockers(testManager.telegramId);
      
      expect(blockers.count).toBe(0);
      expect(blockers.blockers).toHaveLength(0);
    });
  });
  
  describe('Overdue Tasks', () => {
    test('identifies overdue tasks correctly', async () => {
      const overdue = await dashboardService.getOverdueTasks(testManager.telegramId);
      
      expect(overdue.count).toBe(1);
      expect(overdue.tasks[0].title).toBe('Overdue Task');
      expect(overdue.tasks[0].urgencyLevel).toBe('high'); // 1 day overdue = high
    });
    
    test('calculates urgency levels correctly', async () => {
      // Create critical overdue task (3+ days)
      await Task.create({
        title: 'Critical Overdue',
        description: 'Critical overdue task',
        goal: 'Complete critical task',
        successMetric: 'Task completed',
        status: 'in_progress',
        priority: 'critical',
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: testMember._id,
        deadline: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
      });
      
      const overdue = await dashboardService.getOverdueTasks(testManager.telegramId);
      
      const criticalTask = overdue.tasks.find(t => t.title === 'Critical Overdue');
      expect(criticalTask.urgencyLevel).toBe('critical');
      expect(overdue.breakdown.critical).toBe(1);
      expect(overdue.breakdown.high).toBe(1); // Original overdue task
      expect(overdue.count).toBe(2);
    });

    test('handles no overdue tasks', async () => {
      await Task.updateMany({}, { deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) }); // Make all deadlines future
      
      const overdue = await dashboardService.getOverdueTasks(testManager.telegramId);
      
      expect(overdue.count).toBe(0);
      expect(overdue.tasks).toHaveLength(0);
    });
  });

  describe('Overdue Tasks Analysis', () => {
    test('groups overdue tasks by urgency correctly', async () => {
      const overdueAnalysis = await dashboardService.getOverdueTasksAnalysis(testTeam._id);
      
      expect(overdueAnalysis.total).toBe(1);
      expect(overdueAnalysis.grouped.high).toHaveLength(1); // 1 day overdue = high
      expect(overdueAnalysis.grouped.critical).toHaveLength(0);
      expect(overdueAnalysis.grouped.medium).toHaveLength(0);
    });

    test('handles multiple overdue tasks with different urgency levels', async () => {
      // Create critical overdue task
      await Task.create({
        title: 'Critical Overdue',
        description: 'Critical overdue task',
        goal: 'Complete critical task',
        successMetric: 'Task completed',
        status: 'in_progress',
        priority: 'critical',
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: testMember._id,
        deadline: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
      });

      const overdueAnalysis = await dashboardService.getOverdueTasksAnalysis(testTeam._id);
      
      expect(overdueAnalysis.total).toBe(2);
      expect(overdueAnalysis.grouped.critical).toHaveLength(1);
      expect(overdueAnalysis.grouped.high).toHaveLength(1);
    });
  });
  
  describe('Message Formatters', () => {
    test('formats dashboard overview message correctly', async () => {
      const dashboardData = {
        hasTeams: true,
        team: {
          name: 'Test Team',
          memberCount: 2
        },
        activeTasks: { 
          total: 5, 
          overdue: 2,
          statusBreakdown: { ready: 2, in_progress: 1, blocked: 1, review: 1 },
          priorityBreakdown: { high: 2, medium: 2, low: 1 }
        },
        velocity: { 
          completionRate: 85,
          avgCompletionDays: 2.3,
          totalCompleted: 10,
          trend: []
        },
        blockers: { 
          count: 1,
          details: []
        },
        overdue: { 
          count: 2,
          details: []
        }
      };
      
      const message = dashboardFormatter.formatDashboardOverview(dashboardData);
      
      expect(message).toContain('📊 *Manager Dashboard*');
      expect(message).toContain('🏢 *Team:* Test Team (2 members)');
      expect(message).toContain('5 total (2 overdue)');
      expect(message).toContain('85% completion rate');
      expect(message).toContain('1 requiring attention');
    });
    
    test('formats active tasks view correctly', async () => {
      const activeTasksData = {
        team: { name: 'Test Team' },
        activeTasks: {
          statusBreakdown: { ready: 2, in_progress: 1, review: 1, blocked: 0 },
          priorityBreakdown: { high: 1, medium: 2, low: 1 }
        },
        recentTasks: [{
          title: 'Test Task',
          status: 'ready',
          assignedTo: { username: 'testuser', firstName: 'Test' },
          deadline: new Date()
        }]
      };
      
      const message = dashboardFormatter.formatActiveTasksView(activeTasksData);
      
      expect(message).toContain('📋 *Active Tasks Overview*');
      expect(message).toContain('🏢 *Team:* Test Team');
      expect(message).toContain('✅ Ready: 2 tasks');
      expect(message).toContain('🟠 High: 1 tasks');
      expect(message).toContain('Test Task');
    });
    
    test('formats velocity metrics correctly', async () => {
      const velocityData = {
        team: { name: 'Test Team' },
        velocity: {
          completionRate: 85,
          avgCompletionDays: 2.3,
          totalCompleted: 10,
          trend: []
        },
        recentCompleted: [{
          title: 'Completed Task',
          assignedTo: { username: 'testuser', firstName: 'Test' },
          completedAt: new Date()
        }]
      };
      
      const message = dashboardFormatter.formatVelocityMetrics(velocityData);
      
      expect(message).toContain('📈 *Team Velocity Metrics*');
      expect(message).toContain('🏢 *Team:* Test Team');
      expect(message).toContain('85%');
      expect(message).toContain('2.3 days');
      expect(message).toContain('Completed Task');
    });

    test('formats blocker alerts correctly', async () => {
      const blockersData = {
        team: { name: 'Test Team' },
        blockers: {
          total: 1,
          grouped: {
            high: [{
              title: 'Blocked Task',
              assignedTo: { username: 'testuser', firstName: 'Test' },
              blockers: [{
                impact: 'high',
                attempts: 'Tried multiple approaches but still blocked',
                reportedAt: new Date()
              }]
            }]
          }
        }
      };
      
      const message = dashboardFormatter.formatBlockerAlerts(blockersData);
      
      expect(message).toContain('🚧 *Active Blocker Alerts*');
      expect(message).toContain('🏢 *Team:* Test Team');
      expect(message).toContain('1 blockers requiring attention');
      expect(message).toContain('⚠️ *HIGH PRIORITY*');
      expect(message).toContain('Blocked Task');
    });

    test('formats overdue warnings correctly', async () => {
      const overdueData = {
        team: { name: 'Test Team' },
        overdue: {
          total: 1,
          grouped: {
            high: [{
              title: 'Overdue Task',
              assignedTo: { username: 'testuser', firstName: 'Test' },
              deadline: new Date(Date.now() - 24 * 60 * 60 * 1000),
              goal: 'Complete overdue task'
            }]
          }
        }
      };
      
      const message = dashboardFormatter.formatOverdueWarnings(overdueData);
      
      expect(message).toContain('⏰ *Overdue Task Warnings*');
      expect(message).toContain('🏢 *Team:* Test Team');
      expect(message).toContain('1 tasks require immediate attention');
      expect(message).toContain('🟠 *HIGH - 1-2 days overdue*');
      expect(message).toContain('Overdue Task');
    });
    
    test('creates dashboard keyboard correctly', () => {
      const keyboard = dashboardFormatter.createDashboardKeyboard();
      
      expect(keyboard.inline_keyboard).toHaveLength(3);
      expect(keyboard.inline_keyboard[0][0].text).toBe('📋 Active Tasks');
      expect(keyboard.inline_keyboard[0][0].callback_data).toBe('dashboard_active_tasks');
      expect(keyboard.inline_keyboard[0][1].text).toBe('📈 Velocity Metrics');
      expect(keyboard.inline_keyboard[0][1].callback_data).toBe('dashboard_velocity');
    });

    test('creates section keyboards correctly', () => {
      const activeTasksKeyboard = dashboardFormatter.createSectionKeyboard('active_tasks');
      const velocityKeyboard = dashboardFormatter.createSectionKeyboard('velocity');
      
      expect(activeTasksKeyboard.inline_keyboard).toHaveLength(2);
      expect(activeTasksKeyboard.inline_keyboard[0][0].text).toBe('📋 All Tasks');
      expect(activeTasksKeyboard.inline_keyboard[0][0].callback_data).toBe('dashboard_all_tasks');
      
      expect(velocityKeyboard.inline_keyboard).toHaveLength(2);
      expect(velocityKeyboard.inline_keyboard[0][0].text).toBe('📊 Performance Report');
      expect(velocityKeyboard.inline_keyboard[0][0].callback_data).toBe('dashboard_performance_report');
    });
  });
  
  describe('Error Handling', () => {
    test('handles database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(Task, 'find').mockRejectedValueOnce(new Error('Database error'));
      
      await expect(
        dashboardService.getDashboardOverview(testManager.telegramId)
      ).rejects.toThrow('Failed to load dashboard data');
    });
    
    test('handles invalid user ID', async () => {
      const invalidUserId = '99999';
      
      const hasPermission = await dashboardService.validateManagerPermissions(invalidUserId);
      expect(hasPermission).toBe(false);
    });

    test('handles service errors in formatters', () => {
      // Test formatter with invalid data
      const invalidData = null;
      
      expect(() => {
        dashboardFormatter.formatDashboardOverview(invalidData);
      }).toThrow();
    });
  });
  
  describe('Performance Tests', () => {
    test('handles large datasets efficiently', async () => {
      // Create 50 test tasks
      const largeTasks = Array.from({ length: 50 }, (_, i) => ({
        title: `Task ${i}`,
        description: `Description ${i}`,
        goal: `Goal ${i}`,
        successMetric: `Metric ${i}`,
        status: ['ready', 'in_progress', 'review', 'blocked'][i % 4],
        priority: ['high', 'medium', 'low', 'critical'][i % 4],
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: testMember._id,
        deadline: new Date(Date.now() + (i * 86400000)) // Varying deadlines
      }));
      
      await Task.insertMany(largeTasks);
      
      const startTime = Date.now();
      const overview = await dashboardService.getDashboardOverview(testManager.telegramId);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(overview.activeTasks.total).toBe(53); // 50 + 3 original
    });

    test('handles concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, () => 
        dashboardService.getDashboardOverview(testManager.telegramId)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.hasTeams).toBe(true);
        expect(result.activeTasks.total).toBe(3);
      });
    });
  });

  describe('Cache Management', () => {
    test('caches dashboard overview data', async () => {
      const firstCall = await dashboardService.getDashboardOverview(testManager.telegramId);
      const secondCall = await dashboardService.getDashboardOverview(testManager.telegramId);
      
      expect(firstCall).toEqual(secondCall);
    });

    test('refreshes cache correctly', async () => {
      // Get initial data
      await dashboardService.getDashboardOverview(testManager.telegramId);
      
      // Create new task
      await Task.create({
        title: 'New Task',
        description: 'New test task',
        goal: 'Complete new task',
        successMetric: 'Task completed',
        status: 'ready',
        priority: 'medium',
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: testMember._id
      });
      
      // Refresh cache
      await dashboardService.refreshDashboardCache(testManager.telegramId);
      
      // Get fresh data
      const overview = await dashboardService.getDashboardOverview(testManager.telegramId);
      
      expect(overview.activeTasks.total).toBe(4); // Should include new task
    });
  });
});

describe('Manager Dashboard Service Unit Tests', () => {
  describe('Helper Methods', () => {
    test('calculateAverageCompletionTime works correctly', () => {
      const completedTasks = [
        { createdAt: new Date('2024-01-01'), completedAt: new Date('2024-01-03') }, // 2 days
        { createdAt: new Date('2024-01-05'), completedAt: new Date('2024-01-09') }  // 4 days
      ];
      
      const avgTime = dashboardService.calculateAverageCompletionTime(completedTasks);
      expect(avgTime).toBe(3); // (2 + 4) / 2 = 3 days
    });
    
    test('handles empty completion time array', () => {
      const avgTime = dashboardService.calculateAverageCompletionTime([]);
      expect(avgTime).toBe(0);
    });

    test('handles tasks with no completion time', () => {
      const tasks = [
        { createdAt: new Date('2024-01-01'), completedAt: null },
        { createdAt: new Date('2024-01-05'), completedAt: new Date('2024-01-09') }
      ];
      
      const avgTime = dashboardService.calculateAverageCompletionTime(tasks);
      expect(avgTime).toBe(4); // Only count completed task
    });
  });

  describe('Icon and Formatting Methods', () => {
    test('getStatusIcon returns correct icons', () => {
      expect(dashboardFormatter.getStatusIcon('ready')).toBe('✅');
      expect(dashboardFormatter.getStatusIcon('in_progress')).toBe('🔄');
      expect(dashboardFormatter.getStatusIcon('blocked')).toBe('🚧');
      expect(dashboardFormatter.getStatusIcon('unknown')).toBe('📋');
    });

    test('getPriorityIcon returns correct icons', () => {
      expect(dashboardFormatter.getPriorityIcon('high')).toBe('🟠');
      expect(dashboardFormatter.getPriorityIcon('critical')).toBe('🔴');
      expect(dashboardFormatter.getPriorityIcon('low')).toBe('🟢');
      expect(dashboardFormatter.getPriorityIcon('unknown')).toBe('📋');
    });

    test('formatDueDate handles various scenarios', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      expect(dashboardFormatter.formatDueDate(tomorrow)).toBe('Tomorrow');
      expect(dashboardFormatter.formatDueDate(yesterday)).toBe('1 days overdue');
      expect(dashboardFormatter.formatDueDate(null)).toBe('No deadline');
    });

    test('formatTimeAgo handles various time periods', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      expect(dashboardFormatter.formatTimeAgo(oneHourAgo)).toBe('1 hour ago');
      expect(dashboardFormatter.formatTimeAgo(oneDayAgo)).toBe('1 day ago');
    });
  });
}); 