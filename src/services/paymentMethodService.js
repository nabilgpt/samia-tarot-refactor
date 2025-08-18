/**
 * SAMIA TAROT - Payment Methods Service
 * 
 * Handles restricted payment methods system with:
 * - Only approved payment methods
 * - Country-based filtering
 * - Dynamic Apple Pay/Google Pay detection
 * - Receipt upload requirements
 */

import { supabase } from '../lib/supabase.js';

// Restricted payment methods - NO OTHERS ALLOWED
const ALLOWED_PAYMENT_METHODS = [
  'stripe',
  'square', 
  'usdt',
  'western_union',
  'moneygram',
  'ria',
  'omt',
  'whish',
  'bob',
  'wallet'
];

class PaymentMethodService {
  
  /**
   * Get available payment methods for a user's country
   * @param {string} countryCode - ISO 3166-1 alpha-2 country code
   * @returns {Promise<Array>} Available payment methods
   */
  static async getAvailablePaymentMethods(countryCode = 'XX') {
    try {
      // Use the database function to get available methods
      const { data, error } = await supabase
        .rpc('get_available_payment_methods', { 
          user_country_code: countryCode.toUpperCase() 
        });

      if (error) throw error;

      // Enhance methods with dynamic gateway features
      const enhancedMethods = await Promise.all(
        data.map(async (method) => await this.enhancePaymentMethod(method))
      );

      return enhancedMethods.filter(method => method !== null);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      // Fallback to basic methods if database fails
      return this.getFallbackMethods(countryCode);
    }
  }

  /**
   * Enhance payment method with dynamic features (Apple Pay, Google Pay)
   * @param {Object} method - Base payment method from database
   * @returns {Promise<Object>} Enhanced payment method
   */
  static async enhancePaymentMethod(method) {
    try {
      const enhanced = { ...method };

      // Add dynamic gateway features for Stripe/Square
      if (method.method === 'stripe' || method.method === 'square') {
        const gatewayFeatures = await this.getGatewayFeatures(method.method);
        enhanced.gateway_features = gatewayFeatures;
        
        // Add Apple Pay/Google Pay options if available
        if (gatewayFeatures.apple_pay_enabled) {
          enhanced.supports_apple_pay = true;
        }
        if (gatewayFeatures.google_pay_enabled) {
          enhanced.supports_google_pay = true;
        }
      }

      // Add method-specific icons and colors
      enhanced.icon = this.getMethodIcon(method.method);
      enhanced.color = this.getMethodColor(method.method);

      return enhanced;
    } catch (error) {
      console.error(`Error enhancing method ${method.method}:`, error);
      return method; // Return basic method if enhancement fails
    }
  }

  /**
   * Get gateway features from API (Apple Pay, Google Pay availability)
   * @param {string} gateway - Gateway name (stripe/square)
   * @returns {Promise<Object>} Gateway features
   */
  static async getGatewayFeatures(gateway) {
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('features, is_active')
        .eq('gateway', gateway)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { apple_pay_enabled: false, google_pay_enabled: false };
      }

