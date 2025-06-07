// =============================================================================
// ENHANCED ADMIN ROUTES - مسارات الإدارة المحسنة
// =============================================================================
// Complete and secure admin API routes for SAMIA TAROT platform

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import middleware
const { authenticateToken, requireRole } = require('../middleware/auth.js');

// Import controllers
const adminController = require('../controllers/adminController.js');

// Import validation schemas
const {
  validateUserUpdate,
  validateRoleChange,
  validateBookingUpdate,
  validatePaymentAction,
  validateServiceUpdate,
  validateComplaintResolution
} = require('../validators/adminValidators.js');

// =============================================================================
// RATE LIMITING CONFIGURATIONS
// =============================================================================

// General admin rate limit
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: 'Too many admin requests, please try again later.',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED'
  }
});

// Strict rate limit for sensitive operations
const sensitiveOperationsLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 sensitive operations per minute
  message: {
    success: false,
    error: 'Rate limit exceeded for sensitive operations.',
    code: 'SENSITIVE_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// MIDDLEWARE COMBINATIONS
// =============================================================================

// Standard admin middleware
const adminAuth = [authenticateToken, requireRole(['admin', 'super_admin']), adminRateLimit];

// Sensitive operations middleware
const sensitiveAdminAuth = [
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  sensitiveOperationsLimit
];

// Super admin only middleware
const superAdminAuth = [
  authenticateToken, 
  requireRole(['super_admin']), 
  sensitiveOperationsLimit
];

// =============================================================================
// 1. USER MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/users
 * Get all users with filtering and pagination
 * Query params: page, limit, role, status, search, sort_by, sort_order
 */
router.get('/users', adminAuth, adminController.getAllUsers);

/**
 * PUT /api/admin/users/:id
 * Edit user profile (status, name, email, phone, etc)
 * Body: { first_name?, last_name?, email?, phone?, is_active?, bio?, country?, timezone?, languages? }
 */
router.put('/users/:id', [...sensitiveAdminAuth, validateUserUpdate], adminController.editUserProfile);

/**
 * PATCH /api/admin/users/:id/role
 * Change user role (client, reader, monitor, admin, super_admin)
 * Body: { role: string, reason?: string }
 */
router.patch('/users/:id/role', [...superAdminAuth, validateRoleChange], adminController.changeUserRole);

/**
 * DELETE /api/admin/users/:id
 * Disable (soft delete) a user account
 * Body: { reason: string }
 */
router.delete('/users/:id', [...superAdminAuth, validateUserUpdate], adminController.disableUserAccount);

// =============================================================================
// 2. BOOKING MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/bookings
 * List all bookings with filtering
 * Query params: page, limit, status, date_from, date_to, reader_id, client_id, service_type
 */
router.get('/bookings', adminAuth, adminController.getAllBookings);

/**
 * PUT /api/admin/bookings/:id
 * Update booking status, notes, or assigned reader
 * Body: { status?, notes?, reader_id?, scheduled_at?, service_id? }
 */
router.put('/bookings/:id', [...sensitiveAdminAuth, validateBookingUpdate], adminController.updateBooking);

/**
 * DELETE /api/admin/bookings/:id
 * Cancel booking
 * Body: { reason: string }
 */
router.delete('/bookings/:id', [...sensitiveAdminAuth, validateBookingUpdate], adminController.cancelBooking);

// =============================================================================
// 3. PAYMENT MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/payments
 * Get all payments with filtering
 * Query params: page, limit, method, status, user_id, date_from, date_to, amount_from, amount_to
 */
router.get('/payments', adminAuth, adminController.getAllPayments);

/**
 * PATCH /api/admin/payments/:id/approve
 * Approve payment (manual transfers)
 * Body: { admin_notes?: string }
 */
router.patch('/payments/:id/approve', [...sensitiveAdminAuth, validatePaymentAction], adminController.approvePayment);

/**
 * PATCH /api/admin/payments/:id/reject
 * Reject payment
 * Body: { reason: string, admin_notes?: string }
 */
router.patch('/payments/:id/reject', [...sensitiveAdminAuth, validatePaymentAction], adminController.rejectPayment);

// =============================================================================
// 4. SERVICE & READER MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/services
 * List all services
 * Query params: page, limit, type, is_active
 */
router.get('/services', adminAuth, adminController.getAllServices);

/**
 * PUT /api/admin/services/:id
 * Edit service details (name, price, enabled)
 * Body: { name?, description?, price?, duration_minutes?, is_active?, type? }
 */
router.put('/services/:id', [...sensitiveAdminAuth, validateServiceUpdate], adminController.updateService);

/**
 * GET /api/admin/readers
 * List all readers with statistics
 * Query params: page, limit, is_active, rating_min, rating_max, sort_by, sort_order
 */
router.get('/readers', adminAuth, adminController.getAllReaders);

// =============================================================================
// 5. ANALYTICS & MONITORING ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/analytics
 * Return detailed statistics
 * Query params: date_from, date_to, include_charts
 */
router.get('/analytics', adminAuth, adminController.getAnalytics);

// =============================================================================
// 6. AUDIT & LOGS ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/logs
 * Get audit logs of all admin actions
 * Query params: page, limit, user_id, action, date_from, date_to, resource_type
 */
router.get('/logs', adminAuth, adminController.getAuditLogs);

/**
 * GET /api/admin/logs/summary
 * Get audit summary for dashboard
 * Query params: days
 */
router.get('/logs/summary', adminAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const auditService = require('../services/auditService.js');
    
    const summary = await auditService.getAuditSummary(parseInt(days));
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get audit summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit summary',
      code: 'FETCH_AUDIT_SUMMARY_ERROR'
    });
  }
});

