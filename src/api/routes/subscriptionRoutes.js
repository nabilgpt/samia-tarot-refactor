// =============================================================================
// SUBSCRIPTION & PLANS API ROUTES - مسارات الاشتراكات والخطط
// =============================================================================
// Complete subscription management and access control system

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import middleware
const { authenticateToken, requireRole } = require('../middleware/auth.js');

// Import controllers
const subscriptionController = require('../controllers/subscriptionController.js');

// Import validation schemas
const {
  validatePlanCreation,
  validateSubscriptionUpdate,
  validatePaymentMethod,
  validatePlanUpgrade
} = require('../validators/subscriptionValidators.js');

// =============================================================================
// RATE LIMITING CONFIGURATIONS
// =============================================================================

// Subscription modification rate limits
const subscriptionModifyLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 subscription changes per hour
  message: {
    success: false,
    error: 'Subscription modification limit exceeded.',
    code: 'SUBSCRIPTION_MODIFY_RATE_LIMIT_EXCEEDED'
  }
});

// Payment processing rate limits
const paymentProcessLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 payment attempts per 15 minutes
  message: {
    success: false,
    error: 'Payment processing rate limit exceeded.',
    code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
  }
});

// General subscription API rate limits
const subscriptionAPILimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Subscription API rate limit exceeded.',
    code: 'SUBSCRIPTION_API_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// MIDDLEWARE COMBINATIONS
// =============================================================================

// Standard authenticated users
const userAuth = [authenticateToken, subscriptionAPILimit];

// Subscription modification middleware
const subscriptionAuth = [authenticateToken, subscriptionModifyLimit];

// Payment processing middleware
const paymentAuth = [authenticateToken, paymentProcessLimit];

// Admin subscription management
const adminAuth = [
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  subscriptionAPILimit
];

// =============================================================================
// 1. SUBSCRIPTION PLANS MANAGEMENT
// =============================================================================

/**
 * GET /api/subscriptions/plans
 * Get available subscription plans
 * Query params: active_only, user_type, region
 */
router.get('/plans', userAuth, subscriptionController.getSubscriptionPlans);

/**
 * GET /api/subscriptions/plans/:id
 * Get specific plan details
 * URL params: id (plan_id)
 */
router.get('/plans/:id', userAuth, subscriptionController.getPlanById);

/**
 * POST /api/subscriptions/plans
 * Create new subscription plan (admin only)
 * Body: { name, description, price, duration, features, user_types, active }
 */
router.post('/plans', [...adminAuth, validatePlanCreation], subscriptionController.createSubscriptionPlan);

/**
 * PUT /api/subscriptions/plans/:id
 * Update subscription plan (admin only)
 * URL params: id (plan_id)
 * Body: { name, description, price, duration, features, active }
 */
router.put('/plans/:id', [...adminAuth, validatePlanCreation], subscriptionController.updateSubscriptionPlan);

/**
 * DELETE /api/subscriptions/plans/:id
 * Deactivate subscription plan (admin only)
 * URL params: id (plan_id)
 */
router.delete('/plans/:id', adminAuth, subscriptionController.deactivateSubscriptionPlan);

/**
 * POST /api/subscriptions/plans/:id/features
 * Add feature to subscription plan (admin only)
 * URL params: id (plan_id)
 * Body: { feature_code, feature_name, limits, description }
 */
router.post('/plans/:id/features', adminAuth, subscriptionController.addPlanFeature);

// =============================================================================
// 2. USER SUBSCRIPTIONS
// =============================================================================

/**
 * GET /api/subscriptions/my-subscription
 * Get current user's subscription details
 */
router.get('/my-subscription', userAuth, subscriptionController.getMySubscription);

/**
 * POST /api/subscriptions/subscribe/:plan_id
 * Subscribe to a plan
 * URL params: plan_id
 * Body: { payment_method, billing_address, promo_code }
 */
router.post('/subscribe/:plan_id', [...subscriptionAuth, validatePaymentMethod], subscriptionController.subscribeToPlan);

/**
 * POST /api/subscriptions/upgrade/:plan_id
 * Upgrade to higher plan
 * URL params: plan_id
 * Body: { payment_method, immediate_upgrade, promo_code }
 */
