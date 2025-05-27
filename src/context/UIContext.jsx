import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const UIContext = createContext();

const initialState = {
  theme: 'dark',
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

  // Load saved preferences on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('samia_theme') || 'dark';
    const savedLanguage = localStorage.getItem('samia_language') || 'ar';

    dispatch({ type: 'SET_THEME', payload: savedTheme });
    dispatch({ type: 'SET_LANGUAGE', payload: savedLanguage });
    
    // Update i18n language
    i18n.changeLanguage(savedLanguage);
    
    // Update HTML attributes
    document.documentElement.setAttribute('dir', savedLanguage === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', savedLanguage);
    document.documentElement.className = savedTheme;
  }, [i18n]);

  const setTheme = (theme) => {
    localStorage.setItem('samia_theme', theme);
    document.documentElement.className = theme;
    dispatch({ type: 'SET_THEME', payload: theme });
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
      title: 'نجح'
    });
  };

  const showError = (message) => {
    addNotification({
      type: 'error',
      message,
      title: 'خطأ',
      duration: 7000
    });
  };

  const showInfo = (message) => {
    addNotification({
      type: 'info',
      message,
      title: 'معلومات'
    });
  };

  const showWarning = (message) => {
    addNotification({
      type: 'warning',
      message,
      title: 'تحذير'
    });
  };

  const value = {
    ...state,
    setTheme,
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
    showWarning
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}; 