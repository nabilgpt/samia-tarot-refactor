// =============================================================================
// SUPPORT & HELPDESK API ROUTES - مسارات الدعم ومكتب المساعدة
// =============================================================================
// Complete support/helpdesk/ticketing system

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import middleware
const { authenticateToken, requireRole } = require('../middleware/auth.js');

// Import controllers
const supportController = require('../controllers/supportController.js');

// Import validation schemas
const {
  validateTicketCreation,
  validateTicketUpdate,
  validateTicketResponse,
  validateTicketEscalation
} = require('../validators/supportValidators.js');

// =============================================================================
// RATE LIMITING CONFIGURATIONS
// =============================================================================

// Support ticket creation rate limits
const ticketCreationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Maximum 5 tickets per hour per user
  message: {
    success: false,
    error: 'Support ticket creation limit exceeded. Please wait before creating another ticket.',
    code: 'SUPPORT_TICKET_RATE_LIMIT_EXCEEDED'
  }
});

// Support response rate limits
const supportResponseLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 responses per 15 minutes
  message: {
    success: false,
    error: 'Support response rate limit exceeded.',
    code: 'SUPPORT_RESPONSE_RATE_LIMIT_EXCEEDED'
  }
});

// General support API rate limits
const supportAPILimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Support API rate limit exceeded.',
    code: 'SUPPORT_API_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// MIDDLEWARE COMBINATIONS
// =============================================================================

// Standard user access
const userAuth = [authenticateToken, supportAPILimit];

// Ticket creation middleware
const ticketAuth = [authenticateToken, ticketCreationLimit];

// Support staff middleware
const staffAuth = [
  authenticateToken, 
  requireRole(['support', 'admin', 'super_admin']), 
  supportResponseLimit
];

// Admin support management
const adminAuth = [
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  supportAPILimit
];

// =============================================================================
// 1. TICKET MANAGEMENT
// =============================================================================

/**
 * POST /api/support/tickets
 * Create new support ticket
 * Body: { subject, description, category, priority, attachments }
 */
router.post('/tickets', [...ticketAuth, validateTicketCreation], supportController.createTicket);

/**
 * GET /api/support/tickets
 * Get support tickets (filtered by user role)
 * Query params: status, category, priority, assigned_to, page, limit, search
 */
router.get('/tickets', userAuth, supportController.getTickets);

/**
 * GET /api/support/tickets/:id
 * Get specific ticket details
 * URL params: id (ticket_id)
 */
router.get('/tickets/:id', userAuth, supportController.getTicketById);

/**
 * PUT /api/support/tickets/:id
 * Update ticket (customer updates)
 * URL params: id (ticket_id)
 * Body: { subject, description, priority, additional_info }
 */
router.put('/tickets/:id', [...userAuth, validateTicketUpdate], supportController.updateTicket);

/**
 * DELETE /api/support/tickets/:id
 * Delete/cancel ticket (customer only)
 * URL params: id (ticket_id)
 */
router.delete('/tickets/:id', userAuth, supportController.deleteTicket);

// =============================================================================
// 2. TICKET RESPONSES & COMMUNICATION
// =============================================================================

/**
 * POST /api/support/tickets/:id/responses
 * Add response to ticket
 * URL params: id (ticket_id)
 * Body: { message, internal_note, attachments, status_change }
 */
router.post('/tickets/:id/responses', [...userAuth, validateTicketResponse], supportController.addTicketResponse);

/**
 * GET /api/support/tickets/:id/responses
 * Get ticket response history
 * URL params: id (ticket_id)
 * Query params: include_internal, page, limit
 */
router.get('/tickets/:id/responses', userAuth, supportController.getTicketResponses);

/**
 * PUT /api/support/tickets/:id/responses/:response_id
 * Update ticket response (staff only)
 * URL params: id (ticket_id), response_id
 * Body: { message, internal_note }
 */
router.put('/tickets/:id/responses/:response_id', [...staffAuth, validateTicketResponse], supportController.updateTicketResponse);

/**
 * DELETE /api/support/tickets/:id/responses/:response_id
 * Delete ticket response (staff only)
 * URL params: id (ticket_id), response_id
 */
router.delete('/tickets/:id/responses/:response_id', staffAuth, supportController.deleteTicketResponse);

// =============================================================================
// 3. SUPPORT STAFF OPERATIONS
// =============================================================================

/**
 * POST /api/support/tickets/:id/assign
 * Assign ticket to support staff (staff/admin only)
 * URL params: id (ticket_id)
 * Body: { assigned_to, assignment_reason, notify_user }
 */
