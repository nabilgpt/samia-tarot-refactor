// ================================================================
// SAMIA TAROT BILINGUAL UX PERFORMANCE MONITOR
// Tracks language switching performance, memory usage, and component efficiency
// ================================================================

class BilingualPerformanceMonitor {
  constructor() {
    this.metrics = {
      languageSwitches: [],
      componentRenders: new Map(),
      memorySnapshots: [],
      userInteractions: [],
      errorCounts: new Map()
    };
    
    this.observers = new Map();
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     localStorage.getItem('samia_performance_debug') === 'true';
    
    if (this.isEnabled) {
      this.initialize();
    }
  }

  initialize() {
    // Start performance observers
    this.startPerformanceObserver();
    this.startMemoryMonitoring();
    this.startRenderTracking();
    
    console.log('🚀 Bilingual Performance Monitor initialized');
  }

  // ================================================================
  // LANGUAGE SWITCHING PERFORMANCE
  // ================================================================

  startLanguageSwitch(fromLang, toLang, userId = null) {
    const switchId = `switch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    const switchMetric = {
      id: switchId,
      fromLang,
      toLang,
      userId,
      startTime,
      endTime: null,
      duration: null,
      domUpdates: 0,
      renderCount: 0,
      memoryUsed: this.getCurrentMemoryUsage(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    this.metrics.languageSwitches.push(switchMetric);
    
    // Track DOM mutations during switch
    this.trackDOMUpdates(switchId);
    
    return switchId;
  }

  endLanguageSwitch(switchId, success = true, error = null) {
    const metric = this.metrics.languageSwitches.find(s => s.id === switchId);
    if (!metric) return;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
    metric.error = error;
    metric.memoryAfter = this.getCurrentMemoryUsage();
    metric.memoryDelta = metric.memoryAfter - metric.memoryUsed;

    // Stop DOM mutation tracking
    this.stopDOMUpdates(switchId);

    // Log performance if poor
    if (metric.duration > 1000) {
      console.warn(`🐌 Slow language switch detected:`, {
        duration: `${metric.duration.toFixed(2)}ms`,
        fromLang: metric.fromLang,
        toLang: metric.toLang,
        domUpdates: metric.domUpdates
      });
    }

    // Emit performance event
    this.emitPerformanceEvent('languageSwitch', metric);
  }

  trackDOMUpdates(switchId) {
    if (!window.MutationObserver) return;

    const metric = this.metrics.languageSwitches.find(s => s.id === switchId);
    if (!metric) return;

    const observer = new MutationObserver((mutations) => {
      metric.domUpdates += mutations.length;
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['dir', 'class', 'style']
    });

    this.observers.set(switchId, observer);
  }

  stopDOMUpdates(switchId) {
    const observer = this.observers.get(switchId);
    if (observer) {
      observer.disconnect();
      this.observers.delete(switchId);
    }
  }

  // ================================================================
  // COMPONENT RENDER TRACKING
  // ================================================================

  trackComponentRender(componentName, props = {}, renderTime = null) {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const renderDuration = renderTime || 0;
    
    if (!this.metrics.componentRenders.has(componentName)) {
      this.metrics.componentRenders.set(componentName, {
        name: componentName,
        renderCount: 0,
        totalRenderTime: 0,
        averageRenderTime: 0,
        lastRender: null,
        propsHistory: [],
        renderTimes: []
      });
    }

    const componentMetric = this.metrics.componentRenders.get(componentName);
    componentMetric.renderCount++;
    componentMetric.totalRenderTime += renderDuration;
    componentMetric.averageRenderTime = componentMetric.totalRenderTime / componentMetric.renderCount;
    componentMetric.lastRender = timestamp;
    componentMetric.renderTimes.push(renderDuration);
    
    // Keep only last 10 render times
    if (componentMetric.renderTimes.length > 10) {
      componentMetric.renderTimes.shift();
    }

    // Track props changes for bilingual components
    if (this.isBilingualComponent(componentName)) {
      componentMetric.propsHistory.push({
        timestamp,
        props: this.sanitizeProps(props),
        language: props.currentLanguage || 'unknown'
      });
      
      // Keep only last 5 prop changes
      if (componentMetric.propsHistory.length > 5) {
        componentMetric.propsHistory.shift();
      }
    }

    // Warn for excessive renders
    if (componentMetric.renderCount > 20 && componentMetric.renderCount % 10 === 0) {
      console.warn(`⚠️ High render count for ${componentName}: ${componentMetric.renderCount} renders`);
    }
  }

  trackComponentMount(componentName) {
    this.emitPerformanceEvent('componentMount', { componentName, timestamp: Date.now() });
  }

  trackComponentUnmount(componentName) {
    this.emitPerformanceEvent('componentUnmount', { componentName, timestamp: Date.now() });
  }

  isBilingualComponent(componentName) {
    const bilingualComponents = [
      'BilingualInput',
      'BilingualTextarea', 
      'BilingualSelect',
      'AdminLanguageToggle',
      'LanguageProvider',
      'SpreadManager',
      'AddServiceModal'
    ];
    return bilingualComponents.some(comp => componentName.includes(comp));
  }

  sanitizeProps(props) {
    // Remove functions and complex objects for logging
    const sanitized = {};
    Object.keys(props).forEach(key => {
      const value = props[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value === null || value === undefined) {
        sanitized[key] = value;
      } else {
        sanitized[key] = `[${typeof value}]`;
      }
    });
    return sanitized;
  }

  // ================================================================
  // MEMORY MONITORING
  // ================================================================

  startMemoryMonitoring() {
    if (!performance.memory) {
      console.warn('Memory monitoring not available in this browser');
      return;
    }

    // Take snapshot every 30 seconds
    setInterval(() => {
      this.takeMemorySnapshot();
    }, 30000);

    // Take initial snapshot
    this.takeMemorySnapshot();
  }

  takeMemorySnapshot(label = 'auto') {
    if (!performance.memory) return null;

    const snapshot = {
      timestamp: Date.now(),
      label,
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
      totalMB: Math.round(performance.memory.totalJSHeapSize / 1048576),
      limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
    };

    this.metrics.memorySnapshots.push(snapshot);

    // Keep only last 50 snapshots
    if (this.metrics.memorySnapshots.length > 50) {
      this.metrics.memorySnapshots.shift();
    }

    // Check for memory leaks
    this.checkMemoryLeaks();

    return snapshot;
  }

  getCurrentMemoryUsage() {
    return performance.memory ? 
           Math.round(performance.memory.usedJSHeapSize / 1048576) : 0;
  }

  checkMemoryLeaks() {
    if (this.metrics.memorySnapshots.length < 10) return;

    const recent = this.metrics.memorySnapshots.slice(-10);
    const growthTrend = recent.every((snapshot, index) => {
      if (index === 0) return true;
      return snapshot.usedMB >= recent[index - 1].usedMB;
    });

    if (growthTrend) {
      const firstSnapshot = recent[0];
      const lastSnapshot = recent[recent.length - 1];
      const growth = lastSnapshot.usedMB - firstSnapshot.usedMB;
      
      if (growth > 10) { // More than 10MB growth
        console.warn(`🔴 Potential memory leak detected: ${growth}MB growth over last 10 snapshots`);
        this.emitPerformanceEvent('memoryLeak', {
          growth,
          snapshots: recent
        });
      }
    }
  }

  // ================================================================
  // USER INTERACTION TRACKING
  // ================================================================

  trackUserInteraction(action, details = {}) {
    if (!this.isEnabled) return;

    const interaction = {
      timestamp: Date.now(),
      action,
      details,
      currentLanguage: document.body.dir === 'rtl' ? 'ar' : 'en',
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    this.metrics.userInteractions.push(interaction);

    // Keep only last 100 interactions
    if (this.metrics.userInteractions.length > 100) {
      this.metrics.userInteractions.shift();
    }
  }

  // ================================================================
  // ERROR TRACKING
  // ================================================================

  trackError(error, context = {}) {
    const errorKey = error.message || 'Unknown Error';
    const currentCount = this.metrics.errorCounts.get(errorKey) || 0;
    this.metrics.errorCounts.set(errorKey, currentCount + 1);

    const errorMetric = {
      timestamp: Date.now(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      currentLanguage: document.body.dir === 'rtl' ? 'ar' : 'en',
      count: currentCount + 1
    };

    console.error('🔴 Bilingual UX Error tracked:', errorMetric);
    this.emitPerformanceEvent('error', errorMetric);
  }

  // ================================================================
  // PERFORMANCE OBSERVER
  // ================================================================

  startPerformanceObserver() {
    if (!window.PerformanceObserver) return;

    // Observe layout shifts
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && entry.value > 0.1) {
            console.warn('📐 Layout shift detected during language switch:', entry.value);
            this.emitPerformanceEvent('layoutShift', {
              value: entry.value,
              timestamp: entry.startTime
            });
          }
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('Layout shift observer not supported');
    }

    // Observe paint timing
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.emitPerformanceEvent('paint', {
            name: entry.name,
            startTime: entry.startTime
          });
        }
      });

      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Paint observer not supported');
    }
  }

  startRenderTracking() {
    // Hook into React DevTools if available
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = (id, root, priorityLevel) => {
        this.trackComponentRender('ReactRoot', { priorityLevel }, performance.now());
      };
    }
  }

  // ================================================================
  // REPORTING & ANALYTICS
  // ================================================================

  generateReport() {
    const report = {
      timestamp: Date.now(),
      summary: this.generateSummary(),
      languageSwitches: this.analyzeLanguageSwitches(),
      componentPerformance: this.analyzeComponentPerformance(),
      memoryUsage: this.analyzeMemoryUsage(),
      errors: this.analyzeErrors(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  generateSummary() {
    return {
      totalLanguageSwitches: this.metrics.languageSwitches.length,
      avgSwitchTime: this.getAverageLanguageSwitchTime(),
      totalComponentRenders: Array.from(this.metrics.componentRenders.values())
        .reduce((total, comp) => total + comp.renderCount, 0),
      currentMemoryUsage: this.getCurrentMemoryUsage(),
      totalErrors: Array.from(this.metrics.errorCounts.values())
        .reduce((total, count) => total + count, 0),
      uptime: Date.now() - (this.metrics.memorySnapshots[0]?.timestamp || Date.now())
    };
  }

  analyzeLanguageSwitches() {
    const switches = this.metrics.languageSwitches;
    if (switches.length === 0) return { message: 'No language switches recorded' };

    const successfulSwitches = switches.filter(s => s.success !== false);
    const avgDuration = successfulSwitches.reduce((sum, s) => sum + (s.duration || 0), 0) / successfulSwitches.length;
    const slowSwitches = successfulSwitches.filter(s => s.duration > 1000);

    return {
      total: switches.length,
      successful: successfulSwitches.length,
      failed: switches.length - successfulSwitches.length,
      averageDuration: Math.round(avgDuration),
      slowSwitches: slowSwitches.length,
      slowSwitchPercentage: Math.round((slowSwitches.length / successfulSwitches.length) * 100),
      languageDistribution: this.getLanguageDistribution(switches)
    };
  }

  analyzeComponentPerformance() {
    const components = Array.from(this.metrics.componentRenders.values());
    
    const topRenderCounts = components
      .sort((a, b) => b.renderCount - a.renderCount)
      .slice(0, 5)
      .map(comp => ({
        name: comp.name,
        renderCount: comp.renderCount,
        averageRenderTime: Math.round(comp.averageRenderTime)
      }));

    const slowComponents = components
      .filter(comp => comp.averageRenderTime > 16) // Slower than 60fps
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, 5)
      .map(comp => ({
        name: comp.name,
        averageRenderTime: Math.round(comp.averageRenderTime),
        renderCount: comp.renderCount
      }));

    return {
      totalComponents: components.length,
      topRenderCounts,
      slowComponents,
      bilingualComponents: components.filter(comp => this.isBilingualComponent(comp.name)).length
    };
  }

  analyzeMemoryUsage() {
    const snapshots = this.metrics.memorySnapshots;
    if (snapshots.length === 0) return { message: 'No memory snapshots available' };

    const current = snapshots[snapshots.length - 1];
    const initial = snapshots[0];
    const peak = snapshots.reduce((max, snapshot) => 
      snapshot.usedMB > max.usedMB ? snapshot : max, snapshots[0]);

    return {
      current: current.usedMB,
      initial: initial.usedMB,
      peak: peak.usedMB,
      growth: current.usedMB - initial.usedMB,
      snapshots: snapshots.length,
      trend: this.getMemoryTrend()
    };
  }

  analyzeErrors() {
    const errors = Array.from(this.metrics.errorCounts.entries());
    const totalErrors = errors.reduce((sum, [, count]) => sum + count, 0);
    
    return {
      totalErrors,
      uniqueErrors: errors.length,
      topErrors: errors
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([message, count]) => ({ message, count }))
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const summary = this.generateSummary();

    // Language switch performance
    if (summary.avgSwitchTime > 500) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Language switches are slow (${summary.avgSwitchTime}ms avg). Consider optimizing DOM updates.`
      });
    }

    // Memory usage
    if (summary.currentMemoryUsage > 100) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message: `High memory usage (${summary.currentMemoryUsage}MB). Monitor for memory leaks.`
      });
    }

    // Component renders
    const topRenderer = Array.from(this.metrics.componentRenders.values())
      .sort((a, b) => b.renderCount - a.renderCount)[0];
    
    if (topRenderer && topRenderer.renderCount > 50) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        message: `${topRenderer.name} has rendered ${topRenderer.renderCount} times. Consider memoization.`
      });
    }

    // Error rate
    if (summary.totalErrors > 10) {
      recommendations.push({
        type: 'stability',
        priority: 'high',
        message: `High error count (${summary.totalErrors}). Investigate error sources.`
      });
    }

    return recommendations;
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

  getAverageLanguageSwitchTime() {
    const switches = this.metrics.languageSwitches.filter(s => s.duration);
    if (switches.length === 0) return 0;
    
    const total = switches.reduce((sum, s) => sum + s.duration, 0);
    return Math.round(total / switches.length);
  }

  getLanguageDistribution(switches) {
    const distribution = { 'ar': 0, 'en': 0, 'other': 0 };
    
    switches.forEach(s => {
      if (s.toLang === 'ar') distribution.ar++;
      else if (s.toLang === 'en') distribution.en++;
      else distribution.other++;
    });

    return distribution;
  }

  getMemoryTrend() {
    const snapshots = this.metrics.memorySnapshots;
    if (snapshots.length < 5) return 'insufficient_data';

    const recent = snapshots.slice(-5);
    const isIncreasing = recent.every((snapshot, index) => {
      if (index === 0) return true;
      return snapshot.usedMB >= recent[index - 1].usedMB;
    });

    const isDecreasing = recent.every((snapshot, index) => {
      if (index === 0) return true;
      return snapshot.usedMB <= recent[index - 1].usedMB;
    });

    if (isIncreasing) return 'increasing';
    if (isDecreasing) return 'decreasing';
    return 'stable';
  }

  emitPerformanceEvent(eventType, data) {
    if (window.gtag) {
      window.gtag('event', 'bilingual_performance', {
        event_category: 'bilingual_ux',
        event_label: eventType,
        custom_map: { performance_data: JSON.stringify(data) }
      });
    }

    // Custom event for other analytics tools
    window.dispatchEvent(new CustomEvent('bilingualPerformance', {
      detail: { type: eventType, data }
    }));
  }

  // ================================================================
  // PUBLIC API
  // ================================================================

  enable() {
    this.isEnabled = true;
    localStorage.setItem('samia_performance_debug', 'true');
    this.initialize();
  }

  disable() {
    this.isEnabled = false;
    localStorage.removeItem('samia_performance_debug');
    
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }

  exportData() {
    const data = {
      timestamp: Date.now(),
      metrics: {
        languageSwitches: this.metrics.languageSwitches,
        componentRenders: Array.from(this.metrics.componentRenders.entries()),
        memorySnapshots: this.metrics.memorySnapshots,
        userInteractions: this.metrics.userInteractions,
        errorCounts: Array.from(this.metrics.errorCounts.entries())
      },
      report: this.generateReport()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], 
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `bilingual-performance-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  clearData() {
    this.metrics = {
      languageSwitches: [],
      componentRenders: new Map(),
      memorySnapshots: [],
      userInteractions: [],
      errorCounts: new Map()
    };
    console.log('📊 Performance data cleared');
  }

  logReport() {
    const report = this.generateReport();
    console.group('📊 Bilingual UX Performance Report');
    console.log('Summary:', report.summary);
    console.log('Language Switches:', report.languageSwitches);
    console.log('Component Performance:', report.componentPerformance);
    console.log('Memory Usage:', report.memoryUsage);
    console.log('Errors:', report.errors);
    console.log('Recommendations:', report.recommendations);
    console.groupEnd();
    return report;
  }
}

// Global instance
const bilingualPerformanceMonitor = new BilingualPerformanceMonitor();

// React hook for component tracking
export const useBilingualPerformance = (componentName) => {
  const startTime = React.useRef(performance.now());
  
  React.useEffect(() => {
    bilingualPerformanceMonitor.trackComponentMount(componentName);
    
    return () => {
      bilingualPerformanceMonitor.trackComponentUnmount(componentName);
    };
  }, [componentName]);

  React.useEffect(() => {
    const renderTime = performance.now() - startTime.current;
    bilingualPerformanceMonitor.trackComponentRender(componentName, {}, renderTime);
    startTime.current = performance.now();
  });

  return {
    trackInteraction: (action, details) => 
      bilingualPerformanceMonitor.trackUserInteraction(action, details),
    trackError: (error, context) => 
      bilingualPerformanceMonitor.trackError(error, context)
  };
};

// Export monitor instance and utilities
export default bilingualPerformanceMonitor;

export {
  BilingualPerformanceMonitor,
  bilingualPerformanceMonitor as performanceMonitor
}; 