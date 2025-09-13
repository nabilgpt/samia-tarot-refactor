/**
 * M36 — CLS (Cumulative Layout Shift) Optimizer
 * Prevents layout shifts with proper space reservation and font fallbacks
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Hook for preventing CLS in images
export const useImageCLSPrevention = () => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const setImageDimensions = useCallback((width, height) => {
    setDimensions({ width, height });
  }, []);

  const imageProps = {
    style: {
      aspectRatio: dimensions.width && dimensions.height 
        ? `${dimensions.width} / ${dimensions.height}` 
        : undefined,
      width: '100%',
      height: 'auto'
    },
    onLoad: (e) => {
      if (!dimensions.width || !dimensions.height) {
        setImageDimensions(e.target.naturalWidth, e.target.naturalHeight);
      }
    }
  };

  return { imageProps, setImageDimensions };
};

// Component for preventing layout shifts
const CLSOptimizer = ({ children }) => {
  const observerRef = useRef(null);

  useEffect(() => {
    // Add dimension constraints to prevent CLS
    const preventImageCLS = () => {
      const images = document.querySelectorAll('img:not([data-cls-optimized])');
      
      images.forEach(img => {
        // Set loading attribute if not present
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }

        // Add explicit dimensions if available
        if (img.naturalWidth && img.naturalHeight) {
          img.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
        } else {
          // Listen for load event to set aspect ratio
          img.addEventListener('load', function setAspectRatio() {
            if (this.naturalWidth && this.naturalHeight) {
              this.style.aspectRatio = `${this.naturalWidth} / ${this.naturalHeight}`;
            }
            this.removeEventListener('load', setAspectRatio);
          });
        }

        // Prevent decoding attribute issues
        if (!img.hasAttribute('decoding')) {
          img.setAttribute('decoding', 'async');
        }

        img.setAttribute('data-cls-optimized', 'true');
      });
    };

    // Prevent font loading CLS
    const preventFontCLS = () => {
      // Add font-display: swap if not already set
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-display: swap;
        }
        
        /* M36 CLS Prevention - Stable font metrics */
        body, html {
          font-family: var(--font-arabic, 'Noto Sans Arabic', 'Segoe UI Arabic', 'Tahoma', sans-serif);
        }
        
        /* Prevent font size changes during loading */
        .font-loading {
          visibility: hidden;
        }
        
        .font-loaded {
          visibility: visible;
        }
      `;
      
      if (!document.querySelector('[data-cls-font-styles]')) {
        style.setAttribute('data-cls-font-styles', 'true');
        document.head.appendChild(style);
      }
    };

    // Prevent dynamic content CLS
    const preventDynamicContentCLS = () => {
      // Add min-height to elements that might expand
      const dynamicElements = document.querySelectorAll(
        '[data-dynamic], .loading, .skeleton, [data-testid*="loading"]'
      );

      dynamicElements.forEach(element => {
        if (!element.style.minHeight) {
          const rect = element.getBoundingClientRect();
          if (rect.height > 0) {
            element.style.minHeight = `${rect.height}px`;
          }
        }
      });

      // Stabilize form elements
      const formElements = document.querySelectorAll('input, textarea, select');
      formElements.forEach(element => {
        if (!element.style.height && element.offsetHeight > 0) {
          element.style.height = `${element.offsetHeight}px`;
        }
      });
    };

    // Initial CLS prevention
    preventImageCLS();
    preventFontCLS();
    preventDynamicContentCLS();

    // Set up ResizeObserver to detect layout shifts
    if ('ResizeObserver' in window) {
      observerRef.current = new ResizeObserver((entries) => {
        entries.forEach(entry => {
          const element = entry.target;
          
          // If element is expanding significantly, apply stabilization
          if (entry.contentRect.height > element._lastHeight * 1.2) {
            element.style.transition = 'height 0.2s ease-out';
          }
          
          element._lastHeight = entry.contentRect.height;
        });
      });

      // Observe elements that commonly cause CLS
      const clsPrones = document.querySelectorAll(
        'img, iframe, .card, .modal, .dropdown, [data-dynamic]'
      );
      
      clsPrones.forEach(element => {
        observerRef.current.observe(element);
        element._lastHeight = element.offsetHeight;
      });
    }

    // Re-run optimizations on DOM changes
    const mutationObserver = new MutationObserver(() => {
      // Debounce to avoid excessive calls
      setTimeout(() => {
        preventImageCLS();
        preventDynamicContentCLS();
      }, 100);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      mutationObserver.disconnect();
    };
  }, []);

  return children;
};

// Higher-order component for CLS prevention
export const withCLSPrevention = (WrappedComponent) => {
  return React.forwardRef((props, ref) => {
    const containerRef = useRef(null);

    useEffect(() => {
      if (containerRef.current) {
        // Apply layout stabilization
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        
        if (rect.height > 0) {
          container.style.minHeight = `${rect.height}px`;
        }

        // Apply contain property for layout isolation
        container.style.contain = 'layout style';
      }
    }, []);

    return (
      <div ref={containerRef} data-cls-optimized="true">
        <WrappedComponent {...props} ref={ref} />
      </div>
    );
  });
};

// Component for stable image loading
export const StableImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  onLoad, 
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleError = () => {
    setHasError(true);
  };

  const aspectRatio = width && height ? `${width} / ${height}` : '16 / 9';

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ 
        aspectRatio,
        backgroundColor: '#1a1a2e' // Fallback background
      }}
    >
      {!hasError && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
      
      {/* Loading skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-pulse" />
      )}
      
      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-400">
          <div className="text-center">
            <div className="text-2xl mb-2">🖼️</div>
            <div className="text-sm">Image not available</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Hook for stable content loading
export const useStableContent = (isLoading, minHeight = 200) => {
  const containerRef = useRef(null);
  const [stabilizedHeight, setStabilizedHeight] = useState(minHeight);

  useEffect(() => {
    if (containerRef.current && !isLoading) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.height > stabilizedHeight) {
        setStabilizedHeight(rect.height);
      }
    }
  }, [isLoading, stabilizedHeight]);

  const containerProps = {
    ref: containerRef,
    style: {
      minHeight: `${stabilizedHeight}px`,
      transition: 'min-height 0.3s ease-out'
    }
  };

  return { containerProps, stabilizedHeight };
};

// Component for preventing CLS in dynamic lists
export const StableList = ({ items, renderItem, itemHeight = 60, className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading completion
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [items]);

  const containerHeight = items.length * itemHeight;

  return (
    <div 
      className={`transition-all duration-300 ${className}`}
      style={{ minHeight: `${containerHeight}px` }}
    >
      {isLoading ? (
        // Skeleton items
        Array.from({ length: Math.max(3, items.length) }).map((_, index) => (
          <div 
            key={`skeleton-${index}`}
            className="animate-pulse bg-gray-700 rounded-lg mb-2"
            style={{ height: `${itemHeight}px` }}
          />
        ))
      ) : (
        items.map((item, index) => (
          <div key={item.id || index} style={{ minHeight: `${itemHeight}px` }}>
            {renderItem(item, index)}
          </div>
        ))
      )}
    </div>
  );
};

// Web font loading optimization
export const FontLoadingOptimizer = () => {
  useEffect(() => {
    if ('fonts' in document) {
      // Preload critical fonts
      const criticalFonts = [
        'Noto Sans Arabic',
        'Inter'
      ];

      criticalFonts.forEach(fontFamily => {
        document.fonts.load(`1rem ${fontFamily}`).catch(() => {
          // Font loading failed, fallback will be used
        });
      });

      // Set font-loaded class when fonts are ready
      document.fonts.ready.then(() => {
        document.body.classList.add('font-loaded');
        document.body.classList.remove('font-loading');
      });
    }
  }, []);

  return null;
};

export default CLSOptimizer;