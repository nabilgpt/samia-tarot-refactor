// Updated to use JWT authentication instead of Supabase auth

// =====================================================
// DASHBOARD HEALTH MONITOR - PRODUCTION SYSTEM
// =====================================================
// 🚨 CRITICAL: Monitors all dashboards for freeze/loading issues
// Auto-detects and resolves authentication, configuration, and API problems

class DashboardHealthMonitor {
  constructor() {
    this.monitoringActive = false;
    this.checkInterval = 120000; // Increased to 2 minutes instead of 30 seconds
    this.timeoutThreshold = 30000; // Increased to 30 seconds max loading time
    this.errorLog = [];
    
    // Dashboard endpoints to monitor (using backend server) - reduced list
    const backendURL = 'http://localhost:5001';
    this.dashboardEndpoints = {
      super_admin: [
        `${backendURL}/api/admin/system-health`, // Only check system health
        `${backendURL}/api/configuration/categories` // Only check configuration
      ],
      admin: [
        `${backendURL}/api/configuration/categories` // Only check configuration
      ],
      monitor: [
        `${backendURL}/api/monitor/live-sessions`
      ],
      reader: [
        `${backendURL}/api/reader/profile`
      ],
      client: [
        `${backendURL}/api/client/profile`
      ]
    };
  }

  /**
   * Start monitoring all dashboards
   */
  startMonitoring() {
    if (this.monitoringActive) {
      return;
    }

    this.monitoringActive = true;
    
    // Start periodic health checks
    this.monitorInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.checkInterval);

    // Monitor authentication state changes
    this.monitorAuthState();
    
