// =============================================================================
// EMERGENCY CALL API ROUTES - مسارات المكالمات الطارئة
// =============================================================================
// Emergency call API for urgent requests with priority routing and alerts

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import middleware
const { authenticateToken, requireRole } = require('../middleware/auth.js');

// Import controllers
const emergencyController = require('../controllers/emergencyController.js');

// Import validation schemas
const {
  validateEmergencyRequest,
  validateEmergencyResponse,
  validateEmergencyEscalation,
  validateEmergencyResolution
} = require('../validators/emergencyValidators.js');

// =============================================================================
// RATE LIMITING CONFIGURATIONS
// =============================================================================

// Emergency request rate limits (stricter to prevent abuse)
const emergencyRequestLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Maximum 3 emergency requests per hour per user
  message: {
    success: false,
    error: 'Emergency request limit exceeded. Please contact support if this is a genuine emergency.',
    code: 'EMERGENCY_REQUEST_RATE_LIMIT_EXCEEDED'
  },
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false
});

// Emergency response rate limits (for responders)
const emergencyResponseLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Higher limit for emergency responders
  message: {
    success: false,
    error: 'Emergency response rate limit exceeded.',
    code: 'EMERGENCY_RESPONSE_RATE_LIMIT_EXCEEDED'
  }
});

// General emergency API rate limits
const emergencyAPILimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    success: false,
    error: 'Too many emergency API requests.',
    code: 'EMERGENCY_API_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// MIDDLEWARE COMBINATIONS
// =============================================================================

// Standard authenticated users (clients/readers)
const userAuth = [authenticateToken, emergencyAPILimit];

// Emergency request middleware (for creating emergencies)
const emergencyRequestAuth = [authenticateToken, emergencyRequestLimit];

// Emergency responder middleware (monitor/admin)
const responderAuth = [
  authenticateToken, 
  requireRole(['monitor', 'admin', 'super_admin']), 
  emergencyResponseLimit
];

// Admin emergency management
const adminAuth = [
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  emergencyAPILimit
];

// =============================================================================
// 1. EMERGENCY REQUEST CREATION
// =============================================================================

/**
 * POST /api/emergency/request
 * Create new emergency request (clients and guests)
 * Body: { emergency_type, description, severity, location, contact_preference }
 */
router.post('/request', [...emergencyRequestAuth, validateEmergencyRequest], emergencyController.createEmergencyRequest);

/**
 * POST /api/emergency/anonymous-request
 * Create anonymous emergency request (for guests without account)
 * Body: { emergency_type, description, contact_info, location, severity }
 */
router.post('/anonymous-request', [emergencyRequestLimit, validateEmergencyRequest], emergencyController.createAnonymousEmergencyRequest);

/**
 * POST /api/emergency/panic-button
 * Trigger panic button (immediate highest priority emergency)
 * Body: { location, additional_info }
 */
router.post('/panic-button', emergencyRequestAuth, emergencyController.triggerPanicButton);

/**
 * POST /api/emergency/session/:session_id/escalate
 * Escalate existing session to emergency status
 * URL params: session_id
 * Body: { reason, emergency_type, immediate_response_required }
 */
router.post('/session/:session_id/escalate', [...userAuth, validateEmergencyEscalation], emergencyController.escalateSessionToEmergency);

// =============================================================================
// 2. EMERGENCY RESPONSE & ROUTING
// =============================================================================

/**
 * GET /api/emergency/pending
 * Get all pending emergency requests (responders only)
 * Query params: severity, type, page, limit, unassigned_only
 */
router.get('/pending', responderAuth, emergencyController.getPendingEmergencies);

/**
 * GET /api/emergency/active
 * Get all active emergency responses (responders only)
 * Query params: assigned_to, severity, page, limit
 */
router.get('/active', responderAuth, emergencyController.getActiveEmergencies);

/**
 * POST /api/emergency/:id/accept
 * Accept emergency response assignment
 * URL params: id (emergency_id)
 * Body: { estimated_response_time, initial_notes }
 */
