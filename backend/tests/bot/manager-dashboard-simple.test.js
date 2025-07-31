const mongoose = require('mongoose');
const Task = require('../../src/models/task.model');
const Team = require('../../src/models/team.model');
const User = require('../../src/models/user.model');
const dashboardService = require('../../src/services/manager-dashboard/manager-dashboard.service');
const dashboardFormatter = require('../../src/bot/formatters/manager-dashboard.formatter');

describe('Manager Dashboard Simple Tests', () => {
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
    
    // Create test team with only manager (no regular members)
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
        }
      ]
    });
  });
  
  afterEach(async () => {
    await Task.deleteMany({});
    await Team.deleteMany({});
    await User.deleteMany({});
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
  });
  
  describe('Dashboard Overview', () => {
    test('handles user with no teams', async () => {
      await Team.deleteMany({});
      
      const overview = await dashboardService.getDashboardOverview(testManager._id);
      
      expect(overview.hasTeams).toBe(false);
      expect(overview.message).toContain('No teams found where you have manager permissions');
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
    
    test('creates dashboard keyboard correctly', () => {
      const keyboard = dashboardFormatter.createDashboardKeyboard();
      
      expect(keyboard.inline_keyboard).toHaveLength(3);
      expect(keyboard.inline_keyboard[0][0].text).toBe('📋 Active Tasks');
      expect(keyboard.inline_keyboard[0][0].callback_data).toBe('dashboard_active_tasks');
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