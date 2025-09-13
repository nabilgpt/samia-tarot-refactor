/**
 * M37 — UI Context (Minimal for Language Context Dependencies)
 * Basic UI context to satisfy imports
 */

import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  isSidebarOpen: false,
  toggleSidebar: () => {},
  isLoading: false
});

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

export const UIProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const contextValue = {
    theme,
    toggleTheme,
    isSidebarOpen,
    toggleSidebar,
    isLoading
  };

  return (
    <UIContext.Provider value={contextValue}>
      {children}
    </UIContext.Provider>
  );
};

export default UIProvider;