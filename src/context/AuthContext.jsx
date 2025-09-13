/**
 * M37 — Authentication Context (Minimal for Language Context Dependencies)
 * Basic auth context to satisfy imports
 */

import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  isLoading: false
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (credentials) => {
    setIsLoading(true);
    // Minimal auth logic placeholder
    setIsLoading(false);
  };

  const logout = async () => {
    setUser(null);
  };

  const contextValue = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;