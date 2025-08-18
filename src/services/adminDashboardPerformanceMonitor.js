// =====================================================
// ADMIN DASHBOARD PERFORMANCE MONITOR
// =====================================================
// 🚀 Monitors admin dashboard performance and provides insights

class AdminDashboardPerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTimes: [],
      apiCalls: [],
      errors: [],
      cacheHits: 0,
      cacheMisses: 0
    };
    this.startTime = null;
  }

  // Start monitoring dashboard load
  startLoadMonitoring() {
    this.startTime = performance.now();
    console.log('📊 Started admin dashboard load monitoring');
  }

  // End monitoring and record metrics
  endLoadMonitoring() {
    if (!this.startTime) return;
    
    const loadTime = performance.now() - this.startTime;
    this.metrics.loadTimes.push({
      timestamp: Date.now(),
      duration: loadTime,
      page: 'admin_dashboard'
    });

    console.log(`📊 Admin dashboard loaded in ${loadTime.toFixed(2)}ms`);
    
    // Alert if load time is too high
    if (loadTime > 3000) {
      console.warn(`⚠️ Slow admin dashboard load: ${loadTime.toFixed(2)}ms`);
      this.recordError('slow_load', `Dashboard loaded in ${loadTime.toFixed(2)}ms`);
    }

    this.startTime = null;
  }

  // Record API call metrics
  recordAPICall(endpoint, duration, success = true) {
    this.metrics.apiCalls.push({
      timestamp: Date.now(),
      endpoint,
      duration,
      success,
      page: 'admin_dashboard'
    });

    if (!success) {
      this.recordError('api_failure', `Failed API call to ${endpoint}`);
    }

    if (duration > 2000) {
      console.warn(`⚠️ Slow API call: ${endpoint} took ${duration}ms`);
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    const recentLoadTimes = this.metrics.loadTimes.slice(-10);
    const avgLoadTime = recentLoadTimes.length > 0 
      ? recentLoadTimes.reduce((sum, metric) => sum + metric.duration, 0) / recentLoadTimes.length
      : 0;

    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
      : 0;

    return {
      avgLoadTime: avgLoadTime.toFixed(2),
      cacheHitRate: cacheHitRate.toFixed(1),
      recentErrors: this.metrics.errors.slice(-10).length,
      status: avgLoadTime > 3000 ? 'warning' : 'healthy'
    };
  }

  // Record errors
  recordError(type, message) {
    this.metrics.errors.push({
      timestamp: Date.now(),
      type,
      message,
      page: 'admin_dashboard'
    });
    console.error(`❌ Admin dashboard error [${type}]: ${message}`);
  }
}

export const adminDashboardPerformanceMonitor = new AdminDashboardPerformanceMonitor();