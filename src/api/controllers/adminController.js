// =============================================================================
// ADMIN CONTROLLER - مراقب الإدارة
// =============================================================================
// Complete admin controller for SAMIA TAROT platform management

// CREDENTIAL SOURCE POLICY COMPLIANCE:
// - Supabase credentials: ONLY from .env (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
// - All other API keys: ONLY from Super Admin Dashboard/Database, NEVER from .env

import { supabaseAdmin as supabase } from '../lib/supabase.js';
import auditService from '../services/auditService.js';
import adminService from '../services/adminService.js';

// =============================================================================
// USER MANAGEMENT CONTROLLERS
// =============================================================================

/**
 * Get all users with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const users = await adminService.getAllUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      role,
      status,
      search,
      sort_by,
      sort_order
    });

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'GET_ALL_USERS', 'users', null, {
      filters: { role, status, search },
      pagination: { page, limit }
    });

    res.json({
      success: true,
      data: users.data,
      pagination: users.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      code: 'FETCH_USERS_ERROR'
    });
  }
};

/**
 * Edit user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const editUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate required fields
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'is_active',
      'avatar_url', 'bio', 'country', 'timezone', 'languages'
    ];

    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update',
        code: 'INVALID_UPDATE_DATA'
      });
    }

    const updatedUser = await adminService.updateUserProfile(id, filteredData);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'UPDATE_USER_PROFILE', 'users', id, {
      updated_fields: Object.keys(filteredData),
      old_data: updateData.old_data || {},
      new_data: filteredData
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'User profile updated successfully'
    });
  } catch (error) {
    console.error('Edit user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile',
      code: 'UPDATE_PROFILE_ERROR'
    });
  }
};

/**
 * Change user role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, reason } = req.body;

    // Validate role
    const validRoles = ['client', 'reader', 'monitor', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified',
        code: 'INVALID_ROLE',
        valid_roles: validRoles
      });
    }

    // Prevent self-demotion for super_admin
    if (req.user.id === id && req.profile.role === 'super_admin' && role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Super admin cannot change their own role',
        code: 'SELF_ROLE_CHANGE_DENIED'
      });
    }

    // Get current user data for logging
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', id)
      .single();

    const updatedUser = await adminService.changeUserRole(id, role);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'CHANGE_USER_ROLE', 'users', id, {
      old_role: currentUser?.role,
      new_role: role,
      reason,
      target_user: `${currentUser?.first_name} ${currentUser?.last_name}`
    });

    res.json({
      success: true,
      data: updatedUser,
      message: `User role changed to ${role} successfully`
    });
  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change user role',
      code: 'CHANGE_ROLE_ERROR'
    });
  }
};

/**
 * Disable (soft delete) user account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const disableUserAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Prevent self-deletion
    if (req.user.id === id) {
      return res.status(403).json({
        success: false,
        error: 'Cannot disable your own account',
        code: 'SELF_DELETION_DENIED'
      });
    }

    // Get user data for logging
    const { data: userData } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, role')
      .eq('id', id)
      .single();

    const disabledUser = await adminService.disableUserAccount(id);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'DISABLE_USER_ACCOUNT', 'users', id, {
      reason,
      disabled_user: `${userData?.first_name} ${userData?.last_name} (${userData?.email})`,
      user_role: userData?.role
    });

    res.json({
      success: true,
      data: disabledUser,
      message: 'User account disabled successfully'
    });
  } catch (error) {
    console.error('Disable user account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable user account',
      code: 'DISABLE_ACCOUNT_ERROR'
    });
  }
};

// =============================================================================
// BOOKING MANAGEMENT CONTROLLERS
// =============================================================================

/**
 * Get all bookings with filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllBookings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      date_from,
      date_to,
      reader_id,
      client_id,
      service_type,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const bookings = await adminService.getAllBookings({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      date_from,
      date_to,
      reader_id,
      client_id,
      service_type,
      sort_by,
      sort_order
    });

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'GET_ALL_BOOKINGS', 'bookings', null, {
      filters: { status, date_from, date_to, reader_id, client_id, service_type },
      pagination: { page, limit }
    });

    res.json({
      success: true,
      data: bookings.data,
      pagination: bookings.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings',
      code: 'FETCH_BOOKINGS_ERROR'
    });
  }
};

/**
 * Update booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate allowed fields
    const allowedFields = ['status', 'notes', 'reader_id', 'scheduled_at', 'service_id'];
    const filteredData = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update',
        code: 'INVALID_UPDATE_DATA'
      });
    }

    // Get current booking data for logging
    const { data: currentBooking } = await supabase
      .from('bookings')
      .select('status, reader_id, client_id, service_id')
      .eq('id', id)
      .single();

    const updatedBooking = await adminService.updateBooking(id, filteredData);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'UPDATE_BOOKING', 'bookings', id, {
      updated_fields: Object.keys(filteredData),
      old_data: currentBooking,
      new_data: filteredData
    });

    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking updated successfully'
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update booking',
      code: 'UPDATE_BOOKING_ERROR'
    });
  }
};

/**
 * Cancel booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required',
        code: 'MISSING_CANCELLATION_REASON'
      });
    }

    // Get booking data for logging
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('status, reader_id, client_id, service_id, scheduled_at')
      .eq('id', id)
      .single();

    const cancelledBooking = await adminService.cancelBooking(id, reason);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'CANCEL_BOOKING', 'bookings', id, {
      reason,
      original_status: bookingData?.status,
      booking_details: bookingData
    });

    res.json({
      success: true,
      data: cancelledBooking,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel booking',
      code: 'CANCEL_BOOKING_ERROR'
    });
  }
};

// =============================================================================
// PAYMENT MANAGEMENT CONTROLLERS
// =============================================================================

/**
 * Get all payments with filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      method,
      status,
      user_id,
      date_from,
      date_to,
      amount_from,
      amount_to,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const payments = await adminService.getAllPayments({
      page: parseInt(page),
      limit: parseInt(limit),
      method,
      status,
      user_id,
      date_from,
      date_to,
      amount_from: amount_from ? parseFloat(amount_from) : null,
      amount_to: amount_to ? parseFloat(amount_to) : null,
      sort_by,
      sort_order
    });

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'GET_ALL_PAYMENTS', 'payments', null, {
      filters: { method, status, user_id, date_from, date_to, amount_from, amount_to },
      pagination: { page, limit }
    });

    res.json({
      success: true,
      data: payments.data,
      pagination: payments.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
      code: 'FETCH_PAYMENTS_ERROR'
    });
  }
};

/**
 * Approve payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    // Get current payment data for logging
    const { data: paymentData } = await supabase
      .from('payments')
      .select('status, amount, method, user_id')
      .eq('id', id)
      .single();

    if (paymentData?.status === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Payment is already approved',
        code: 'PAYMENT_ALREADY_APPROVED'
      });
    }

    const approvedPayment = await adminService.approvePayment(id, admin_notes);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'APPROVE_PAYMENT', 'payments', id, {
      admin_notes,
      amount: paymentData?.amount,
      method: paymentData?.method,
      user_id: paymentData?.user_id,
      previous_status: paymentData?.status
    });

    res.json({
      success: true,
      data: approvedPayment,
      message: 'Payment approved successfully'
    });
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve payment',
      code: 'APPROVE_PAYMENT_ERROR'
    });
  }
};

/**
 * Reject payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, admin_notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required',
        code: 'MISSING_REJECTION_REASON'
      });
    }

    // Get current payment data for logging
    const { data: paymentData } = await supabase
      .from('payments')
      .select('status, amount, method, user_id')
      .eq('id', id)
      .single();

    const rejectedPayment = await adminService.rejectPayment(id, reason, admin_notes);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'REJECT_PAYMENT', 'payments', id, {
      reason,
      admin_notes,
      amount: paymentData?.amount,
      method: paymentData?.method,
      user_id: paymentData?.user_id,
      previous_status: paymentData?.status
    });

    res.json({
      success: true,
      data: rejectedPayment,
      message: 'Payment rejected successfully'
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject payment',
      code: 'REJECT_PAYMENT_ERROR'
    });
  }
};

// =============================================================================
// SERVICE & READER MANAGEMENT CONTROLLERS
// =============================================================================

/**
 * Get all services
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllServices = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, is_active } = req.query;

    const services = await adminService.getAllServices({
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : null
    });

    res.json({
      success: true,
      data: services.data,
      pagination: services.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services',
      code: 'FETCH_SERVICES_ERROR'
    });
  }
};

/**
 * Update service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate allowed fields
    const allowedFields = ['name', 'description', 'price', 'duration_minutes', 'is_active', 'type'];
    const filteredData = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update',
        code: 'INVALID_UPDATE_DATA'
      });
    }

    // Get current service data for logging
    const { data: currentService } = await supabase
      .from('services')
      .select('name, price, is_active, type')
      .eq('id', id)
      .single();

    const updatedService = await adminService.updateService(id, filteredData);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'UPDATE_SERVICE', 'services', id, {
      updated_fields: Object.keys(filteredData),
      old_data: currentService,
      new_data: filteredData
    });

    res.json({
      success: true,
      data: updatedService,
      message: 'Service updated successfully'
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update service',
      code: 'UPDATE_SERVICE_ERROR'
    });
  }
};

/**
 * Get all readers with statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllReaders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      is_active,
      rating_min,
      rating_max,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const readers = await adminService.getAllReaders({
      page: parseInt(page),
      limit: parseInt(limit),
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : null,
      rating_min: rating_min ? parseFloat(rating_min) : null,
      rating_max: rating_max ? parseFloat(rating_max) : null,
      sort_by,
      sort_order
    });

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'GET_ALL_READERS', 'readers', null, {
      filters: { is_active, rating_min, rating_max },
      pagination: { page, limit }
    });

    res.json({
      success: true,
      data: readers.data,
      pagination: readers.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get all readers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch readers',
      code: 'FETCH_READERS_ERROR'
    });
  }
};

// =============================================================================
// ANALYTICS & MONITORING CONTROLLERS
// =============================================================================

/**
 * Get analytics data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAnalytics = async (req, res) => {
  try {
    const { date_from, date_to, include_charts = 'false' } = req.query;

    const analytics = await adminService.getAnalytics({
      date_from,
      date_to,
      include_charts: include_charts === 'true'
    });

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'GET_ANALYTICS', 'analytics', null, {
      date_range: { date_from, date_to },
      include_charts: include_charts === 'true'
    });

    res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      code: 'FETCH_ANALYTICS_ERROR'
    });
  }
};

/**
 * Get audit logs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      admin_id,
      action_type,
      resource_type,
      date_from,
      date_to,
      sort_order = 'desc'
    } = req.query;

    const logs = await auditService.getAuditLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      admin_id,
      action_type,
      resource_type,
      date_from,
      date_to,
      sort_order
    });

    res.json({
      success: true,
      data: logs.data,
      pagination: logs.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      code: 'FETCH_AUDIT_LOGS_ERROR'
    });
  }
};

// =============================================================================
// COMPLAINT MANAGEMENT CONTROLLERS
// =============================================================================

/**
 * Get all complaints
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllComplaints = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      category,
      date_from,
      date_to,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const complaints = await adminService.getAllComplaints({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      priority,
      category,
      date_from,
      date_to,
      sort_by,
      sort_order
    });

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'GET_ALL_COMPLAINTS', 'complaints', null, {
      filters: { status, priority, category, date_from, date_to },
      pagination: { page, limit }
    });

    res.json({
      success: true,
      data: complaints.data,
      pagination: complaints.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaints',
      code: 'FETCH_COMPLAINTS_ERROR'
    });
  }
};

/**
 * Resolve complaint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const resolveComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, resolution_notes } = req.body;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        error: 'Resolution is required',
        code: 'MISSING_RESOLUTION'
      });
    }

    // Get current complaint data for logging
    const { data: complaintData } = await supabase
      .from('complaints')
      .select('status, category, priority, user_id')
      .eq('id', id)
      .single();

    const resolvedComplaint = await adminService.resolveComplaint(id, resolution, resolution_notes);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'RESOLVE_COMPLAINT', 'complaints', id, {
      resolution,
      resolution_notes,
      previous_status: complaintData?.status,
      complaint_category: complaintData?.category,
      complaint_priority: complaintData?.priority
    });

    res.json({
      success: true,
      data: resolvedComplaint,
      message: 'Complaint resolved successfully'
    });
  } catch (error) {
    console.error('Resolve complaint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve complaint',
      code: 'RESOLVE_COMPLAINT_ERROR'
    });
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

const adminController = {
  getAllUsers,
  editUserProfile,
  changeUserRole,
  disableUserAccount,
  getAllBookings,
  updateBooking,
  cancelBooking,
  getAllPayments,
  approvePayment,
  rejectPayment,
  getAllServices,
  updateService,
  getAllReaders,
  getAnalytics,
  getAuditLogs,
  getAllComplaints,
  resolveComplaint
};

export default adminController;