/**
 * M37 — Config Context (Minimal for Language Context Dependencies)
 * Basic config context to satisfy imports
 */

import React, { createContext, useContext, useState } from 'react';

const ConfigContext = createContext({
  config: {},
  updateConfig: () => {},
  isLoading: false
});

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000',
    supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
    supabaseKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
    environment: process.env.NODE_ENV || 'development'
  });
  const [isLoading, setIsLoading] = useState(false);

  const updateConfig = (newConfig) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const contextValue = {
    config,
    updateConfig,
    isLoading
  };

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
};

export default ConfigProvider;