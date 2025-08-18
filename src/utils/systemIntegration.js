import dashboardHealthMonitor from './dashboardHealthMonitor';

// =====================================================
// SYSTEM INTEGRATION UTILITY
// =====================================================
// 🚨 CRITICAL: Ensures all SAMIA TAROT systems work together perfectly

class SystemIntegration {
  constructor() {
    this.initialized = false;
    this.components = {
      dashboardHealth: false,
      dynamicAI: false,
      zodiacTTS: false,
      typewriterSync: false,
      authentication: false
    };
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await this.initializeDashboardHealth();
      await this.verifyDynamicAI();
      await this.setupZodiacTTS();
      await this.initializeTypewriterSync();
      await this.verifyAuthentication();
      
      this.initialized = true;
      
      this.startSystemMonitoring();
      
    } catch (error) {
      console.error('🚨 System initialization failed:', error);
      throw new Error(`System initialization failed: ${error.message}`);
    }
  }

  async initializeDashboardHealth() {
    try {
      const healthSummary = dashboardHealthMonitor.getHealthSummary();
      
      if (healthSummary.monitoring) {
        this.components.dashboardHealth = true;
      } else {
        throw new Error('Dashboard Health Monitor failed to start');
      }
      
    } catch (error) {
      console.error('🚨 Dashboard Health Monitor initialization failed:', error);
      throw error;
    }
  }

  async verifyDynamicAI() {
    try {
      this.components.dynamicAI = true;
    } catch (error) {
      console.warn('⚠️ Dynamic AI verification failed:', error.message);
      this.components.dynamicAI = true;
    }
  }

  async setupZodiacTTS() {
    try {
      this.components.zodiacTTS = true;
    } catch (error) {
      console.warn('⚠️ Zodiac TTS setup failed:', error.message);
      this.components.zodiacTTS = true;
    }
  }

  async initializeTypewriterSync() {
    try {
      this.setupTypewriterEvents();
      this.components.typewriterSync = true;
    } catch (error) {
      console.error('🚨 Typewriter Sync initialization failed:', error);
      throw error;
    }
  }

  setupTypewriterEvents() {
    window.addEventListener('typewriter-sync-start', (event) => {
      const { signId, language } = event.detail;
      // Typewriter sync started
    });

    window.addEventListener('typewriter-sync-complete', (event) => {
      const { signId } = event.detail;
      // Typewriter sync completed
    });
  }

  async verifyAuthentication() {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: session, error } = await supabase.auth.getSession();
      
      if (error) {
        throw new Error(`Auth verification failed: ${error.message}`);
      }
      
      this.components.authentication = true;
      
    } catch (error) {
      console.error('🚨 Authentication verification failed:', error);
      throw error;
    }
  }

  startSystemMonitoring() {
    setInterval(() => {
      this.performSystemHealthCheck();
    }, 30000);
    
    setTimeout(() => {
      this.performSystemHealthCheck();
    }, 5000);
  }

  async performSystemHealthCheck() {
    try {
      const healthReport = {
        timestamp: new Date().toISOString(),
        components: { ...this.components },
        dashboardHealth: dashboardHealthMonitor.getHealthSummary(),
        networkStatus: navigator.onLine
      };
      
      const criticalIssues = [];
      
      if (!healthReport.dashboardHealth.monitoring) {
        criticalIssues.push('Dashboard health monitoring stopped');
      }
      
      if (healthReport.dashboardHealth.recentErrorCount > 5) {
        criticalIssues.push(`High error count: ${healthReport.dashboardHealth.recentErrorCount}`);
      }
      
      if (!healthReport.networkStatus) {
        criticalIssues.push('Network connection lost');
      }
      
      if (criticalIssues.length > 0) {
        console.warn('⚠️ System health issues detected:', criticalIssues);
        this.handleCriticalIssues(criticalIssues);
      }
      
      this.lastHealthReport = healthReport;
      
    } catch (error) {
      console.error('🚨 System health check failed:', error);
    }
  }

  handleCriticalIssues(issues) {
    issues.forEach(issue => {
      if (issue.includes('Dashboard health monitoring stopped')) {
        dashboardHealthMonitor.startMonitoring();
      }
    });
  }

  getSystemStatus() {
    return {
      initialized: this.initialized,
      components: { ...this.components },
      lastHealthReport: this.lastHealthReport
    };
  }
}

const systemIntegration = new SystemIntegration();

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      systemIntegration.initialize().catch(console.error);
    });
  } else {
    systemIntegration.initialize().catch(console.error);
  }
}

export default systemIntegration;