/**
 * GET /api/admin/logs/suspicious/:adminId
 * Check for suspicious admin activity
 * Query params: hours
 */
router.get('/logs/suspicious/:adminId', superAdminAuth, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { hours = 24 } = req.query;
    const auditService = require('../services/auditService.js');
    
    const analysis = await auditService.checkSuspiciousActivity(adminId, parseInt(hours));
    
    res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Check suspicious activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check suspicious activity',
      code: 'CHECK_SUSPICIOUS_ERROR'
    });
  }
});

/**
 * POST /api/admin/logs/export
 * Export audit data for compliance
 * Body: { date_from?, date_to?, admin_id?, include_metadata? }
 */
router.post('/logs/export', superAdminAuth, async (req, res) => {
  try {
    const auditService = require('../services/auditService.js');
    
    const exportData = await auditService.exportAuditData(req.body);
    
    // Log the export action
    await auditService.logAdminAction(req.user.id, 'EXPORT_AUDIT_DATA', 'audit_logs', null, {
      export_options: req.body,
      exported_records: exportData.data.length
    });
    
    res.json({
      success: true,
      data: exportData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Export audit data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit data',
      code: 'EXPORT_AUDIT_ERROR'
    });
  }
});

// =============================================================================
// 7. COMPLAINTS & FEEDBACK ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/complaints
 * Get all client complaints or reports
 * Query params: page, limit, status, priority, date_from, date_to, type
 */
router.get('/complaints', adminAuth, adminController.getAllComplaints);

/**
 * PUT /api/admin/complaints/:id/resolve
 * Mark complaint as resolved
 * Body: { resolution_notes: string, resolution_action?: string }
 */
router.put('/complaints/:id/resolve', [...sensitiveAdminAuth, validateComplaintResolution], adminController.resolveComplaint);

// =============================================================================
// 8. DASHBOARD & OVERVIEW ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/dashboard
 * Get admin dashboard overview
 */
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const adminService = require('../services/adminService.js');
    const auditService = require('../services/auditService.js');
    
    // Get basic analytics
    const analytics = await adminService.getDetailedAnalytics({
      date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
      date_to: new Date().toISOString(),
      include_charts: false
    });
    
    // Get audit summary
    const auditSummary = await auditService.getAuditSummary(7);
    
    // Log dashboard access
    await auditService.logAdminAction(req.user.id, 'ACCESS_ADMIN_DASHBOARD', 'dashboard', null, {
      access_time: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: {
        overview: analytics.overview,
        recent_analytics: {
          revenue: analytics.revenue,
          bookings: analytics.bookings.total,
          users: analytics.users.total
        },
        audit_summary: {
          total_actions: auditSummary.total_actions,
          unique_admins: auditSummary.unique_admins,
          high_risk_actions: auditSummary.high_risk_actions
        },
        admin_info: {
          id: req.user.id,
          role: req.profile.role,
          name: `${req.profile.first_name} ${req.profile.last_name}`,
          last_login: req.profile.last_seen
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load admin dashboard',
      code: 'DASHBOARD_ERROR'
    });
  }
});

/**
 * GET /api/admin/health
 * System health check for admin panel
 */
router.get('/health', adminAuth, async (req, res) => {
  try {
    const { supabaseAdmin: supabase } = require('../lib/supabase.js');
    
    // Test database connection
    const { data: healthCheck, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    const dbStatus = (error || !healthCheck) ? 'unhealthy' : 'healthy';
    
    // Check recent activity
    const { data: recentActivity } = await supabase
      .from('admin_actions')
      .select('id')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .limit(1);
    
    res.json({
      success: true,
      data: {
        system_status: 'operational',
        database_status: dbStatus,
        api_status: 'healthy',
        admin_activity: recentActivity ? 'active' : 'quiet',
        last_check: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Admin health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      code: 'HEALTH_CHECK_ERROR'
    });
  }
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

// Error handler for admin routes
router.use((error, req, res, _next) => {
  console.error('Admin API Error:', error);
  
  // Log error for audit
  const auditService = require('../services/auditService.js');
  if (req.user?.id) {
    auditService.logAdminAction(req.user.id, 'API_ERROR', 'system', null, {
      error_message: error.message,
      stack: error.stack,
      endpoint: req.path,
      method: req.method
    }).catch(console.error);
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error in admin operation',
    code: 'ADMIN_API_ERROR',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for admin routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Admin endpoint not found',
    code: 'ADMIN_ENDPOINT_NOT_FOUND',
    requested_path: req.originalUrl,
    available_endpoints: [
      'GET /api/admin/users',
      'PUT /api/admin/users/:id',
      'PATCH /api/admin/users/:id/role',
      'DELETE /api/admin/users/:id',
      'GET /api/admin/bookings',
      'PUT /api/admin/bookings/:id',
      'DELETE /api/admin/bookings/:id',
      'GET /api/admin/payments',
      'PATCH /api/admin/payments/:id/approve',
      'PATCH /api/admin/payments/:id/reject',
      'GET /api/admin/services',
      'PUT /api/admin/services/:id',
      'GET /api/admin/readers',
      'GET /api/admin/analytics',
      'GET /api/admin/logs',
      'GET /api/admin/complaints',
      'PUT /api/admin/complaints/:id/resolve',
      'GET /api/admin/dashboard',
      'GET /api/admin/health'
    ]
  });
});

module.exports = router; 