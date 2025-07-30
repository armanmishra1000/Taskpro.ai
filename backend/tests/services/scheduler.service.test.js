const cron = require('node-cron');
const StandupScheduler = require('../../src/services/daily-standup/scheduler.service');
const Team = require('../../src/models/team.model');
const dailyStandupService = require('../../src/services/daily-standup/daily-standup.service');

// Mock dependencies
jest.mock('node-cron');
jest.mock('../../src/models/team.model');
jest.mock('../../src/services/daily-standup/daily-standup.service');

describe('StandupScheduler', () => {
  let mockCronSchedule;
  let mockTeams;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock cron.schedule
    mockCronSchedule = {
      stop: jest.fn()
    };
    cron.schedule.mockReturnValue(mockCronSchedule);
    
    // Mock team data
    mockTeams = [
      {
        _id: 'team1',
        name: 'Test Team 1',
        standupConfig: {
          enabled: true,
          scheduleTime: '09:00',
          lastRun: null,
          responseTimeout: 120
        },
        save: jest.fn()
      },
      {
        _id: 'team2',
        name: 'Test Team 2',
        standupConfig: {
          enabled: true,
          scheduleTime: '10:00',
          lastRun: new Date('2024-01-01T09:00:00Z'),
          responseTimeout: 60
        },
        save: jest.fn()
      }
    ];
    
    // Reset scheduler instance
    StandupScheduler.initialized = false;
    StandupScheduler.mainScheduler = null;
  });
  
  describe('initialize', () => {
    it('should initialize the scheduler successfully', async () => {
      Team.find.mockResolvedValue([]);
      
      await StandupScheduler.initialize();
      
      expect(cron.schedule).toHaveBeenCalledWith('* * * * *', expect.any(Function));
      expect(StandupScheduler.initialized).toBe(true);
    });
    
    it('should not initialize twice', async () => {
      Team.find.mockResolvedValue([]);
      
      await StandupScheduler.initialize();
      await StandupScheduler.initialize();
      
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('shouldRunStandup', () => {
    beforeEach(() => {
      StandupScheduler.initialized = true;
    });
    
    it('should return false for disabled standup', () => {
      const team = {
        standupConfig: {
          enabled: false,
          scheduleTime: '09:00'
        }
      };
      const now = new Date('2024-01-01T09:00:00Z');
      
      const result = StandupScheduler.shouldRunStandup(team, now);
      expect(result).toBe(false);
    });
    
    it('should return false for missing schedule time', () => {
      const team = {
        standupConfig: {
          enabled: true,
          scheduleTime: null
        }
      };
      const now = new Date('2024-01-01T09:00:00Z');
      
      const result = StandupScheduler.shouldRunStandup(team, now);
      expect(result).toBe(false);
    });
    
    it('should return false if already run today', () => {
      const team = {
        standupConfig: {
          enabled: true,
          scheduleTime: '09:00',
          lastRun: new Date('2024-01-01T08:00:00Z')
        }
      };
      const now = new Date('2024-01-01T09:00:00Z');
      
      const result = StandupScheduler.shouldRunStandup(team, now);
      expect(result).toBe(false);
    });
    
    it('should return true for valid standup time', () => {
      const team = {
        standupConfig: {
          enabled: true,
          scheduleTime: '09:00',
          lastRun: null
        }
      };
      const now = new Date('2024-01-01T09:00:00Z');
      
      const result = StandupScheduler.shouldRunStandup(team, now);
      expect(result).toBe(true);
    });
  });
  
  describe('executeStandup', () => {
    beforeEach(() => {
      StandupScheduler.initialized = true;
    });
    
    it('should execute standup successfully', async () => {
      const team = {
        _id: 'team1',
        name: 'Test Team',
        standupConfig: {
          responseTimeout: 120
        },
        save: jest.fn()
      };
      
      dailyStandupService.startDailyStandup.mockResolvedValue();
      
      await StandupScheduler.executeStandup(team);
      
      expect(dailyStandupService.startDailyStandup).toHaveBeenCalledWith('team1');
      expect(team.save).toHaveBeenCalled();
    });
    
    it('should handle execution errors gracefully', async () => {
      const team = {
        _id: 'team1',
        name: 'Test Team',
        standupConfig: {
          responseTimeout: 120
        },
        save: jest.fn()
      };
      
      dailyStandupService.startDailyStandup.mockRejectedValue(new Error('Test error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await StandupScheduler.executeStandup(team);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Standup execution failed for team Test Team:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('generateSummary', () => {
    beforeEach(() => {
      StandupScheduler.initialized = true;
    });
    
    it('should generate summary successfully', async () => {
      dailyStandupService.generateTeamSummary.mockResolvedValue();
      
      await StandupScheduler.generateSummary('team1');
      
      expect(dailyStandupService.generateTeamSummary).toHaveBeenCalledWith('team1');
    });
    
    it('should handle summary generation errors gracefully', async () => {
      dailyStandupService.generateTeamSummary.mockRejectedValue(new Error('Test error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await StandupScheduler.generateSummary('team1');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Summary generation failed for team team1:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('recoverMissedStandups', () => {
    beforeEach(() => {
      StandupScheduler.initialized = true;
    });
    
    it('should call Team.find with correct filter', async () => {
      Team.find.mockResolvedValue([]);
      
      await StandupScheduler.recoverMissedStandups();
      
      expect(Team.find).toHaveBeenCalledWith({ 'standupConfig.enabled': true });
    });
    
    it('should handle empty teams list', async () => {
      Team.find.mockResolvedValue([]);
      
      await StandupScheduler.recoverMissedStandups();
      
      expect(dailyStandupService.startDailyStandup).not.toHaveBeenCalled();
    });
    
    it('should skip teams without schedule time', async () => {
      const teamWithoutSchedule = {
        _id: 'team1',
        name: 'Team Without Schedule',
        standupConfig: {
          enabled: true,
          scheduleTime: null
        }
      };
      
      Team.find.mockResolvedValue([teamWithoutSchedule]);
      
      await StandupScheduler.recoverMissedStandups();
      
      expect(dailyStandupService.startDailyStandup).not.toHaveBeenCalled();
    });
  });
  
  describe('stop', () => {
    it('should stop the scheduler', () => {
      StandupScheduler.initialized = true;
      StandupScheduler.mainScheduler = mockCronSchedule;
      
      StandupScheduler.stop();
      
      expect(mockCronSchedule.stop).toHaveBeenCalled();
      expect(StandupScheduler.initialized).toBe(false);
    });
  });
  
  describe('getStatus', () => {
    it('should return correct status', () => {
      StandupScheduler.initialized = true;
      StandupScheduler.mainScheduler = mockCronSchedule;
      StandupScheduler.activeJobs.set('job1', {});
      
      const status = StandupScheduler.getStatus();
      
      expect(status).toEqual({
        initialized: true,
        activeJobs: 1,
        schedulerRunning: true
      });
    });
  });
}); 