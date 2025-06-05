import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertTriangle, Home, LogOut, RefreshCw } from 'lucide-react';

const ProtectedRoute = ({ children, requiredRoles = [], fallbackPath = '/login', showUnauthorized = false }) => {
  const { user, profile, loading, initialized, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [timeoutError, setTimeoutError] = useState(false);
  const [roleError, setRoleError] = useState(false);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || !initialized) {
        console.error('Authentication timeout - forcing fallback');
        setTimeoutError(true);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timer);
  }, [loading, initialized]);

  // Enhanced role validation
  const validateRoleAccess = (userRole, requiredRoles) => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!userRole) return false;

    // Super admin has access to everything
    if (userRole === 'super_admin') return true;

    // Admin has access to admin, monitor, reader, client dashboards
    if (userRole === 'admin' && requiredRoles.some(role => 
      ['admin', 'monitor', 'reader', 'client'].includes(role)
    )) return true;

    // Check exact role match
    return requiredRoles.includes(userRole);
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

  // Show loading spinner while authentication is being checked
  if (loading || !initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-300 text-lg font-medium">
              Checking authentication...
            </p>
            <p className="text-gray-500 text-sm">
              Please wait while we verify your credentials
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if required roles are specified
  if (requiredRoles.length > 0) {
    // Wait for profile to load before doing role checks
    if (!profile) {
      console.log('🔄 ProtectedRoute: Profile not loaded yet, showing loading...');
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
              <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
            </div>
            <div className="space-y-2">
              <p className="text-gray-300 text-lg font-medium">
                Loading profile...
              </p>
              <p className="text-gray-500 text-sm">
                Fetching your role and permissions
              </p>
            </div>
          </div>
        </div>
      );
    }

    console.log('🔍 ProtectedRoute Role Check:');
    console.log('  - User Role:', profile.role);
    console.log('  - Required Roles:', requiredRoles);
    console.log('  - Profile Object:', profile);

    const hasRequiredRole = validateRoleAccess(profile.role, requiredRoles);
    console.log('  - Access Granted:', hasRequiredRole);
    
    if (!hasRequiredRole) {
      console.log('❌ ProtectedRoute: Access denied - showing unauthorized page');
      // Show unauthorized page if requested, otherwise redirect
      if (showUnauthorized) {
        return <UnauthorizedAccess userRole={profile.role} requiredRoles={requiredRoles} />;
      }
      
      // Redirect to appropriate dashboard based on user's actual role
      const userDashboard = getDashboardPath(profile.role);
      console.log('🔄 ProtectedRoute: Redirecting to user dashboard:', userDashboard);
      return <Navigate to={userDashboard} replace />;
    }

    console.log('✅ ProtectedRoute: Access granted - rendering protected content');
  }

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