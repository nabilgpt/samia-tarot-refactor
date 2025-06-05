import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const UIContext = createContext();

const initialState = {
  theme: 'dark', // Always default to dark
  language: 'ar',
  direction: 'rtl',
  sidebarOpen: false,
  loading: false,
  notifications: [],
  modal: {
    isOpen: false,
    type: null,
    data: null
  }
};

const uiReducer = (state, action) => {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload
      };
    case 'TOGGLE_THEME':
      return {
        ...state,
        theme: state.theme === 'dark' ? 'light' : 'dark'
      };
    case 'SET_LANGUAGE':
      return {
        ...state,
        language: action.payload,
        direction: action.payload === 'ar' ? 'rtl' : 'ltr'
      };
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen
      };
    case 'SET_SIDEBAR':
      return {
        ...state,
        sidebarOpen: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: []
      };
    case 'OPEN_MODAL':
      return {
        ...state,
        modal: {
          isOpen: true,
          type: action.payload.type,
          data: action.payload.data
        }
      };
    case 'CLOSE_MODAL':
      return {
        ...state,
        modal: {
          isOpen: false,
          type: null,
          data: null
        }
      };
    default:
      return state;
  }
};

export const UIProvider = ({ children }) => {
  const [state, dispatch] = useReducer(uiReducer, initialState);
  const { i18n } = useTranslation();

  // Apply theme to document with enhanced cosmic effects
  const applyTheme = (theme) => {
    const html = document.documentElement;
    const body = document.body;
    
    // Remove any existing theme classes from both html and body
    html.classList.remove('dark', 'light');
    body.classList.remove('dark', 'light');
    
    // Add the new theme class to both html and body for maximum compatibility
    html.classList.add(theme);
    body.classList.add(theme);
    
    // Set data attribute for CSS variables
    html.setAttribute('data-theme', theme);
    body.setAttribute('data-theme', theme);
    
    // Update CSS variables for cosmic theme with enhanced day/night palettes
    const root = document.documentElement;
    if (theme === 'dark') {
      // Dark cosmic theme variables (Night Mode)
      root.style.setProperty('--bg-primary', '#0f172a');
      root.style.setProperty('--bg-secondary', '#1e293b');
      root.style.setProperty('--bg-tertiary', '#334155');
      root.style.setProperty('--bg-card', 'rgba(30, 41, 59, 0.8)');
      root.style.setProperty('--bg-glass', 'rgba(51, 65, 85, 0.1)');
      root.style.setProperty('--bg-input', 'rgba(51, 65, 85, 0.5)');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#e2e8f0');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--text-inverse', '#1e293b');
      root.style.setProperty('--cosmic-glow', 'rgba(217, 70, 239, 0.4)');
      root.style.setProperty('--gold-glow', 'rgba(251, 191, 36, 0.4)');
      root.style.setProperty('--cosmic-primary', '#d946ef');
      root.style.setProperty('--cosmic-secondary', '#8b5cf6');
      root.style.setProperty('--gold-primary', '#fbbf24');
      root.style.setProperty('--gold-secondary', '#f59e0b');
      
      // Night mode particle and animation variables
      root.style.setProperty('--particle-opacity', '0.8');
      root.style.setProperty('--particle-size', '2px');
      root.style.setProperty('--particle-glow', 'rgba(217, 70, 239, 0.6)');
      root.style.setProperty('--orb-opacity-primary', '0.3');
      root.style.setProperty('--orb-opacity-secondary', '0.25');
      root.style.setProperty('--orb-opacity-tertiary', '0.2');
      
      root.style.setProperty('--border-color', 'rgba(251, 191, 36, 0.2)');
      root.style.setProperty('--border-cosmic', 'rgba(217, 70, 239, 0.3)');
      root.style.setProperty('--shadow-cosmic', '0 0 50px rgba(217, 70, 239, 0.3)');
      root.style.setProperty('--shadow-gold', '0 0 30px rgba(251, 191, 36, 0.3)');
      
      // Night mode gradients
      root.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)');
      root.style.setProperty('--cosmic-gradient', 'linear-gradient(135deg, rgba(217, 70, 239, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)');
      root.style.setProperty('--orb-gradient-primary', 'radial-gradient(circle, #d946ef 0%, transparent 70%)');
      root.style.setProperty('--orb-gradient-secondary', 'radial-gradient(circle, #fbbf24 0%, transparent 70%)');
      root.style.setProperty('--orb-gradient-tertiary', 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)');
    } else {
      // Light cosmic theme variables (Day Mode)
      root.style.setProperty('--bg-primary', '#f8fafc');
      root.style.setProperty('--bg-secondary', '#e2e8f0');
      root.style.setProperty('--bg-tertiary', '#cbd5e1');
      root.style.setProperty('--bg-card', 'rgba(248, 250, 252, 0.9)');
      root.style.setProperty('--bg-glass', 'rgba(226, 232, 240, 0.2)');
      root.style.setProperty('--bg-input', 'rgba(203, 213, 225, 0.5)');
      root.style.setProperty('--text-primary', '#1e293b');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--text-inverse', '#ffffff');
      root.style.setProperty('--cosmic-glow', 'rgba(139, 92, 246, 0.3)');
      root.style.setProperty('--gold-glow', 'rgba(217, 119, 6, 0.3)');
      root.style.setProperty('--cosmic-primary', '#8b5cf6');
      root.style.setProperty('--cosmic-secondary', '#a855f7');
      root.style.setProperty('--gold-primary', '#d97706');
      root.style.setProperty('--gold-secondary', '#ea580c');
      
      // Day mode particle and animation variables
      root.style.setProperty('--particle-opacity', '0.4');
      root.style.setProperty('--particle-size', '1.5px');
      root.style.setProperty('--particle-glow', 'rgba(139, 92, 246, 0.4)');
      root.style.setProperty('--orb-opacity-primary', '0.1');
      root.style.setProperty('--orb-opacity-secondary', '0.08');
      root.style.setProperty('--orb-opacity-tertiary', '0.06');
      
      root.style.setProperty('--border-color', 'rgba(217, 119, 6, 0.3)');
      root.style.setProperty('--border-cosmic', 'rgba(139, 92, 246, 0.4)');
      root.style.setProperty('--shadow-cosmic', '0 0 30px rgba(139, 92, 246, 0.2)');
      root.style.setProperty('--shadow-gold', '0 0 20px rgba(217, 119, 6, 0.2)');
      
      // Day mode gradients
      root.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)');
      root.style.setProperty('--cosmic-gradient', 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)');
      root.style.setProperty('--orb-gradient-primary', 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)');
      root.style.setProperty('--orb-gradient-secondary', 'radial-gradient(circle, #d97706 0%, transparent 70%)');
      root.style.setProperty('--orb-gradient-tertiary', 'radial-gradient(circle, #a855f7 0%, transparent 70%)');
    }
    
    // Add transition for smooth theme switching
    body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    
    // Force immediate update of all CSS custom properties
    root.style.setProperty('--theme-transition', 'all 0.3s ease');
    
    // Trigger custom event for components that need to react to theme changes
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { theme, timestamp: Date.now() } 
    }));
    
    // Force a repaint to ensure all elements update immediately
    setTimeout(() => {
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';
    }, 0);
  };

  // Load saved preferences on mount with guaranteed dark default
  useEffect(() => {
    // ALWAYS default to dark if no preference is saved
    const savedTheme = localStorage.getItem('samia_theme');
    const finalTheme = savedTheme || 'dark'; // Force dark as default
    
    const savedLanguage = localStorage.getItem('samia_language') || 'ar';

    // Apply theme first
    applyTheme(finalTheme);
    dispatch({ type: 'SET_THEME', payload: finalTheme });
    
    // Save the theme if it wasn't already saved (ensures dark is stored as default)
    if (!savedTheme) {
      localStorage.setItem('samia_theme', 'dark');
    }
    
    // Apply language
    dispatch({ type: 'SET_LANGUAGE', payload: savedLanguage });
    
    // Update i18n language
    i18n.changeLanguage(savedLanguage);
    
    // Update HTML attributes for RTL/LTR
    document.documentElement.setAttribute('dir', savedLanguage === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', savedLanguage);
  }, [i18n]);

  const setTheme = (theme) => {
    localStorage.setItem('samia_theme', theme);
    applyTheme(theme);
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  const toggleTheme = () => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('samia_theme', newTheme);
    applyTheme(newTheme);
    dispatch({ type: 'TOGGLE_THEME' });
  };

  const setLanguage = (language) => {
    localStorage.setItem('samia_language', language);
    i18n.changeLanguage(language);
    
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', language);
    
    dispatch({ type: 'SET_LANGUAGE', payload: language });
  };

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const setSidebar = (isOpen) => {
    dispatch({ type: 'SET_SIDEBAR', payload: isOpen });
  };

  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const addNotification = (notification) => {
    const id = Date.now().toString();
    const newNotification = {
      id,
      type: 'info',
      duration: 5000,
      ...notification
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Auto remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  };

  const removeNotification = (id) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  };

  const openModal = (type, data = null) => {
    dispatch({ type: 'OPEN_MODAL', payload: { type, data } });
  };

  const closeModal = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const showSuccess = (message) => {
    addNotification({
      type: 'success',
      message,
      duration: 5000
    });
  };

  const showError = (message) => {
    addNotification({
      type: 'error', 
      message,
      duration: 8000
    });
  };

  const showInfo = (message) => {
    addNotification({
      type: 'info',
      message,
      duration: 5000
    });
  };

  const showWarning = (message) => {
    addNotification({
      type: 'warning',
      message,
      duration: 6000
    });
  };

  const showNotification = (message, type = 'info') => {
    addNotification({
      type,
      message,
      duration: type === 'error' ? 8000 : 5000
    });
  };

  const value = {
    ...state,
    setTheme,
    toggleTheme,
    setLanguage,
    toggleSidebar,
    setSidebar,
    setLoading,
    addNotification,
    removeNotification,
    clearNotifications,
    openModal,
    closeModal,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showNotification
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}; 