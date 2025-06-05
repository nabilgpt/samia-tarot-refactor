// =====================================================
// API Security Layer - Role-Based Access Control
// =====================================================

import { supabase } from './supabase.js';

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
  'super_admin': 5,
  'admin': 4,
  'monitor': 3,
  'reader': 2,
  'client': 1
};

// Role permissions matrix
const ROLE_PERMISSIONS = {
  'super_admin': {
    canManageUsers: true,
    canManageServices: true,
    canViewAllBookings: true,
    canManageBookings: true,
    canViewAllPayments: true,
    canManagePayments: true,
    canViewAllMessages: true,
    canManageSettings: true,
    canAccessMonitoring: true,
    canManageRoles: true
  },
  'admin': {
    canManageUsers: true,
    canManageServices: true,
    canViewAllBookings: true,
    canManageBookings: true,
    canViewAllPayments: true,
    canManagePayments: true,
    canViewAllMessages: true,
    canManageSettings: true,
    canAccessMonitoring: true,
    canManageRoles: false // Only super admin can manage roles
  },
  'monitor': {
    canManageUsers: false,
    canManageServices: false,
    canViewAllBookings: true,
    canManageBookings: false,
    canViewAllPayments: true,
    canManagePayments: false,
    canViewAllMessages: true,
    canManageSettings: false,
    canAccessMonitoring: true,
    canManageRoles: false
  },
  'reader': {
    canManageUsers: false,
    canManageServices: false,
    canViewAllBookings: false,
    canManageBookings: false, // Can only manage their own bookings
    canViewAllPayments: false,
    canManagePayments: false,
    canViewAllMessages: false, // Can only view their booking messages
    canManageSettings: false,
    canAccessMonitoring: false,
    canManageRoles: false
  },
  'client': {
    canManageUsers: false,
    canManageServices: false,
    canViewAllBookings: false,
    canManageBookings: false, // Can only manage their own bookings
    canViewAllPayments: false,
    canManagePayments: false,
    canViewAllMessages: false, // Can only view their booking messages
    canManageSettings: false,
    canAccessMonitoring: false,
    canManageRoles: false
  }
};

/**
 * Get current user's profile and role
 */
export const getCurrentUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }

    return { user, profile };
  } catch (error) {
    console.error('Error getting current user profile:', error);
    throw error;
  }
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (userRole, permission) => {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return false;
  }
  return ROLE_PERMISSIONS[userRole][permission] || false;
};

/**
 * Check if user has required role level or higher
 */
export const hasRoleLevel = (userRole, requiredRole) => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Validate API access based on user role and requested operation
 */
export const validateAPIAccess = async (requiredPermission, requiredRole = null) => {
  try {
    const { user, profile } = await getCurrentUserProfile();
    
    // Check if user has required permission
    if (requiredPermission && !hasPermission(profile.role, requiredPermission)) {
      throw new Error(`Access denied: Missing permission '${requiredPermission}'`);
    }
    
    // Check if user has required role level
    if (requiredRole && !hasRoleLevel(profile.role, requiredRole)) {
      throw new Error(`Access denied: Requires '${requiredRole}' role or higher`);
    }
    
    return { user, profile };
  } catch (error) {
    console.error('API access validation failed:', error);
    throw error;
  }
};

/**
 * Secure API wrapper that enforces role-based access control
 */
export const secureAPI = {
  // User Management APIs
  async getUsers() {
    await validateAPIAccess('canManageUsers');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch users: ${error.message}`);
    return data;
  },

  async updateUserRole(userId, newRole) {
    await validateAPIAccess('canManageRoles');
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update user role: ${error.message}`);
    return data;
  },

  // Booking Management APIs
  async getAllBookings() {
    await validateAPIAccess('canViewAllBookings');
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        client:profiles!user_id(*),
        reader:profiles!reader_id(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);
    return data;
  },

  async getUserBookings(userId) {
    const { profile } = await getCurrentUserProfile();
    
    // Users can only access their own bookings unless they're admin/monitor
    if (profile.id !== userId && !hasPermission(profile.role, 'canViewAllBookings')) {
      throw new Error('Access denied: Can only view your own bookings');
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        reader:profiles!reader_id(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch user bookings: ${error.message}`);
    return data;
  },

  async getReaderBookings(readerId) {
    const { profile } = await getCurrentUserProfile();
    
    // Readers can only access their own bookings unless they're admin/monitor
    if (profile.id !== readerId && !hasPermission(profile.role, 'canViewAllBookings')) {
      throw new Error('Access denied: Can only view your own assigned bookings');
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*),
        client:profiles!user_id(*)
      `)
      .eq('reader_id', readerId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch reader bookings: ${error.message}`);
    return data;
  },

  // Payment Management APIs
  async getAllPayments() {
    await validateAPIAccess('canViewAllPayments');
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings(*),
        user:profiles!user_id(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch payments: ${error.message}`);
    return data;
  },

  async getUserPayments(userId) {
    const { profile } = await getCurrentUserProfile();
    
    // Users can only access their own payments unless they're admin/monitor
    if (profile.id !== userId && !hasPermission(profile.role, 'canViewAllPayments')) {
      throw new Error('Access denied: Can only view your own payments');
    }

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch user payments: ${error.message}`);
    return data;
  },

  // Service Management APIs
  async getServices() {
    // Services are viewable by all authenticated users
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch services: ${error.message}`);
    return data;
  },

  async getAllServices() {
    await validateAPIAccess('canManageServices');
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch all services: ${error.message}`);
    return data;
  },

  async createService(serviceData) {
    await validateAPIAccess('canManageServices');
    const { data, error } = await supabase
      .from('services')
      .insert([serviceData])
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create service: ${error.message}`);
    return data;
  },

  async updateService(serviceId, updates) {
    await validateAPIAccess('canManageServices');
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', serviceId)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update service: ${error.message}`);
    return data;
  },

  // Message Management APIs
  async getBookingMessages(bookingId) {
    const { profile } = await getCurrentUserProfile();
    
    // Check if user has access to this booking's messages
    if (!hasPermission(profile.role, 'canViewAllMessages')) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('user_id, reader_id')
        .eq('id', bookingId)
        .single();
      
      if (!booking || (booking.user_id !== profile.id && booking.reader_id !== profile.id)) {
        throw new Error('Access denied: Can only view messages for your own bookings');
      }
    }

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(*)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
    return data;
  }
};

/**
 * Higher-order function to wrap API calls with security checks
 */
export const withSecurity = (apiFunction, requiredPermission, requiredRole = null) => {
  return async (...args) => {
    try {
      await validateAPIAccess(requiredPermission, requiredRole);
      return await apiFunction(...args);
    } catch (error) {
      console.error('Secure API call failed:', error);
      throw error;
    }
  };
};

/**
 * Log security events for auditing
 */
export const logSecurityEvent = async (event, details = {}) => {
  try {
    const { user, profile } = await getCurrentUserProfile();
    
    const logEntry = {
      user_id: user.id,
      user_role: profile.role,
      event_type: event,
      details: details,
      ip_address: 'unknown', // Would need additional setup to capture
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    // In a real implementation, you would send this to a security logging service
    console.log('Security Event:', logEntry);
    
    // You could also store security events in a dedicated table
    // await supabase.from('security_logs').insert([logEntry]);
    
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

export default secureAPI; 