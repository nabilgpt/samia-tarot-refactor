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

// Import advanced admin routes
const advancedAdminRoutes = require('./advancedAdminRoutes');

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
// 6. MESSAGES MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/messages
 * Get all platform messages for monitoring
 * Query params: page, limit, status, type, flagged, search
 */
router.get('/messages', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status = 'all', type = 'all', flagged = 'all', search = '' } = req.query;
    const { supabaseAdmin: supabase } = require('../lib/supabase.js');
    
    let query = supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!chat_messages_sender_id_fkey(first_name, last_name),
        receiver:profiles!chat_messages_receiver_id_fkey(first_name, last_name),
        chat_sessions!chat_messages_session_id_fkey(session_id, booking_id)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status !== 'all') {
      if (status === 'flagged') {
        query = query.eq('flagged', true);
      } else {
        query = query.eq('status', status);
      }
    }

    if (type !== 'all') {
      query = query.eq('message_type', type);
    }

    if (flagged !== 'all') {
      query = query.eq('flagged', flagged === 'true');
    }

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: messages, error } = await query;

    if (error) throw error;

    // Format messages for frontend
    const formattedMessages = messages?.map(message => ({
      id: message.id,
      sender: `${message.sender?.first_name || ''} ${message.sender?.last_name || ''}`.trim() || 'مستخدم مجهول',
      receiver: `${message.receiver?.first_name || ''} ${message.receiver?.last_name || ''}`.trim() || 'مستخدم مجهول',
      content: message.content,
      type: message.message_type || 'general',
      status: message.status || 'active',
      flagged: message.flagged || false,
      timestamp: new Date(message.created_at).toLocaleString('ar-EG'),
      sessionId: message.chat_sessions?.session_id || null,
      priority: message.priority || 'normal'
    })) || [];

    res.json({
      success: true,
      data: formattedMessages
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
      code: 'MESSAGES_FETCH_ERROR'
    });
  }
});

/**
 * PUT /api/admin/messages/:id/flag
 * Flag or unflag a message
 * Body: { flagged: boolean, reason?: string }
 */
router.put('/messages/:id/flag', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { flagged, reason } = req.body;
    const { supabaseAdmin: supabase } = require('../lib/supabase.js');

    // Update message
    const { data, error } = await supabase
      .from('chat_messages')
      .update({
        flagged,
        flag_reason: reason,
        flagged_by: req.user.id,
        flagged_at: flagged ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    const auditService = require('../services/auditService.js');
    await auditService.logAdminAction(req.user.id, flagged ? 'FLAG_MESSAGE' : 'UNFLAG_MESSAGE', 'message', id, {
      reason,
      flagged
    });

    res.json({
      success: true,
      data: data,
      message: `Message ${flagged ? 'flagged' : 'unflagged'} successfully`
    });
  } catch (error) {
    console.error('Message flag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update message flag',
      code: 'MESSAGE_FLAG_ERROR'
    });
  }
});

