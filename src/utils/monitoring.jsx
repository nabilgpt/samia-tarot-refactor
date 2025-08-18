/**
 * Production Monitoring & Real-Time Alerts
 * SAMIA TAROT Platform
 */

import React from 'react';
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { onCLS, onFCP, onFID, onLCP, onTTFB } from 'web-vitals';

// =============================================================================
// SENTRY CONFIGURATION
// =============================================================================

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export const initializeSentry = () => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_ENV || 'production',
      
      // Performance monitoring
      integrations: [
        Sentry.browserTracingIntegration({
          // Set tracing sample rate
          tracingOrigins: [
            'localhost',
            'samia-tarot.com',
            'staging.samia-tarot.com',
            /^\//
          ],
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes
          ),
        }),
      ],
      
      // Error sampling
      sampleRate: 1.0,
      
      // Performance sampling
      tracesSampleRate: import.meta.env.VITE_ENV === 'production' ? 0.1 : 1.0,
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      
      // Filter out noise
      beforeSend(event) {
        // Filter out development errors
        if (import.meta.env.DEV) return null;
        
        // Filter out common user errors
        if (event.exception) {
          const error = event.exception.values[0];
          
          // Network errors
          if (error.type === 'NetworkError' || 
              error.value?.includes('Failed to fetch')) {
            return null;
          }
          
          // Script loading errors from extensions
          if (error.value?.includes('chrome-extension://') ||
              error.value?.includes('moz-extension://')) {
            return null;
          }
        }
        
        return event;
      },
      
      // Custom error boundaries
      beforeErrorBoundary: (error, errorInfo) => {
        if (import.meta.env.DEV) {
          // Development only - console logs
          console.error('React Error Boundary:', error, errorInfo);
        }
      }
    });

    // Production: Use Sentry for error tracking
    if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
      // console.log('✅ Sentry monitoring initialized');
    }
  }
};

// =============================================================================
// CLASS DEFINITIONS (MOVED TO TOP TO AVOID HOISTING ISSUES)
// =============================================================================

/**
 * Error tracking and monitoring
 */
export class ErrorTracker {
  constructor() {
    this.errorCount = 0;
    this.errorThreshold = 10; // Alert after 10 errors in 5 minutes
    this.timeWindow = 5 * 60 * 1000; // 5 minutes
    
    this.setupGlobalErrorHandlers();
  }

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    // Unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'JavaScript Error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'Unhandled Promise Rejection',
        message: event.reason?.message || 'Unknown promise rejection',
        reason: event.reason
      });
    });
  }

  /**
   * Track and report errors
   */
  trackError(errorInfo) {
    this.errorCount++;
    
    // Add contextual information
    const enrichedError = {
      ...errorInfo,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    };

    // Send to Sentry
    if (Sentry.isInitialized()) {
      Sentry.captureException(errorInfo.error || new Error(errorInfo.message), {
        tags: {
          type: errorInfo.type
        },
        extra: enrichedError
      });
    }

    // Check error rate threshold
    if (this.errorCount >= this.errorThreshold) {
      this.alertHighErrorRate();
    }

    // Log in development
    if (import.meta.env.DEV) {
      console.error('🚨 Error tracked:', enrichedError);
    }
  }

  /**
   * Alert for high error rate
   */
  alertHighErrorRate() {
    const message = `High error rate detected: ${this.errorCount} errors in ${this.timeWindow / 60000} minutes`;
    
    if (Sentry.isInitialized()) {
      Sentry.captureMessage(message, 'error');
    }
    
    console.error(`🚨 ${message}`);
    
    // Reset counter
    setTimeout(() => {
      this.errorCount = 0;
    }, this.timeWindow);
  }
}

/**
 * Real-time alerting system
 */
export class AlertManager {
  constructor() {
    this.alerts = [];
    this.webhookUrl = import.meta.env.VITE_SLACK_WEBHOOK_URL;
  }

  /**
   * Send critical alert
   */
  async sendCriticalAlert(message, details = {}) {
    const alert = {
      level: 'critical',
      message,
      details,
      timestamp: new Date().toISOString(),
      environment: import.meta.env.VITE_ENV || 'production'
    };

    // Send to Sentry
    if (Sentry.isInitialized()) {
      Sentry.captureMessage(message, 'error');
    }

    // Send to Slack if webhook is configured
    if (this.webhookUrl && import.meta.env.PROD) {
      await this.sendSlackAlert(alert);
    }

    this.alerts.push(alert);
    console.error('🚨 CRITICAL ALERT:', alert);
  }

