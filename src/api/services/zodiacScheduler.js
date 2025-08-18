import cron from 'node-cron';
import { dailyZodiacService } from './dailyZodiacService.js';

// =====================================================
// ZODIAC SCHEDULER SERVICE
// =====================================================
// Handles automatic daily zodiac generation

class ZodiacScheduler {
  constructor() {
    this.scheduledTasks = new Map();
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⏰ Zodiac scheduler is already running');
      return;
    }

    console.log('⏰ Starting Zodiac scheduler...');

    // Schedule daily generation at 07:00 Asia/Beirut timezone
    const dailyGenerationTask = cron.schedule('0 7 * * *', async () => {
      console.log('🌅 07:00 Asia/Beirut: Starting automatic daily zodiac generation...');
      try {
        const result = await dailyZodiacService.runAutomaticDailyGeneration();
        if (result.success) {
          console.log('✅ Automatic daily zodiac generation completed successfully');
        } else {
          console.error('❌ Automatic daily zodiac generation failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Error in automatic daily zodiac generation:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Beirut'
    });

    // Schedule cleanup task (weekly at 2 AM on Sunday)
    const cleanupTask = cron.schedule('0 2 * * 0', async () => {
      console.log('🧹 Starting weekly audio cleanup...');
      try {
        const { zodiacTTSService } = await import('./zodiacTTSService.js');
        const result = await zodiacTTSService.cleanupOldAudioFiles(30); // Delete files older than 30 days
        if (result.success) {
          console.log(`✅ Audio cleanup completed: ${result.deletedCount} files deleted`);
        } else {
          console.error('❌ Audio cleanup failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Error in audio cleanup:', error);
      }
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    // Start the scheduled tasks
    dailyGenerationTask.start();
    cleanupTask.start();

    this.scheduledTasks.set('daily_generation', dailyGenerationTask);
    this.scheduledTasks.set('weekly_cleanup', cleanupTask);

    this.isRunning = true;
    console.log('✅ Zodiac scheduler started successfully');
    console.log('📅 Daily generation scheduled for 07:00 Asia/Beirut timezone');
    console.log('🧹 Weekly cleanup scheduled for Sunday 2:00 AM');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⏰ Zodiac scheduler is not running');
      return;
    }

    console.log('⏰ Stopping Zodiac scheduler...');

    // Stop all scheduled tasks
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      console.log(`⏹️ Stopped task: ${name}`);
    });

    this.scheduledTasks.clear();
    this.isRunning = false;
    console.log('✅ Zodiac scheduler stopped successfully');
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeTasks: Array.from(this.scheduledTasks.keys()),
      timezone: process.env.TIMEZONE || 'UTC',
      nextGeneration: this.getNext7AM(),
      nextCleanup: this.getNextSunday2AM()
    };
  }

  /**
   * Get next 7 AM Asia/Beirut time
   */
  getNext7AM() {
    const now = new Date();
    const today7AM = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Beirut"}));
    today7AM.setHours(7, 0, 0, 0);
    
    // If it's already past 7 AM today, schedule for tomorrow
    const nowBeirut = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Beirut"}));
    if (nowBeirut.getHours() >= 7) {
      today7AM.setDate(today7AM.getDate() + 1);
    }
    
    return today7AM.toISOString();
  }

  /**
   * Get next Sunday 2 AM
   */
  getNextSunday2AM() {
    const now = new Date();
    const nextSunday = new Date(now);
    const daysUntilSunday = (7 - now.getDay()) % 7;
    nextSunday.setDate(now.getDate() + (daysUntilSunday || 7));
    nextSunday.setHours(2, 0, 0, 0);
    return nextSunday.toISOString();
  }

  /**
   * Manually trigger daily generation (for testing)
   */
  async triggerManualGeneration(force = false) {
    try {
      console.log('🔧 Manual trigger: Starting daily zodiac generation...');
      
      const result = await dailyZodiacService.generateDailyReadings({
        date: new Date().toISOString().split('T')[0],
        forceRegenerate: force,
        generationType: 'manual',
        generatedBy: null // System generated
      });

      if (result.success) {
        console.log('✅ Manual daily zodiac generation started successfully');
        return {
          success: true,
          message: 'Daily zodiac generation started',
          generationId: result.generationId
        };
      } else {
        console.error('❌ Manual daily zodiac generation failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('❌ Error in manual daily zodiac generation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Manually trigger cleanup (for testing)
   */
  async triggerManualCleanup(daysOld = 30) {
    try {
      console.log('🧹 Manual trigger: Starting audio cleanup...');
      
      const { zodiacTTSService } = await import('./zodiacTTSService.js');
      const result = await zodiacTTSService.cleanupOldAudioFiles(daysOld);

      if (result.success) {
        console.log(`✅ Manual audio cleanup completed: ${result.deletedCount} files deleted`);
        return {
          success: true,
          message: `Audio cleanup completed: ${result.deletedCount} files deleted`,
          deletedCount: result.deletedCount
        };
      } else {
        console.error('❌ Manual audio cleanup failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('❌ Error in manual audio cleanup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test if the scheduler can access required services
   */
  async testServices() {
    const results = {
      dailyZodiacService: false,
      zodiacTTSService: false,
      database: false
    };

    try {
      // Test daily zodiac service
      const configResult = await dailyZodiacService.getSystemConfig();
      results.dailyZodiacService = configResult.success;
    } catch (error) {
      console.error('Error testing daily zodiac service:', error);
    }

    try {
      // Test TTS service
      const { zodiacTTSService } = await import('./zodiacTTSService.js');
      const statsResult = await zodiacTTSService.getAudioStats();
      results.zodiacTTSService = statsResult.success;
    } catch (error) {
      console.error('Error testing TTS service:', error);
    }

    try {
      // Test database connection through daily zodiac service
      const testDate = new Date().toISOString().split('T')[0];
      const readingsResult = await dailyZodiacService.getTodaysReadings(testDate);
      results.database = readingsResult.success;
    } catch (error) {
      console.error('Error testing database connection:', error);
    }

    return {
      success: Object.values(results).every(Boolean),
      services: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get detailed scheduler information
   */
  getInfo() {
    const status = this.getStatus();
    
    return {
      ...status,
      description: 'Daily Zodiac (Abraj) Scheduler',
      features: [
        'Automatic daily horoscope generation at midnight',
        'Weekly audio file cleanup',
        'Manual trigger capabilities',
        'Service health monitoring'
      ],
      schedule: {
        daily_generation: {
          time: '07:00',
          timezone: 'Asia/Beirut',
          description: 'Generate new horoscopes for all 12 zodiac signs'
        },
        weekly_cleanup: {
          time: 'Sunday 02:00',
          timezone: process.env.TIMEZONE || 'UTC',
          description: 'Clean up audio files older than 30 days'
        }
      }
    };
  }
}

// Create singleton instance
const zodiacScheduler = new ZodiacScheduler();

export { zodiacScheduler }; 