    // Monitor network connectivity
    this.monitorNetworkHealth();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.monitoringActive) return;
    
    this.monitoringActive = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }

  /**
   * Perform comprehensive health checks
   */
  async performHealthChecks() {
    try {
      // Check authentication state
      await this.checkAuthenticationHealth();
      
      // Check configuration loading
      await this.checkConfigurationHealth();
      
      // Check API endpoints
      await this.checkAPIHealth();
      
      // Check for stuck loading states
      await this.checkLoadingStates();
      
      // Auto-resolve detected issues
      await this.autoResolveIssues();
      
    } catch (error) {
      console.error('🚨 Health check error:', error);
      this.logError('health_check_failed', error.message);
    }
  }

  /**
   * Check authentication health
   */
  async checkAuthenticationHealth() {
    try {
      // Check JWT token from localStorage (our current auth system)
      const token = localStorage.getItem('jwtToken');
      
      if (!token) {
        this.logError('auth_no_token', 'No JWT token found in localStorage');
        return { healthy: false, error: 'No JWT token' };
      }
      
      // Check token format and expiration
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000;
        const now = Date.now();
        
        if (expiresAt < now) {
          this.logError('auth_token_expired', 'JWT token expired');
          return { healthy: false, error: 'Token expired' };
        }
        
        // Check if token expires soon (within 5 minutes)
        if (expiresAt - now < 300000) {
          console.warn('⚠️ JWT token expires soon, should refresh');
          // Note: We don't have refresh logic for JWT tokens yet
        }
        
        // Validate token with backend
        const response = await fetch('http://localhost:5001/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          this.logError('auth_token_invalid', `Token validation failed: ${response.status}`);
          return { healthy: false, error: `Token validation failed: ${response.status}` };
        }
        
        return { healthy: true };
        
      } catch (tokenError) {
        this.logError('auth_token_invalid', 'Invalid JWT token format');
        return { healthy: false, error: 'Invalid token format' };
      }
      
    } catch (error) {
      this.logError('auth_health_check_failed', error.message);
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Check configuration loading health
   */
  async checkConfigurationHealth() {
    try {
      const response = await fetch('http://localhost:5001/api/configuration/categories', {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        this.logError('config_api_error', `Configuration API returned ${response.status}`);
        return { healthy: false, error: `API error: ${response.status}` };
      }
      
      const data = await response.json();
      if (!data.success) {
        this.logError('config_data_error', 'Configuration API returned error');
        return { healthy: false, error: 'Configuration load failed' };
      }
      
      return { healthy: true };
    } catch (error) {
      this.logError('config_health_check_failed', error.message);
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Check API endpoint health for current user role
   */
  async checkAPIHealth() {
    try {
      const user = await this.getCurrentUser();
      if (!user?.role) return { healthy: false, error: 'No user role' };
      
      const endpoints = this.dashboardEndpoints[user.role] || [];
      const results = [];
      
      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${await this.getAuthToken()}`
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          results.push({
            endpoint,
            status: response.status,
            healthy: response.ok
          });
          
          if (!response.ok) {
            this.logError('api_endpoint_error', `${endpoint} returned ${response.status}`);
          }
          
        } catch (error) {
          results.push({
            endpoint,
            error: error.message,
            healthy: false
          });
          this.logError('api_endpoint_failed', `${endpoint} failed: ${error.message}`);
        }
      }
      
      const healthyCount = results.filter(r => r.healthy).length;
      const totalCount = results.length;
      
      return {
        healthy: healthyCount > totalCount * 0.7, // 70% healthy threshold
        results,
        healthyRatio: healthyCount / totalCount
      };
      
    } catch (error) {
      this.logError('api_health_check_failed', error.message);
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Check for stuck loading states in DOM
   */
  async checkLoadingStates() {
    try {
      // Check for loading spinners that have been active too long
      const loadingElements = document.querySelectorAll('[data-loading="true"], .animate-spin, .loading');
      const stuckElements = [];
      
      loadingElements.forEach(element => {
        const loadingStartTime = element.dataset.loadingStart;
        if (loadingStartTime) {
          const elapsed = Date.now() - parseInt(loadingStartTime);
          if (elapsed > this.timeoutThreshold) {
            stuckElements.push({
              element,
              elapsed,
              component: element.dataset.component || 'unknown'
            });
          }
        }
      });
      
      if (stuckElements.length > 0) {
        console.warn('⚠️ Detected stuck loading states:', stuckElements);
        this.logError('stuck_loading_detected', `${stuckElements.length} components stuck loading`);
        
        // Auto-resolve stuck loading states
        stuckElements.forEach(({ element, component }) => {
          element.removeAttribute('data-loading');
          element.classList.remove('animate-spin', 'loading');
        });
      }
      
      return { healthy: stuckElements.length === 0, stuckElements };
    } catch (error) {
      this.logError('loading_state_check_failed', error.message);
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Auto-resolve detected issues
   */
  async autoResolveIssues() {
    const recentErrors = this.errorLog.slice(-10); // Last 10 errors
    const errorCounts = {};
    
    // Count error types
    recentErrors.forEach(error => {
      errorCounts[error.type] = (errorCounts[error.type] || 0) + 1;
    });
    
    // Auto-resolve common issues
    for (const [errorType, count] of Object.entries(errorCounts)) {
      if (count >= 3) { // If error occurred 3+ times recently
        switch (errorType) {
          case 'auth_token_expired':
            await this.refreshAuthToken();
            break;
            
          case 'config_api_error':
            await this.clearConfigCache();
            break;
            
          case 'api_endpoint_error':
            await this.retryFailedRequests();
            break;
            
          case 'stuck_loading_detected':
            await this.forceRefreshDashboard();
            break;
            
          default:
            console.warn(`⚠️ Unknown error type for auto-resolution: ${errorType}`);
        }
      }
    }
  }

  /**
   * Monitor authentication state changes
   */
  monitorAuthState() {
    // For JWT authentication, we monitor localStorage changes
    window.addEventListener('storage', (event) => {
      if (event.key === 'jwtToken') {
        if (!event.newValue) {
          // JWT token was removed (user logged out)
          this.logError('auth_signed_out', 'JWT token removed from localStorage');
          window.location.href = '/login';
        } else if (event.newValue !== event.oldValue) {
          // JWT token was updated (new login)
          this.errorLog = this.errorLog.filter(e => !e.type.startsWith('auth_'));
          console.log('✅ JWT token updated, cleared auth errors');
        }
      }
    });
    
    // Also periodically check if token is still valid
    setInterval(async () => {
      const authHealth = await this.checkAuthenticationHealth();
      if (!authHealth.healthy && authHealth.error.includes('expired')) {
        // Token expired, redirect to login
        localStorage.removeItem('jwtToken');
        window.location.href = '/login';
      }
    }, 60000); // Check every minute
  }

  /**
   * Monitor network connectivity
   */
  monitorNetworkHealth() {
    window.addEventListener('online', () => {
      this.errorLog = this.errorLog.filter(e => e.type !== 'network_offline');
    });
    
    window.addEventListener('offline', () => {
      this.logError('network_offline', 'Network connection lost');
    });
  }

  /**
   * Helper methods
   */
  async getAuthToken() {
    try {
      // Get JWT token from localStorage (our current auth system)
      const token = localStorage.getItem('jwtToken');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async getCurrentUser() {
    try {
      // Get user from JWT token (our current auth system)
      const token = localStorage.getItem('jwtToken');
      if (!token) return null;
      
      // Decode JWT payload to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      return {
        id: payload.user_id,
        email: payload.email,
        role: payload.role
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async refreshAuthToken() {
    try {
      // For JWT tokens, we don't have a refresh mechanism yet
      // This would need to be implemented with the backend
      console.warn('⚠️ JWT token refresh not implemented yet');
      return false;
    } catch (error) {
      console.error('🚨 Failed to refresh auth token:', error);
      this.logError('auth_refresh_failed', error.message);
      return false;
    }
  }

  async clearConfigCache() {
    try {
      // Clear localStorage config cache
      localStorage.removeItem('dashboard_config_cache');
      
      // Trigger config reload
      window.dispatchEvent(new CustomEvent('config-reload-requested'));
    } catch (error) {
      console.error('Error clearing config cache:', error);
    }
  }

  async retryFailedRequests() {
    // This would integrate with a request retry system
    // For now, just trigger a dashboard refresh
    await this.forceRefreshDashboard();
  }

  async forceRefreshDashboard() {
    // Clear all loading states
    document.querySelectorAll('[data-loading="true"]').forEach(el => {
      el.removeAttribute('data-loading');
    });
    
    // Trigger dashboard reload event
    window.dispatchEvent(new CustomEvent('dashboard-force-refresh'));
    
    // If still stuck after 5 seconds, do a full page reload
    setTimeout(() => {
      if (this.errorLog.some(e => e.type === 'stuck_loading_detected' && Date.now() - e.timestamp < 10000)) {
        console.warn('🚨 Dashboard still stuck, performing full page reload');
        window.location.reload();
      }
    }, 5000);
  }

  logError(type, message) {
    const error = {
      type,
      message,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.errorLog.push(error);
    
    // Keep only last 50 errors
    if (this.errorLog.length > 50) {
      this.errorLog = this.errorLog.slice(-50);
    }
    
    console.error(`🚨 Dashboard Health Error [${type}]:`, message);
    
    // Send critical errors to backend for monitoring
    if (['auth_session_error', 'api_endpoint_failed', 'stuck_loading_detected'].includes(type)) {
      this.reportCriticalError(error);
    }
  }

  async reportCriticalError(error) {
    try {
      await fetch('/api/system/error-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          error_type: 'dashboard_health',
          error_data: error,
          user_id: (await this.getCurrentUser())?.id
        })
      });
    } catch (reportError) {
      console.error('Failed to report critical error:', reportError);
    }
  }

  /**
   * Get health summary
   */
  getHealthSummary() {
    const recentErrors = this.errorLog.filter(e => Date.now() - e.timestamp < 300000); // Last 5 minutes
    const errorTypes = [...new Set(recentErrors.map(e => e.type))];
    
    return {
      monitoring: this.monitoringActive,
      recentErrorCount: recentErrors.length,
      errorTypes,
      lastCheck: Date.now(),
      status: recentErrors.length === 0 ? 'healthy' : 'issues_detected'
    };
  }
}

// Create singleton instance
const dashboardHealthMonitor = new DashboardHealthMonitor();

// Auto-start monitoring when imported
if (typeof window !== 'undefined') {
  // Start monitoring after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      dashboardHealthMonitor.startMonitoring();
    });
  } else {
    dashboardHealthMonitor.startMonitoring();
  }
}

export default dashboardHealthMonitor;
