// =============================================================================
// MONITOR API ROUTES - مسارات مراقب المحتوى
// =============================================================================
// Complete monitor API routes for content moderation and session monitoring

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import middleware
const { authenticateToken, requireRole } = require('../middleware/auth.js');

// Import controllers
const monitorController = require('../controllers/monitorController.js');

// Import validation schemas
const {
  validateSessionAction,
  validateContentModeration,
  validateReportResolution,
  validateEmergencyResponse
} = require('../validators/monitorValidators.js');

// =============================================================================
// RATE LIMITING CONFIGURATIONS
// =============================================================================

// Monitor-specific rate limits
const monitorRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Higher limit for monitors due to real-time nature
  message: {
    success: false,
    error: 'Too many monitor requests, please try again later.',
    code: 'MONITOR_RATE_LIMIT_EXCEEDED'
  }
});

// Critical action rate limits
const criticalActionsLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 critical actions per minute
  message: {
    success: false,
    error: 'Rate limit exceeded for critical monitor actions.',
    code: 'CRITICAL_ACTIONS_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// MIDDLEWARE COMBINATIONS
// =============================================================================

// Standard monitor middleware
const monitorAuth = [authenticateToken, requireRole(['monitor', 'admin', 'super_admin']), monitorRateLimit];

// Critical actions middleware (session termination, emergency response)
const criticalAuth = [
  authenticateToken, 
  requireRole(['monitor', 'admin', 'super_admin']), 
  criticalActionsLimit
];

// =============================================================================
// 1. ACTIVE SESSIONS MONITORING
// =============================================================================

/**
 * GET /api/monitor/sessions/active
 * List all active sessions (calls, chat, bookings)
 * Query params: type, page, limit, reader_id, client_id, status, priority
 */
router.get('/sessions/active', monitorAuth, monitorController.getActiveSessions);

/**
 * GET /api/monitor/sessions/:id
 * View specific session details with conversation history
 * URL params: id (session_id)
 */
router.get('/sessions/:id', monitorAuth, monitorController.getSessionDetails);

/**
 * GET /api/monitor/sessions/:id/conversation
 * Get real-time conversation/call content for monitoring
 * URL params: id (session_id)
 * Query params: include_voice, include_video, from_timestamp
 */
router.get('/sessions/:id/conversation', monitorAuth, monitorController.getSessionConversation);

/**
 * POST /api/monitor/sessions/:id/lock
 * Lock a session to prevent further activity
 * URL params: id (session_id)
 * Body: { reason, notify_participants }
 */
router.post('/sessions/:id/lock', [...criticalAuth, validateSessionAction], monitorController.lockSession);

/**
 * POST /api/monitor/sessions/:id/terminate
 * Terminate a session immediately
 * URL params: id (session_id)
 * Body: { reason, notify_participants, escalate_to_admin }
 */
router.post('/sessions/:id/terminate', [...criticalAuth, validateSessionAction], monitorController.terminateSession);

/**
 * POST /api/monitor/sessions/:id/pause
 * Temporarily pause a session
 * URL params: id (session_id)
 * Body: { reason, duration_minutes }
 */
router.post('/sessions/:id/pause', [...criticalAuth, validateSessionAction], monitorController.pauseSession);

// =============================================================================
// 2. CONTENT MODERATION & APPROVAL QUEUE
// =============================================================================

/**
 * GET /api/monitor/approval-queue
 * Get pending content requiring approval
 * Query params: type, priority, page, limit, reader_id, date_from, date_to
 */
router.get('/approval-queue', monitorAuth, monitorController.getApprovalQueue);

/**
 * POST /api/monitor/content/:id/approve
 * Approve reader message or voice note
 * URL params: id (content_id)
 * Body: { approved, feedback, tags }
 */
router.post('/content/:id/approve', [...monitorAuth, validateContentModeration], monitorController.approveContent);

/**
 * POST /api/monitor/content/:id/reject
 * Reject reader message or voice note
 * URL params: id (content_id)
 * Body: { reason, feedback, escalate, notify_reader }
 */
router.post('/content/:id/reject', [...monitorAuth, validateContentModeration], monitorController.rejectContent);

/**
 * GET /api/monitor/content/flagged
 * Get AI-flagged content requiring review
 * Query params: severity, confidence_score, page, limit, ai_flags
 */
router.get('/content/flagged', monitorAuth, monitorController.getFlaggedContent);

/**
 * POST /api/monitor/content/:id/review
 * Mark flagged content as reviewed
 * URL params: id (content_id)
 * Body: { action, notes, severity_override, training_feedback }
 */
router.post('/content/:id/review', [...monitorAuth, validateContentModeration], monitorController.reviewFlaggedContent);

// =============================================================================
// 3. REPORTS & COMPLAINTS MANAGEMENT
// =============================================================================

/**
 * GET /api/monitor/reports
 * Get all user reports and complaints
 * Query params: status, type, priority, reporter_id, reported_user_id, page, limit
 */
router.get('/reports', monitorAuth, monitorController.getAllReports);

/**
 * GET /api/monitor/reports/:id
 * Get specific report details
 * URL params: id (report_id)
 */
router.get('/reports/:id', monitorAuth, monitorController.getReportDetails);

/**
 * POST /api/monitor/reports/:id/investigate
 * Start investigation on a report
 * URL params: id (report_id)
 * Body: { assigned_to, priority, estimated_resolution_time, notes }
 */
router.post('/reports/:id/investigate', [...monitorAuth, validateReportResolution], monitorController.investigateReport);

/**
 * POST /api/monitor/reports/:id/resolve
 * Resolve a report with action taken
 * URL params: id (report_id)
 * Body: { resolution, action_taken, user_notified, follow_up_required }
 */
router.post('/reports/:id/resolve', [...monitorAuth, validateReportResolution], monitorController.resolveReport);

/**
 * POST /api/monitor/reports/:id/escalate
 * Escalate report to admin level
 * URL params: id (report_id)
 * Body: { escalation_reason, urgency, admin_notes }
 */
router.post('/reports/:id/escalate', [...monitorAuth, validateReportResolution], monitorController.escalateReport);

// =============================================================================
// 4. EMERGENCY MONITORING & RESPONSE
// =============================================================================

/**
 * GET /api/monitor/emergencies
 * Get all emergency alerts and calls
 * Query params: status, severity, page, limit, date_from, date_to
 */
router.get('/emergencies', monitorAuth, monitorController.getEmergencies);

/**
 * POST /api/monitor/emergencies/:id/respond
 * Respond to an emergency alert
 * URL params: id (emergency_id)
 * Body: { response_type, notes, contact_attempted, escalate_to_admin }
 */
router.post('/emergencies/:id/respond', [...criticalAuth, validateEmergencyResponse], monitorController.respondToEmergency);

/**
 * POST /api/monitor/emergencies/:id/resolve
 * Mark emergency as resolved
 * URL params: id (emergency_id)
 * Body: { resolution_summary, follow_up_required, user_contacted }
 */
router.post('/emergencies/:id/resolve', [...criticalAuth, validateEmergencyResponse], monitorController.resolveEmergency);

// =============================================================================
// 5. REAL-TIME MONITORING DASHBOARD
// =============================================================================

/**
 * GET /api/monitor/dashboard/stats
 * Get real-time monitoring statistics
 * Query params: time_range (1h, 6h, 24h, 7d)
 */
router.get('/dashboard/stats', monitorAuth, monitorController.getMonitoringStats);

/**
 * GET /api/monitor/dashboard/alerts
 * Get active alerts requiring attention
 * Query params: severity, type, limit
 */
router.get('/dashboard/alerts', monitorAuth, monitorController.getActiveAlerts);

/**
 * GET /api/monitor/dashboard/activity
 * Get recent monitoring activity feed
 * Query params: limit, include_resolved, monitor_id
 */
router.get('/dashboard/activity', monitorAuth, monitorController.getActivityFeed);

// =============================================================================
// 6. READER MANAGEMENT & OVERSIGHT
// =============================================================================

/**
 * GET /api/monitor/readers
 * Get all readers with monitoring flags
 * Query params: flagged_only, warning_level, performance_score, page, limit
 */
router.get('/readers', monitorAuth, monitorController.getReadersForMonitoring);

/**
 * POST /api/monitor/readers/:id/warn
 * Issue warning to a reader
 * URL params: id (reader_id)
 * Body: { warning_type, message, severity, temporary_restriction }
 */
router.post('/readers/:id/warn', [...monitorAuth, validateContentModeration], monitorController.warnReader);

/**
 * POST /api/monitor/readers/:id/suspend
 * Temporarily suspend a reader
 * URL params: id (reader_id)
 * Body: { reason, duration_hours, notify_admin, active_sessions_action }
 */
router.post('/readers/:id/suspend', [...criticalAuth, validateContentModeration], monitorController.suspendReader);

/**
 * GET /api/monitor/readers/:id/history
 * Get reader's monitoring history
 * URL params: id (reader_id)
 * Query params: include_warnings, include_suspensions, date_from, date_to
 */
router.get('/readers/:id/history', monitorAuth, monitorController.getReaderMonitoringHistory);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
router.use((error, req, res, next) => {
  console.error('Monitor API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
    monitor: req.profile?.id,
    timestamp: new Date().toISOString()
  });

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Monitor operation failed',
    code: error.code || 'MONITOR_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 