// =============================================================================
// 7. REPORTS GENERATION ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/reports
 * Get all generated reports
 * Query params: page, limit, type, status
 */
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, type = 'all', status = 'all' } = req.query;
    const { supabaseAdmin: supabase } = require('../lib/supabase.js');
    
    let query = supabase
      .from('admin_reports')
      .select(`
        *,
        generated_by_profile:profiles!admin_reports_generated_by_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (type !== 'all') {
      query = query.eq('report_type', type);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: reports, error } = await query;

    if (error) throw error;

    // Format reports for frontend
    const formattedReports = reports?.map(report => ({
      id: report.id,
      name: report.name,
      type: report.report_type,
      description: report.description,
      generatedAt: new Date(report.created_at).toLocaleString('ar-EG'),
      generatedBy: `${report.generated_by_profile?.first_name || ''} ${report.generated_by_profile?.last_name || ''}`.trim() || 'مدير مجهول',
      status: report.status,
      fileSize: report.file_size,
      downloadCount: report.download_count || 0,
      period: report.period_description
    })) || [];

    res.json({
      success: true,
      data: formattedReports
    });
  } catch (error) {
    console.error('Reports fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      code: 'REPORTS_FETCH_ERROR'
    });
  }
});

/**
 * POST /api/admin/reports/generate
 * Generate a new report
 * Body: { type: string, dateRange: string, startDate?: string, endDate?: string }
 */
router.post('/reports/generate', adminAuth, async (req, res) => {
  try {
    const { type, dateRange, startDate, endDate } = req.body;
    const { supabaseAdmin: supabase } = require('../lib/supabase.js');

    // Validate report type
    const validTypes = ['financial', 'users', 'readers', 'sessions', 'security', 'analytics'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report type',
        code: 'INVALID_REPORT_TYPE'
      });
    }

    // Create report record
    const reportName = getReportName(type);
    const { data: report, error } = await supabase
      .from('admin_reports')
      .insert({
        name: reportName,
        report_type: type,
        description: getReportDescription(type),
        generated_by: req.user.id,
        status: 'generating',
        period_description: getDateRangeText(dateRange),
        parameters: { type, dateRange, startDate, endDate }
      })
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    const auditService = require('../services/auditService.js');
    await auditService.logAdminAction(req.user.id, 'GENERATE_REPORT', 'report', report.id, {
      report_type: type,
      date_range: dateRange
    });

    // Simulate report generation (in real implementation, this would be a background job)
    setTimeout(async () => {
      try {
        await supabase
          .from('admin_reports')
          .update({
            status: 'completed',
            file_size: '1.2 MB',
            completed_at: new Date().toISOString()
          })
          .eq('id', report.id);
      } catch (error) {
        console.error('Report completion update error:', error);
      }
    }, 3000);

    res.json({
      success: true,
      data: {
        id: report.id,
        name: reportName,
        type: type,
        description: getReportDescription(type),
        generatedAt: new Date().toLocaleString('ar-EG'),
        generatedBy: 'المدير الحالي',
        status: 'generating',
        fileSize: null,
        downloadCount: 0,
        period: getDateRangeText(dateRange)
      },
      message: 'Report generation started'
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      code: 'REPORT_GENERATION_ERROR'
    });
  }
});

// =============================================================================
// 8. INCIDENTS MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/incidents
 * Get all incidents and reports
 * Query params: page, limit, status, severity, category
 */
router.get('/incidents', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status = 'all', severity = 'all', category = 'all' } = req.query;
    const { supabaseAdmin: supabase } = require('../lib/supabase.js');
    
    let query = supabase
      .from('incidents')
      .select(`
        *,
        reported_by_profile:profiles!incidents_reported_by_fkey(first_name, last_name),
        reported_user_profile:profiles!incidents_reported_user_fkey(first_name, last_name),
        assigned_to_profile:profiles!incidents_assigned_to_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (severity !== 'all') {
      query = query.eq('severity', severity);
    }

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: incidents, error } = await query;

    if (error) throw error;

    // Format incidents for frontend
    const formattedIncidents = incidents?.map(incident => ({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      reportedBy: `${incident.reported_by_profile?.first_name || ''} ${incident.reported_by_profile?.last_name || ''}`.trim() || 'مستخدم مجهول',
      reportedUser: incident.reported_user_profile ? `${incident.reported_user_profile?.first_name || ''} ${incident.reported_user_profile?.last_name || ''}`.trim() : null,
      userRole: incident.user_role,
      severity: incident.severity,
      status: incident.status,
      category: incident.category,
      sessionId: incident.session_id,
      createdAt: new Date(incident.created_at).toLocaleString('ar-EG'),
      updatedAt: new Date(incident.updated_at).toLocaleString('ar-EG'),
      assignedTo: incident.assigned_to_profile ? `${incident.assigned_to_profile?.first_name || ''} ${incident.assigned_to_profile?.last_name || ''}`.trim() : null,
      evidence: incident.evidence || [],
      actions: incident.actions || []
    })) || [];

    res.json({
      success: true,
      data: formattedIncidents
    });
  } catch (error) {
    console.error('Incidents fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incidents',
      code: 'INCIDENTS_FETCH_ERROR'
    });
  }
});

