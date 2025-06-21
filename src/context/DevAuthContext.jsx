import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false); // Start with false for development
  const [session, setSession] = useState(null);
  const [initialized, setInitialized] = useState(true); // Start as initialized

  // Development mode - create mock user if needed
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Using mock authentication');
      
      // Create a mock user for development
      const mockUser = {
        id: 'dev-user-123',
        email: 'dev@samia-tarot.com',
        user_metadata: {
          full_name: 'Development User'
        }
      };
      
      const mockProfile = {
        id: 'dev-user-123',
        role: 'super_admin', // Give super admin access for development
        full_name: 'Development User',
        email: 'dev@samia-tarot.com',
        avatar_url: null
      };
      
      setUser(mockUser);
      setProfile(mockProfile);
      setSession({ user: mockUser, access_token: 'dev-token' });
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  const signIn = async (email, password) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Mock sign in');
      return { data: { user: user }, error: null };
    }
    // Real implementation would go here
    return { data: null, error: { message: 'Production sign in not implemented' } };
  };

  const signUp = async (email, password, userData = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Mock sign up');
      return { data: { user: user }, error: null };
    }
    return { data: null, error: { message: 'Production sign up not implemented' } };
  };

  const signOut = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Mock sign out');
      setUser(null);
      setProfile(null);
      setSession(null);
    }
    return { error: null };
  };

  const value = {
    user,
    profile,
    session,
    loading,
    initialized,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin',
    isSuperAdmin: profile?.role === 'super_admin',
    isReader: profile?.role === 'reader',
    isClient: profile?.role === 'client'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
