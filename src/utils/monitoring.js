import React from 'react';
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Initialize Sentry error monitoring
export const initializeMonitoring = () => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new BrowserTracing({
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
    Sentry.setTag('language', localStorage.getItem('samia_language') || 'ar');

    return { setUserContext };
  }

  // Return mock functions for development
  return {
    setUserContext: () => {},
  };
};

// Performance monitoring utilities
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.init();
  }

  init() {
    // Core Web Vitals monitoring
    if (typeof window !== 'undefined') {
      this.observeLCP();
      this.observeFID();
      this.observeCLS();
      this.observeFCP();
      this.observeTTFB();
    }
  }

  // Largest Contentful Paint
  observeLCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.metrics.set('lcp', lastEntry.startTime);
        
        // Send to analytics
        this.sendMetric('lcp', lastEntry.startTime);
        
        // Sentry performance
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `LCP: ${lastEntry.startTime}ms`,
          level: 'info',
        });
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', observer);
    }
  }

  // First Input Delay
  observeFID() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fid = entry.processingStart - entry.startTime;
          this.metrics.set('fid', fid);
          this.sendMetric('fid', fid);
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', observer);
    }
  }

  // Cumulative Layout Shift
  observeCLS() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        this.metrics.set('cls', clsValue);
        this.sendMetric('cls', clsValue);
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', observer);
    }
  }

  // First Contentful Paint
  observeFCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.set('fcp', entry.startTime);
            this.sendMetric('fcp', entry.startTime);
          }
        });
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.set('fcp', observer);
    }
  }

  // Time to First Byte
  observeTTFB() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const ttfb = entry.responseStart - entry.requestStart;
            this.metrics.set('ttfb', ttfb);
            this.sendMetric('ttfb', ttfb);
          }
        });
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.set('ttfb', observer);
    }
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
    trackApiCall: monitor.trackApiCall.bind(monitor),
    trackUserInteraction: monitor.trackUserInteraction.bind(monitor),
    trackPageLoad: monitor.trackPageLoad.bind(monitor),
    startTransaction: monitor.startTransaction.bind(monitor),
    getMetrics: monitor.getMetrics.bind(monitor),
  };
};

// Initialize global performance monitor
export const globalPerformanceMonitor = new PerformanceMonitor();

// Export utilities
export {
  Sentry,
}; 