/**
 * PUT /api/admin/incidents/:id
 * Update incident status or assignment
 * Body: { status?: string, assigned_to?: string, resolution_notes?: string }
 */
router.put('/incidents/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, resolution_notes } = req.body;
    const { supabaseAdmin: supabase } = require('../lib/supabase.js');

    // Get current incident to update actions
    const { data: currentIncident } = await supabase
      .from('incidents')
      .select('actions')
      .eq('id', id)
      .single();

    const currentActions = currentIncident?.actions || [];
    const newAction = {
      action: status ? `تم تغيير الحالة إلى ${getStatusText(status)}` : `تم تعيين المحقق: ${assigned_to}`,
      timestamp: new Date().toLocaleString('ar-EG'),
      user: 'المدير الحالي'
    };

    // Update incident
    const updateData = {
      updated_at: new Date().toISOString(),
      actions: [...currentActions, newAction]
    };

    if (status) updateData.status = status;
    if (assigned_to) updateData.assigned_to = assigned_to;
    if (resolution_notes) updateData.resolution_notes = resolution_notes;

    const { data, error } = await supabase
      .from('incidents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    const auditService = require('../services/auditService.js');
    await auditService.logAdminAction(req.user.id, 'UPDATE_INCIDENT', 'incident', id, {
      status,
      assigned_to,
      resolution_notes
    });

    res.json({
      success: true,
      data: data,
      message: 'Incident updated successfully'
    });
  } catch (error) {
    console.error('Incident update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update incident',
      code: 'INCIDENT_UPDATE_ERROR'
    });
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getReportName(type) {
  const names = {
    financial: 'التقرير المالي',
    users: 'تقرير نشاط المستخدمين',
    readers: 'تقرير أداء القراء',
    sessions: 'تقرير الجلسات',
    security: 'تقرير الأمان والحوادث',
    analytics: 'تقرير التحليلات'
  };
  return names[type] || 'تقرير عام';
}

function getReportDescription(type) {
  const descriptions = {
    financial: 'تقرير شامل عن الإيرادات والمصروفات والمعاملات المالية',
    users: 'إحصائيات تفصيلية عن نشاط المستخدمين والتسجيلات الجديدة',
    readers: 'تقييم أداء القراء وإحصائيات الجلسات والتقييمات',
    sessions: 'تحليل شامل لجلسات القراءة والحجوزات',
    security: 'تقرير عن الحوادث الأمنية والتدابير المتخذة',
    analytics: 'تحليلات شاملة لأداء المنصة والمؤشرات الرئيسية'
  };
  return descriptions[type] || 'تقرير عام عن المنصة';
}

function getDateRangeText(range) {
  const ranges = {
    '7days': 'آخر 7 أيام',
    '30days': 'آخر 30 يوم',
    '3months': 'آخر 3 أشهر',
    '6months': 'آخر 6 أشهر',
    '1year': 'آخر سنة',
    'custom': 'فترة مخصصة'
  };
  return ranges[range] || 'فترة محددة';
}

function getStatusText(status) {
  const statusTexts = {
    pending: 'في الانتظار',
    investigating: 'قيد التحقيق',
    escalated: 'مُحال',
    resolved: 'محلول',
    closed: 'مغلق'
  };
  return statusTexts[status] || status;
}

// =============================================================================
// 8. AUDIT & LOGS ENDPOINTS
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
// 9. COMPLAINTS & FEEDBACK ENDPOINTS
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
// FINANCIAL REPORTS ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/finances
 * Get financial reports and analytics
 * Query params: range, type, format
 */
router.get('/finances', adminAuth, async (req, res) => {
  try {
    const { range = 'month', type = 'all' } = req.query;
    const { supabaseAdmin: supabase } = require('../lib/supabase.js');
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (range) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get financial data
    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        profiles!wallet_transactions_user_id_fkey(first_name, last_name),
        bookings!wallet_transactions_booking_id_fkey(
          service_type,
          profiles!bookings_reader_id_fkey(first_name, last_name)
        )
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // Calculate summary statistics
    const completedTransactions = transactions?.filter(t => t.status === 'completed') || [];
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalTransactions = transactions?.length || 0;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / completedTransactions.length : 0;

    // Get previous period for comparison
    const prevStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const { data: prevTransactions } = await supabase
      .from('wallet_transactions')
      .select('amount, status')
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDate.toISOString());

    const prevRevenue = prevTransactions?.filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0;
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          monthlyRevenue: totalRevenue,
          totalTransactions,
          averageTransaction,
          revenueGrowth,
          transactionGrowth: prevTransactions ? ((totalTransactions - prevTransactions.length) / Math.max(prevTransactions.length, 1)) * 100 : 0
        },
        transactions: transactions?.slice(0, 50) || [] // Limit to 50 recent transactions
      }
    });
  } catch (error) {
    console.error('Financial reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch financial reports',
      code: 'FINANCIAL_REPORTS_ERROR'
    });
  }
});

