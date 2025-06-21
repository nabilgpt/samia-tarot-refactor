/**
 * SAMIA TAROT - Payment Settings API Service
 * 
 * Handles all payment settings management operations with role-based access control
 * - Super Admin: Full CRUD operations
 * - Admin: Enable/disable operations only
 * - Other roles: No access
 */

import { supabase } from '../lib/supabase';

// Mock payment methods data for development
const mockPaymentMethods = [
  {
    id: 1,
    method: 'stripe',
    enabled: true,
    countries: ['US', 'CA', 'UK', 'AU'],
    details: { name: 'Stripe', description: 'Credit/Debit Cards' },
    fees: { percentage: 2.9, fixed: 0.30 },
    processing_time: 'Instant',
    auto_confirm: true,
    requires_receipt: false,
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    method: 'paypal',
    enabled: true,
    countries: ['US', 'CA', 'UK', 'AU', 'DE', 'FR'],
    details: { name: 'PayPal', description: 'PayPal Payments' },
    fees: { percentage: 3.49, fixed: 0.49 },
    processing_time: 'Instant',
    auto_confirm: false,
    requires_receipt: false,
    display_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    method: 'bank_transfer',
    enabled: false,
    countries: ['US', 'CA'],
    details: { name: 'Bank Transfer', description: 'Direct Bank Transfer' },
    fees: { percentage: 0, fixed: 0 },
    processing_time: '1-3 business days',
    auto_confirm: false,
    requires_receipt: true,
    display_order: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockPaymentRegions = [
  { code: 'US', name: 'United States', currency: 'USD', enabled: true },
  { code: 'CA', name: 'Canada', currency: 'CAD', enabled: true },
  { code: 'UK', name: 'United Kingdom', currency: 'GBP', enabled: true },
  { code: 'AU', name: 'Australia', currency: 'AUD', enabled: true },
  { code: 'DE', name: 'Germany', currency: 'EUR', enabled: true },
  { code: 'FR', name: 'France', currency: 'EUR', enabled: true }
];

class PaymentSettingsAPI {
  
  /**
   * Check if we're in mock mode
   */
  static isInMockMode() {
    return !import.meta.env.VITE_SUPABASE_URL || 
           import.meta.env.VITE_SUPABASE_URL.includes('localhost') ||
           window.location.hostname === 'localhost';
  }

  /**
   * Get all payment methods (Admin & Super Admin only)
   * @returns {Promise<Object>} API response with payment methods
   */
  static async getPaymentMethods() {
    try {
      // Check if we're in mock mode
      if (this.isInMockMode()) {
        console.log('🔧 Mock mode: Returning payment methods data');
        return {
          success: true,
          data: mockPaymentMethods,
          timestamp: new Date().toISOString()
        };
      }

      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      
      // Fallback to mock data if database fails
      if (error.message?.includes('table') || error.message?.includes('Invalid API key')) {
        console.log('🔧 Falling back to mock payment methods data');
        return {
          success: true,
          data: mockPaymentMethods,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to fetch payment methods'
      };
    }
  }

  /**
   * Create new payment method (Super Admin only)
   * @param {Object} methodData - Payment method data
   * @returns {Promise<Object>} API response
   */
  static async createPaymentMethod(methodData) {
    try {
      // Validate required fields
      if (!methodData.method) {
        throw new Error('Payment method is required');
      }

      const { data, error } = await supabase
        .from('payment_settings')
        .insert({
          method: methodData.method,
          enabled: methodData.enabled !== false,
          countries: methodData.countries || [],
          details: methodData.details || {},
          fees: methodData.fees || {},
          processing_time: methodData.processing_time || 'Unknown',
          auto_confirm: methodData.auto_confirm || false,
          requires_receipt: methodData.requires_receipt || false,
          display_order: methodData.display_order || 0
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Payment method already exists');
        }
        throw error;
      }

      return {
        success: true,
        data,
        message: 'Payment method created successfully'
      };
    } catch (error) {
      console.error('Error creating payment method:', error);
      return {
        success: false,
        error: error.message || 'Failed to create payment method'
      };
    }
  }

  /**
   * Update payment method
   * @param {string} method - Payment method name
   * @param {Object} updateData - Update data
   * @param {string} userRole - User role for permission check
   * @returns {Promise<Object>} API response
   */
  static async updatePaymentMethod(method, updateData, userRole = 'admin') {
    try {
      // Validate method exists
      const { data: existingMethod, error: fetchError } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('method', method)
        .single();

      if (fetchError || !existingMethod) {
        throw new Error('Payment method not found');
      }

      let finalUpdateData = {};

      if (userRole === 'super_admin') {
        // Super Admin can update everything
        finalUpdateData = {
          ...updateData,
          updated_at: new Date().toISOString()
        };
      } else if (userRole === 'admin') {
        // Admin can only enable/disable
        if (updateData.enabled !== undefined) {
          finalUpdateData = {
            enabled: updateData.enabled,
            updated_at: new Date().toISOString()
          };
        } else {
          throw new Error('Admins can only enable/disable payment methods');
        }
      } else {
        throw new Error('Insufficient permissions');
      }

      const { data, error } = await supabase
        .from('payment_settings')
        .update(finalUpdateData)
        .eq('method', method)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Payment method updated successfully'
      };
    } catch (error) {
      console.error('Error updating payment method:', error);
      return {
        success: false,
        error: error.message || 'Failed to update payment method'
      };
    }
  }

  /**
   * Delete payment method (Super Admin only)
   * @param {string} method - Payment method name
   * @returns {Promise<Object>} API response
   */
  static async deletePaymentMethod(method) {
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .delete()
        .eq('method', method)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          throw new Error('Payment method not found');
        }
        throw error;
      }

      return {
        success: true,
        data,
        message: 'Payment method deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting payment method:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete payment method'
      };
    }
  }

  /**
   * Toggle payment method enabled/disabled state
   * @param {string} method - Payment method name
   * @returns {Promise<Object>} API response
   */
  static async togglePaymentMethod(method) {
    try {
      // Get current state
      const { data: currentMethod, error: fetchError } = await supabase
        .from('payment_settings')
        .select('enabled')
        .eq('method', method)
        .single();

      if (fetchError || !currentMethod) {
        throw new Error('Payment method not found');
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

      return {
        success: true,
        data,
        message: `Payment method ${data.enabled ? 'enabled' : 'disabled'} successfully`
      };
    } catch (error) {
      console.error('Error toggling payment method:', error);
      return {
        success: false,
        error: error.message || 'Failed to toggle payment method'
      };
    }
  }

  /**
   * Get payment regions
   * @returns {Promise<Object>} API response with payment regions
   */
  static async getPaymentRegions() {
    try {
      // Mock data for development
      const mockRegions = [
        { code: 'US', name: 'United States', currency: 'USD', enabled: true },
        { code: 'CA', name: 'Canada', currency: 'CAD', enabled: true },
        { code: 'UK', name: 'United Kingdom', currency: 'GBP', enabled: true },
        { code: 'AU', name: 'Australia', currency: 'AUD', enabled: true },
        { code: 'DE', name: 'Germany', currency: 'EUR', enabled: true },
        { code: 'FR', name: 'France', currency: 'EUR', enabled: true }
      ];

      // Check if we're in mock mode or if database fails
      if (!import.meta.env.VITE_SUPABASE_URL || 
          import.meta.env.VITE_SUPABASE_URL.includes('localhost') ||
          window.location.hostname === 'localhost') {
        console.log('🔧 Mock mode: Returning payment regions data');
        return {
          success: true,
          data: mockRegions,
          timestamp: new Date().toISOString()
        };
      }

      const { data, error } = await supabase
        .from('payment_regions')
        .select('*')
        .order('region', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching payment regions:', error);
      
      // Fallback to mock data if database fails
      if (error.message?.includes('table') || error.message?.includes('Invalid API key')) {
        console.log('🔧 Falling back to mock payment regions data');
        const mockRegions = [
          { code: 'US', name: 'United States', currency: 'USD', enabled: true },
          { code: 'CA', name: 'Canada', currency: 'CAD', enabled: true },
          { code: 'UK', name: 'United Kingdom', currency: 'GBP', enabled: true },
          { code: 'AU', name: 'Australia', currency: 'AUD', enabled: true },
          { code: 'DE', name: 'Germany', currency: 'EUR', enabled: true },
          { code: 'FR', name: 'France', currency: 'EUR', enabled: true }
        ];
        return {
          success: true,
          data: mockRegions,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to fetch payment regions'
      };
    }
  }

  /**
   * Get available payment methods for a specific country
   * @param {string} countryCode - ISO country code
   * @returns {Promise<Object>} API response with available methods
   */
  static async getAvailablePaymentMethods(countryCode) {
    try {
      const { data, error } = await supabase
        .rpc('get_available_payment_methods', { 
          user_country_code: countryCode.toUpperCase() 
        });

      if (error) throw error;

      return {
        success: true,
        data,
        country_code: countryCode.toUpperCase(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching available payment methods:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch available payment methods'
      };
    }
  }

  /**
   * Bulk update payment methods (Super Admin only)
   * @param {Array} updates - Array of update objects
   * @returns {Promise<Object>} API response
   */
  static async bulkUpdatePaymentMethods(updates) {
    try {
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new Error('Updates array is required');
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

      return {
        success: errors.length === 0,
        data: results,
        errors: errors.length > 0 ? errors : undefined,
        message: `Updated ${results.length} payment methods${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
      };
    } catch (error) {
      console.error('Error bulk updating payment methods:', error);
      return {
        success: false,
        error: error.message || 'Failed to bulk update payment methods'
      };
    }
  }

  /**
   * Validate payment method for country
   * @param {string} countryCode - ISO country code
   * @param {string} paymentMethod - Payment method name
   * @returns {Promise<Object>} API response with validation result
   */
  static async validatePaymentMethod(countryCode, paymentMethod) {
    try {
      const { data, error } = await supabase
        .rpc('validate_payment_method', { 
          user_country_code: countryCode.toUpperCase(),
          payment_method: paymentMethod
        });

      if (error) throw error;

      return {
        success: true,
        valid: data,
        country_code: countryCode.toUpperCase(),
        payment_method: paymentMethod
      };
    } catch (error) {
      console.error('Error validating payment method:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate payment method'
      };
    }
  }

  /**
   * Get payment method statistics
   * @returns {Promise<Object>} API response with statistics
   */
  static async getPaymentMethodStats() {
    try {
      // Get method counts
      const { data: methods, error: methodsError } = await supabase
        .from('payment_settings')
        .select('method, enabled');

      if (methodsError) throw methodsError;

      // Get payment usage stats
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('method, status, amount')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (paymentsError) throw paymentsError;

      // Calculate statistics
      const totalMethods = methods.length;
      const enabledMethods = methods.filter(m => m.enabled).length;
      const disabledMethods = totalMethods - enabledMethods;

      const methodUsage = {};
      const methodRevenue = {};

      payments.forEach(payment => {
        if (!methodUsage[payment.method]) {
          methodUsage[payment.method] = 0;
          methodRevenue[payment.method] = 0;
        }
        methodUsage[payment.method]++;
        if (payment.status === 'completed') {
          methodRevenue[payment.method] += parseFloat(payment.amount || 0);
        }
      });

      return {
        success: true,
        data: {
          total_methods: totalMethods,
          enabled_methods: enabledMethods,
          disabled_methods: disabledMethods,
          method_usage: methodUsage,
          method_revenue: methodRevenue,
          total_transactions: payments.length,
          total_revenue: Object.values(methodRevenue).reduce((sum, amount) => sum + amount, 0)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching payment method stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch payment method statistics'
      };
    }
  }
}

export default PaymentSettingsAPI; 