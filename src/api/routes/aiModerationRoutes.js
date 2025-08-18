// =============================================================================
// AI MODERATION API ROUTES - مسارات الذكاء الاصطناعي للمراقبة
// =============================================================================
// AI-powered content moderation and monitoring system

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import middleware
const { authenticateToken, requireRole } = require('../middleware/auth.js');

// Import controllers
const aiModerationController = require('../controllers/aiModerationController.js');

// Import validation schemas
const {
  validateContentScan,
  validateAIConfig,
  validateModerationRule,
  validateTrainingData
} = require('../validators/aiModerationValidators.js');

// =============================================================================
// RATE LIMITING CONFIGURATIONS
// =============================================================================

// AI scanning rate limits
const aiScanLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 scan requests per minute
  message: {
    success: false,
    error: 'AI scanning rate limit exceeded.',
    code: 'AI_SCAN_RATE_LIMIT_EXCEEDED'
  }
});

// AI configuration rate limits (admin only)
const aiConfigLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: {
    success: false,
    error: 'AI configuration rate limit exceeded.',
    code: 'AI_CONFIG_RATE_LIMIT_EXCEEDED'
  }
});

// General AI API rate limits
const aiAPILimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    success: false,
    error: 'AI API rate limit exceeded.',
    code: 'AI_API_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// MIDDLEWARE COMBINATIONS
// =============================================================================

// Standard AI API access
// const aiAuth = [authenticateToken, aiAPILimit];

// AI scanning (for real-time content analysis)
const scanAuth = [authenticateToken, aiScanLimit];

// Monitor/Admin access for AI management
const moderatorAuth = [
  authenticateToken, 
  requireRole(['monitor', 'admin', 'super_admin']), 
  aiAPILimit
];

// Admin access for AI configuration
const adminAuth = [
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  aiConfigLimit
];

// =============================================================================
// 1. CONTENT SCANNING & ANALYSIS
// =============================================================================

/**
 * POST /api/ai-moderation/scan/text
 * Scan text content for policy violations
 * Body: { content, context, session_id, priority }
 */
router.post('/scan/text', [...scanAuth, validateContentScan], aiModerationController.scanTextContent);

/**
 * POST /api/ai-moderation/scan/voice
 * Scan voice message transcription
 * Body: { transcript, audio_url, duration, session_id, confidence_threshold }
 */
router.post('/scan/voice', [...scanAuth, validateContentScan], aiModerationController.scanVoiceContent);

/**
 * POST /api/ai-moderation/scan/conversation
 * Scan entire conversation for patterns
 * Body: { session_id, message_ids, analysis_type }
 */
router.post('/scan/conversation', [...scanAuth, validateContentScan], aiModerationController.scanConversation);

/**
 * POST /api/ai-moderation/scan/bulk
 * Bulk scan multiple content items (admin only)
 * Body: { content_items, scan_type, batch_id }
 */
router.post('/scan/bulk', [...adminAuth, validateContentScan], aiModerationController.bulkScanContent);

/**
 * POST /api/ai-moderation/scan/realtime
 * Real-time content scanning (WebSocket alternative)
 * Body: { content, session_id, immediate_response }
 */
router.post('/scan/realtime', scanAuth, aiModerationController.realtimeContentScan);

// =============================================================================
// 2. FLAGGED CONTENT MANAGEMENT
// =============================================================================

/**
 * GET /api/ai-moderation/flagged
 * Get AI-flagged content requiring review
 * Query params: severity, confidence_min, type, status, page, limit, date_from, date_to
 */
router.get('/flagged', moderatorAuth, aiModerationController.getFlaggedContent);

/**
 * GET /api/ai-moderation/flagged/:id
 * Get specific flagged content details
 * URL params: id (flagged_content_id)
 */
router.get('/flagged/:id', moderatorAuth, aiModerationController.getFlaggedContentDetails);

/**
 * POST /api/ai-moderation/flagged/:id/review
 * Review and update flagged content status
 * URL params: id (flagged_content_id)
 * Body: { action, feedback, training_data, override_ai }
 */
router.post('/flagged/:id/review', moderatorAuth, aiModerationController.reviewFlaggedContent);

/**
 * POST /api/ai-moderation/flagged/:id/escalate
 * Escalate flagged content to human moderator
 * URL params: id (flagged_content_id)
 * Body: { escalation_reason, priority, assigned_to }
 */
router.post('/flagged/:id/escalate', moderatorAuth, aiModerationController.escalateFlaggedContent);

/**
 * PUT /api/ai-moderation/flagged/:id/dismiss
 * Dismiss AI flag (mark as false positive)
 * URL params: id (flagged_content_id)
 * Body: { reason, training_feedback }
 */
