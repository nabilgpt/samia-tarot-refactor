/**
 * M37 — Accessibility Provider
 * WCAG 2.2 AA compliance provider with keyboard navigation and screen reader support
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const AccessibilityContext = createContext({
  announceToScreenReader: () => {},
  focusElement: () => {},
  trapFocus: () => {},
  releaseFocusTrap: () => {},
  isReducedMotion: false,
  isHighContrast: false,
  currentFocusId: null
});

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

const AccessibilityProvider = ({ children }) => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [currentFocusId, setCurrentFocusId] = useState(null);
  const liveRegionRef = useRef(null);
  const focusTrapRef = useRef(null);
  const lastFocusedElement = useRef(null);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    
    const handleMotionChange = (e) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleMotionChange);

    // Check for high contrast preference
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(contrastQuery.matches);
    
    const handleContrastChange = (e) => setIsHighContrast(e.matches);
    contrastQuery.addEventListener('change', handleContrastChange);

    // Create live region for screen reader announcements
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.id = 'accessibility-live-region';
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    // Global keyboard event handlers
    const handleKeyDown = (e) => {
      // ESC key handling for modals/dialogs
      if (e.key === 'Escape' && focusTrapRef.current) {
        releaseFocusTrap();
      }
      
      // Track focus for debugging
      if (e.target && e.target.id) {
        setCurrentFocusId(e.target.id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
      document.removeEventListener('keydown', handleKeyDown);
      
      if (liveRegionRef.current) {
        document.body.removeChild(liveRegionRef.current);
      }
    };
  }, []);

  const announceToScreenReader = (message, priority = 'polite') => {
    if (liveRegionRef.current) {
      // Clear previous message
      liveRegionRef.current.textContent = '';
      
      // Update aria-live attribute based on priority
      liveRegionRef.current.setAttribute('aria-live', priority);
      
      // Set new message with slight delay to ensure it's announced
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = message;
        }
      }, 100);
    }
  };

  const focusElement = (elementId, options = {}) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus(options);
      setCurrentFocusId(elementId);
      
      // Announce focus change to screen readers if requested
      if (options.announce) {
        const label = element.getAttribute('aria-label') || 
                     element.getAttribute('title') || 
                     element.textContent?.trim() || 
                     'Element';
        announceToScreenReader(`Focused on ${label}`);
      }
    }
  };

  const trapFocus = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Store the last focused element
    lastFocusedElement.current = document.activeElement;
    
    // Get all focusable elements within the container
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTrapKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTrapKeyDown);
    focusTrapRef.current = {
      container,
      handleTrapKeyDown,
      firstElement,
      lastElement
    };

    // Focus the first element
    firstElement.focus();
  };

  const releaseFocusTrap = () => {
    if (focusTrapRef.current) {
      const { container, handleTrapKeyDown } = focusTrapRef.current;
      container.removeEventListener('keydown', handleTrapKeyDown);
      focusTrapRef.current = null;

      // Return focus to the last focused element
      if (lastFocusedElement.current) {
        lastFocusedElement.current.focus();
        lastFocusedElement.current = null;
      }
    }
  };

  const contextValue = {
    announceToScreenReader,
    focusElement,
    trapFocus,
    releaseFocusTrap,
    isReducedMotion,
    isHighContrast,
    currentFocusId
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityProvider;