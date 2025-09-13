/**
 * M36 — LCP Optimizer Component
 * Handles Largest Contentful Paint optimizations for React components
 */

import { useEffect, useState } from 'react';

const LCPOptimizer = ({ children, fallback = null }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [lcpElement, setLcpElement] = useState(null);

  useEffect(() => {
    // Mark as hydrated after first render
    setIsHydrated(true);

    // LCP observer to identify largest contentful paint elements
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            setLcpElement(entry.element);
            
            // Add optimization attributes to LCP element
            if (entry.element) {
              // Ensure LCP images have priority loading
              if (entry.element.tagName === 'IMG') {
                entry.element.setAttribute('loading', 'eager');
                entry.element.setAttribute('fetchpriority', 'high');
                
                // Add dimensions if missing to prevent CLS
                if (!entry.element.hasAttribute('width') || !entry.element.hasAttribute('height')) {
                  const rect = entry.element.getBoundingClientRect();
                  if (rect.width && rect.height) {
                    entry.element.setAttribute('width', Math.round(rect.width));
                    entry.element.setAttribute('height', Math.round(rect.height));
                  }
                }
              }
              
              // Add data attribute for debugging
              entry.element.setAttribute('data-lcp-element', 'true');
            }
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP observation failed:', error);
      }

      return () => observer.disconnect();
    }
  }, []);

  // Apply LCP-specific optimizations based on element type
  useEffect(() => {
    if (lcpElement) {
      console.log('LCP element detected:', lcpElement);
      
      // Apply element-specific optimizations
      if (lcpElement.tagName === 'IMG') {
        optimizeImageLCP(lcpElement);
      } else if (lcpElement.tagName === 'DIV' || lcpElement.tagName === 'SECTION') {
        optimizeContainerLCP(lcpElement);
      }
    }
  }, [lcpElement]);

  return (
    <>
      {/* Show fallback during initial load to prevent blank screen */}
      {!isHydrated && fallback && (
        <div className="app-loading" data-testid="lcp-fallback">
          {fallback}
        </div>
      )}
      {children}
    </>
  );
};

// Image-specific LCP optimizations
const optimizeImageLCP = (imgElement) => {
  // Ensure critical image properties
  if (!imgElement.hasAttribute('alt')) {
    imgElement.setAttribute('alt', '');
  }
  
  // Add responsive image loading if not present
  if (!imgElement.hasAttribute('sizes')) {
    imgElement.setAttribute('sizes', '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw');
  }
  
  // Preload if it's truly the LCP element
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = imgElement.src;
  link.setAttribute('fetchpriority', 'high');
  
  // Only add if not already preloaded
  const existing = document.querySelector(`link[rel="preload"][href="${imgElement.src}"]`);
  if (!existing) {
    document.head.appendChild(link);
  }
};

// Container-specific LCP optimizations
const optimizeContainerLCP = (containerElement) => {
  // Apply layout stability improvements
  if (!containerElement.style.minHeight) {
    const rect = containerElement.getBoundingClientRect();
    if (rect.height > 200) { // Only apply to significant height containers
      containerElement.style.minHeight = `${Math.round(rect.height)}px`;
    }
  }
  
  // Add will-change for smooth rendering
  containerElement.style.willChange = 'auto';
  
  // Remove will-change after a delay to prevent memory issues
  setTimeout(() => {
    containerElement.style.willChange = 'auto';
  }, 1000);
};

// Hook for manual LCP optimization triggers
export const useLCPOptimization = () => {
  const [lcpCandidate, setLcpCandidate] = useState(null);

  const markAsLCPCandidate = (element) => {
    if (element && element.nodeType === Node.ELEMENT_NODE) {
      setLcpCandidate(element);
      
      // Apply immediate optimizations
      element.setAttribute('data-lcp-candidate', 'true');
      
      if (element.tagName === 'IMG') {
        element.setAttribute('loading', 'eager');
        element.setAttribute('fetchpriority', 'high');
      }
    }
  };

  const preloadResource = (href, as = 'image', fetchpriority = 'high') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = as;
    link.href = href;
    link.setAttribute('fetchpriority', fetchpriority);
    
    const existing = document.querySelector(`link[rel="preload"][href="${href}"]`);
    if (!existing) {
      document.head.appendChild(link);
    }
  };

  return {
    lcpCandidate,
    markAsLCPCandidate,
    preloadResource
  };
};

// Higher-order component for LCP optimization
export const withLCPOptimization = (WrappedComponent) => {
  return function LCPOptimizedComponent(props) {
    return (
      <LCPOptimizer fallback={<div>Loading...</div>}>
        <WrappedComponent {...props} />
      </LCPOptimizer>
    );
  };
};

export default LCPOptimizer;