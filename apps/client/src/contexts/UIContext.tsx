import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface UIState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  loading: boolean;
  notifications: Notification[];
  modal: {
    isOpen: boolean;
    type: string | null;
    data: any;
  };
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  duration: number;
}

interface UIContextType extends UIState {
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebar: (isOpen: boolean) => void;
  setLoading: (loading: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  openModal: (type: string, data?: any) => void;
  closeModal: () => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
  showNotification: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

const initialState: UIState = {
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

type UIAction =
  | { type: 'SET_THEME'; payload: 'dark' | 'light' }
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'OPEN_MODAL'; payload: { type: string; data?: any } }
  | { type: 'CLOSE_MODAL' };

const uiReducer = (state: UIState, action: UIAction): UIState => {
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

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  // Theme management with CSS variable application
  const applyTheme = (theme: 'dark' | 'light') => {
    const root = document.documentElement;
    const body = document.body;

    // Remove all theme classes
    body.className = body.className.replace(/theme-\w+/g, '');

    // Add current theme class
    body.classList.add(`theme-${theme}`);

    // Apply theme class to html element for CSS selector targeting
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }

    // Detailed theme application with CSS variables
    if (theme === 'dark') {
      // Dark mode CSS variables
      root.style.setProperty('--bg-primary', '#0f172a');
      root.style.setProperty('--bg-secondary', '#1e293b');
      root.style.setProperty('--bg-tertiary', '#334155');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#e2e8f0');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-color', 'rgba(251, 191, 36, 0.2)');
      root.style.setProperty('--cosmic-primary', '#d946ef');
      root.style.setProperty('--cosmic-secondary', '#8b5cf6');
      root.style.setProperty('--gold-primary', '#fbbf24');
      root.style.setProperty('--cosmic-glow', 'rgba(217, 70, 239, 0.4)');
      root.style.setProperty('--gold-glow', 'rgba(251, 191, 36, 0.4)');
      root.style.setProperty('--shadow-cosmic', '0 0 50px rgba(217, 70, 239, 0.3)');
      root.style.setProperty('--shadow-gold', '0 0 30px rgba(251, 191, 36, 0.3)');

      // Dark mode gradients
      root.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)');
      root.style.setProperty('--cosmic-gradient', 'linear-gradient(135deg, rgba(217, 70, 239, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)');
      root.style.setProperty('--orb-gradient-primary', 'radial-gradient(circle, #d946ef 0%, transparent 70%)');
      root.style.setProperty('--orb-gradient-secondary', 'radial-gradient(circle, #fbbf24 0%, transparent 70%)');
      root.style.setProperty('--orb-gradient-tertiary', 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)');
    } else {
      // Light mode CSS variables
      root.style.setProperty('--bg-primary', '#f8fafc');
      root.style.setProperty('--bg-secondary', '#e2e8f0');
      root.style.setProperty('--bg-tertiary', '#cbd5e1');
      root.style.setProperty('--text-primary', '#1e293b');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-color', 'rgba(217, 119, 6, 0.3)');
      root.style.setProperty('--cosmic-primary', '#8b5cf6');
      root.style.setProperty('--cosmic-secondary', '#a855f7');
      root.style.setProperty('--gold-primary', '#d97706');
      root.style.setProperty('--cosmic-glow', 'rgba(139, 92, 246, 0.3)');
      root.style.setProperty('--gold-glow', 'rgba(217, 119, 6, 0.3)');
      root.style.setProperty('--shadow-cosmic', '0 0 30px rgba(139, 92, 246, 0.2)');
      root.style.setProperty('--shadow-gold', '0 0 20px rgba(217, 119, 6, 0.2)');

      // Light mode gradients
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
    const savedTheme = localStorage.getItem('samia_theme') as 'dark' | 'light' | null;
    const finalTheme = savedTheme || 'dark'; // Force dark as default

    // Apply theme first
    applyTheme(finalTheme);
    dispatch({ type: 'SET_THEME', payload: finalTheme });

    // Save the theme if it wasn't already saved (ensures dark is stored as default)
    if (!savedTheme) {
      localStorage.setItem('samia_theme', 'dark');
    }
  }, []);

  const setTheme = (theme: 'dark' | 'light') => {
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

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const setSidebar = (isOpen: boolean) => {
    dispatch({ type: 'SET_SIDEBAR', payload: isOpen });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    const newNotification: Notification = {
      id,
      ...notification,
      type: notification.type || 'info',
      duration: notification.duration ?? 5000,
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Auto remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  };

  const openModal = (type: string, data: any = null) => {
    dispatch({ type: 'OPEN_MODAL', payload: { type, data } });
  };

  const closeModal = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const showSuccess = (message: string) => {
    addNotification({
      type: 'success',
      message,
      duration: 5000
    });
  };

  const showError = (message: string) => {
    addNotification({
      type: 'error',
      message,
      duration: 8000
    });
  };

  const showInfo = (message: string) => {
    addNotification({
      type: 'info',
      message,
      duration: 5000
    });
  };

  const showWarning = (message: string) => {
    addNotification({
      type: 'warning',
      message,
      duration: 6000
    });
  };

  const showNotification = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    addNotification({
      type,
      message,
      duration: type === 'error' ? 8000 : 5000
    });
  };

  const value: UIContextType = {
    ...state,
    setTheme,
    toggleTheme,
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

export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};