router.post('/upgrade/:plan_id', [...subscriptionAuth, validatePlanUpgrade], subscriptionController.upgradeSubscription);

/**
 * POST /api/subscriptions/downgrade/:plan_id
 * Downgrade to lower plan
 * URL params: plan_id
 * Body: { effective_date, reason }
 */
router.post('/downgrade/:plan_id', [...subscriptionAuth, validatePlanUpgrade], subscriptionController.downgradeSubscription);

/**
 * POST /api/subscriptions/cancel
 * Cancel current subscription
 * Body: { cancellation_reason, feedback, immediate_cancellation }
 */
router.post('/cancel', [...subscriptionAuth, validateSubscriptionUpdate], subscriptionController.cancelSubscription);

/**
 * POST /api/subscriptions/pause
 * Pause current subscription
 * Body: { pause_duration, reason }
 */
router.post('/pause', [...subscriptionAuth, validateSubscriptionUpdate], subscriptionController.pauseSubscription);

/**
 * POST /api/subscriptions/resume
 * Resume paused subscription
 * Body: { payment_method_update }
 */
router.post('/resume', subscriptionAuth, subscriptionController.resumeSubscription);

// =============================================================================
// 3. PAYMENT METHODS & BILLING
// =============================================================================

/**
 * GET /api/subscriptions/payment-methods
 * Get user's payment methods
 */
router.get('/payment-methods', userAuth, subscriptionController.getPaymentMethods);

/**
 * POST /api/subscriptions/payment-methods
 * Add new payment method
 * Body: { type, details, default, billing_address }
 */
router.post('/payment-methods', [...paymentAuth, validatePaymentMethod], subscriptionController.addPaymentMethod);

/**
 * PUT /api/subscriptions/payment-methods/:id
 * Update payment method
 * URL params: id (payment_method_id)
 * Body: { details, default, billing_address }
 */
router.put('/payment-methods/:id', [...paymentAuth, validatePaymentMethod], subscriptionController.updatePaymentMethod);

/**
 * DELETE /api/subscriptions/payment-methods/:id
 * Remove payment method
 * URL params: id (payment_method_id)
 */
router.delete('/payment-methods/:id', paymentAuth, subscriptionController.removePaymentMethod);

/**
 * POST /api/subscriptions/payment-methods/:id/set-default
 * Set payment method as default
 * URL params: id (payment_method_id)
 */
router.post('/payment-methods/:id/set-default', userAuth, subscriptionController.setDefaultPaymentMethod);

// =============================================================================
// 4. BILLING & INVOICES
// =============================================================================

/**
 * GET /api/subscriptions/billing-history
 * Get billing history
 * Query params: page, limit, date_from, date_to, status
 */
router.get('/billing-history', userAuth, subscriptionController.getBillingHistory);

/**
 * GET /api/subscriptions/invoices
 * Get invoices
 * Query params: page, limit, status, date_from, date_to
 */
router.get('/invoices', userAuth, subscriptionController.getInvoices);

/**
 * GET /api/subscriptions/invoices/:id
 * Get specific invoice
 * URL params: id (invoice_id)
 */
router.get('/invoices/:id', userAuth, subscriptionController.getInvoiceById);

/**
 * GET /api/subscriptions/invoices/:id/download
 * Download invoice PDF
 * URL params: id (invoice_id)
 */
router.get('/invoices/:id/download', userAuth, subscriptionController.downloadInvoice);

/**
 * POST /api/subscriptions/invoices/:id/pay
 * Pay outstanding invoice
 * URL params: id (invoice_id)
 * Body: { payment_method_id }
 */
router.post('/invoices/:id/pay', [...paymentAuth, validatePaymentMethod], subscriptionController.payInvoice);

/**
 * GET /api/subscriptions/upcoming-invoice
 * Get upcoming invoice preview
 */
router.get('/upcoming-invoice', userAuth, subscriptionController.getUpcomingInvoice);

// =============================================================================
// 5. SUBSCRIPTION RENEWAL & AUTOMATION
// =============================================================================

/**
 * POST /api/subscriptions/renew
 * Manually renew subscription
 * Body: { payment_method_id, promo_code }
 */
