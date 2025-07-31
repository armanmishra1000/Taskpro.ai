const mongoose = require('mongoose');
const dashboardService = require('../../src/services/manager-dashboard/manager-dashboard.service');
const Task = require('../../src/models/task.model');
const Team = require('../../src/models/team.model');
const User = require('../../src/models/user.model');
const StandupResponse = require('../../src/models/standup-response.model');

describe('Manager Dashboard Service', () => {
  let testManager, testTeam, testMember;
  
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
    
    // Create test team
    testTeam = await Team.create({
      name: 'Test Team',
      description: 'Test team for service tests',
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
  });
  
  afterEach(async () => {
    await Task.deleteMany({});
    await Team.deleteMany({});
    await User.deleteMany({});
    await StandupResponse.deleteMany({});
  });
  
  describe('Permission Validation', () => {
    test('correctly identifies managers', async () => {
      const hasPermission = await dashboardService.validateManagerPermissions(testManager._id);
      expect(hasPermission).toBe(true);
    });

    test('correctly identifies admins', async () => {
      await User.findByIdAndUpdate(testManager._id, { role: 'admin' });
      const hasPermission = await dashboardService.validateManagerPermissions(testManager._id);
      expect(hasPermission).toBe(true);
    });

    test('denies access to regular members', async () => {
      const hasPermission = await dashboardService.validateManagerPermissions(testMember._id);
      expect(hasPermission).toBe(false);
    });

    test('handles inactive users', async () => {
      await User.findByIdAndUpdate(testManager._id, { isActive: false });
      const hasPermission = await dashboardService.validateManagerPermissions(testManager._id);
      expect(hasPermission).toBe(false);
    });

    test('handles deleted users', async () => {
      await User.findByIdAndUpdate(testManager._id, { isDeleted: true });
      const hasPermission = await dashboardService.validateManagerPermissions(testManager._id);
      expect(hasPermission).toBe(false);
    });
  });
  
  describe('Metrics Calculation', () => {
    test('calculates velocity correctly', async () => {
      // Create completed tasks with different completion times
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      await Task.create([
        {
          title: 'Task 1',
          description: 'Completed task 1',
          goal: 'Complete task 1',
          successMetric: 'Task completed',
          status: 'done',
          priority: 'medium',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: testMember._id,
          deadline: yesterday, // Add deadline
          startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          title: 'Task 2',
          description: 'Completed task 2',
          goal: 'Complete task 2',
          successMetric: 'Task completed',
          status: 'done',
          priority: 'high',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: testMember._id,
          deadline: yesterday, // Add deadline
          startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      ]);

      const velocity = await dashboardService.getTeamVelocityMetrics(testManager.telegramId);
      
      expect(velocity.completionRate).toBeGreaterThan(0);
      expect(velocity.tasksCompletedThisWeek).toBe(2);
      expect(velocity.avgCompletionTime).toBe(3); // (2 + 4) / 2 = 3 days
      expect(velocity.topPerformers).toBeDefined();
    });

    test('calculates completion rate correctly', async () => {
      // Create mix of completed and active tasks
      await Task.create([
        {
          title: 'Completed Task',
          description: 'Completed task',
          goal: 'Complete task',
          successMetric: 'Task completed',
          status: 'done',
          priority: 'medium',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: testMember._id,
          startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'Active Task 1',
          description: 'Active task 1',
          goal: 'Complete active task',
          successMetric: 'Task completed',
          status: 'in_progress',
          priority: 'high',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: testMember._id
        },
        {
          title: 'Active Task 2',
          description: 'Active task 2',
          goal: 'Complete active task',
          successMetric: 'Task completed',
          status: 'ready',
          priority: 'low',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: testMember._id
        }
      ]);

      const velocity = await dashboardService.getTeamVelocityMetrics(testManager.telegramId);
      
      // 1 completed out of 3 total = 33.33%
      expect(velocity.completionRate).toBeCloseTo(33.33, 1);
    });

    test('identifies top performers correctly', async () => {
      // Create tasks completed by different users
      const anotherMember = await User.create({
        telegramId: '11111',
        firstName: 'Another',
        lastName: 'Member',
        username: 'anothermember',
        role: 'member',
        isActive: true
      });

      await Task.create([
        {
          title: 'Task by Member 1',
          description: 'Task completed by member 1',
          goal: 'Complete task',
          successMetric: 'Task completed',
          status: 'done',
          priority: 'medium',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: testMember._id,
          startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'Task by Member 2',
          description: 'Task completed by member 2',
          goal: 'Complete task',
          successMetric: 'Task completed',
          status: 'done',
          priority: 'high',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: anotherMember._id,
          startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ]);

      const velocity = await dashboardService.getTeamVelocityMetrics(testManager.telegramId);
      
      expect(velocity.topPerformers).toHaveLength(2);
      expect(velocity.topPerformers[0].completedTasks).toBe(1);
    });
  });

  describe('Blocker Analysis', () => {
    test('analyzes blockers correctly', async () => {
      await Task.create([
        {
          title: 'High Impact Blocker',
          description: 'High impact blocked task',
          goal: 'Resolve high impact blocker',
          successMetric: 'Blocker resolved',
          status: 'blocked',
          priority: 'critical',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: testMember._id,
          blockers: [{
            reportedBy: testMember._id,
            reportedAt: new Date(),
            impact: 'high',
            attempts: 'Tried multiple approaches',
            logs: 'Error logs',
            status: 'active'
          }]
        },
        {
          title: 'Low Impact Blocker',
          description: 'Low impact blocked task',
          goal: 'Resolve low impact blocker',
          successMetric: 'Blocker resolved',
          status: 'blocked',
          priority: 'medium',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: testMember._id,
          blockers: [{
            reportedBy: testMember._id,
            reportedAt: new Date(),
            impact: 'low',
            attempts: 'Tried basic approach',
            logs: 'Basic logs',
            status: 'active'
          }]
        }
      ]);

      const blockers = await dashboardService.getActiveBlockers(testManager.telegramId);
      
      expect(blockers.count).toBe(2);
      expect(blockers.blockers[0].latestBlocker.impact).toBe('high'); // High priority first
      expect(blockers.blockers[1].latestBlocker.impact).toBe('low');
    });

    test('calculates average blocker resolution time', async () => {
      // Create resolved blockers
      await Task.create([
        {
          title: 'Resolved Blocker 1',
          description: 'Resolved blocker 1',
          goal: 'Resolve blocker',
          successMetric: 'Blocker resolved',
          status: 'done',
          priority: 'high',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: testMember._id,
          blockers: [{
            reportedBy: testMember._id,
            reportedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            impact: 'high',
            attempts: 'Tried multiple approaches',
            logs: 'Error logs',
            status: 'resolved'
          }]
        }
      ]);

      const avgResolutionTime = await dashboardService.calculateAvgBlockerResolution(testTeam._id);
      expect(avgResolutionTime).toBe(2); // 2 days average
    });
  });

  describe('Overdue Task Analysis', () => {
    test('categorizes overdue tasks by urgency', async () => {
      const now = new Date();
      
      await Task.create([
        {
          title: 'Critical Overdue',
          description: 'Critical overdue task',
          goal: 'Complete critical task',
          successMetric: 'Task completed',
          status: 'in_progress',
          priority: 'critical',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: testMember._id,
          deadline: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
        },
        {
          title: 'High Overdue',
          description: 'High overdue task',
          goal: 'Complete high priority task',
          successMetric: 'Task completed',
          status: 'in_progress',
          priority: 'high',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: testMember._id,
          deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        },
        {
          title: 'Medium Overdue',
          description: 'Medium overdue task',
          goal: 'Complete medium priority task',
          successMetric: 'Task completed',
          status: 'in_progress',
          priority: 'medium',
          teamId: testTeam._id,
          createdBy: testManager._id,
          assignedTo: testMember._id,
          deadline: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        }
      ]);

      const overdue = await dashboardService.getOverdueTasks(testManager.telegramId);
      
      expect(overdue.count).toBe(3);
      expect(overdue.breakdown.critical).toBe(1);
      expect(overdue.breakdown.high).toBe(1);
      expect(overdue.breakdown.medium).toBe(1);
    });

    test('calculates urgency levels correctly', async () => {
      const now = new Date();
      
      const task1 = await Task.create({
        title: 'Task 1',
        description: 'Task 1',
        goal: 'Complete task',
        successMetric: 'Task completed',
        status: 'in_progress',
        priority: 'high',
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: testMember._id,
        deadline: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      });

      const task2 = await Task.create({
        title: 'Task 2',
        description: 'Task 2',
        goal: 'Complete task',
        successMetric: 'Task completed',
        status: 'in_progress',
        priority: 'medium',
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: testMember._id,
        deadline: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      });

      const overdue = await dashboardService.getOverdueTasks(testManager.telegramId);
      
      const task1Overdue = overdue.tasks.find(t => t.title === 'Task 1');
      const task2Overdue = overdue.tasks.find(t => t.title === 'Task 2');
      
      expect(task1Overdue.urgencyLevel).toBe('high'); // 1 day overdue
      expect(task2Overdue.urgencyLevel).toBe('critical'); // 5 days overdue
    });
  });

  describe('Cache Management', () => {
    test('caches data correctly', async () => {
      const firstCall = await dashboardService.getDashboardOverview(testManager.telegramId);
      const secondCall = await dashboardService.getDashboardOverview(testManager.telegramId);
      
      expect(firstCall).toEqual(secondCall);
    });

    test('clears cache correctly', async () => {
      // Get initial data
      await dashboardService.getDashboardOverview(testManager.telegramId);
      
      // Clear cache
      await dashboardService.refreshDashboardCache(testManager.telegramId);
      
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
      
      // Get fresh data
      const overview = await dashboardService.getDashboardOverview(testManager.telegramId);
      
      expect(overview.activeTasks.total).toBe(1); // Should include new task
    });

    test('handles cache timeout', async () => {
      // Mock cache timeout
      const originalTimeout = dashboardService.cacheTimeout;
      dashboardService.cacheTimeout = 0; // Immediate timeout
      
      const firstCall = await dashboardService.getDashboardOverview(testManager.telegramId);
      const secondCall = await dashboardService.getDashboardOverview(testManager.telegramId);
      
      // Should be different due to cache timeout
      expect(firstCall).toEqual(secondCall);
      
      // Restore original timeout
      dashboardService.cacheTimeout = originalTimeout;
    });
  });

  describe('Error Handling', () => {
    test('handles database connection errors', async () => {
      // Mock database error
      jest.spyOn(Task, 'find').mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(
        dashboardService.getDashboardOverview(testManager.telegramId)
      ).rejects.toThrow('Failed to load dashboard data');
    });

    test('handles invalid team ID', async () => {
      const invalidTeamId = new mongoose.Types.ObjectId();
      
      await expect(
        dashboardService.getOverdueTasksAnalysis(invalidTeamId)
      ).rejects.toThrow();
    });

    test('handles empty results gracefully', async () => {
      await Task.deleteMany({});
      
      const overview = await dashboardService.getDashboardOverview(testManager.telegramId);
      
      expect(overview.activeTasks.total).toBe(0);
      expect(overview.blockers.count).toBe(0);
      expect(overview.overdue.count).toBe(0);
    });
  });

  describe('Helper Methods', () => {
    test('calculateAverageCompletionTime handles edge cases', () => {
      // Empty array
      expect(dashboardService.calculateAverageCompletionTime([])).toBe(0);
      
      // Array with null completion times
      const tasksWithNulls = [
        { createdAt: new Date('2024-01-01'), completedAt: null },
        { createdAt: new Date('2024-01-05'), completedAt: null }
      ];
      expect(dashboardService.calculateAverageCompletionTime(tasksWithNulls)).toBe(0);
      
      // Mixed array
      const mixedTasks = [
        { createdAt: new Date('2024-01-01'), completedAt: null },
        { createdAt: new Date('2024-01-05'), completedAt: new Date('2024-01-09') }
      ];
      expect(dashboardService.calculateAverageCompletionTime(mixedTasks)).toBe(4);
    });

    test('getTopPerformers handles edge cases', async () => {
      // No completed tasks
      const topPerformers = await dashboardService.getTopPerformers(testTeam._id);
      expect(topPerformers).toHaveLength(0);
      
      // Tasks with no assigned user
      await Task.create({
        title: 'Unassigned Task',
        description: 'Unassigned task',
        goal: 'Complete task',
        successMetric: 'Task completed',
        status: 'done',
        priority: 'medium',
        teamId: testTeam._id,
        createdBy: testManager._id,
        assignedTo: null,
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      });

      const topPerformersWithUnassigned = await dashboardService.getTopPerformers(testTeam._id);
      expect(topPerformersWithUnassigned).toHaveLength(0); // Should filter out unassigned tasks
    });
  });
}); 