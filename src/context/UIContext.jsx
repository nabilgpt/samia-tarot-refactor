import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const UIContext = createContext();

const initialState = {
  theme: 'dark',
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
      return { ...state, theme: action.payload };
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
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

  // Theme management only - NO LANGUAGE MANAGEMENT
  const applyTheme = (theme) => {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove all theme classes
    body.className = body.className.replace(/theme-\w+/g, '');
    
    // Add current theme class
    body.classList.add(`theme-${theme}`);
    
    if (theme === 'dark') {
      // Dark mode CSS variables
      root.style.setProperty('--bg-primary', '#0a0a0a');
      root.style.setProperty('--bg-secondary', '#1a1a1a');
      root.style.setProperty('--bg-tertiary', '#2a2a2a');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#b0b0b0');
      root.style.setProperty('--text-tertiary', '#808080');
      root.style.setProperty('--border-primary', '#404040');
      root.style.setProperty('--border-secondary', '#2a2a2a');
      root.style.setProperty('--accent-primary', '#8b5cf6');
      root.style.setProperty('--accent-secondary', '#a855f7');
      root.style.setProperty('--accent-gold', '#d97706');
      root.style.setProperty('--accent-cosmic', '#8b5cf6');
      root.style.setProperty('--border-cosmic', 'rgba(139, 92, 246, 0.6)');
      root.style.setProperty('--shadow-cosmic', '0 0 30px rgba(139, 92, 246, 0.3)');
      root.style.setProperty('--shadow-gold', '0 0 20px rgba(217, 119, 6, 0.3)');
      
      // Dark mode gradients
      root.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)');
      root.style.setProperty('--cosmic-gradient', 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)');
      root.style.setProperty('--orb-gradient-primary', 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)');
      root.style.setProperty('--orb-gradient-secondary', 'radial-gradient(circle, #d97706 0%, transparent 70%)');
      root.style.setProperty('--orb-gradient-tertiary', 'radial-gradient(circle, #a855f7 0%, transparent 70%)');
    } else {
      // Light mode CSS variables
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8fafc');
      root.style.setProperty('--bg-tertiary', '#e2e8f0');
      root.style.setProperty('--text-primary', '#1a1a1a');
      root.style.setProperty('--text-secondary', '#4a4a4a');
      root.style.setProperty('--text-tertiary', '#6a6a6a');
      root.style.setProperty('--border-primary', '#e2e8f0');
      root.style.setProperty('--border-secondary', '#cbd5e1');
      root.style.setProperty('--accent-primary', '#8b5cf6');
      root.style.setProperty('--accent-secondary', '#a855f7');
      root.style.setProperty('--accent-gold', '#d97706');
      root.style.setProperty('--accent-cosmic', '#8b5cf6');
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

  // Load saved theme preferences on mount
  useEffect(() => {
    // ALWAYS default to dark if no preference is saved
    const savedTheme = localStorage.getItem('samia_theme');
    const finalTheme = savedTheme || 'dark'; // Force dark as default

    // Apply theme first
    applyTheme(finalTheme);
    dispatch({ type: 'SET_THEME', payload: finalTheme });
    
    // Save the theme if it wasn't already saved (ensures dark is stored as default)
    if (!savedTheme) {
      localStorage.setItem('samia_theme', 'dark');
    }
    
    // ⚠️ LANGUAGE IS NOW MANAGED BY LanguageContext ONLY
  }, []);

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

  // ⚠️ LANGUAGE FUNCTIONS REMOVED - USE LanguageContext INSTEAD

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
    // ⚠️ setLanguage REMOVED - USE LanguageContext
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