router.post('/tickets/:id/assign', [...staffAuth, validateTicketUpdate], supportController.assignTicket);

/**
 * PUT /api/support/tickets/:id/status
 * Update ticket status (staff only)
 * URL params: id (ticket_id)
 * Body: { status, status_reason, notify_user }
 */
router.put('/tickets/:id/status', [...staffAuth, validateTicketUpdate], supportController.updateTicketStatus);

/**
 * POST /api/support/tickets/:id/escalate
 * Escalate ticket to higher level (staff only)
 * URL params: id (ticket_id)
 * Body: { escalation_level, reason, escalate_to, urgency }
 */
router.post('/tickets/:id/escalate', [...staffAuth, validateTicketEscalation], supportController.escalateTicket);

/**
 * POST /api/support/tickets/:id/resolve
 * Mark ticket as resolved (staff only)
 * URL params: id (ticket_id)
 * Body: { resolution_summary, resolution_type, follow_up_required }
 */
router.post('/tickets/:id/resolve', [...staffAuth, validateTicketUpdate], supportController.resolveTicket);

/**
 * POST /api/support/tickets/:id/close
 * Close ticket (staff only)
 * URL params: id (ticket_id)
 * Body: { closure_reason, customer_satisfaction, final_notes }
 */
router.post('/tickets/:id/close', [...staffAuth, validateTicketUpdate], supportController.closeTicket);

// =============================================================================
// 4. TICKET CATEGORIES & CONFIGURATION
// =============================================================================

/**
 * GET /api/support/categories
 * Get support ticket categories
 */
router.get('/categories', userAuth, supportController.getTicketCategories);

/**
 * POST /api/support/categories
 * Create ticket category (admin only)
 * Body: { name, description, priority_default, auto_assignment_rules }
 */
router.post('/categories', adminAuth, supportController.createTicketCategory);

/**
 * PUT /api/support/categories/:id
 * Update ticket category (admin only)
 * URL params: id (category_id)
 */
router.put('/categories/:id', adminAuth, supportController.updateTicketCategory);

/**
 * DELETE /api/support/categories/:id
 * Delete ticket category (admin only)
 * URL params: id (category_id)
 */
router.delete('/categories/:id', adminAuth, supportController.deleteTicketCategory);

/**
 * GET /api/support/priorities
 * Get ticket priority levels
 */
router.get('/priorities', userAuth, supportController.getTicketPriorities);

// =============================================================================
// 5. SUPPORT STAFF MANAGEMENT
// =============================================================================

/**
 * GET /api/support/staff
 * Get support staff list (admin only)
 * Query params: available_only, specialization, workload_status
 */
router.get('/staff', adminAuth, supportController.getSupportStaff);

/**
 * POST /api/support/staff/:id/availability
 * Update staff availability status
 * URL params: id (staff_id)
 * Body: { available, specializations, max_tickets, notes }
 */
router.post('/staff/:id/availability', staffAuth, supportController.updateStaffAvailability);

/**
 * GET /api/support/staff/:id/workload
 * Get staff workload and statistics
 * URL params: id (staff_id)
 * Query params: date_from, date_to
 */
router.get('/staff/:id/workload', staffAuth, supportController.getStaffWorkload);

/**
 * GET /api/support/staff/my-tickets
 * Get tickets assigned to current staff member
 * Query params: status, priority, page, limit
 */
router.get('/staff/my-tickets', staffAuth, supportController.getMyAssignedTickets);

// =============================================================================
// 6. CUSTOMER FEEDBACK & SATISFACTION
// =============================================================================

/**
 * POST /api/support/tickets/:id/feedback
 * Submit customer feedback for resolved ticket
 * URL params: id (ticket_id)
 * Body: { rating, feedback, areas_for_improvement, recommend }
 */
router.post('/tickets/:id/feedback', userAuth, supportController.submitTicketFeedback);

/**
 * GET /api/support/tickets/:id/feedback
 * Get ticket feedback (staff only)
 * URL params: id (ticket_id)
 */
router.get('/tickets/:id/feedback', staffAuth, supportController.getTicketFeedback);

/**
 * GET /api/support/feedback/summary
 * Get customer satisfaction summary (admin only)
 * Query params: date_from, date_to, category, staff_id
 */
router.get('/feedback/summary', adminAuth, supportController.getFeedbackSummary);

// =============================================================================
// 7. KNOWLEDGE BASE & HELP ARTICLES
// =============================================================================

