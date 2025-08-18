// =============================================================================
// NOTIFICATION API ROUTES - مسارات الإشعارات والتحديثات الفورية
// =============================================================================
// Complete notification API with real-time Socket.IO integration

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import middleware
const { authenticateToken, requireRole } = require('../middleware/auth.js');

// Import controllers
const notificationController = require('../controllers/notificationController.js');

// Import validation schemas
const {
  validateNotificationSend,
  validateNotificationUpdate,
  validateBulkNotification,
  validateNotificationSettings
} = require('../validators/notificationValidators.js');

// =============================================================================
// RATE LIMITING CONFIGURATIONS
// =============================================================================

// General notification rate limits
const notificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes
  message: {
    success: false,
    error: 'Too many notification requests, please try again later.',
    code: 'NOTIFICATION_RATE_LIMIT_EXCEEDED'
  }
});

// Sending notifications rate limit (prevent spam)
const sendNotificationLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 notifications per minute
  message: {
    success: false,
    error: 'Too many notifications sent, please slow down.',
    code: 'SEND_NOTIFICATION_RATE_LIMIT_EXCEEDED'
  }
});

// Bulk notification rate limit (admin/system only)
const bulkNotificationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 bulk notifications per hour
  message: {
    success: false,
    error: 'Bulk notification rate limit exceeded.',
    code: 'BULK_NOTIFICATION_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// MIDDLEWARE COMBINATIONS
// =============================================================================

// Standard notification middleware
const notificationAuth = [authenticateToken, notificationRateLimit];

// Send notification middleware
const sendAuth = [authenticateToken, sendNotificationLimit];

// Admin notification middleware
const adminAuth = [authenticateToken, requireRole(['admin', 'super_admin']), notificationRateLimit];

// Bulk notification middleware (system notifications)
const bulkAuth = [authenticateToken, requireRole(['admin', 'super_admin']), bulkNotificationLimit];

// =============================================================================
// 1. USER NOTIFICATIONS MANAGEMENT
// =============================================================================

/**
 * GET /api/notifications
 * Get user's notifications with filtering
 * Query params: page, limit, type, read_status, date_from, date_to, priority
 */
router.get('/', notificationAuth, notificationController.getUserNotifications);

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications for current user
 */
router.get('/unread-count', notificationAuth, notificationController.getUnreadCount);

/**
 * PUT /api/notifications/:id/read
 * Mark specific notification as read
 * URL params: id (notification_id)
 */
router.put('/:id/read', notificationAuth, notificationController.markAsRead);

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read for current user
 * Query params: type (optional - to mark only specific type as read)
 */
router.put('/mark-all-read', notificationAuth, notificationController.markAllAsRead);

/**
 * DELETE /api/notifications/:id
 * Delete specific notification
 * URL params: id (notification_id)
 */
router.delete('/:id', notificationAuth, notificationController.deleteNotification);

/**
 * DELETE /api/notifications/clear-all
 * Clear all notifications for current user
 * Query params: type (optional - to clear only specific type)
 */
router.delete('/clear-all', notificationAuth, notificationController.clearAllNotifications);

// =============================================================================
// 2. SENDING NOTIFICATIONS
// =============================================================================

/**
 * POST /api/notifications/send
 * Send notification to specific user(s)
 * Body: { recipient_ids, type, title, message, data, priority, channels }
 */
router.post('/send', [...sendAuth, validateNotificationSend], notificationController.sendNotification);

/**
 * POST /api/notifications/send-to-role
 * Send notification to all users with specific role
 * Body: { roles, type, title, message, data, priority, exclude_users }
 */
router.post('/send-to-role', [...adminAuth, validateBulkNotification], notificationController.sendToRole);

/**
 * POST /api/notifications/send-bulk
 * Send bulk notifications (admin only)
 * Body: { recipients, type, title, message, data, priority, schedule_at }
 */
router.post('/send-bulk', [...bulkAuth, validateBulkNotification], notificationController.sendBulkNotification);

/**
 * POST /api/notifications/broadcast
 * Broadcast notification to all active users (super admin only)
 * Body: { type, title, message, data, priority, exclude_roles }
 */
router.post('/broadcast', [
  authenticateToken, 
  requireRole(['super_admin']), 
  bulkNotificationLimit, 
  validateBulkNotification
], notificationController.broadcastNotification);

// =============================================================================
// 3. NOTIFICATION CHANNELS & TYPES
// =============================================================================

/**
 * GET /api/notifications/types
 * Get available notification types and their configurations
 */
router.get('/types', notificationAuth, notificationController.getNotificationTypes);

/**
 * GET /api/notifications/channels
 * Get available notification channels (push, email, sms, socket)
 */
router.get('/channels', notificationAuth, notificationController.getNotificationChannels);

/**
 * PUT /api/notifications/settings
 * Update user's notification preferences
 * Body: { channels, types, quiet_hours, frequency }
 */
router.put('/settings', [...notificationAuth, validateNotificationSettings], notificationController.updateNotificationSettings);

/**
 * GET /api/notifications/settings
 * Get user's current notification settings
 */
router.get('/settings', notificationAuth, notificationController.getNotificationSettings);

// =============================================================================
// 4. REAL-TIME NOTIFICATIONS (SOCKET.IO INTEGRATION)
// =============================================================================

/**
 * POST /api/notifications/realtime/join-room
 * Join user to real-time notification room
 * Body: { room_type, room_id }
 */
router.post('/realtime/join-room', notificationAuth, notificationController.joinNotificationRoom);

/**
 * POST /api/notifications/realtime/leave-room
 * Leave user from real-time notification room
 * Body: { room_type, room_id }
 */
router.post('/realtime/leave-room', notificationAuth, notificationController.leaveNotificationRoom);

/**
 * GET /api/notifications/realtime/active-rooms
 * Get user's active notification rooms
 */
router.get('/realtime/active-rooms', notificationAuth, notificationController.getActiveRooms);

/**
 * POST /api/notifications/realtime/test
 * Send test real-time notification (development only)
 * Body: { type, message }
 */
router.post('/realtime/test', notificationAuth, notificationController.sendTestNotification);

// =============================================================================
// 5. EMERGENCY & PRIORITY NOTIFICATIONS
// =============================================================================

/**
 * POST /api/notifications/emergency
 * Send emergency notification (monitor/admin only)
 * Body: { recipient_ids, emergency_type, message, severity, auto_escalate }
 */
router.post('/emergency', [
  authenticateToken, 
  requireRole(['monitor', 'admin', 'super_admin']), 
  sendNotificationLimit,
  validateNotificationSend
], notificationController.sendEmergencyNotification);

/**
 * POST /api/notifications/priority
 * Send high-priority notification with immediate delivery
 * Body: { recipient_ids, type, title, message, urgency }
 */
router.post('/priority', [
  authenticateToken, 
  requireRole(['monitor', 'admin', 'super_admin']), 
  sendNotificationLimit,
  validateNotificationSend
], notificationController.sendPriorityNotification);

/**
 * GET /api/notifications/emergency/active
 * Get active emergency notifications (admin/monitor only)
 */
router.get('/emergency/active', [
  authenticateToken, 
  requireRole(['monitor', 'admin', 'super_admin'])
], notificationController.getActiveEmergencyNotifications);

// =============================================================================
// 6. NOTIFICATION ANALYTICS & MONITORING
// =============================================================================

/**
 * GET /api/notifications/analytics
 * Get notification analytics (admin only)
 * Query params: date_from, date_to, type, channel, user_role
 */
router.get('/analytics', adminAuth, notificationController.getNotificationAnalytics);

/**
 * GET /api/notifications/delivery-status
 * Get notification delivery statistics
 * Query params: notification_ids, date_from, date_to
 */
router.get('/delivery-status', adminAuth, notificationController.getDeliveryStatus);

/**
 * GET /api/notifications/failed
 * Get failed notifications for retry (admin only)
 * Query params: page, limit, channel, error_type, date_from, date_to
 */
router.get('/failed', adminAuth, notificationController.getFailedNotifications);

/**
 * POST /api/notifications/retry/:id
 * Retry failed notification (admin only)
 * URL params: id (notification_id)
 * Body: { retry_channels, update_content }
 */
router.post('/retry/:id', adminAuth, notificationController.retryNotification);

// =============================================================================
// 7. ROLE-SPECIFIC NOTIFICATION ENDPOINTS
// =============================================================================

/**
 * GET /api/notifications/client
 * Get client-specific notifications
 */
router.get('/client', [
  authenticateToken, 
  requireRole(['client'])
], notificationController.getClientNotifications);

/**
 * GET /api/notifications/reader
 * Get reader-specific notifications
 */
router.get('/reader', [
  authenticateToken, 
  requireRole(['reader'])
], notificationController.getReaderNotifications);

/**
 * GET /api/notifications/admin
 * Get admin-specific notifications
 */
router.get('/admin', [
  authenticateToken, 
  requireRole(['admin', 'super_admin'])
], notificationController.getAdminNotifications);

/**
 * GET /api/notifications/monitor
 * Get monitor-specific notifications
 */
router.get('/monitor', [
  authenticateToken, 
  requireRole(['monitor', 'admin', 'super_admin'])
], notificationController.getMonitorNotifications);

// =============================================================================
// 8. NOTIFICATION TEMPLATES & AUTOMATION
// =============================================================================

/**
 * GET /api/notifications/templates
 * Get notification templates (admin only)
 */
router.get('/templates', adminAuth, notificationController.getNotificationTemplates);

/**
 * POST /api/notifications/templates
 * Create notification template (admin only)
 * Body: { name, type, title_template, message_template, variables, active }
 */
router.post('/templates', adminAuth, notificationController.createNotificationTemplate);

/**
 * PUT /api/notifications/templates/:id
 * Update notification template (admin only)
 * URL params: id (template_id)
 */
router.put('/templates/:id', adminAuth, notificationController.updateNotificationTemplate);

/**
 * DELETE /api/notifications/templates/:id
 * Delete notification template (admin only)
 * URL params: id (template_id)
 */
router.delete('/templates/:id', adminAuth, notificationController.deleteNotificationTemplate);

/**
 * POST /api/notifications/automated
 * Set up automated notification trigger (admin only)
 * Body: { trigger_event, template_id, conditions, recipients_rule }
 */
router.post('/automated', adminAuth, notificationController.createAutomatedNotification);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
router.use((error, req, res, /* next */) => {
  console.error('Notification API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Notification operation failed',
    code: error.code || 'NOTIFICATION_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 