router.post('/:id/accept', [...responderAuth, validateEmergencyResponse], emergencyController.acceptEmergencyResponse);

/**
 * POST /api/emergency/:id/respond
 * Update emergency response with actions taken
 * URL params: id (emergency_id)
 * Body: { response_type, actions_taken, status_update, next_steps }
 */
router.post('/:id/respond', [...responderAuth, validateEmergencyResponse], emergencyController.updateEmergencyResponse);

/**
 * POST /api/emergency/:id/assign
 * Assign emergency to specific responder (admin only)
 * URL params: id (emergency_id)
 * Body: { assigned_to, priority_override, notes }
 */
router.post('/:id/assign', [...adminAuth, validateEmergencyResponse], emergencyController.assignEmergency);

// =============================================================================
// 3. EMERGENCY ESCALATION & ALERTS
// =============================================================================

/**
 * POST /api/emergency/:id/escalate
 * Escalate emergency to higher level (admin/external services)
 * URL params: id (emergency_id)
 * Body: { escalation_level, reason, external_services, urgency }
 */
router.post('/:id/escalate', [...responderAuth, validateEmergencyEscalation], emergencyController.escalateEmergency);

/**
 * POST /api/emergency/:id/alert
 * Send additional alerts for emergency
 * URL params: id (emergency_id)
 * Body: { alert_type, recipients, message, channels }
 */
router.post('/:id/alert', responderAuth, emergencyController.sendEmergencyAlert);

/**
 * POST /api/emergency/:id/siren
 * Trigger emergency siren/notification to all available responders
 * URL params: id (emergency_id)
 * Body: { siren_type, duration_seconds, message }
 */
router.post('/:id/siren', responderAuth, emergencyController.triggerEmergencySiren);

/**
 * POST /api/emergency/broadcast-alert
 * Broadcast emergency alert to all staff (admin only)
 * Body: { emergency_type, message, severity, departments }
 */
router.post('/broadcast-alert', adminAuth, emergencyController.broadcastEmergencyAlert);

// =============================================================================
// 4. EMERGENCY RESOLUTION & FOLLOW-UP
// =============================================================================

/**
 * POST /api/emergency/:id/resolve
 * Mark emergency as resolved
 * URL params: id (emergency_id)
 * Body: { resolution_type, resolution_summary, follow_up_required, user_contacted }
 */
router.post('/:id/resolve', [...responderAuth, validateEmergencyResolution], emergencyController.resolveEmergency);

/**
 * POST /api/emergency/:id/close
 * Close emergency case (admin only)
 * URL params: id (emergency_id)
 * Body: { closure_reason, final_notes, quality_rating }
 */
router.post('/:id/close', [...adminAuth, validateEmergencyResolution], emergencyController.closeEmergency);

/**
 * POST /api/emergency/:id/follow-up
 * Add follow-up action to resolved emergency
 * URL params: id (emergency_id)
 * Body: { follow_up_type, notes, schedule_date, assigned_to }
 */
router.post('/:id/follow-up', responderAuth, emergencyController.addFollowUp);

/**
 * PUT /api/emergency/:id/status
 * Update emergency status
 * URL params: id (emergency_id)
 * Body: { status, status_reason, estimated_resolution }
 */
router.put('/:id/status', responderAuth, emergencyController.updateEmergencyStatus);

// =============================================================================
// 5. EMERGENCY INFORMATION & TRACKING
// =============================================================================

/**
 * GET /api/emergency/:id
 * Get specific emergency details
 * URL params: id (emergency_id)
 */
router.get('/:id', responderAuth, emergencyController.getEmergencyDetails);

/**
 * GET /api/emergency/:id/timeline
 * Get emergency response timeline
 * URL params: id (emergency_id)
 */
router.get('/:id/timeline', responderAuth, emergencyController.getEmergencyTimeline);

/**
 * GET /api/emergency/user/:user_id/history
 * Get user's emergency history (admin only)
 * URL params: user_id
 * Query params: page, limit, status, date_from, date_to
 */
router.get('/user/:user_id/history', adminAuth, emergencyController.getUserEmergencyHistory);