/**
 * GET /api/support/knowledge-base
 * Get knowledge base articles
 * Query params: category, search, featured_only, page, limit
 */
router.get('/knowledge-base', userAuth, supportController.getKnowledgeBaseArticles);

/**
 * GET /api/support/knowledge-base/:id
 * Get specific knowledge base article
 * URL params: id (article_id)
 */
router.get('/knowledge-base/:id', userAuth, supportController.getKnowledgeBaseArticle);

/**
 * POST /api/support/knowledge-base
 * Create knowledge base article (staff only)
 * Body: { title, content, category, tags, featured, access_level }
 */
router.post('/knowledge-base', staffAuth, supportController.createKnowledgeBaseArticle);

/**
 * PUT /api/support/knowledge-base/:id
 * Update knowledge base article (staff only)
 * URL params: id (article_id)
 */
router.put('/knowledge-base/:id', staffAuth, supportController.updateKnowledgeBaseArticle);

/**
 * DELETE /api/support/knowledge-base/:id
 * Delete knowledge base article (admin only)
 * URL params: id (article_id)
 */
router.delete('/knowledge-base/:id', adminAuth, supportController.deleteKnowledgeBaseArticle);

/**
 * POST /api/support/knowledge-base/:id/helpful
 * Mark article as helpful
 * URL params: id (article_id)
 * Body: { helpful, feedback }
 */
router.post('/knowledge-base/:id/helpful', userAuth, supportController.markArticleHelpful);

// =============================================================================
// 8. SUPPORT ANALYTICS & REPORTING
// =============================================================================

/**
 * GET /api/support/analytics/dashboard
 * Get support dashboard analytics (staff/admin only)
 * Query params: date_from, date_to, breakdown_by
 */
router.get('/analytics/dashboard', staffAuth, supportController.getSupportDashboard);

/**
 * GET /api/support/analytics/performance
 * Get support performance metrics (admin only)
 * Query params: date_from, date_to, staff_id, metrics
 */
router.get('/analytics/performance', adminAuth, supportController.getSupportPerformance);

/**
 * GET /api/support/analytics/trends
 * Get support trends analysis (admin only)
 * Query params: period, trend_types, category
 */
router.get('/analytics/trends', adminAuth, supportController.getSupportTrends);

/**
 * POST /api/support/reports/generate
 * Generate support report (admin only)
 * Body: { report_type, date_from, date_to, filters, format }
 */
router.post('/reports/generate', adminAuth, supportController.generateSupportReport);

// =============================================================================
// 9. AUTOMATED SUPPORT FEATURES
// =============================================================================

/**
 * GET /api/support/auto-suggestions
 * Get automated suggestions for customer query
 * Query params: query, category
 */
router.get('/auto-suggestions', userAuth, supportController.getAutoSuggestions);

/**
 * POST /api/support/auto-response
 * Get automated response for common issues
 * Body: { query, category, user_context }
 */
router.post('/auto-response', userAuth, supportController.getAutoResponse);

/**
 * GET /api/support/faq
 * Get frequently asked questions
 * Query params: category, popular_only, search
 */
router.get('/faq', userAuth, supportController.getFAQ);

/**
 * POST /api/support/faq/:id/helpful
 * Mark FAQ as helpful
 * URL params: id (faq_id)
 * Body: { helpful, feedback }
 */
router.post('/faq/:id/helpful', userAuth, supportController.markFAQHelpful);

// =============================================================================
// 10. SUPPORT INTEGRATIONS & WEBHOOKS
// =============================================================================

/**
 * POST /api/support/webhooks/ticket-created
 * Webhook for ticket creation events (internal)
 */
router.post('/webhooks/ticket-created', supportController.handleTicketCreatedWebhook);

/**
 * POST /api/support/webhooks/ticket-updated
 * Webhook for ticket update events (internal)
 */
router.post('/webhooks/ticket-updated', supportController.handleTicketUpdatedWebhook);

/**
 * GET /api/support/integrations
 * Get support integrations configuration (admin only)
 */
router.get('/integrations', adminAuth, supportController.getSupportIntegrations);

/**
 * PUT /api/support/integrations/:integration
 * Update support integration settings (admin only)
 * URL params: integration
 * Body: { enabled, configuration, webhooks }
 */
router.put('/integrations/:integration', adminAuth, supportController.updateSupportIntegration);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
router.use((error, req, res, next) => {
  console.error('Support API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Support operation failed',
    code: error.code || 'SUPPORT_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 