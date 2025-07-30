const cron = require('node-cron');
const Team = require('../../models/team.model');
const dailyStandupService = require('./daily-standup.service');

class StandupScheduler {
  constructor() {
    this.activeJobs = new Map();
    this.initialized = false;
    this.mainScheduler = null;
  }
  
  async initialize() {
    if (this.initialized) return;
    
    console.log('🕐 Initializing Daily Standup Scheduler...');
    
    // Check every minute for scheduled standups
    this.mainScheduler = cron.schedule('* * * * *', async () => {
      await this.checkPendingStandups();
    });
    
    // Recovery for missed standups
    await this.recoverMissedStandups();
    
    this.initialized = true;
    console.log('✅ Daily Standup Scheduler initialized');
  }
  
  async checkPendingStandups() {
    try {
      const now = new Date();
      const teams = await Team.find({ 'standupConfig.enabled': true });
      
      for (const team of teams) {
        if (this.shouldRunStandup(team, now)) {
          await this.executeStandup(team);
        }
      }
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  }
  
  shouldRunStandup(team, now) {
    const config = team.standupConfig;
    if (!config.enabled || !config.scheduleTime) return false;
    
    // Simple timezone handling (can be enhanced)
    const currentTime = now.toISOString().substr(11, 5); // HH:MM
    const hasRunToday = config.lastRun && 
      config.lastRun.toDateString() === now.toDateString();
    
    return currentTime === config.scheduleTime && !hasRunToday;
  }
  
  async executeStandup(team) {
    console.log(`🌅 Starting standup for team: ${team.name}`);
    
    try {
      await dailyStandupService.startDailyStandup(team._id);
      
      // Update last run time
      team.standupConfig.lastRun = new Date();
      await team.save();
      
      // Schedule summary generation after timeout period
      const summaryDelay = (team.standupConfig.responseTimeout || 120) * 60 * 1000;
      setTimeout(async () => {
        await this.generateSummary(team._id);
      }, summaryDelay);
      
    } catch (error) {
      console.error(`Standup execution failed for team ${team.name}:`, error);
    }
  }
  
  async generateSummary(teamId) {
    try {
      console.log(`📊 Generating summary for team: ${teamId}`);
      await dailyStandupService.generateTeamSummary(teamId);
    } catch (error) {
      console.error(`Summary generation failed for team ${teamId}:`, error);
    }
  }
  
  async recoverMissedStandups() {
    try {
      console.log('🔄 Checking for missed standups...');
      
      const teams = await Team.find({ 'standupConfig.enabled': true });
      const now = new Date();
      const today = now.toDateString();
      
      for (const team of teams) {
        const config = team.standupConfig;
        if (!config.scheduleTime) continue;
        
        // Check if standup was missed today
        const hasRunToday = config.lastRun && 
          config.lastRun.toDateString() === today;
        
        if (!hasRunToday) {
          const [scheduledHour, scheduledMinute] = config.scheduleTime.split(':').map(Number);
          const scheduledTime = new Date(now);
          scheduledTime.setHours(scheduledHour, scheduledMinute, 0, 0);
          
          // If scheduled time has passed by more than 5 minutes, it was missed
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
          
          if (scheduledTime < fiveMinutesAgo) {
            console.log(`⚠️ Recovering missed standup for team: ${team.name}`);
            await this.executeStandup(team);
          }
        }
      }
    } catch (error) {
      console.error('Error recovering missed standups:', error);
    }
  }
  
  async stop() {
    if (this.mainScheduler) {
      this.mainScheduler.stop();
      this.mainScheduler = null;
    }
    
    this.initialized = false;
    console.log('🛑 Daily Standup Scheduler stopped');
  }
  
  getStatus() {
    return {
      initialized: this.initialized,
      activeJobs: this.activeJobs.size,
      schedulerRunning: !!this.mainScheduler
    };
  }
}

module.exports = new StandupScheduler(); 