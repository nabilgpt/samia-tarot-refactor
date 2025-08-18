import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertTriangle, Home, LogOut, RefreshCw } from 'lucide-react';
import AuthInitializer from './UI/AuthInitializer';
import BulletproofAuthLoader from './UI/BulletproofAuthLoader';

// 🔥 EXTREME DEBUG MODE - Route Protection Logging System
const EXTREME_DEBUG = true;

function debugLog(label, ...args) {
  if (!EXTREME_DEBUG) return;
  const styles = [
    "background: #222; color: #32cd32; font-weight: bold; padding: 2px 6px; border-radius: 6px;",
    "color: #fff; background: #1a1a1a; padding: 2px 6px; border-radius: 4px;"
  ];
  if (typeof label === "string") {
    console.log(`%c[EXTREME DEBUG - ROUTE]%c ${label}`, ...styles, ...args);
  } else {
    console.log("%c[EXTREME DEBUG - ROUTE]", styles[0], label, ...args);
  }
}

const ProtectedRoute = ({ children, requiredRoles = [], fallbackPath = '/login', showUnauthorized = false }) => {
  debugLog('=== [ROUTE PROTECTION] COMPONENT RENDER ===');
  
  const { user, profile, loading, initialized, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [timeoutError, setTimeoutError] = useState(false);
  const [profileTimeout, setProfileTimeout] = useState(false);

  debugLog('Route protection state:', {
    hasUser: !!user,
    hasProfile: !!profile,
    loading,
    initialized,
    isAuthenticated,
    timeoutError,
    profileTimeout,
    locationPathname: location.pathname,
    requiredRoles,
    fallbackPath
  });

  debugLog('User details:', {
    user: user ? {
      id: user.id,
      email: user.email,
      role: user.role
    } : null,
    profile: profile ? {
      id: profile.id,
      role: profile.role,
      isActive: profile.is_active
    } : null
  });

  // Add timeout to prevent infinite loading
  useEffect(() => {
    debugLog('Setting up authentication timeout (30s)...');
    const timer = setTimeout(() => {
      if (loading || !initialized) {
        debugLog('🚨 AUTHENTICATION TIMEOUT TRIGGERED!', {
          loading,
          initialized,
          timeElapsed: '30 seconds',
          action: 'forcing fallback'
        });
        setTimeoutError(true);
      }
    }, 30000); // 30 second timeout (increased from 15)

    return () => {
      debugLog('Cleaning up authentication timeout timer');
      clearTimeout(timer);
    };
  }, [loading, initialized]);

  // Add timeout for profile loading when role checking is required
  useEffect(() => {
    debugLog('Profile timeout effect triggered:', {
      hasRequiredRoles: requiredRoles.length > 0,
      isAuthenticated,
      hasProfile: !!profile,
      profileTimeout
    });

    if (requiredRoles.length > 0 && isAuthenticated && !profile && !profileTimeout) {
      debugLog('Setting up profile loading timeout (15s)...');
      const profileTimer = setTimeout(() => {
        debugLog('🚨 PROFILE LOADING TIMEOUT TRIGGERED!', {
          isAuthenticated,
          hasProfile: !!profile,
          timeElapsed: '15 seconds',
          action: 'allowing access without role check'
        });
        setProfileTimeout(true);
      }, 15000); // 15 second timeout for profile

      return () => {
        debugLog('Cleaning up profile timeout timer');
        clearTimeout(profileTimer);
      };
    }
  }, [requiredRoles.length, isAuthenticated, profile, profileTimeout]);

  // Enhanced role validation
  const validateRoleAccess = (userRole, requiredRoles) => {
    debugLog('=== [ROLE VALIDATION] Starting validation ===', {
      userRole,
      requiredRoles,
      hasRequiredRoles: !!(requiredRoles && requiredRoles.length > 0),
      hasUserRole: !!userRole
    });

    if (!requiredRoles || requiredRoles.length === 0) {
      debugLog('✅ No required roles - access granted', { requiredRoles });
      return true;
    }
    
    if (!userRole) {
      debugLog('❌ No user role found - access denied', { userRole });
      return false;
    }

    // Super admin has access to everything
    if (userRole === 'super_admin') {
      debugLog('✅ Super admin detected - access granted', { userRole });
      return true;
    }

    // Admin has access to admin, monitor, reader, client dashboards
    const adminAccessRoles = ['admin', 'monitor', 'reader', 'client'];
    const hasAdminAccess = userRole === 'admin' && requiredRoles.some(role => 
      adminAccessRoles.includes(role)
    );
    
    if (hasAdminAccess) {
      debugLog('✅ Admin access granted for admin-level roles', {
        userRole,
        requiredRoles,
        adminAccessRoles,
        matchingRoles: requiredRoles.filter(role => adminAccessRoles.includes(role))
      });
      return true;
    }

    // Check exact role match
    const exactMatch = requiredRoles.includes(userRole);
    debugLog(exactMatch ? '✅ Exact role match found' : '❌ No role match found', {
      userRole,
      requiredRoles,
      exactMatch,
      matchingRole: exactMatch ? userRole : null
    });
    
    return exactMatch;
  };

  // Enhanced dashboard path mapping
  const getDashboardPath = (userRole) => {
    const dashboardPaths = {
      client: '/dashboard/client',
      reader: '/dashboard/reader',
      admin: '/dashboard/admin',
      monitor: '/dashboard/monitor',
      super_admin: '/dashboard/super-admin'
    };
    return dashboardPaths[userRole] || '/';
  };

  // Debug logging removed for performance

  // Show timeout error with enhanced UI
  if (timeoutError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto p-8 bg-black/30 backdrop-blur-sm rounded-2xl border border-purple-500/20">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="text-red-400 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Authentication Timeout
          </h2>
          <p className="text-gray-300 mb-6 leading-relaxed">
            There seems to be an issue connecting to the authentication service. 
            This might be due to network connectivity or server issues.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // BULLETPROOF: Show cosmic loader during session rehydration
  if (loading || !initialized) {
    debugLog('🔄 SHOWING BULLETPROOF AUTH LOADER', {
      loading,
      initialized,
      reason: loading ? 'loading=true' : 'initialized=false'
    });
    return (
      <BulletproofAuthLoader 
        message="Verifying Session..." 
        submessage="Checking your authentication status"
        showProgress={true}
      />
    );
  }

  debugLog('Session rehydration completed - checking authentication...', {
    loading,
    initialized,
    isAuthenticated,
    hasUser: !!user
  });

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    debugLog('🚫 REDIRECTING TO LOGIN - User not authenticated', {
      isAuthenticated,
      hasUser: !!user,
      currentPath: location.pathname,
      redirectingTo: '/login'
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  debugLog('✅ User is authenticated - checking role requirements...', {
    hasRequiredRoles: requiredRoles.length > 0,
    requiredRoles,
    userRole: profile?.role || 'no-profile'
  });

  // Check role-based access if required roles are specified
  if (requiredRoles.length > 0) {
    debugLog('🔐 ROLE-BASED ACCESS CONTROL REQUIRED', {
      requiredRoles,
      hasProfile: !!profile,
      profileRole: profile?.role,
      profileTimeout
    });

    // Wait for profile to load before doing role checks, but timeout after 15 seconds
    if (!profile && !profileTimeout) {
      debugLog('⏳ WAITING FOR PROFILE - Showing profile loader', {
        profileTimeout,
        hasProfile: !!profile
      });
      return (
        <BulletproofAuthLoader 
          message="Loading Profile..." 
          submessage="Fetching your role and permissions"
          showProgress={false}
        />
      );
    }

    // If profile timeout occurred, allow access without role check (emergency fallback)
    if (profileTimeout && !profile) {
      debugLog('⚠️ PROFILE TIMEOUT - Allowing emergency access', {
        profileTimeout,
        hasProfile: !!profile,
        action: 'bypassing role check'
      });
      return children;
    }

    debugLog('🔍 VALIDATING ROLE ACCESS...', {
      userRole: profile.role,
      requiredRoles,
      profileData: profile
    });

    const hasRequiredRole = validateRoleAccess(profile.role, requiredRoles);
    
    debugLog('Role validation result:', {
      hasRequiredRole,
      userRole: profile.role,
      requiredRoles,
      validationMethod: 'validateRoleAccess'
    });
    
    if (!hasRequiredRole) {
      debugLog('🚫 ACCESS DENIED - Insufficient role permissions', {
        userRole: profile.role,
        requiredRoles,
        showUnauthorized,
        action: showUnauthorized ? 'showing unauthorized page' : 'redirecting to user dashboard'
      });
      
      // Show unauthorized page if requested, otherwise redirect
      if (showUnauthorized) {
        debugLog('Rendering UnauthorizedAccess component');
        return <UnauthorizedAccess userRole={profile.role} requiredRoles={requiredRoles} />;
      }
      
      // Redirect to appropriate dashboard based on user's actual role
      const userDashboard = getDashboardPath(profile.role);
      debugLog('Redirecting to user dashboard:', {
        userRole: profile.role,
        userDashboard,
        currentPath: location.pathname
      });
      return <Navigate to={userDashboard} replace />;
    }
    
    debugLog('✅ ROLE ACCESS GRANTED', {
      userRole: profile.role,
      requiredRoles,
      action: 'rendering protected component'
    });
  }

  debugLog('=== [SUCCESS] ROUTE PROTECTION COMPLETE - RENDERING CHILDREN ===', {
    finalState: {
      isAuthenticated,
      hasUser: !!user,
      hasProfile: !!profile,
      userRole: profile?.role || user?.role,
      hasRequiredRoles: requiredRoles.length > 0,
      allChecksPass: true
    }
  });

  // User is authenticated and has proper role, render the protected component
  return children;
};

// Unauthorized Access Component
const UnauthorizedAccess = ({ userRole, requiredRoles }) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const getDashboardPath = (role) => {
    const paths = {
      client: '/dashboard/client',
      reader: '/dashboard/reader',
      admin: '/dashboard/admin',
      monitor: '/dashboard/monitor',
      super_admin: '/dashboard/super-admin'
    };
    return paths[role] || '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center p-4">
      <div className="text-center max-w-lg mx-auto p-8 bg-black/30 backdrop-blur-sm rounded-2xl border border-red-500/20">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="text-red-400 w-8 h-8" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">
          Access Denied
        </h1>
        
        <p className="text-gray-300 mb-6 leading-relaxed">
          You don&apos;t have permission to access this page. This area is restricted to users with 
          <span className="text-yellow-400 font-semibold mx-1">
            {requiredRoles.join(', ')}
          </span> 
          roles, but you have 
          <span className="text-blue-400 font-semibold mx-1">
            {userRole}
          </span> 
          access.
        </p>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
          <p className="text-yellow-300 text-sm">
            <strong>Security Notice:</strong> All access attempts are logged for security purposes.
            If you believe this is an error, please contact your administrator.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.href = getDashboardPath(userRole)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to My Dashboard
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Need different access? Contact your administrator or 
          <a href="/contact" className="text-purple-400 hover:text-purple-300 ml-1">
            support team
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute; 