router.put('/flagged/:id/dismiss', moderatorAuth, aiModerationController.dismissAIFlag);

// =============================================================================
// 3. REAL-TIME MONITORING & ALERTS
// =============================================================================

/**
 * GET /api/ai-moderation/alerts/active
 * Get active AI moderation alerts
 * Query params: severity, type, unacknowledged_only
 */
router.get('/alerts/active', moderatorAuth, aiModerationController.getActiveAlerts);

/**
 * POST /api/ai-moderation/alerts/:id/acknowledge
 * Acknowledge AI moderation alert
 * URL params: id (alert_id)
 * Body: { notes, action_taken }
 */
router.post('/alerts/:id/acknowledge', moderatorAuth, aiModerationController.acknowledgeAlert);

/**
 * GET /api/ai-moderation/monitor/dashboard
 * Get real-time AI monitoring dashboard
 * Query params: time_range, metrics
 */
router.get('/monitor/dashboard', moderatorAuth, aiModerationController.getMonitoringDashboard);

/**
 * GET /api/ai-moderation/monitor/trends
 * Get AI detection trends and patterns
 * Query params: period, violation_types, user_segments
 */
router.get('/monitor/trends', moderatorAuth, aiModerationController.getModerationTrends);

/**
 * POST /api/ai-moderation/alerts/configure
 * Configure AI alert thresholds (admin only)
 * Body: { alert_type, thresholds, notification_channels, escalation_rules }
 */
router.post('/alerts/configure', adminAuth, aiModerationController.configureAlerts);

// =============================================================================
// 4. AI MODEL MANAGEMENT
// =============================================================================

/**
 * GET /api/ai-moderation/models
 * Get available AI moderation models
 */
router.get('/models', adminAuth, aiModerationController.getAIModerationModels);

/**
 * POST /api/ai-moderation/models/train
 * Train AI model with new data (admin only)
 * Body: { training_data, model_type, validation_split }
 */
router.post('/models/train', [...adminAuth, validateTrainingData], aiModerationController.trainAIModel);

/**
 * PUT /api/ai-moderation/models/:id/activate
 * Activate specific AI model version
 * URL params: id (model_id)
 * Body: { activation_reason, rollback_plan }
 */
router.put('/models/:id/activate', adminAuth, aiModerationController.activateAIModel);

/**
 * GET /api/ai-moderation/models/:id/performance
 * Get AI model performance metrics
 * URL params: id (model_id)
 * Query params: date_from, date_to, metric_types
 */
router.get('/models/:id/performance', adminAuth, aiModerationController.getModelPerformance);

/**
 * POST /api/ai-moderation/models/:id/feedback
 * Provide feedback to improve AI model
 * URL params: id (model_id)
 * Body: { prediction_id, correct_classification, feedback_type, notes }
 */
router.post('/models/:id/feedback', moderatorAuth, aiModerationController.provideModelFeedback);

// =============================================================================
// 5. MODERATION RULES & POLICIES
// =============================================================================

/**
 * GET /api/ai-moderation/rules
 * Get AI moderation rules and policies
 * Query params: category, active_only, rule_type
 */
router.get('/rules', adminAuth, aiModerationController.getModerationRules);

/**
 * POST /api/ai-moderation/rules
 * Create new moderation rule (admin only)
 * Body: { name, category, conditions, actions, priority, active }
 */
router.post('/rules', [...adminAuth, validateModerationRule], aiModerationController.createModerationRule);

/**
 * PUT /api/ai-moderation/rules/:id
 * Update moderation rule (admin only)
 * URL params: id (rule_id)
 * Body: { name, conditions, actions, priority, active }
 */
router.put('/rules/:id', [...adminAuth, validateModerationRule], aiModerationController.updateModerationRule);

/**
 * DELETE /api/ai-moderation/rules/:id
 * Delete moderation rule (admin only)
 * URL params: id (rule_id)
 */
router.delete('/rules/:id', adminAuth, aiModerationController.deleteModerationRule);

/**
 * POST /api/ai-moderation/rules/:id/test
 * Test moderation rule against sample content
 * URL params: id (rule_id)
 * Body: { test_content, expected_result }
 */
router.post('/rules/:id/test', adminAuth, aiModerationController.testModerationRule);

// =============================================================================
// 6. AI CONFIGURATION & SETTINGS
// =============================================================================

/**
 * GET /api/ai-moderation/config
 * Get AI moderation configuration (admin only)
 */
router.get('/config', adminAuth, aiModerationController.getAIConfig);