// =============================================================================
// REVIEWS MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/reviews
 * Get all reviews for moderation
 * Query params: status, rating, page, limit
 */
router.get('/reviews', adminAuth, async (req, res) => {
  try {
    const { status = 'all', rating = 'all', page = 1, limit = 50 } = req.query;
    const { supabaseAdmin: supabase } = require('../lib/supabase.js');
    
    let query = supabase
      .from('reviews')
      .select(`
        *,
        profiles!reviews_client_id_fkey(first_name, last_name),
        reader_profiles:profiles!reviews_reader_id_fkey(first_name, last_name),
        bookings!reviews_booking_id_fkey(service_type)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status !== 'all') {
      if (status === 'flagged') {
        query = query.eq('flagged', true);
      } else {
        query = query.eq('status', status);
      }
    }

    if (rating !== 'all') {
      query = query.eq('rating', parseInt(rating));
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: reviews, error } = await query;

    if (error) throw error;

    // Format reviews for frontend
    const formattedReviews = reviews?.map(review => ({
      id: review.id,
      client: `${review.profiles?.first_name || ''} ${review.profiles?.last_name || ''}`.trim() || 'مستخدم مجهول',
      reader: `${review.reader_profiles?.first_name || ''} ${review.reader_profiles?.last_name || ''}`.trim() || 'قارئ مجهول',
      rating: review.rating,
      comment: review.comment,
      status: review.status,
      createdAt: new Date(review.created_at).toLocaleString('ar-EG'),
      serviceType: review.bookings?.service_type || 'خدمة غير محددة',
      flagged: review.flagged || false
    })) || [];

    res.json({
      success: true,
      data: formattedReviews
    });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews',
      code: 'REVIEWS_FETCH_ERROR'
    });
  }
});

/**
 * PUT /api/admin/reviews/:id
 * Update review status (approve/reject)
 * Body: { status: 'approved' | 'rejected', admin_notes?: string }
 */
router.put('/reviews/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const { supabaseAdmin: supabase } = require('../lib/supabase.js');

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be approved or rejected',
        code: 'INVALID_STATUS'
      });
    }

    // Update review
    const { data, error } = await supabase
      .from('reviews')
      .update({
        status,
        admin_notes,
        moderated_by: req.user.id,
        moderated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    const auditService = require('../services/auditService.js');
    await auditService.logAdminAction(req.user.id, 'REVIEW_MODERATION', 'review', id, {
      action: status,
      admin_notes
    });

    res.json({
      success: true,
      data: data,
      message: `Review ${status} successfully`
    });
  } catch (error) {
    console.error('Review update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update review',
      code: 'REVIEW_UPDATE_ERROR'
    });
  }
});

// =============================================================================
// 9. DASHBOARD & OVERVIEW ENDPOINTS
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

// Mount advanced admin routes
router.use('/', advancedAdminRoutes);

module.exports = router; 