/**
 * M36 — INP (Interaction to Next Paint) Optimizer
 * Reduces main-thread blocking work and optimizes user interactions
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';

// Scheduler for breaking up main-thread work
class MainThreadScheduler {
  constructor() {
    this.taskQueue = [];
    this.isRunning = false;
    this.frameDeadline = 0;
  }

  schedule(task, priority = 'normal') {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task,
        priority,
        resolve,
        reject,
        timestamp: performance.now()
      });

      if (!this.isRunning) {
        this.flush();
      }
    });
  }

  flush() {
    if (this.isRunning) return;
    this.isRunning = true;

    const runTasks = (deadline) => {
      this.frameDeadline = deadline.timeRemaining();

      // Sort tasks by priority
      this.taskQueue.sort((a, b) => {
        const priorities = { high: 3, normal: 2, low: 1 };
        return priorities[b.priority] - priorities[a.priority];
      });

      while (this.taskQueue.length > 0 && this.frameDeadline > 0) {
        const { task, resolve, reject } = this.taskQueue.shift();
        const startTime = performance.now();

        try {
          const result = task();
          resolve(result);
        } catch (error) {
          reject(error);
        }

        this.frameDeadline -= (performance.now() - startTime);
      }

      if (this.taskQueue.length > 0) {
        requestIdleCallback(runTasks);
      } else {
        this.isRunning = false;
      }
    };

    requestIdleCallback(runTasks);
  }
}

// Global scheduler instance
const scheduler = new MainThreadScheduler();

// Hook for optimizing heavy computations
export const useINPOptimization = () => {
  const scheduleWork = useCallback((task, priority = 'normal') => {
    return scheduler.schedule(task, priority);
  }, []);

  const deferWork = useCallback((task, delay = 0) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        scheduleWork(task).then(resolve);
      }, delay);
    });
  }, [scheduleWork]);

  // Break up large arrays into chunks
  const processArrayInChunks = useCallback(async (array, processor, chunkSize = 100) => {
    const results = [];
    
    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      const chunkResults = await scheduleWork(() => chunk.map(processor));
      results.push(...chunkResults);
    }
    
    return results;
  }, [scheduleWork]);

  return {
    scheduleWork,
    deferWork,
    processArrayInChunks
  };
};

// Component for optimizing event handlers
const INPOptimizer = ({ children }) => {
  const interactionTimeoutRef = useRef(null);
  const lastInteractionRef = useRef(0);

  useEffect(() => {
    // Debounced interaction handler
    const optimizeInteractionHandlers = () => {
      // Optimize click handlers
      const clickableElements = document.querySelectorAll(
        'button, [role="button"], a, input[type="button"], input[type="submit"]'
      );

      clickableElements.forEach(element => {
        if (element._inpOptimized) return;

        const originalHandler = element.onclick;
        if (originalHandler) {
          element.onclick = (e) => {
            const now = performance.now();
            
            // Prevent rapid-fire clicks
            if (now - lastInteractionRef.current < 100) {
              e.preventDefault();
              return;
            }
            
            lastInteractionRef.current = now;
            
            // Schedule the handler to run when the main thread is available
            scheduler.schedule(() => originalHandler.call(element, e), 'high');
          };
        }

        element._inpOptimized = true;
      });

      // Optimize form inputs
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        if (input._inpOptimized) return;

        const originalOnInput = input.oninput;
        if (originalOnInput) {
          input.oninput = (e) => {
            clearTimeout(interactionTimeoutRef.current);
            interactionTimeoutRef.current = setTimeout(() => {
              scheduler.schedule(() => originalOnInput.call(input, e), 'normal');
            }, 150); // Debounce input events
          };
        }

        input._inpOptimized = true;
      });

      // Optimize scroll handlers
      const scrollableElements = document.querySelectorAll('[data-scroll-optimized]');
      scrollableElements.forEach(element => {
        if (element._scrollOptimized) return;

        let scrollTimeout;
        element.addEventListener('scroll', (e) => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            scheduler.schedule(() => {
              // Custom scroll logic here
              element.dispatchEvent(new CustomEvent('optimizedScroll', { detail: e }));
            }, 'low');
          }, 16); // ~60fps
        }, { passive: true });

        element._scrollOptimized = true;
      });
    };

    // Initial optimization
    optimizeInteractionHandlers();

    // Re-optimize after DOM changes
    const observer = new MutationObserver(() => {
      scheduler.schedule(optimizeInteractionHandlers, 'low');
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      clearTimeout(interactionTimeoutRef.current);
    };
  }, []);

  // Optimize React event handlers
  useEffect(() => {
    const optimizeReactEvents = () => {
      // Find React root
      const reactRoot = document.getElementById('root');
      if (!reactRoot) return;

      // Add passive listeners for scroll events
      const scrollElements = reactRoot.querySelectorAll('*');
      scrollElements.forEach(element => {
        const style = window.getComputedStyle(element);
        if (style.overflowY === 'scroll' || style.overflowY === 'auto') {
          element.style.willChange = 'scroll-position';
        }
      });
    };

    optimizeReactEvents();

    // Re-run on route changes
    const handleRouteChange = () => {
      setTimeout(optimizeReactEvents, 100);
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return children;
};

// HOC for heavy components
export const withINPOptimization = (WrappedComponent) => {
  return React.forwardRef((props, ref) => {
    const { scheduleWork } = useINPOptimization();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
      // Defer component mounting for non-critical components
      scheduleWork(() => {
        setIsReady(true);
      }, 'normal');
    }, [scheduleWork]);

    if (!isReady) {
      return (
        <div className="animate-pulse bg-gray-700 rounded-lg h-32 w-full">
          {/* Skeleton placeholder */}
        </div>
      );
    }

    return <WrappedComponent {...props} ref={ref} />;
  });
};

// Utility for breaking up heavy work
export const breakUpWork = async (work, chunkSize = 50) => {
  if (Array.isArray(work)) {
    const results = [];
    for (let i = 0; i < work.length; i += chunkSize) {
      const chunk = work.slice(i, i + chunkSize);
      await new Promise(resolve => {
        scheduler.schedule(() => {
          results.push(...chunk);
          resolve();
        });
      });
    }
    return results;
  } else {
    return scheduler.schedule(work, 'normal');
  }
};

// React hook for deferring non-critical work
export const useDeferredWork = (work, dependencies = []) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    
    // Use requestIdleCallback to defer work until the main thread is free
    const idleCallback = requestIdleCallback(() => {
      scheduler.schedule(async () => {
        try {
          const workResult = typeof work === 'function' ? await work() : work;
          setResult(workResult);
        } catch (error) {
          console.error('Deferred work failed:', error);
        } finally {
          setLoading(false);
        }
      }, 'low');
    });

    return () => {
      cancelIdleCallback(idleCallback);
    };
  }, dependencies);

  return { result, loading };
};

// Performance observer for INP monitoring
export const useINPMonitoring = () => {
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === 'event') {
          const inp = entry.processingStart ? entry.processingStart - entry.startTime : 0;
          
          if (inp > 200) {
            console.warn(`[M36 INP] Slow interaction detected: ${inp.toFixed(2)}ms`, {
              type: entry.name,
              target: entry.target?.tagName || 'unknown',
              inp: inp
            });
          }
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['event'] });
    } catch (error) {
      console.warn('INP monitoring setup failed:', error);
    }

    return () => observer.disconnect();
  }, []);
};

export default INPOptimizer;