router.post('/renew', [...paymentAuth, validatePaymentMethod], subscriptionController.renewSubscription);

/**
 * PUT /api/subscriptions/auto-renewal
 * Update auto-renewal settings
 * Body: { enabled, payment_method_id, renewal_reminder }
 */
router.put('/auto-renewal', [...userAuth, validateSubscriptionUpdate], subscriptionController.updateAutoRenewal);

/**
 * GET /api/subscriptions/renewal-status
 * Get subscription renewal status
 */
router.get('/renewal-status', userAuth, subscriptionController.getRenewalStatus);

/**
 * POST /api/subscriptions/renewal-reminder
 * Set renewal reminder preferences
 * Body: { days_before, notification_channels, enabled }
 */
router.post('/renewal-reminder', userAuth, subscriptionController.setRenewalReminder);

// =============================================================================
// 6. FEATURE ACCESS & USAGE TRACKING
// =============================================================================

/**
 * GET /api/subscriptions/features
 * Get available features for current subscription
 */
router.get('/features', userAuth, subscriptionController.getSubscriptionFeatures);

/**
 * GET /api/subscriptions/feature-usage
 * Get feature usage statistics
 * Query params: feature_code, date_from, date_to
 */
router.get('/feature-usage', userAuth, subscriptionController.getFeatureUsage);

/**
 * POST /api/subscriptions/check-access/:feature
 * Check access to specific feature
 * URL params: feature (feature_code)
 * Body: { usage_context }
 */
router.post('/check-access/:feature', userAuth, subscriptionController.checkFeatureAccess);

/**
 * POST /api/subscriptions/track-usage
 * Track feature usage
 * Body: { feature_code, usage_amount, metadata }
 */
router.post('/track-usage', userAuth, subscriptionController.trackFeatureUsage);

/**
 * GET /api/subscriptions/usage-limits
 * Get current usage limits
 */
router.get('/usage-limits', userAuth, subscriptionController.getUsageLimits);

// =============================================================================
// 7. PROMO CODES & DISCOUNTS
// =============================================================================

/**
 * POST /api/subscriptions/validate-promo/:code
 * Validate promo code
 * URL params: code (promo_code)
 * Body: { plan_id }
 */
router.post('/validate-promo/:code', userAuth, subscriptionController.validatePromoCode);

/**
 * POST /api/subscriptions/apply-promo
 * Apply promo code to subscription
 * Body: { promo_code, subscription_id }
 */
router.post('/apply-promo', subscriptionAuth, subscriptionController.applyPromoCode);

/**
 * GET /api/subscriptions/promos
 * Get available promo codes (admin only)
 * Query params: active_only, usage_stats, page, limit
 */
router.get('/promos', adminAuth, subscriptionController.getPromoCodes);

/**
 * POST /api/subscriptions/promos
 * Create promo code (admin only)
 * Body: { code, discount_type, discount_value, valid_from, valid_until, usage_limit }
 */
router.post('/promos', adminAuth, subscriptionController.createPromoCode);

/**
 * PUT /api/subscriptions/promos/:id
 * Update promo code (admin only)
 * URL params: id (promo_id)
 */
router.put('/promos/:id', adminAuth, subscriptionController.updatePromoCode);

// =============================================================================
// 8. SUBSCRIPTION ANALYTICS & ADMIN
// =============================================================================

/**
 * GET /api/subscriptions/analytics/dashboard
 * Get subscription analytics dashboard (admin only)
 * Query params: date_from, date_to, breakdown_by
 */
router.get('/analytics/dashboard', adminAuth, subscriptionController.getSubscriptionAnalytics);

/**
 * GET /api/subscriptions/analytics/revenue
 * Get revenue analytics (admin only)
 * Query params: period, plan_breakdown, currency
 */
router.get('/analytics/revenue', adminAuth, subscriptionController.getRevenueAnalytics);

/**
 * GET /api/subscriptions/analytics/churn
 * Get churn analysis (admin only)
 * Query params: period, cohort_analysis, reasons
 */
router.get('/analytics/churn', adminAuth, subscriptionController.getChurnAnalytics);

