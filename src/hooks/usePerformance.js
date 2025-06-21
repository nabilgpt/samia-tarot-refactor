import { useEffect, useCallback, useRef } from 'react';

/**
 * Performance monitoring hook
 * Tracks component render times and provides optimization insights
 */
export const usePerformance = (componentName) => {
  const renderStartTime = useRef();
  const renderCount = useRef(0);

  const startTiming = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endTiming = useCallback(() => {
    if (renderStartTime.current) {
      const duration = performance.now() - renderStartTime.current;
      renderCount.current++;
      
      // Log slow renders (>16ms for 60fps)
      if (duration > 16) {
        console.warn(`Slow render detected in ${componentName}: ${duration.toFixed(2)}ms`);
      }

      // Log performance data for analysis
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render #${renderCount.current}: ${duration.toFixed(2)}ms`);
      }
    }
  }, [componentName]);

  const measureRender = useCallback((renderFunction) => {
    startTiming();
    const result = renderFunction();
    endTiming();
    return result;
  }, [startTiming, endTiming]);

  return {
    startTiming,
    endTiming,
    measureRender,
    renderCount: renderCount.current
  };
};

/**
 * Web Vitals monitoring hook
 */
export const useWebVitals = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);
      });
    }
  }, []);
};

export default usePerformance;
