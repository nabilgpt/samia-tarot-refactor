/**
 * M37 — Accessible Components
 * WAI-ARIA APG compliant components with WCAG 2.2 AA support
 */

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { useAccessibility } from './AccessibilityProvider';

// Skip to main content link
export const SkipLink = ({ href = "#main-content", children = "Skip to main content" }) => {
  return (
    <a 
      href={href}
      className="skip-link"
      onFocus={(e) => {
        // Ensure the link is visible when focused
        e.target.style.top = '6px';
      }}
      onBlur={(e) => {
        e.target.style.top = '-40px';
      }}
    >
      {children}
    </a>
  );
};

// Accessible button with proper ARIA states
export const AccessibleButton = forwardRef(({ 
  children, 
  onClick, 
  disabled = false,
  pressed = null, // For toggle buttons
  expanded = null, // For collapsible content
  ariaLabel,
  ariaDescribedBy,
  className = "",
  loading = false,
  ...props 
}, ref) => {
  const { announceToScreenReader } = useAccessibility();

  const handleClick = (e) => {
    if (disabled || loading) return;
    
    if (onClick) {
      onClick(e);
    }
    
    // Announce state changes to screen readers
    if (pressed !== null) {
      announceToScreenReader(`Button ${pressed ? 'pressed' : 'not pressed'}`);
    }
    if (expanded !== null) {
      announceToScreenReader(`${expanded ? 'Expanded' : 'Collapsed'}`);
    }
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-pressed={pressed}
      aria-expanded={expanded}
      className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {loading && (
        <span className="loading-spinner mr-2" aria-hidden="true"></span>
      )}
      {loading && <span className="sr-only">Loading...</span>}
      {children}
    </button>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

// Accessible form input with proper labeling
export const AccessibleInput = forwardRef(({ 
  label,
  error,
  hint,
  required = false,
  type = "text",
  className = "",
  id,
  ...props 
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      <label 
        htmlFor={inputId}
        className="block text-sm font-medium text-high-contrast"
      >
        {label}
        {required && (
          <span className="text-red-400 ml-1" aria-label="required">*</span>
        )}
      </label>
      
      {hint && (
        <div id={hintId} className="text-sm text-muted">
          {hint}
        </div>
      )}
      
      <input
        ref={ref}
        id={inputId}
        type={type}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
        className={`
          ${className}
          ${error ? 'field-error' : ''}
          w-full px-3 py-2 bg-input border border-cosmic-border rounded-lg
          text-text-primary placeholder-text-muted
          focus:ring-2 focus:ring-cosmic-primary focus:border-cosmic-primary
          transition-colors duration-200
        `}
        {...props}
      />
      
      {error && (
        <div 
          id={errorId} 
          className="error-message"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  );
});

AccessibleInput.displayName = 'AccessibleInput';

// Accessible modal/dialog
export const AccessibleModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = "",
  closeOnEscape = true,
  closeOnOverlayClick = true 
}) => {
  const { trapFocus, releaseFocusTrap, announceToScreenReader } = useAccessibility();
  const modalRef = useRef(null);
  const modalId = `modal-${Math.random().toString(36).substr(2, 9)}`;
  const titleId = `${modalId}-title`;

  useEffect(() => {
    if (isOpen) {
      // Trap focus within modal
      trapFocus(modalId);
      
      // Announce modal opening
      announceToScreenReader(`Dialog opened: ${title}`, 'assertive');
      
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
    } else {
      // Release focus trap
      releaseFocusTrap();
      
      // Restore body scrolling
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, title, trapFocus, releaseFocusTrap, announceToScreenReader, modalId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && closeOnEscape && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby={titleId}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div 
        className="modal-backdrop fixed inset-0"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          id={modalId}
          className={`
            relative bg-card border border-cosmic-border rounded-lg
            shadow-xl max-w-lg w-full p-6 ${className}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 
              id={titleId}
              className="text-lg font-semibold text-high-contrast"
            >
              {title}
            </h2>
            
            <AccessibleButton
              onClick={onClose}
              ariaLabel="Close dialog"
              className="p-2 rounded-lg hover:bg-cosmic-border text-text-muted hover:text-text-primary"
            >
              <span aria-hidden="true">✕</span>
            </AccessibleButton>
          </div>
          
          {/* Content */}
          <div className="modal-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Accessible dropdown menu
export const AccessibleDropdown = ({ 
  trigger, 
  children, 
  align = "left",
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { announceToScreenReader } = useAccessibility();
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = `dropdown-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    announceToScreenReader(`Menu ${newState ? 'opened' : 'closed'}`);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={menuId}
      >
        {trigger}
      </div>

      {/* Menu */}
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          className={`
            absolute z-50 mt-2 bg-card border border-cosmic-border rounded-lg
            shadow-lg min-w-[200px] dropdown-menu ${className}
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// Accessible dropdown menu item
export const AccessibleDropdownItem = ({ 
  children, 
  onClick, 
  disabled = false,
  className = "" 
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        px-4 py-2 cursor-pointer dropdown-item
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cosmic-border'}
        ${className}
      `}
      aria-disabled={disabled}
    >
      {children}
    </div>
  );
};

// Accessible loading spinner
export const AccessibleSpinner = ({ 
  size = "md", 
  label = "Loading...",
  className = "" 
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div 
        className={`loading-spinner ${sizeClasses[size]}`}
        role="status"
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
};

// Accessible progress indicator
export const AccessibleProgress = ({ 
  value, 
  max = 100, 
  label,
  className = "" 
}) => {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex justify-between text-sm text-high-contrast">
          <span>{label}</span>
          <span>{percentage}%</span>
        </div>
      )}
      
      <div 
        className="progress-bar"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `Progress: ${percentage}%`}
      >
        <div 
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};