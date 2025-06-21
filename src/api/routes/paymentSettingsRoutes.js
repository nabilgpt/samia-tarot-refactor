// ===============================================
// PAYMENT SETTINGS MANAGEMENT API ROUTES
// ===============================================

const express = require('express');
const Joi = require('joi');
const { supabase } = require('../lib/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { triggerPaymentMethodsInit, checkPaymentMethodsStatus } = require('../middleware/paymentMethodsInit');
const router = express.Router();

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const paymentMethodSchema = Joi.object({
  method: Joi.string().valid(
    'stripe', 'square', 'usdt', 'western_union', 'moneygram',
    'ria', 'omt', 'whish', 'bob', 'wallet', 'apple_pay', 'google_pay'
  ).required(),
  enabled: Joi.boolean().default(true),
  countries: Joi.array().items(Joi.string().length(2).uppercase()).default([]),
  details: Joi.object().default({}),
  fees: Joi.object().default({}),
  processing_time: Joi.string().max(100).default('Unknown'),
  auto_confirm: Joi.boolean().default(false),
  requires_receipt: Joi.boolean().default(false),
  display_order: Joi.number().integer().min(0).default(0)
});

const updatePaymentMethodSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  countries: Joi.array().items(Joi.string().length(2).uppercase()).optional(),
  details: Joi.object().optional(),
  fees: Joi.object().optional(),
  processing_time: Joi.string().max(100).optional(),
  auto_confirm: Joi.boolean().optional(),
  requires_receipt: Joi.boolean().optional(),
  display_order: Joi.number().integer().min(0).optional()
});

// ===============================================
// MIDDLEWARE
// ===============================================

const adminAuth = [authenticateToken, requireRole(['admin', 'super_admin'])];
const superAdminAuth = [authenticateToken, requireRole(['super_admin'])];

// ===============================================
// ROUTES
// ===============================================

/**
 * GET /api/payment-settings
 * Get all payment methods (Admin & Super Admin only)
 */
router.get('/', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payment_settings')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment settings'
    });
  }
});

/**
 * POST /api/payment-settings
 * Create new payment method (Super Admin only)
 */
router.post('/', superAdminAuth, validateRequest(paymentMethodSchema), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payment_settings')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          success: false,
          error: 'Payment method already exists'
        });
      }
      throw error;
    }

    res.status(201).json({
      success: true,
      data,
      message: 'Payment method created successfully'
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment method'
    });
  }
});

/**
 * PUT /api/payment-settings/:method
 * Update payment method (Super Admin: full update, Admin: enable/disable only)
 */
router.put('/:method', adminAuth, async (req, res) => {
  try {
    const { method } = req.params;
    const userRole = req.user.role;
    
    // Validate method exists
    const { data: existingMethod, error: fetchError } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('method', method)
      .single();

    if (fetchError || !existingMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }

    let updateData = {};

    if (userRole === 'super_admin') {
      // Super Admin can update everything
      const { error: validationError } = updatePaymentMethodSchema.validate(req.body);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError.details[0].message
        });
      }
      updateData = req.body;
    } else if (userRole === 'admin') {
      // Admin can only enable/disable
      if (req.body.enabled !== undefined) {
        updateData.enabled = req.body.enabled;
      } else {
        return res.status(403).json({
          success: false,
          error: 'Admins can only enable/disable payment methods'
        });
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('payment_settings')
      .update(updateData)
      .eq('method', method)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
      message: 'Payment method updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment method'
    });
  }
});

/**
 * DELETE /api/payment-settings/:method
 * Delete payment method (Super Admin only)
 */
router.delete('/:method', superAdminAuth, async (req, res) => {
  try {
    const { method } = req.params;

    const { data, error } = await supabase
      .from('payment_settings')
      .delete()
      .eq('method', method)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return res.status(404).json({
          success: false,
          error: 'Payment method not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment method'
    });
  }
});

/**
 * PATCH /api/payment-settings/:method/toggle
 * Quick toggle enable/disable (Admin & Super Admin)
 */
router.patch('/:method/toggle', adminAuth, async (req, res) => {
  try {
    const { method } = req.params;

    // Get current state
    const { data: currentMethod, error: fetchError } = await supabase
      .from('payment_settings')
      .select('enabled')
      .eq('method', method)
      .single();

    if (fetchError || !currentMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }

    // Toggle the enabled state
    const { data, error } = await supabase
      .from('payment_settings')
      .update({ 
        enabled: !currentMethod.enabled,
        updated_at: new Date().toISOString()
      })
      .eq('method', method)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
      message: `Payment method ${data.enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error toggling payment method:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle payment method'
    });
  }
});

/**
 * GET /api/payment-settings/regions
 * Get payment regions (Admin & Super Admin)
 */
router.get('/regions', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payment_regions')
      .select('*')
      .order('region', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching payment regions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment regions'
    });
  }
});

/**
 * GET /api/payment-settings/available/:countryCode
 * Get available payment methods for a specific country (Public endpoint for frontend)
 */
router.get('/available/:countryCode', async (req, res) => {
  try {
    const { countryCode } = req.params;

    const { data, error } = await supabase
      .rpc('get_available_payment_methods', { 
        user_country_code: countryCode.toUpperCase() 
      });

    if (error) throw error;

    res.json({
      success: true,
      data,
      country_code: countryCode.toUpperCase(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching available payment methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available payment methods'
    });
  }
});

/**
 * POST /api/payment-settings/bulk-update
 * Bulk update payment methods (Super Admin only)
 */
router.post('/bulk-update', superAdminAuth, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Updates array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { method, ...updateData } = update;
        
        const { data, error } = await supabase
          .from('payment_settings')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('method', method)
          .select()
          .single();

        if (error) throw error;
        results.push(data);
      } catch (error) {
        errors.push({ method: update.method, error: error.message });
      }
    }

    res.json({
      success: errors.length === 0,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `Updated ${results.length} payment methods${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });
  } catch (error) {
    console.error('Error bulk updating payment methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update payment methods'
    });
  }
});

/**
 * POST /api/payment-settings/initialize
 * Manually trigger payment methods auto-population (Super Admin only)
 */
router.post('/initialize', superAdminAuth, async (req, res) => {
  try {
    console.log('🚀 Manual payment methods initialization triggered by Super Admin');
    
    const result = await triggerPaymentMethodsInit();
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          initialized: result.initialized,
          verification: result.verification
        },
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Payment methods initialization failed'
      });
    }
  } catch (error) {
    console.error('Error in manual payment methods initialization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize payment methods'
    });
  }
});

/**
 * GET /api/payment-settings/status
 * Check payment methods status (Admin & Super Admin)
 */
router.get('/status', adminAuth, async (req, res) => {
  try {
    const status = await checkPaymentMethodsStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking payment methods status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment methods status'
    });
  }
});

/**
 * GET /api/payment-settings/health
 * Payment methods health check (for system monitoring)
 */
router.get('/health', async (req, res) => {
  try {
    const status = await checkPaymentMethodsStatus();
    
    // Return appropriate HTTP status based on payment methods status
    const httpStatus = status.status === 'healthy' ? 200 : 
                      status.status === 'empty' ? 503 : 
                      status.status === 'partial' ? 206 : 500;
    
    res.status(httpStatus).json({
      status: status.status,
      message: status.message,
      data: {
        total: status.total || 0,
        enabled: status.enabled || 0,
        disabled: status.disabled || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in payment methods health check:', error);
    res.status(500).json({
      status: 'error',
      message: 'Payment methods health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 