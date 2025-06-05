/**
 * Role-based Helper Utilities
 * Centralized functions for role management and navigation
 */

// Valid user roles in the system
export const USER_ROLES = {
  ADMIN: 'admin',
  READER: 'reader', 
  MONITOR: 'monitor',
  CLIENT: 'client',
  SUPER_ADMIN: 'super_admin'
};

/**
 * Get dashboard configuration for a specific role
 * @param {string} role - User role
 * @param {function} t - Translation function
 * @returns {Object|null} Dashboard config or null if invalid role
 */
export const getDashboardConfigForRole = (role, t) => {
  const configs = {
    [USER_ROLES.SUPER_ADMIN]: {
      label: t('nav.superAdminDashboard'),
      path: '/dashboard/super-admin',
      description: 'Super Admin panel with maximum privileges',
      color: 'purple'
    },
    [USER_ROLES.ADMIN]: {
      label: t('nav.adminDashboard'),
      path: '/dashboard/admin',
      description: 'Admin panel with full system control',
      color: 'red'
    },
    [USER_ROLES.READER]: {
      label: t('nav.readerDashboard'),
      path: '/dashboard/reader',
      description: 'Reader tools and client management',
      color: 'purple'
    },
    [USER_ROLES.MONITOR]: {
      label: t('nav.monitorDashboard'),
      path: '/dashboard/monitor',
      description: 'System monitoring and analytics',
      color: 'blue'
    },
    [USER_ROLES.CLIENT]: {
      label: t('nav.clientDashboard'),
      path: '/dashboard/client',
      description: 'Personal account and bookings',
      color: 'green'
    }
  };

  return configs[role] || null;
};

/**
 * Check if user has permission for a specific role
 * @param {string} userRole - Current user role
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {boolean} True if user has permission
 */
export const hasRole = (userRole, requiredRoles) => {
  if (!userRole) return false;
  
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(userRole);
  }
  
  return userRole === requiredRoles;
};

/**
 * Check if user is admin
 * @param {string} role - User role
 * @returns {boolean}
 */
export const isAdmin = (role) => role === USER_ROLES.ADMIN;

/**
 * Check if user is super admin
 * @param {string} role - User role
 * @returns {boolean}
 */
export const isSuperAdmin = (role) => role === USER_ROLES.SUPER_ADMIN;

/**
 * Check if user is reader
 * @param {string} role - User role
 * @returns {boolean}
 */
export const isReader = (role) => role === USER_ROLES.READER;

/**
 * Check if user is monitor
 * @param {string} role - User role
 * @returns {boolean}
 */
export const isMonitor = (role) => role === USER_ROLES.MONITOR;

/**
 * Check if user is client
 * @param {string} role - User role
 * @returns {boolean}
 */
export const isClient = (role) => role === USER_ROLES.CLIENT;

/**
 * Get role display name
 * @param {string} role - User role
 * @param {function} t - Translation function
 * @returns {string} Localized role name
 */
export const getRoleDisplayName = (role, t) => {
  const roleNames = {
    [USER_ROLES.SUPER_ADMIN]: t('roles.super_admin'),
    [USER_ROLES.ADMIN]: t('roles.admin'),
    [USER_ROLES.READER]: t('roles.reader'),
    [USER_ROLES.MONITOR]: t('roles.monitor'),
    [USER_ROLES.CLIENT]: t('roles.client')
  };

  return roleNames[role] || role;
};

/**
 * Get valid dashboard path for user role
 * @param {string} role - User role
 * @returns {string} Dashboard path
 */
export const getDashboardPath = (role) => {
  if (!role || !Object.values(USER_ROLES).includes(role)) {
    return '/dashboard';
  }
  
  if (role === 'super_admin') {
    return '/dashboard/super-admin';
  }
  
  return `/dashboard/${role}`;
};

/**
 * Check if role is valid
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
export const isValidRole = (role) => {
  return Object.values(USER_ROLES).includes(role);
};

/**
 * Get all available roles
 * @returns {string[]} Array of all roles
 */
export const getAllRoles = () => {
  return Object.values(USER_ROLES);
};

/**
 * Role hierarchy for permission checking
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY = {
  [USER_ROLES.CLIENT]: 1,
  [USER_ROLES.READER]: 2,
  [USER_ROLES.MONITOR]: 3,
  [USER_ROLES.ADMIN]: 4,
  [USER_ROLES.SUPER_ADMIN]: 5
};

/**
 * Check if user role has higher or equal permissions than required role
 * @param {string} userRole - Current user role
 * @param {string} requiredRole - Required minimum role
 * @returns {boolean}
 */
export const hasMinimumRole = (userRole, requiredRole) => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}; 