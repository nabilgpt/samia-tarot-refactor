// =============================================================================
// ADMIN CONTROLLER - مراقب الإدارة
// =============================================================================
// Complete admin controller for SAMIA TAROT platform management

const { supabaseAdmin: supabase } = require('../lib/supabase.js');
const auditService = require('../services/auditService.js');
const adminService = require('../services/adminService.js');

// =============================================================================
// USER MANAGEMENT CONTROLLERS
// =============================================================================

/**
 * Get all users with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllUsers = async (req, res) => {
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
const editUserProfile = async (req, res) => {
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
const changeUserRole = async (req, res) => {
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
const disableUserAccount = async (req, res) => {
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

    const result = await adminService.disableUserAccount(id, reason);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'DISABLE_USER_ACCOUNT', 'users', id, {
      reason,
      target_user: userData ? `${userData.first_name} ${userData.last_name} (${userData.email})` : 'Unknown',
      target_role: userData?.role
    });

    res.json({
      success: true,
      data: result,
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
const getAllBookings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      date_from,
      date_to,
      reader_id,
      client_id,
      service_type
    } = req.query;

    const bookings = await adminService.getAllBookings({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      date_from,
      date_to,
      reader_id,
      client_id,
      service_type
    });

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'GET_ALL_BOOKINGS', 'bookings', null, {
      filters: { status, date_from, date_to, reader_id, client_id, service_type }
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
 * Update booking details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate allowed fields
    const allowedFields = [
      'status', 'notes', 'reader_id', 'scheduled_at', 'service_id'
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

    // Get current booking for logging
    const { data: currentBooking } = await supabase
      .from('bookings')
      .select('*')
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
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get booking data for logging
    const { data: bookingData } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles!bookings_client_id_fkey(first_name, last_name),
        reader:profiles!bookings_reader_id_fkey(first_name, last_name)
      `)
      .eq('id', id)
      .single();

    const result = await adminService.cancelBooking(id, reason);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'CANCEL_BOOKING', 'bookings', id, {
      reason,
      booking_details: bookingData,
      client: bookingData?.profiles ? `${bookingData.profiles.first_name} ${bookingData.profiles.last_name}` : 'Unknown',
      reader: bookingData?.reader ? `${bookingData.reader.first_name} ${bookingData.reader.last_name}` : 'Unassigned'
    });

    res.json({
      success: true,
      data: result,
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
const getAllPayments = async (req, res) => {
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
      amount_to
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
      amount_to: amount_to ? parseFloat(amount_to) : null
    });

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'GET_ALL_PAYMENTS', 'payments', null, {
      filters: { method, status, user_id, date_from, date_to, amount_from, amount_to }
    });

    res.json({
      success: true,
      data: payments.data,
      pagination: payments.pagination,
      summary: payments.summary,
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
const approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    // Get payment data for logging
    const { data: paymentData } = await supabase
      .from('payments')
      .select(`
        *,
        profiles!payments_user_id_fkey(first_name, last_name, email)
      `)
      .eq('id', id)
      .single();

    if (!paymentData) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND'
      });
    }

    const result = await adminService.approvePayment(id, admin_notes, req.user.id);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'APPROVE_PAYMENT', 'payments', id, {
      admin_notes,
      amount: paymentData.amount,
      method: paymentData.method,
      user: paymentData.profiles ? `${paymentData.profiles.first_name} ${paymentData.profiles.last_name} (${paymentData.profiles.email})` : 'Unknown'
    });

    res.json({
      success: true,
      data: result,
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
const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes, reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required',
        code: 'REASON_REQUIRED'
      });
    }

    // Get payment data for logging
    const { data: paymentData } = await supabase
      .from('payments')
      .select(`
        *,
        profiles!payments_user_id_fkey(first_name, last_name, email)
      `)
      .eq('id', id)
      .single();

    const result = await adminService.rejectPayment(id, admin_notes, reason, req.user.id);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'REJECT_PAYMENT', 'payments', id, {
      admin_notes,
      reason,
      amount: paymentData?.amount,
      method: paymentData?.method,
      user: paymentData?.profiles ? `${paymentData.profiles.first_name} ${paymentData.profiles.last_name} (${paymentData.profiles.email})` : 'Unknown'
    });

    res.json({
      success: true,
      data: result,
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
const getAllServices = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, is_active } = req.query;

    const services = await adminService.getAllServices({
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : null
    });

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'GET_ALL_SERVICES', 'services', null, {
      filters: { type, is_active }
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
 * Update service details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate allowed fields
    const allowedFields = [
      'name', 'description', 'price', 'duration_minutes', 'is_active', 'type'
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

    // Get current service for logging
    const { data: currentService } = await supabase
      .from('services')
      .select('*')
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
const getAllReaders = async (req, res) => {
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
    await auditService.logAdminAction(req.user.id, 'GET_ALL_READERS', 'profiles', null, {
      filters: { is_active, rating_min, rating_max }
    });

    res.json({
      success: true,
      data: readers.data,
      pagination: readers.pagination,
      summary: readers.summary,
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
// ANALYTICS CONTROLLERS
// =============================================================================

/**
 * Get detailed analytics and statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAnalytics = async (req, res) => {
  try {
    const {
      date_from,
      date_to,
      include_charts = 'false'
    } = req.query;

    const analytics = await adminService.getDetailedAnalytics({
      date_from,
      date_to,
      include_charts: include_charts === 'true'
    });

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'GET_ANALYTICS', 'analytics', null, {
      date_range: { date_from, date_to },
      include_charts
    });

    res.json({
      success: true,
      data: analytics,
      generated_at: new Date().toISOString()
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

// =============================================================================
// AUDIT LOGS CONTROLLERS
// =============================================================================

/**
 * Get audit logs with filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      user_id,
      action,
      date_from,
      date_to,
      resource_type
    } = req.query;

    const logs = await auditService.getAuditLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      user_id,
      action,
      date_from,
      date_to,
      resource_type
    });

    // Log admin action (but don't create infinite loop)
    if (req.query.log_action !== 'false') {
      await auditService.logAdminAction(req.user.id, 'GET_AUDIT_LOGS', 'audit_logs', null, {
        filters: { user_id, action, date_from, date_to, resource_type }
      });
    }

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
// COMPLAINTS & FEEDBACK CONTROLLERS
// =============================================================================

/**
 * Get all complaints and feedback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllComplaints = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      date_from,
      date_to,
      type
    } = req.query;

    const complaints = await adminService.getAllComplaints({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      priority,
      date_from,
      date_to,
      type
    });

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'GET_ALL_COMPLAINTS', 'complaints', null, {
      filters: { status, priority, date_from, date_to, type }
    });

    res.json({
      success: true,
      data: complaints.data,
      pagination: complaints.pagination,
      summary: complaints.summary,
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
const resolveComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes, resolution_action } = req.body;

    if (!resolution_notes) {
      return res.status(400).json({
        success: false,
        error: 'Resolution notes are required',
        code: 'RESOLUTION_NOTES_REQUIRED'
      });
    }

    // Get complaint data for logging
    const { data: complaintData } = await supabase
      .from('user_feedback')
      .select('*')
      .eq('id', id)
      .single();

    const result = await adminService.resolveComplaint(id, resolution_notes, resolution_action, req.user.id);

    // Log admin action
    await auditService.logAdminAction(req.user.id, 'RESOLVE_COMPLAINT', 'complaints', id, {
      resolution_notes,
      resolution_action,
      complaint_type: complaintData?.feedback_type,
      original_complaint: complaintData?.message
    });

    res.json({
      success: true,
      data: result,
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

module.exports = {
  // User Management
  getAllUsers,
  editUserProfile,
  changeUserRole,
  disableUserAccount,

  // Booking Management
  getAllBookings,
  updateBooking,
  cancelBooking,

  // Payment Management
  getAllPayments,
  approvePayment,
  rejectPayment,

  // Service & Reader Management
  getAllServices,
  updateService,
  getAllReaders,

  // Analytics
  getAnalytics,

  // Audit Logs
  getAuditLogs,

  // Complaints & Feedback
  getAllComplaints,
  resolveComplaint
};