      return {
        apple_pay_enabled: data.features?.apple_pay_enabled || false,
        google_pay_enabled: data.features?.google_pay_enabled || false,
        ...data.features
      };
    } catch (error) {
      console.error(`Error fetching ${gateway} features:`, error);
      return { apple_pay_enabled: false, google_pay_enabled: false };
    }
  }

  /**
   * Validate if a payment method is allowed for a country
   * @param {string} countryCode - User's country code
   * @param {string} paymentMethod - Payment method to validate
   * @returns {Promise<boolean>} Whether method is valid
   */
  static async validatePaymentMethod(countryCode, paymentMethod) {
    // First check if method is in allowed list
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .rpc('validate_payment_method', {
          user_country_code: countryCode.toUpperCase(),
          payment_method: paymentMethod
        });

      if (error) throw error;
      return Boolean(data);
    } catch (error) {
      console.error('Error validating payment method:', error);
      return false;
    }
  }

  /**
   * Get fallback payment methods if database is unavailable
   * @param {string} countryCode - User's country code
   * @returns {Array} Basic payment methods
   */
  static getFallbackMethods(countryCode) {
    const upperCountry = countryCode.toUpperCase();
    
    // EU countries - Stripe
    const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'LU'];
    // UAE - Stripe
    const stripeCountries = [...euCountries, 'AE'];
    // Square supported
    // const squareCountries = ['US', 'CA', 'AU', 'GB', 'JP'];
    // Lebanon - special methods
    const lebanonMethods = ['omt', 'whish', 'bob'];

    let methods = [];

    // Card payments
    if (stripeCountries.includes(upperCountry)) {
      methods.push(this.createFallbackMethod('stripe'));
    } else {
      methods.push(this.createFallbackMethod('square'));
    }

    // Crypto and transfers (global)
    methods.push(this.createFallbackMethod('usdt'));
    methods.push(this.createFallbackMethod('western_union'));
    methods.push(this.createFallbackMethod('moneygram'));
    methods.push(this.createFallbackMethod('ria'));

    // Lebanon-specific
    if (upperCountry === 'LB') {
      lebanonMethods.forEach(method => {
        methods.push(this.createFallbackMethod(method));
      });
    }

    // Wallet (always available)
    methods.push(this.createFallbackMethod('wallet'));

    return methods;
  }

  /**
   * Create a fallback method object
   * @param {string} methodName - Payment method name
   * @returns {Object} Fallback method object
   */
  static createFallbackMethod(methodName) {
    const methodConfigs = {
      stripe: {
        method: 'stripe',
        enabled: true,
        details: { description: 'Credit/Debit Card via Stripe' },
        fees: { percentage: 2.9, fixed: 0.30 },
        processing_time: 'Instant',
        auto_confirm: true,
        requires_receipt: false,
        display_order: 1
      },
      square: {
        method: 'square',
        enabled: true,
        details: { description: 'Credit/Debit Card via Square' },
        fees: { percentage: 2.6, fixed: 0.10 },
        processing_time: 'Instant',
        auto_confirm: true,
        requires_receipt: false,
        display_order: 2
      },
      usdt: {
        method: 'usdt',
        enabled: true,
        details: { description: 'USDT Cryptocurrency' },
        fees: { type: 'network', description: 'Network fees only' },
        processing_time: '5-15 minutes',
        auto_confirm: false,
        requires_receipt: true,
        display_order: 3
      },
      western_union: {
        method: 'western_union',
        enabled: true,
        details: { description: 'Western Union Money Transfer' },
        fees: { range: '5-15', description: 'Transfer fee' },
        processing_time: '1-3 business days',
        auto_confirm: false,
        requires_receipt: true,
        display_order: 4
      },
      moneygram: {
        method: 'moneygram',
        enabled: true,
        details: { description: 'MoneyGram International Transfer' },
        fees: { range: '5-12', description: 'Transfer fee' },
        processing_time: '1-3 business days',
        auto_confirm: false,
        requires_receipt: true,
        display_order: 5
      },
      ria: {
        method: 'ria',
        enabled: true,
        details: { description: 'Ria Money Transfer Service' },
        fees: { range: '3-10', description: 'Transfer fee' },
        processing_time: '1-2 business days',
        auto_confirm: false,
        requires_receipt: true,
        display_order: 6
      },
      omt: {
        method: 'omt',
        enabled: true,
        details: { description: 'OMT Lebanon Money Transfer' },
        fees: { range: '2-5', description: 'Local transfer fee' },
        processing_time: 'Same day',
        auto_confirm: false,
        requires_receipt: true,
        display_order: 7
      },
      whish: {
        method: 'whish',
        enabled: true,
        details: { description: 'Whish Money Digital Wallet' },
        fees: { percentage: 1.5, description: 'Transaction fee' },
        processing_time: 'Instant',
        auto_confirm: false,
        requires_receipt: true,
        display_order: 8
      },
      bob: {
        method: 'bob',
        enabled: true,
        details: { description: 'Bank of Beirut Direct Transfer' },
        fees: { fixed: 0, description: 'No additional fees' },
        processing_time: '1-2 business days',
        auto_confirm: false,
        requires_receipt: true,
        display_order: 9
      },
      wallet: {
        method: 'wallet',
        enabled: true,
        details: { description: 'SAMIA In-App Wallet' },
        fees: { fixed: 0, description: 'No fees' },
        processing_time: 'Instant',
        auto_confirm: true,
        requires_receipt: false,
        display_order: 10
      }
    };

    const config = methodConfigs[methodName] || methodConfigs.wallet;
    config.icon = this.getMethodIcon(methodName);
    config.color = this.getMethodColor(methodName);
    
    return config;
  }

  /**
   * Get payment method icon
   * @param {string} method - Payment method name
   * @returns {string} Icon emoji/symbol
   */
  static getMethodIcon(method) {
    const icons = {
      stripe: '💳',
      square: '🟦',
      usdt: '₿',
      western_union: '🌍',
      moneygram: '💸',
      ria: '🏦',
      omt: '🇱🇧',
      whish: '📱',
      bob: '🏛️',
      wallet: '👛'
    };
    return icons[method] || '💳';
  }

  /**
   * Get payment method color theme
   * @param {string} method - Payment method name
   * @returns {string} CSS color classes
   */
  static getMethodColor(method) {
    const colors = {
      stripe: 'bg-blue-500/20 border-blue-400/30 text-blue-300',
      square: 'bg-gray-500/20 border-gray-400/30 text-gray-300',
      usdt: 'bg-orange-500/20 border-orange-400/30 text-orange-300',
      western_union: 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300',
      moneygram: 'bg-purple-500/20 border-purple-400/30 text-purple-300',
      ria: 'bg-green-500/20 border-green-400/30 text-green-300',
      omt: 'bg-red-500/20 border-red-400/30 text-red-300',
      whish: 'bg-pink-500/20 border-pink-400/30 text-pink-300',
      bob: 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300',
      wallet: 'bg-gold-500/20 border-gold-400/30 text-gold-300'
    };
    return colors[method] || colors.wallet;
  }

  /**
   * Get user's country code from profile or IP
   * @param {Object} profile - User profile object
   * @returns {Promise<string>} Country code
   */
  static async getUserCountryCode(profile) {
    // Try to get from user profile first
    if (profile?.country_code) {
      return profile.country_code.toUpperCase();
    }

    // Fallback to detecting from browser/IP (you can implement IP geolocation here)
    try {
      // This is a placeholder - implement actual geolocation service
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return data.country_code || 'XX';
    } catch (error) {
      console.warn('Could not detect country:', error);
      return 'XX'; // Default to "Other Countries"
    }
  }

  /**
   * Create payment record with validation
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Created payment record
   */
  static async createPayment(paymentData) {
    const {
      user_id,
      booking_id,
      amount,
      method,
      country_code,
      metadata = {}
    } = paymentData;

    // Validate payment method
    if (!ALLOWED_PAYMENT_METHODS.includes(method)) {
      throw new Error(`Payment method '${method}' is not allowed`);
    }

    // Validate for user's country
    const isValid = await this.validatePaymentMethod(country_code, method);
    if (!isValid) {
      throw new Error(`Payment method '${method}' is not available in your country`);
    }

    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id,
          booking_id,
          amount: Number(amount),
          method,
          country_code: country_code?.toUpperCase(),
          status: 'pending',
          metadata: {
            ...metadata,
            created_via: 'payment_method_service',
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload receipt for manual payment methods
   * @param {string} paymentId - Payment ID
   * @param {File} receiptFile - Receipt file
   * @returns {Promise<Object>} Upload result
   */
  static async uploadReceipt(paymentId, receiptFile) {
    try {
      // Upload file to Supabase Storage
      const fileName = `receipt-${paymentId}-${Date.now()}.${receiptFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // Update payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .update({
          receipt_url: urlData.publicUrl,
          receipt_image: urlData.publicUrl,
          status: 'awaiting_approval'
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (paymentError) throw paymentError;

      return { success: true, data: paymentData };
    } catch (error) {
      console.error('Error uploading receipt:', error);
      return { success: false, error: error.message };
    }
  }
}

export default PaymentMethodService; 