/**
 * PUT /api/ai-moderation/config
 * Update AI moderation configuration (admin only)
 * Body: { confidence_thresholds, auto_actions, escalation_rules, performance_settings }
 */
router.put('/config', [...adminAuth, validateAIConfig], aiModerationController.updateAIConfig);

/**
 * POST /api/ai-moderation/config/reset
 * Reset AI configuration to defaults (super admin only)
 * Body: { confirmation, backup_current }
 */
router.post('/config/reset', [
  authenticateToken, 
  requireRole(['super_admin']), 
  aiConfigLimit
], aiModerationController.resetAIConfig);

/**
 * GET /api/ai-moderation/config/presets
 * Get AI configuration presets
 */
router.get('/config/presets', adminAuth, aiModerationController.getConfigPresets);

/**
 * POST /api/ai-moderation/config/backup
 * Backup current AI configuration
 * Body: { backup_name, description }
 */
router.post('/config/backup', adminAuth, aiModerationController.backupAIConfig);

// =============================================================================
// 7. ANALYTICS & REPORTING
// =============================================================================

/**
 * GET /api/ai-moderation/analytics
 * Get AI moderation analytics (admin only)
 * Query params: date_from, date_to, metrics, breakdown_by
 */
router.get('/analytics', adminAuth, aiModerationController.getAIModerationAnalytics);

/**
 * GET /api/ai-moderation/analytics/accuracy
 * Get AI accuracy and performance analytics
 * Query params: model_id, date_from, date_to, content_types
 */
router.get('/analytics/accuracy', adminAuth, aiModerationController.getAIAccuracyAnalytics);

/**
 * GET /api/ai-moderation/analytics/violations
 * Get violation type analytics
 * Query params: date_from, date_to, severity, user_segments
 */
router.get('/analytics/violations', adminAuth, aiModerationController.getViolationAnalytics);

/**
 * POST /api/ai-moderation/reports/generate
 * Generate AI moderation report
 * Body: { report_type, date_from, date_to, filters, format }
 */
router.post('/reports/generate', adminAuth, aiModerationController.generateModerationReport);

/**
 * GET /api/ai-moderation/analytics/false-positives
 * Get false positive analysis
 * Query params: date_from, date_to, model_id, threshold_analysis
 */
router.get('/analytics/false-positives', adminAuth, aiModerationController.getFalsePositiveAnalysis);

// =============================================================================
// 8. TRAINING & IMPROVEMENT
// =============================================================================

/**
 * POST /api/ai-moderation/training/submit
 * Submit training data for AI improvement
 * Body: { content, correct_classification, category, metadata }
 */
router.post('/training/submit', [...moderatorAuth, validateTrainingData], aiModerationController.submitTrainingData);

/**
 * GET /api/ai-moderation/training/data
 * Get training data for review (admin only)
 * Query params: verified_only, category, date_from, date_to, page, limit
 */
router.get('/training/data', adminAuth, aiModerationController.getTrainingData);

/**
 * POST /api/ai-moderation/training/validate
 * Validate training data entries
 * Body: { training_ids, validation_results }
 */
router.post('/training/validate', adminAuth, aiModerationController.validateTrainingData);

/**
 * GET /api/ai-moderation/training/status
 * Get AI training status and progress
 */
router.get('/training/status', adminAuth, aiModerationController.getTrainingStatus);

/**
 * POST /api/ai-moderation/training/schedule
 * Schedule automatic AI model retraining
 * Body: { schedule_type, frequency, criteria, notification_settings }
 */
router.post('/training/schedule', adminAuth, aiModerationController.scheduleAITraining);

// =============================================================================
// 9. INTEGRATION & WEBHOOKS
// =============================================================================

/**
 * POST /api/ai-moderation/webhooks/register
 * Register webhook for AI moderation events
 * Body: { url, events, secret, active }
 */
router.post('/webhooks/register', adminAuth, aiModerationController.registerWebhook);

/**
 * GET /api/ai-moderation/webhooks
 * Get registered webhooks
 */
router.get('/webhooks', adminAuth, aiModerationController.getWebhooks);

/**
 * POST /api/ai-moderation/webhooks/:id/test
 * Test webhook delivery
 * URL params: id (webhook_id)
 */
router.post('/webhooks/:id/test', adminAuth, aiModerationController.testWebhook);

/**
 * DELETE /api/ai-moderation/webhooks/:id
 * Delete webhook
 * URL params: id (webhook_id)
 */
router.delete('/webhooks/:id', adminAuth, aiModerationController.deleteWebhook);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
router.use((error, req, res, /* next */) => {
  console.error('AI Moderation API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'AI moderation operation failed',
    code: error.code || 'AI_MODERATION_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 