  /**
   * Send alert to Slack
   */
  async sendSlackAlert(alert) {
    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🚨 SAMIA TAROT Alert`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${alert.level.toUpperCase()} ALERT*\n${alert.message}`
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Environment:*\n${alert.environment}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Time:*\n${alert.timestamp}`
                }
              ]
            }
          ]
        })
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }
}

/**
 * System health monitoring
 */
export class HealthMonitor {
  constructor() {
    this.healthChecks = new Map();
    this.healthStatus = 'healthy';
    this.lastHealthCheck = null;
    
    this.startHealthMonitoring();
  }

  /**
   * Register health check
   */
  registerHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, checkFunction);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const results = {};
    let overallHealthy = true;

    for (const [name, checkFunction] of this.healthChecks) {
      try {
        const result = await checkFunction();
        results[name] = {
          status: result ? 'healthy' : 'unhealthy',
          timestamp: Date.now()
        };
        
        if (!result) overallHealthy = false;
      } catch (error) {
        results[name] = {
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        };
        overallHealthy = false;
      }
    }

    this.healthStatus = overallHealthy ? 'healthy' : 'unhealthy';
    this.lastHealthCheck = Date.now();

    return {
      status: this.healthStatus,
      checks: results,
      timestamp: this.lastHealthCheck
    };
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring() {
    // Run health checks every 2 minutes
    setInterval(async () => {
      const health = await this.runHealthChecks();
      
      if (health.status === 'unhealthy') {
        alertManager.sendCriticalAlert('Application health check failed', health);
      }
    }, 2 * 60 * 1000);

    // Initial health check
    setTimeout(() => this.runHealthChecks(), 5000);
  }
}

/**
 * Performance monitoring using web-vitals
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
  }

  // Initialize all performance observers
  init() {
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeFCP();
    this.observeTTFB();
  }

  // Largest Contentful Paint - Updated for web-vitals v4.x
  observeLCP() {
    onLCP((metric) => {
      this.metrics.set('lcp', metric.value);
      
      // Send to analytics
      this.sendMetric('lcp', metric.value);
      
      // Sentry performance
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `LCP: ${metric.value}ms`,
        level: 'info',
      });
    });
  }

  // First Input Delay - Updated for web-vitals v4.x
  observeFID() {
    onFID((metric) => {
      this.metrics.set('fid', metric.value);
      this.sendMetric('fid', metric.value);
      
      // Sentry performance
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `FID: ${metric.value}ms`,
        level: 'info',
      });
    });
  }

  // Cumulative Layout Shift - Updated for web-vitals v4.x
  observeCLS() {
    onCLS((metric) => {
      this.metrics.set('cls', metric.value);
      this.sendMetric('cls', metric.value);
      
      // Sentry performance
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `CLS: ${metric.value}`,
        level: 'info',
      });
    });
  }

  // First Contentful Paint - Updated for web-vitals v4.x
  observeFCP() {
    onFCP((metric) => {
      this.metrics.set('fcp', metric.value);
      this.sendMetric('fcp', metric.value);
      
      // Sentry performance
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `FCP: ${metric.value}ms`,
        level: 'info',
      });
    });
  }

  // Time to First Byte - Updated for web-vitals v4.x
  observeTTFB() {
    onTTFB((metric) => {
      this.metrics.set('ttfb', metric.value);
      this.sendMetric('ttfb', metric.value);
      
      // Sentry performance
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `TTFB: ${metric.value}ms`,
        level: 'info',
      });
    });
  }

  // Custom metric tracking
  startTransaction(name, op = 'custom') {
    return Sentry.startTransaction({
      name,
      op,
      tags: {
        custom: true,
      },
    });
  }

  // Track API response times
  trackApiCall(url, method, duration, status) {
    const transaction = this.startTransaction(`API ${method.toUpperCase()} ${url}`, 'http');
    
    transaction.setTag('http.method', method);
    transaction.setTag('http.status_code', status);
    transaction.setData('url', url);
    transaction.setData('duration', duration);
    
    if (status >= 400) {
      transaction.setTag('error', true);
    }
    
    transaction.finish();
    
    // Send to custom analytics
    this.sendMetric('api_call', {
      url,
      method,
      duration,
      status,
      timestamp: Date.now(),
    });
  }

  // Track user interactions
  trackUserInteraction(action, category, label, value) {
    const transaction = this.startTransaction(`User ${action}`, 'user');
    
    transaction.setTag('action', action);
    transaction.setTag('category', category);
    
    if (label) transaction.setData('label', label);
    if (value) transaction.setData('value', value);
    
    transaction.finish();
    
    // Send to analytics
    this.sendMetric('user_interaction', {
      action,
      category,
      label,
      value,
      timestamp: Date.now(),
    });
  }

  // Track page load performance
  trackPageLoad(pageName, loadTime) {
    const transaction = this.startTransaction(`Page Load: ${pageName}`, 'navigation');
    
    transaction.setTag('page', pageName);
    transaction.setData('load_time', loadTime);
    
    // Categorize performance
    let performance_rating = 'good';
    if (loadTime > 2500) performance_rating = 'poor';
    else if (loadTime > 1000) performance_rating = 'needs_improvement';
    
    transaction.setTag('performance_rating', performance_rating);
    transaction.finish();
    
    this.sendMetric('page_load', {
      page: pageName,
      load_time: loadTime,
      performance_rating,
      timestamp: Date.now(),
    });
  }

  // Send metrics to custom analytics endpoint
  sendMetric(type, data) {
    if (import.meta.env.PROD) {
      // Send to your analytics service
      fetch('/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: Date.now(),
          user_agent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch((error) => {
        console.warn('Failed to send metric:', error);
      });
    }
  }

  // Get current metrics
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  // Clean up observers
  disconnect() {
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();
  }
}

// =============================================================================
// SINGLETON INSTANCES (NOW AFTER CLASS DEFINITIONS)
// =============================================================================

export const performanceMonitor = new PerformanceMonitor();
export const errorTracker = new ErrorTracker();
export const alertManager = new AlertManager();
export const healthMonitor = new HealthMonitor();

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize Sentry error monitoring and complete monitoring system
export const initializeMonitoring = () => {
  // Initialize Sentry first
  initializeSentry();
  
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration({
          // Performance monitoring for navigation
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes
          ),
        }),
      ],
      environment: import.meta.env.VITE_APP_ENV || 'development',
      tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
      profilesSampleRate: 0.1, // 10% for profiling
      beforeSend(event) {
        // Filter out non-critical errors in production
        if (event.exception) {
          const error = event.exception.values[0];
          // Skip network errors and other non-actionable errors
          if (error?.value?.includes('NetworkError') ||
              error?.value?.includes('Loading chunk') ||
              error?.value?.includes('ResizeObserver loop limit exceeded')) {
            return null;
          }
        }
        return event;
      },
      beforeSendTransaction(event) {
        // Modify transaction data before sending
        return event;
      },
    });

    // Set user context when available
    const setUserContext = (user) => {
      Sentry.setUser({
        id: user?.id,
        email: user?.email,
        username: user?.profile?.first_name || 'Anonymous',
      });
    };

    // Set custom tags
    Sentry.setTag('platform', 'web');
    Sentry.setTag('cosmic_theme', localStorage.getItem('samia_theme') || 'dark');

    // Register default health checks
    healthMonitor.registerHealthCheck('api', async () => {
      try {
        const response = await fetch('/api/health');
        return response.ok;
      } catch {
        return false;
      }
    });

    healthMonitor.registerHealthCheck('localStorage', () => {
      try {
        localStorage.setItem('health-check', 'test');
        localStorage.removeItem('health-check');
        return true;
      } catch {
        return false;
      }
    });

    // Production: Use Sentry for error tracking
    if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
      // console.log('✅ Production monitoring initialized');
    }
    
    return { setUserContext };
  }

  // Development mode - still register health checks but no Sentry
  healthMonitor.registerHealthCheck('api', async () => {
    try {
      const response = await fetch('/api/health');
      return response.ok;
    } catch {
      return false;
    }
  });

  healthMonitor.registerHealthCheck('localStorage', () => {
    try {
      localStorage.setItem('health-check', 'test');
      localStorage.removeItem('health-check');
      return true;
    } catch {
      return false;
    }
  });

  // Development: Use console for development logs
  if (import.meta.env.DEV) {
    console.log('✅ Development monitoring initialized');
  }

  // Return mock functions for development
  return {
    setUserContext: () => {},
  };
};

// Auto-initialize in production
if (import.meta.env.PROD) {
  initializeMonitoring();
}

// Error boundary with Sentry integration
export const ErrorBoundary = Sentry.withErrorBoundary(
  ({ children }) => children,
  {
    fallback: ({ error, resetError }) => (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-400 mb-4">
            حدث خطأ غير متوقع / Something went wrong
          </h1>
          <p className="text-gray-400 mb-6">
            نعتذر عن هذا الخطأ. تم إرسال تقرير تلقائياً لفريق التطوير
            <br />
            We apologize for this error. An automatic report has been sent to our development team.
          </p>
          <button
            onClick={resetError}
            className="bg-gold-500 hover:bg-gold-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            إعادة المحاولة / Try Again
          </button>
        </div>
      </div>
    ),
    beforeCapture: (scope, error, hint) => {
      scope.setTag('errorBoundary', true);
      scope.setLevel('error');
    },
  }
);

// Custom hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const [monitor] = React.useState(() => new PerformanceMonitor());

  React.useEffect(() => {
    return () => {
      monitor.disconnect();
    };
  }, [monitor]);

  return {
    monitor,
    trackApiCall: monitor.trackApiCall.bind(monitor),
    trackUserInteraction: monitor.trackUserInteraction.bind(monitor),
    trackPageLoad: monitor.trackPageLoad.bind(monitor),
    getMetrics: monitor.getMetrics.bind(monitor),
  };
};

// Use the shared global instance from above
export { performanceMonitor as globalPerformanceMonitor };

// Export utilities
export {
  Sentry,
}; 
