/**
 * M36 — Performance Provider
 * Comprehensive Core Web Vitals optimization provider
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Performance context
const PerformanceContext = createContext({
  metrics: {},
  optimizations: {
    enableLCPOptimization: true,
    enableCLSPrevention: true,
    enableINPOptimization: true,
    enableFCPOptimization: true
  },
  actions: {
    reportMetric: () => {},
    optimizeLCP: () => {},
    preventCLS: () => {},
    optimizeINP: () => {}
  }
});

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

const PerformanceProvider = ({ children }) => {
  const [metrics, setMetrics] = useState({});
  const [optimizations] = useState({
    enableLCPOptimization: true,
    enableCLSPrevention: true,
    enableINPOptimization: true,
    enableFCPOptimization: true
  });

  // Core Web Vitals reporting function
  const reportMetric = useCallback((metric) => {
    setMetrics(prev => ({
      ...prev,
      [metric.name]: {
        value: metric.value,
        delta: metric.delta,
        id: metric.id,
        rating: metric.rating
      }
    }));

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[M36 Performance] ${metric.name}:`, {
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta
      });
    }

    // Send to analytics endpoint (if available)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta
      });
    }
  }, []);

  // Initialize Web Vitals monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Measure Core Web Vitals
    getCLS(reportMetric);
    getFID(reportMetric); // Legacy - will be replaced by INP
    getFCP(reportMetric);
    getLCP(reportMetric);
    getTTFB(reportMetric);

    // Measure INP (Interaction to Next Paint) - new Core Web Vital
    if ('PerformanceObserver' in window) {
      try {
        // Create INP observer manually since web-vitals might not have latest version
        const inpObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.processingStart && entry.startTime) {
              const inp = entry.processingStart - entry.startTime;
              reportMetric({
                name: 'INP',
                value: inp,
                delta: inp,
                id: `inp-${Date.now()}`,
                rating: inp <= 200 ? 'good' : inp <= 500 ? 'needs-improvement' : 'poor'
              });
            }
          }
        });

        inpObserver.observe({ entryTypes: ['event'] });
        
        return () => inpObserver.disconnect();
      } catch (error) {
        console.warn('INP monitoring setup failed:', error);
      }
    }
  }, [reportMetric]);

  // LCP Optimization
  const optimizeLCP = useCallback((element) => {
    if (!element || !optimizations.enableLCPOptimization) return;

    // Image optimizations
    if (element.tagName === 'IMG') {
      element.setAttribute('loading', 'eager');
      element.setAttribute('fetchpriority', 'high');
      element.setAttribute('decoding', 'sync');
      
      // Preload critical images
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'image';
      preloadLink.href = element.src;
      preloadLink.setAttribute('fetchpriority', 'high');
      
      if (!document.querySelector(`link[rel="preload"][href="${element.src}"]`)) {
        document.head.appendChild(preloadLink);
      }
    }

    // Text/container optimizations
    if (['DIV', 'SECTION', 'MAIN', 'ARTICLE'].includes(element.tagName)) {
      // Reduce font loading impact
      element.style.fontDisplay = 'swap';
      
      // Optimize background images
      const computedStyle = window.getComputedStyle(element);
      const backgroundImage = computedStyle.backgroundImage;
      
      if (backgroundImage && backgroundImage !== 'none') {
        const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          const imageUrl = urlMatch[1];
          const preloadLink = document.createElement('link');
          preloadLink.rel = 'preload';
          preloadLink.as = 'image';
          preloadLink.href = imageUrl;
          preloadLink.setAttribute('fetchpriority', 'high');
          
          if (!document.querySelector(`link[rel="preload"][href="${imageUrl}"]`)) {
            document.head.appendChild(preloadLink);
          }
        }
      }
    }
  }, [optimizations.enableLCPOptimization]);

  // CLS Prevention
  const preventCLS = useCallback((element, dimensions = null) => {
    if (!element || !optimizations.enableCLSPrevention) return;

    // Set explicit dimensions to prevent layout shift
    if (dimensions) {
      element.style.width = `${dimensions.width}px`;
      element.style.height = `${dimensions.height}px`;
    } else {
      // Auto-detect dimensions
      const rect = element.getBoundingClientRect();
      if (rect.width && rect.height) {
        element.style.minWidth = `${rect.width}px`;
        element.style.minHeight = `${rect.height}px`;
      }
    }

    // Apply aspect ratio for images
    if (element.tagName === 'IMG') {
      const width = element.naturalWidth || element.width;
      const height = element.naturalHeight || element.height;
      
      if (width && height) {
        element.style.aspectRatio = `${width} / ${height}`;
      }
    }

    // Add CSS containment for layout stability
    element.style.contain = 'layout style';
  }, [optimizations.enableCLSPrevention]);

  // INP Optimization
  const optimizeINP = useCallback(() => {
    if (!optimizations.enableINPOptimization) return;

    // Debounce rapid interactions
    let interactionTimeout;
    const debouncedHandler = (callback, delay = 16) => {
      return (...args) => {
        clearTimeout(interactionTimeout);
        interactionTimeout = setTimeout(() => callback(...args), delay);
      };
    };

    // Optimize scroll listeners
    const optimizeScrollListeners = () => {
      const scrollElements = document.querySelectorAll('[data-scroll-listener]');
      scrollElements.forEach(element => {
        if (element._optimizedScroll) return;
        
        const handler = element.getAttribute('data-scroll-handler');
        if (handler && window[handler]) {
          const optimizedHandler = debouncedHandler(window[handler], 16);
          element.addEventListener('scroll', optimizedHandler, { passive: true });
          element._optimizedScroll = true;
        }
      });
    };

    // Optimize click handlers
    const optimizeClickHandlers = () => {
      const clickElements = document.querySelectorAll('button, [role="button"], a');
      clickElements.forEach(element => {
        if (element._optimizedClick) return;
        
        const originalHandler = element.onclick;
        if (originalHandler) {
          element.onclick = debouncedHandler(originalHandler, 0);
          element._optimizedClick = true;
        }
      });
    };

    optimizeScrollListeners();
    optimizeClickHandlers();

    // Use requestIdleCallback for non-critical work
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        // Perform non-critical optimizations
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
          if (!img.complete) {
            img.addEventListener('load', () => {
              img.style.transition = 'opacity 0.3s ease-in-out';
            });
          }
        });
      });
    }
  }, [optimizations.enableINPOptimization]);

  // Run INP optimizations on mount and route changes
  useEffect(() => {
    optimizeINP();
    
    // Re-run on route changes
    const handleRouteChange = () => {
      setTimeout(optimizeINP, 100);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [optimizeINP]);

  const contextValue = {
    metrics,
    optimizations,
    actions: {
      reportMetric,
      optimizeLCP,
      preventCLS,
      optimizeINP
    }
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
};

// HOC for performance monitoring
export const withPerformanceMonitoring = (Component) => {
  return React.forwardRef((props, ref) => {
    const { actions } = usePerformance();

    useEffect(() => {
      // Monitor component mount performance
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const mountTime = endTime - startTime;
        
        if (mountTime > 50) { // Log slow components
          console.warn(`[M36 Performance] Slow component mount: ${Component.displayName || Component.name}`, {
            mountTime: `${mountTime.toFixed(2)}ms`
          });
        }
      };
    }, [actions]);

    return <Component {...props} ref={ref} />;
  });
};

export default PerformanceProvider;