/**
 * GET /api/subscriptions/analytics/retention
 * Get retention metrics (admin only)
 * Query params: period, cohort_type, plan_id
 */
router.get('/analytics/retention', adminAuth, subscriptionController.getRetentionAnalytics);

/**
 * POST /api/subscriptions/reports/generate
 * Generate subscription report (admin only)
 * Body: { report_type, date_from, date_to, filters, format }
 */
router.post('/reports/generate', adminAuth, subscriptionController.generateSubscriptionReport);

// =============================================================================
// 9. ADMIN SUBSCRIPTION MANAGEMENT
// =============================================================================

/**
 * GET /api/subscriptions/admin/all
 * Get all subscriptions (admin only)
 * Query params: status, plan_id, page, limit, search, date_from, date_to
 */
router.get('/admin/all', adminAuth, subscriptionController.getAllSubscriptions);

/**
 * GET /api/subscriptions/admin/user/:user_id
 * Get user's subscription (admin only)
 * URL params: user_id
 */
router.get('/admin/user/:user_id', adminAuth, subscriptionController.getUserSubscription);

/**
 * POST /api/subscriptions/admin/user/:user_id/grant
 * Grant subscription to user (admin only)
 * URL params: user_id
 * Body: { plan_id, duration, reason, notify_user }
 */
router.post('/admin/user/:user_id/grant', adminAuth, subscriptionController.grantSubscription);

/**
 * POST /api/subscriptions/admin/:subscription_id/modify
 * Modify subscription (admin only)
 * URL params: subscription_id
 * Body: { action, parameters, reason, notify_user }
 */
router.post('/admin/:subscription_id/modify', adminAuth, subscriptionController.modifySubscription);

/**
 * POST /api/subscriptions/admin/:subscription_id/refund
 * Process refund (admin only)
 * URL params: subscription_id
 * Body: { refund_amount, reason, refund_method }
 */
router.post('/admin/:subscription_id/refund', adminAuth, subscriptionController.processRefund);

// =============================================================================
// 10. SUBSCRIPTION WEBHOOKS & INTEGRATIONS
// =============================================================================

/**
 * POST /api/subscriptions/webhooks/payment-success
 * Handle successful payment webhook
 */
router.post('/webhooks/payment-success', subscriptionController.handlePaymentSuccessWebhook);

/**
 * POST /api/subscriptions/webhooks/payment-failed
 * Handle failed payment webhook
 */
router.post('/webhooks/payment-failed', subscriptionController.handlePaymentFailedWebhook);

/**
 * POST /api/subscriptions/webhooks/subscription-updated
 * Handle subscription update webhook
 */
router.post('/webhooks/subscription-updated', subscriptionController.handleSubscriptionUpdatedWebhook);

/**
 * GET /api/subscriptions/integrations
 * Get payment integrations configuration (admin only)
 */
router.get('/integrations', adminAuth, subscriptionController.getPaymentIntegrations);

/**
 * PUT /api/subscriptions/integrations/:provider
 * Update payment integration settings (admin only)
 * URL params: provider
 * Body: { enabled, configuration, webhook_settings }
 */
router.put('/integrations/:provider', adminAuth, subscriptionController.updatePaymentIntegration);

// =============================================================================
// 11. SUBSCRIPTION NOTIFICATIONS
// =============================================================================

/**
 * GET /api/subscriptions/notifications
 * Get subscription-related notifications
 * Query params: type, read_status, page, limit
 */
router.get('/notifications', userAuth, subscriptionController.getSubscriptionNotifications);

/**
 * POST /api/subscriptions/notifications/preferences
 * Update notification preferences
 * Body: { email, sms, push, in_app, notification_types }
 */
router.post('/notifications/preferences', userAuth, subscriptionController.updateNotificationPreferences);

/**
 * POST /api/subscriptions/notifications/test
 * Send test notification (admin only)
 * Body: { user_id, notification_type, channel }
 */
router.post('/notifications/test', adminAuth, subscriptionController.sendTestNotification);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
router.use((error, req, res, /* next */) => {
  console.error('Subscription API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Subscription operation failed',
    code: error.code || 'SUBSCRIPTION_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 