/**
 * GET /api/emergency/my-requests
 * Get current user's emergency requests
 * Query params: status, page, limit
 */
router.get('/my-requests', userAuth, emergencyController.getMyEmergencyRequests);

// =============================================================================
// 6. EMERGENCY CONFIGURATION & SETTINGS
// =============================================================================

/**
 * GET /api/emergency/types
 * Get available emergency types and their configurations
 */
router.get('/types', userAuth, emergencyController.getEmergencyTypes);

/**
 * GET /api/emergency/responders
 * Get available emergency responders (admin only)
 * Query params: available_only, specialization, location
 */
router.get('/responders', adminAuth, emergencyController.getEmergencyResponders);

/**
 * POST /api/emergency/responders/:id/availability
 * Update responder availability status
 * URL params: id (responder_id)
 * Body: { available, specializations, max_concurrent, notes }
 */
router.post('/responders/:id/availability', responderAuth, emergencyController.updateResponderAvailability);

/**
 * GET /api/emergency/settings
 * Get emergency system settings (admin only)
 */
router.get('/settings', adminAuth, emergencyController.getEmergencySettings);

/**
 * PUT /api/emergency/settings
 * Update emergency system settings (admin only)
 * Body: { auto_assignment, escalation_timeouts, alert_intervals, external_services }
 */
router.put('/settings', adminAuth, emergencyController.updateEmergencySettings);

// =============================================================================
// 7. EMERGENCY ANALYTICS & REPORTING
// =============================================================================

/**
 * GET /api/emergency/analytics
 * Get emergency system analytics (admin only)
 * Query params: date_from, date_to, type, severity, responder_id
 */
router.get('/analytics', adminAuth, emergencyController.getEmergencyAnalytics);

/**
 * GET /api/emergency/response-times
 * Get emergency response time statistics
 * Query params: period, type, responder_id
 */
router.get('/response-times', adminAuth, emergencyController.getResponseTimeAnalytics);

/**
 * GET /api/emergency/performance
 * Get emergency system performance metrics
 * Query params: date_from, date_to, metrics
 */
router.get('/performance', adminAuth, emergencyController.getEmergencyPerformance);

/**
 * POST /api/emergency/reports/generate
 * Generate emergency system report (admin only)
 * Body: { report_type, date_from, date_to, filters, format }
 */
router.post('/reports/generate', adminAuth, emergencyController.generateEmergencyReport);

// =============================================================================
// 8. REAL-TIME EMERGENCY MONITORING
// =============================================================================

/**
 * GET /api/emergency/monitor/dashboard
 * Get real-time emergency monitoring dashboard
 */
router.get('/monitor/dashboard', responderAuth, emergencyController.getEmergencyMonitorDashboard);

/**
 * GET /api/emergency/monitor/alerts
 * Get active emergency alerts
 * Query params: severity, type, unacknowledged_only
 */
router.get('/monitor/alerts', responderAuth, emergencyController.getActiveEmergencyAlerts);

/**
 * POST /api/emergency/monitor/heartbeat
 * Update responder heartbeat/availability
 * Body: { status, location, specializations }
 */
router.post('/monitor/heartbeat', responderAuth, emergencyController.updateResponderHeartbeat);

/**
 * GET /api/emergency/monitor/queue
 * Get emergency response queue status
 */
router.get('/monitor/queue', responderAuth, emergencyController.getEmergencyQueue);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
router.use((error, req, res, next) => {
  console.error('Emergency API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date().toISOString(),
    emergency_context: req.params.id || 'general'
  });

  // For emergency APIs, we want to ensure errors are logged with high priority
  if (error.code && error.code.includes('EMERGENCY')) {
    // Log to emergency monitoring system
    console.error('CRITICAL EMERGENCY API ERROR:', error);
  }

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Emergency operation failed',
    code: error.code || 'EMERGENCY_ERROR',
    timestamp: new Date().toISOString(),
    support_contact: process.env.EMERGENCY_SUPPORT_CONTACT || 'support@samia-tarot.com'
  });
});

module.exports = router; 