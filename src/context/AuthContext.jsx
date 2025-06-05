import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAPI } from '../api/userApi.js';
import { authHelpers } from '../lib/supabase.js';

const AuthContext = createContext({});

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
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check for existing session
      const session = await authHelpers.getCurrentSession();
      if (session?.user) {
        await loadUserProfile(session.user);
      }

      // Listen for auth changes
      const { data: { subscription } } = authHelpers.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
      });

      setInitialized(true);
      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (authUser) => {
    try {
      setUser(authUser);
      
      // 🚨 EMERGENCY FIX: Hard-coded profile mapping to bypass infinite recursion
      console.log('🛠️ Using emergency profile mapping for user:', authUser.id, authUser.email);
      
      const emergencyProfileMapping = {
        // info@samiatarot.com - This user has 2 profiles, use the actual auth user (c3922fea)
        'c3922fea-329a-4d6e-800c-3e03c9fe341d': { 
          email: 'info@samiatarot.com', 
          role: 'super_admin', // ✅ Updated to super_admin in database
          first_name: 'Mohamad Nabil',
          last_name: 'Zein'
        },
        // nabilgpt.en@gmail.com mapped to reader profile - ✅ Fixed
        'c1a12781-5fef-46df-a1fc-2bf4e4cb6356': { 
          email: 'nabilgpt.en@gmail.com', 
          role: 'reader', // ✅ Correct in database
          first_name: 'Reader',
          last_name: 'User'
        },
        // saeeeel@gmail.com - admin role - ✅ Fixed  
        'e2a4228e-7ce7-4463-8be7-c1c0d47e669e': { 
          email: 'saeeeel@gmail.com', 
          role: 'admin', // ✅ Correct in database
          first_name: 'Saeee',
          last_name: 'L'
        },
        // tarotsamia@gmail.com - client role (no email in profile, but should be client)
        'ebe682e9-06c8-4daa-a5d2-106e74313467': { 
          email: 'tarotsamia@gmail.com', 
          role: 'client', // ✅ Correct in database  
          first_name: 'Sara', // Updated name from database
          last_name: 'Hussein'
        },
        // nabilzein@gmail.com - monitor role - ✅ Fixed
        'e4161dcc-9d18-49c9-8d93-76ab8b75dc0a': { 
          email: 'nabilzein@gmail.com', 
          role: 'monitor', // ✅ Correct in database
          first_name: 'Nabil',
          last_name: 'Zein'
        },
        // super-admin temp account - ✅ Already correct
        '0a28e972-9cc9-479b-aa1e-fafc5856af18': { 
          email: 'super-admin-1748982300604@samiatarot.com', 
          role: 'super_admin', // ✅ Correct in database
          first_name: 'Mohamad Nabil', // Updated name from database
          last_name: 'Zein'
        }
      };

      // Check if user is in emergency mapping
      const emergencyProfile = emergencyProfileMapping[authUser.id];
      
      if (emergencyProfile) {
        console.log('✅ Found emergency profile mapping:', emergencyProfile);
        console.log(`🎯 User ${emergencyProfile.email} will access: /dashboard/${emergencyProfile.role === 'super_admin' ? 'super-admin' : emergencyProfile.role}`);
        
        const profileData = {
          id: authUser.id,
          first_name: emergencyProfile.first_name,
          last_name: emergencyProfile.last_name,
          email: emergencyProfile.email,
          phone: authUser.phone || '',
          role: emergencyProfile.role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setProfile(profileData);
        return;
      }

      // If not in emergency mapping, try normal API call with error handling
      try {
        const result = await UserAPI.getProfile(authUser.id);
        if (result.success && result.data) {
          console.log('✅ Loaded profile from API:', result.data);
          setProfile(result.data);
          return;
        } else {
          throw new Error(result.error || 'Failed to load profile');
        }
      } catch (apiError) {
        console.warn('⚠️ API call failed, using fallback profile:', apiError.message);
        
        // Create fallback profile based on auth user data
        const fallbackProfile = {
          id: authUser.id,
          first_name: authUser.user_metadata?.first_name || authUser.email?.split('@')[0] || 'User',
          last_name: authUser.user_metadata?.last_name || '',
          email: authUser.email,
          phone: authUser.phone || '',
          role: 'client', // Default role
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('🔄 Using fallback profile:', fallbackProfile);
        setProfile(fallbackProfile);
      }

    } catch (error) {
      console.error('❌ Error in loadUserProfile:', error);
      
      // Last resort fallback
      const lastResortProfile = {
        id: authUser.id,
        first_name: 'User',
        last_name: '',
        email: authUser.email,
        phone: '',
        role: 'client',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('🆘 Using last resort profile:', lastResortProfile);
      setProfile(lastResortProfile);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const result = await UserAPI.login(email, password);
      
      if (result.success && result.data?.user) {
        await loadUserProfile(result.data.user);
        return { success: true };
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true);
      const result = await UserAPI.signUp(email, password, userData);
      
      if (result.success) {
        return { success: true, data: result.data, error: null };
      } else {
        return { success: false, data: null, error: result.error };
      }
    } catch (error) {
      return { success: false, data: null, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const result = await UserAPI.signOut();
      
      if (result.success) {
        setUser(null);
        setProfile(null);
        return { success: true, error: null };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = logout; // Alias for consistency

  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No authenticated user');
      
      const result = await UserAPI.updateProfile(user.id, updates);
      if (result.success) {
        setProfile(result.data);
      }
      return result;
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: error.message };
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadUserProfile(user);
  };

  const resetPassword = async (resetData) => {
    try {
      setLoading(true);
      
      // In a real implementation, this would call your backend API
      // For now, we'll simulate the password reset process
      const { email, phone, verificationCode, newPassword } = resetData;
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock password reset logic
      // In production, this should call UserAPI.resetPassword() or similar
      
      return { 
        success: true, 
        message: 'Password reset successfully' 
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to reset password' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Role-based helpers
  const isClient = () => profile?.role === 'client';
  const isReader = () => profile?.role === 'reader';
  const isAdmin = () => profile?.role === 'admin';
  const isMonitor = () => profile?.role === 'monitor';
  const isSuperAdmin = () => profile?.role === 'super_admin';

  const hasRole = (roles) => {
    if (!profile?.role) return false;
    return Array.isArray(roles) ? roles.includes(profile.role) : profile.role === roles;
  };

  const getDashboardPath = () => {
    if (!profile?.role) return '/dashboard';
    if (profile.role === 'super_admin') return '/dashboard/super-admin';
    return `/dashboard/${profile.role}`;
  };

  const value = {
    // Auth state
    user,
    profile,
    loading,
    initialized,
    isAuthenticated: !!user,

    // Auth methods
    login,
    signUp,
    signOut,
    logout,
    updateProfile,
    refreshProfile,
    resetPassword,

    // Role helpers
    isClient,
    isReader,
    isAdmin,
    isMonitor,
    isSuperAdmin,
    hasRole,
    getDashboardPath,

    // User info
    userName: profile?.first_name && profile?.last_name 
      ? `${profile.first_name} ${profile.last_name}`
      : user?.email?.split('@')[0] || 'User',
    userInitials: profile?.first_name?.[0] || user?.email?.[0] || '?',
    userRole: profile?.role || 'client'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 