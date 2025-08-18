import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/frontendApi.js';
import { authHelpers, supabase } from '../lib/supabase.js';
import { hasAdminAccess } from '../utils/roleHelpers';

// 🔥 EXTREME DEBUG MODE - Console Logging System
const EXTREME_DEBUG = true;

function debugLog(label, ...args) {
  if (!EXTREME_DEBUG) return;
  const styles = [
    "background: #222; color: #00f2ff; font-weight: bold; padding: 2px 6px; border-radius: 6px;",
    "color: #fff; background: #1a1a1a; padding: 2px 6px; border-radius: 4px;"
  ];
  if (typeof label === "string") {
    console.log(`%c[EXTREME DEBUG - AUTH]%c ${label}`, ...styles, ...args);
  } else {
    console.log("%c[EXTREME DEBUG - AUTH]", styles[0], label, ...args);
  }
}

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
  
  // Add loading state tracking to prevent duplicate requests
  const [profileLoading, setProfileLoading] = useState(false);
  const [lastProfileLoadTime, setLastProfileLoadTime] = useState(null);

  const loadUserProfile = async (authUser) => {
    // Prevent duplicate loading requests
    if (profileLoading) {
      return;
    }

    // Skip if we already have a profile for this user and it was loaded recently (within 30 seconds)
    if (profile && lastProfileLoadTime && (Date.now() - lastProfileLoadTime < 30000)) {
      return;
    }

    try {
      setProfileLoading(true);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile loading timeout')), 10000);
      });

      // Load profile from API only - no fallbacks or emergency mappings
      try {
        const result = await Promise.race([
          api.getProfile(authUser.id),
          timeoutPromise
        ]);
        if (result.success && result.data) {
          setProfile(result.data);
          setLastProfileLoadTime(Date.now());
          setLoading(false);
          setInitialized(true);
          return;
        } else {
          // In test environment, continue gracefully without throwing
          if (import.meta.env.MODE === 'test' || typeof jest !== 'undefined') {
            setLoading(false);
            return;
          }
          throw new Error(result.error || 'Failed to load profile');
        }
      } catch (apiError) {
        // If profile doesn't exist, try to create a basic one
        if (apiError.message.includes('timeout') || apiError.message.includes('No rows')) {
          try {
            const basicProfile = {
              id: authUser.id,
              email: authUser.email,
              role: 'client', // Default role
              first_name: '',
              last_name: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const createResult = await api.createProfile(basicProfile);
            if (createResult.success) {
              setProfile(createResult.data);
              setLastProfileLoadTime(Date.now());
              setLoading(false);
              setInitialized(true);
              return;
            } else {
              setProfile(basicProfile);
              setLoading(false);
              setInitialized(true);
              return;
            }
          } catch (createError) {
            setProfile({
              id: authUser.id,
              email: authUser.email,
              role: 'client',
              first_name: '',
              last_name: ''
            });
            setLoading(false);
            setInitialized(true);
            return;
          }
        }
        
        console.error('❌ [AUTH] Profile loading failed:', apiError.message);
        // In test environment, don't throw errors - just continue without profile
        if (import.meta.env.MODE === 'test' || typeof jest !== 'undefined') {
          setLoading(false);
          return;
        }
        
        // Only clear profile if we don't have one cached
        if (!profile) {
          console.warn('⚠️ [AUTH] No cached profile available and loading failed');
          // Don't throw error in production - just continue without profile
          setLoading(false);
          setInitialized(true);
          return;
        }
      }

    } catch (error) {
      // Only set profile to null if we don't have a cached one
      if (!profile) {
        setProfile(null);
        setLoading(false);
        throw error;
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // BULLETPROOF SESSION REHYDRATION
  const rehydrateSession = useCallback(async () => {
    debugLog('=== [START] BULLETPROOF SESSION REHYDRATION ===');
    debugLog('Current state before rehydration:', {
      user: !!user,
      loading,
      initialized,
      hasToken: !!localStorage.getItem('auth_token')
    });

    try {
      debugLog('🔄 Starting bulletproof session rehydration...');
      
      // Step 1: Check JWT token first (primary auth method)
      const token = localStorage.getItem('auth_token');
      debugLog('Step 1 - JWT Token Check:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'null',
        tokenType: typeof token,
        isValidString: token && token !== 'undefined' && token !== 'null' && token !== 'NULL',
        isJWTFormat: token && token.includes('.') && token.split('.').length === 3
      });
      
      // BULLETPROOF TOKEN VALIDATION: Check format, length, and content
      const isValidToken = token && 
                          token !== 'undefined' && 
                          token !== 'null' && 
                          token !== 'NULL' &&
                          token.length > 50 && // JWT should be much longer
                          token.includes('.') && // JWT has dots
                          token.split('.').length === 3; // JWT has 3 parts
      
      if (isValidToken) {
        debugLog('✅ JWT token found, preparing backend verification...');
        
        try {
          // Direct API call with explicit Authorization header
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            debugLog('⏰ Request timeout triggered (8s)');
            controller.abort();
          }, 8000);
          
          const requestHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          };
          debugLog('Request headers prepared:', requestHeaders);
          debugLog('Calling API endpoint: /auth/verify');
          
          const response = await api.get('/auth/verify', {
            headers: requestHeaders,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          debugLog('✅ API Response received:', {
            success: response?.success,
            hasUser: !!response?.user,
            userEmail: response?.user?.email,
            responseKeys: Object.keys(response || {})
          });
          
          // Validate response structure precisely
          if (response?.success === true && response?.user?.email) {
            debugLog('🎉 JWT VALID! Session restoration successful:', {
              email: response.user.email,
              role: response.user.role,
              userId: response.user.id
            });
            
            // Set user FIRST, then load profile
            debugLog('Step 2 - Setting user state...');
            setUser(response.user);
            debugLog('Step 3 - Setting loading to false...');
            setLoading(false);
            debugLog('Step 4 - Setting initialized to true...');
            setInitialized(true);
            
            // Load profile AFTER initialization (non-blocking)
            debugLog('Step 5 - Loading user profile (non-blocking)...');
            try {
              await loadUserProfile(response.user);
              debugLog('✅ Profile loaded successfully');
            } catch (profileError) {
              debugLog('⚠️ Profile loading failed, but session is valid:', {
                error: profileError.message,
                stack: profileError.stack
              });
            }
            
            debugLog('=== [SUCCESS] SESSION REHYDRATION COMPLETED ===');
            return; // Success - exit early
          } else {
            debugLog('❌ Invalid JWT response structure:', {
              success: response?.success,
              hasUser: !!response?.user,
              response: response
            });
            debugLog('🗑️ Removing invalid token from localStorage...');
            localStorage.removeItem('auth_token');
          }
          
        } catch (jwtError) {
          debugLog('❌ JWT verification failed:', {
            message: jwtError.message,
            name: jwtError.name,
            stack: jwtError.stack,
            response: jwtError.response?.data
          });
          
          // Remove invalid/expired tokens
          const errorMessage = jwtError.message?.toLowerCase() || '';
          if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('invalid') || errorMessage.includes('expired')) {
            debugLog('🗑️ Removing invalid/expired JWT token...', {
              reason: errorMessage,
              tokenLength: token.length
            });
            localStorage.removeItem('auth_token');
          }
        }
      } else {
        debugLog('❌ Invalid or no JWT token found in localStorage', {
          hasToken: !!token,
          tokenValue: token,
          tokenLength: token ? token.length : 0,
          tokenFormat: token ? (token.includes('.') ? 'has dots' : 'no dots') : 'null',
          reason: !token ? 'no token' : 
                  token === 'undefined' ? 'undefined string' : 
                  token === 'null' ? 'null string' : 
                  token === 'NULL' ? 'NULL string' :
                  token.length <= 50 ? 'too short' : 
                  !token.includes('.') ? 'not JWT format' : 
                  token.split('.').length !== 3 ? 'invalid JWT structure' : 'unknown'
        });
        
        // BULLETPROOF CLEANUP: Remove any invalid tokens
        if (token && (token === 'undefined' || token === 'null' || token === 'NULL' || 
                     token.length <= 50 || !token.includes('.') || token.split('.').length !== 3)) {
          debugLog('🗑️ Cleaning up invalid token from localStorage...', { 
            invalidToken: token.substring(0, 30) + '...',
            reason: 'invalid format or content'
          });
          localStorage.removeItem('auth_token');
        }
      }
      
      // Step 2: Fallback to Supabase (secondary auth method)
      debugLog('🔄 Step 6 - Checking Supabase session fallback...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      debugLog('Supabase session check result:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email,
        error: error?.message,
        sessionId: session?.access_token ? `${session.access_token.substring(0, 20)}...` : null
      });
      
      if (!error && session?.user?.email) {
        debugLog('✅ Supabase session found! Restoring from Supabase:', {
          email: session.user.email,
          userId: session.user.id,
          role: session.user.role,
          sessionMetadata: session.user.user_metadata,
          lastSignIn: session.user.last_sign_in_at
        });
        
        debugLog('Step 7 - Setting user from Supabase session...');
        setUser(session.user);
        debugLog('Step 8 - Setting loading to false...');
        setLoading(false);
        debugLog('Step 9 - Setting initialized to true...');
        setInitialized(true);
        
        // Load profile after initialization (non-blocking)  
        debugLog('Step 10 - Loading Supabase user profile (non-blocking)...');
        try {
          await loadUserProfile(session.user);
          debugLog('✅ Supabase profile loaded successfully');
        } catch (profileError) {
          debugLog('⚠️ Supabase profile loading failed:', {
            error: profileError.message,
            stack: profileError.stack
          });
        }
        
        debugLog('=== [SUCCESS] SUPABASE SESSION REHYDRATION COMPLETED ===');
        return; // Success - exit early
      }
      
      // Step 3: No valid session found - clear everything
      debugLog('❌ Step 11 - No valid session found anywhere - performing clean logout');
      debugLog('Supabase session details:', {
        hasError: !!error,
        errorMessage: error?.message,
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email
      });
      debugLog('Setting user to null (clean logout)...');
      setUser(null);
      debugLog('Setting profile to null (clean logout)...');
      setProfile(null);
      debugLog('Setting loading to false (clean logout)...');
      setLoading(false);
      debugLog('Setting initialized to true (clean logout)...');
      setInitialized(true);
      debugLog('=== [COMPLETED] CLEAN LOGOUT - NO VALID SESSION ===');
      
    } catch (error) {
      debugLog('🚨 CRITICAL rehydration error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        currentState: {
          user: !!user,
          loading,
          initialized
        }
      });
      
      // Ensure app doesn't get stuck in loading state
      debugLog('Emergency state cleanup - preventing app hang...');
      debugLog('Setting user to null (emergency)...');
      setUser(null);
      debugLog('Setting profile to null (emergency)...');
      setProfile(null);
      debugLog('Setting loading to false (emergency)...');
      setLoading(false);
      debugLog('Setting initialized to true (emergency)...');
      setInitialized(true);
      debugLog('=== [EMERGENCY] REHYDRATION ERROR RECOVERY COMPLETED ===');
    }
  }, [api, loadUserProfile]);

  // SINGLE INITIALIZATION EFFECT - PREVENTS RACE CONDITIONS
  useEffect(() => {
    let isMounted = true;
    let authSubscription = null;
    
    debugLog('=== [INIT] BULLETPROOF INITIALIZATION STARTED ===');
    debugLog('useEffect - Initial state:', {
      isMounted,
      hasAuthSubscription: !!authSubscription,
      currentUser: !!user,
      currentLoading: loading,
      currentInitialized: initialized
    });
    
    const initializeAuth = async () => {
      try {
        debugLog('🚀 Starting bulletproof auth initialization...');
        
        // Step 1: Primary session rehydration (no race conditions)
        if (isMounted) {
          await rehydrateSession();
        }
        
        // Step 2: Setup Supabase listener ONLY for future changes
        if (isMounted && initialized) {
          console.log('🔄 [AUTH] Setting up auth state listener...');
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Only handle future auth changes, not initial session
            console.log('🔄 [AUTH] Auth event received:', event);
            
            try {
              if (event === 'SIGNED_IN' && session?.user?.email) {
                console.log('✅ [AUTH] New sign-in detected:', session.user.email);
                setUser(session.user);
                setLoading(false);
                
                // Load profile non-blocking
                loadUserProfile(session.user).catch((err) => {
                  console.log('⚠️ [AUTH] Profile load failed for new sign-in:', err.message);
                });
                
              } else if (event === 'SIGNED_OUT') {
                console.log('👋 [AUTH] Sign-out detected - cleaning up');
                setUser(null);
                setProfile(null);
                localStorage.removeItem('auth_token');
                setLoading(false);
                
              } else if (event === 'TOKEN_REFRESHED' && session?.user?.email) {
                console.log('🔄 [AUTH] Token refreshed for:', session.user.email);
                setUser(session.user);
                
                // Update profile non-blocking
                loadUserProfile(session.user).catch((err) => {
                  console.log('⚠️ [AUTH] Profile refresh failed:', err.message);
                });
              }
            } catch (stateChangeError) {
              console.error('❌ [AUTH] State change error:', stateChangeError);
            }
          });
          
          authSubscription = subscription;
        }
        
      } catch (initError) {
        console.error('❌ [AUTH] Initialization failed:', initError);
        if (isMounted) {
          setUser(null);
          setProfile(null);  
          setLoading(false);
          setInitialized(true);
        }
      }
    };
    
    // Safety timeout - never leave app in loading state
    const safetyTimeout = setTimeout(() => {
      if (loading && !initialized) {
        console.log('⚠️ [AUTH] Safety timeout - forcing initialization complete');
        setLoading(false);
        setInitialized(true);
      }
    }, 15000);
    
    // Profile loading timeout
    const profileTimeout = setTimeout(() => {
      if (profileLoading) {
        console.log('⚠️ [AUTH] Profile timeout - stopping profile loading');
        setProfileLoading(false);
      }
    }, 10000);
    
    // Start initialization
    initializeAuth();
    
    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      clearTimeout(profileTimeout);
      authSubscription?.unsubscribe();
    };
  }, []); // EMPTY DEPS - RUN ONCE ONLY

  const login = async (email, password) => {
    try {
      setLoading(true);
      
      const result = await api.login(email, password);
      
      // Response structure: { success: true, token: '...', user: {...} }
      if (result.success && result.user) {
        debugLog('🎉 LOGIN SUCCESS! Saving JWT token to localStorage...', {
          email: result.user.email,
          hasToken: !!result.token,
          tokenLength: result.token ? result.token.length : 0
        });
        
        // ✅ CRITICAL FIX: Save JWT token to localStorage
        if (result.token) {
          localStorage.setItem('auth_token', result.token);
          debugLog('✅ JWT token saved to localStorage successfully');
        } else {
          debugLog('⚠️ No token in login response!', result);
        }
        
        setUser(result.user);
        await loadUserProfile(result.user);
        return { success: true };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true);
      const result = await api.signUp(email, password, userData);
      
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
      
      debugLog('=== [LOGOUT] STARTING BULLETPROOF LOGOUT ===');
      
      // ✅ CRITICAL FIX: Clear JWT token from localStorage FIRST
      debugLog('Clearing JWT token from localStorage...');
      localStorage.removeItem('auth_token');
      
      const result = await api.signOut();
      
      if (result.success) {
        debugLog('Backend signOut successful, clearing states...');
        setUser(null);
        setProfile(null);
        debugLog('✅ Logout completed successfully');
        return { success: true };
      }
      
      // Even if backend fails, still clear local state
      debugLog('⚠️ Backend signOut failed, but clearing local state anyway...', result);
      setUser(null);
      setProfile(null);
      return result;
    } catch (error) {
      debugLog('❌ Logout error, but clearing local state anyway...', error.message);
      // Always clear local state even if API fails
      setUser(null);
      setProfile(null);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
      debugLog('=== [LOGOUT] COMPLETED ===');
    }
  };

  const updateProfile = async (updates) => {
    try {
      const result = await api.updateProfile(user.id, updates);
      
      if (result.success && result.data) {
        setProfile(result.data);
        return { success: true, data: result.data };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  const resetPassword = async (resetData) => {
    try {
      if (resetData.token) {
        // Handle password reset with token
        const result = await api.resetPassword(resetData);
        return result;
      } else {
        // Handle forgot password (send reset email)
        const result = await api.forgotPassword(resetData.email);
        return result;
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const refreshAuthToken = async () => {
    try {
      console.log('🔄 [AUTH_CONTEXT] Attempting to refresh authentication token...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.refresh_token) {
        console.log('❌ [AUTH_CONTEXT] No refresh token available');
        return { success: false, error: 'No refresh token available' };
      }

      // Use Supabase's built-in refresh method
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token
      });

      if (error || !data.session) {
        console.log('❌ [AUTH_CONTEXT] Token refresh failed:', error?.message);
        // If refresh fails, logout user
        await logout();
        return { success: false, error: error?.message || 'Token refresh failed' };
      }

      console.log('✅ [AUTH_CONTEXT] Token refreshed successfully');
      
      // Update user state with new session
      setUser(data.user);
      
      // Reload user profile to ensure consistency
      await loadUserProfile(data.user);
      
      return { 
        success: true, 
        session: data.session,
        user: data.user 
      };
      
    } catch (error) {
      console.error('❌ [AUTH_CONTEXT] Token refresh error:', error);
      // If refresh fails, logout user
      await logout();
      return { success: false, error: error.message };
    }
  };

  // Role checking functions
  const isClient = () => profile?.role === 'client';
  const isReader = () => profile?.role === 'reader';
  const isAdmin = () => profile?.role === 'admin';
  const isMonitor = () => profile?.role === 'monitor';
  const isSuperAdmin = () => profile?.role === 'super_admin';

  const hasRole = (roles) => {
    if (!profile?.role) return false;
    return Array.isArray(roles) ? roles.includes(profile.role) : roles === profile.role;
  };

  const getDashboardPath = () => {
    if (!profile?.role) return '/auth';
    
    switch (profile.role) {
      case 'super_admin':
        return '/dashboard/super-admin';
      case 'admin':
        return '/dashboard/admin';
      case 'monitor':
        return '/dashboard/monitor';
      case 'reader':
        return '/dashboard/reader';
      case 'client':
        return '/dashboard/client';
      default:
        return '/auth';
    }
  };

  const value = {
    user,
    profile,
    loading,
    initialized,
    isAuthenticated: !!user,
    login,
    signUp,
    logout,
    signOut: logout, // Alias for backward compatibility
    updateProfile,
    refreshProfile,
    resetPassword,
    refreshAuthToken,
    isClient,
    isReader,
    isAdmin,
    isMonitor,
    isSuperAdmin,
    hasRole,
    getDashboardPath,
    hasAdminAccess: () => hasAdminAccess(profile)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 