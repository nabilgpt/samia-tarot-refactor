// =============================================================================
// EXCHANGE RATE SERVICE - خدمة أسعار الصرف
// =============================================================================
// Handles currency conversion, exchange rate fetching, and formatting

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (error) {
  console.warn('⚠️ Supabase client creation failed, using fallback mode');
  supabase = null;
}

class ExchangeRateService {
  constructor() {
    this.apiKey = process.env.EXCHANGE_RATE_API_KEY || 'free-api-key';
    this.baseUrl = 'https://api.exchangerate-api.com/v4/latest/USD';
    
    // Fallback rates (updated periodically)
    this.fallbackRates = {
      'USD': { rate: 1.0, name: 'US Dollar' },
      'AED': { rate: 3.67, name: 'UAE Dirham' },
      'SAR': { rate: 3.75, name: 'Saudi Riyal' },
      'EUR': { rate: 0.85, name: 'Euro' },
      'LBP': { rate: 89000, name: 'Lebanese Pound' },
      'EGP': { rate: 31.0, name: 'Egyptian Pound' },
      'JOD': { rate: 0.71, name: 'Jordanian Dinar' },
      'QAR': { rate: 3.64, name: 'Qatari Riyal' },
      'KWD': { rate: 0.31, name: 'Kuwaiti Dinar' },
      'BHD': { rate: 0.38, name: 'Bahraini Dinar' },
      'OMR': { rate: 0.38, name: 'Omani Rial' },
      'GBP': { rate: 0.79, name: 'British Pound' },
      'CAD': { rate: 1.35, name: 'Canadian Dollar' },
      'AUD': { rate: 1.52, name: 'Australian Dollar' },
      'TRY': { rate: 29.0, name: 'Turkish Lira' }
    };

    // Country to currency mapping
    this.countryToCurrency = {
      'AE': 'AED', 'SA': 'SAR', 'LB': 'LBP', 'EG': 'EGP',
      'JO': 'JOD', 'QA': 'QAR', 'KW': 'KWD', 'BH': 'BHD',
      'OM': 'OMR', 'GB': 'GBP', 'CA': 'CAD', 'AU': 'AUD',
      'TR': 'TRY', 'US': 'USD', 'EU': 'EUR'
    };
  }

  // Get current exchange rates from database or fallback
  async getCurrentRates() {
    try {
      if (!supabase) {
        console.log('📊 Using fallback exchange rates (no database connection)');
        return {
          success: true,
          data: this.fallbackRates,
          isFallback: true,
          lastUpdated: new Date().toISOString(),
          hasStaleRates: false
        };
      }

      // Try to fetch from database
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('last_updated', { ascending: false });

      if (error) {
        console.warn('⚠️ Database query failed, using fallback rates:', error.message);
        return {
          success: true,
          data: this.fallbackRates,
          isFallback: true,
          lastUpdated: new Date().toISOString(),
          hasStaleRates: false
        };
      }

      if (!data || data.length === 0) {
        console.log('📊 No rates in database, using fallback rates');
        return {
          success: true,
          data: this.fallbackRates,
          isFallback: true,
          lastUpdated: new Date().toISOString(),
          hasStaleRates: false
        };
      }

      // Convert database format to service format
      const rates = {};
      let lastUpdated = null;
      let hasStaleRates = false;

      data.forEach(row => {
        rates[row.currency_code] = {
          rate: parseFloat(row.rate),
          name: this.fallbackRates[row.currency_code]?.name || row.currency_code
        };
        
        if (!lastUpdated || new Date(row.last_updated) > new Date(lastUpdated)) {
          lastUpdated = row.last_updated;
        }

        // Check if rates are older than 2 hours
        const ageInHours = (Date.now() - new Date(row.last_updated)) / (1000 * 60 * 60);
        if (ageInHours > 2) {
          hasStaleRates = true;
        }
      });

      return {
        success: true,
        data: rates,
        isFallback: false,
        lastUpdated,
        hasStaleRates
      };

    } catch (error) {
      console.error('❌ Error fetching exchange rates:', error);
      return {
        success: true,
        data: this.fallbackRates,
        isFallback: true,
        lastUpdated: new Date().toISOString(),
        hasStaleRates: false
      };
    }
  }

  // Update rates from external API
  async updateRatesFromAPI() {
    try {
      console.log('🔄 Updating exchange rates from API...');

      // Fetch from external API
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const apiData = await response.json();
      if (!apiData.rates) {
        throw new Error('Invalid API response format');
      }

      // Add USD as base currency
      const allRates = { USD: 1.0, ...apiData.rates };
      
      // Filter to only supported currencies
      const supportedCurrencies = Object.keys(this.fallbackRates);
      const ratesToUpdate = [];

      supportedCurrencies.forEach(currency => {
        if (allRates[currency] !== undefined) {
          ratesToUpdate.push({
            currency_code: currency,
            rate: allRates[currency],
            last_updated: new Date().toISOString()
          });
        }
      });

      if (!supabase) {
        console.log('📊 Database not available, rates updated in memory only');
        // Update fallback rates in memory
        ratesToUpdate.forEach(({ currency_code, rate }) => {
          if (this.fallbackRates[currency_code]) {
            this.fallbackRates[currency_code].rate = rate;
          }
        });

        return {
          success: true,
          message: 'Exchange rates updated successfully (in-memory)',
          updatedCount: ratesToUpdate.length,
          timestamp: new Date().toISOString()
        };
      }

      // Update database
      let updatedCount = 0;
      for (const rateData of ratesToUpdate) {
        const { error } = await supabase
          .from('exchange_rates')
          .upsert(rateData, { onConflict: 'currency_code' });

        if (!error) {
          updatedCount++;
        } else {
          console.warn(`⚠️ Failed to update ${rateData.currency_code}:`, error.message);
        }
      }

      console.log(`✅ Updated ${updatedCount}/${ratesToUpdate.length} exchange rates`);

      return {
        success: true,
        message: `Exchange rates updated successfully`,
        updatedCount,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Exchange rate update failed:', error);
      return {
        success: false,
        error: `Failed to update exchange rates: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Convert USD to target currency
  async convertCurrency(usdAmount, targetCurrency) {
    try {
      const rates = await this.getCurrentRates();
      
      if (!rates.success) {
        return {
          success: false,
          error: 'Unable to fetch exchange rates'
        };
      }

      const currencyData = rates.data[targetCurrency.toUpperCase()];
      if (!currencyData) {
        return {
          success: false,
          error: `Unsupported currency: ${targetCurrency}`
        };
      }

      const convertedAmount = usdAmount * currencyData.rate;

      return {
        success: true,
        fromAmount: usdAmount,
        fromCurrency: 'USD',
        toAmount: convertedAmount,
        toCurrency: targetCurrency.toUpperCase(),
        rate: currencyData.rate,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Currency conversion error:', error);
      return {
        success: false,
        error: 'Currency conversion failed'
      };
    }
  }

  // Format currency for display with Arabic text
  async formatCurrencyDisplay(usdAmount, targetCurrency) {
    try {
      const conversion = await this.convertCurrency(usdAmount, targetCurrency);
      
      if (!conversion.success) {
        return conversion;
      }

      const currencyCode = targetCurrency.toUpperCase();
      let formattedAmount;

      // Special formatting for different currencies
      if (currencyCode === 'LBP') {
        // Lebanese Pound - use commas for large numbers
        formattedAmount = Math.round(conversion.toAmount).toLocaleString('en-US');
      } else if (['KWD', 'BHD', 'OMR', 'JOD'].includes(currencyCode)) {
        // High-value currencies - show 3 decimal places
        formattedAmount = conversion.toAmount.toFixed(3);
      } else {
        // Standard currencies - 2 decimal places
        formattedAmount = conversion.toAmount.toFixed(2);
      }

      return {
        success: true,
        usdAmount: usdAmount,
        convertedAmount: conversion.toAmount,
        formattedAmount: formattedAmount,
        currency: currencyCode,
        currencySymbol: this.getCurrencySymbol(currencyCode),
        displayText: `${formattedAmount} ${currencyCode}`,
        arabicText: 'تقريبا حسب سعر الصرف في مصرفك',
        rate: conversion.rate,
        timestamp: conversion.timestamp
      };

    } catch (error) {
      console.error('❌ Currency display formatting error:', error);
      return {
        success: false,
        error: 'Currency display formatting failed'
      };
    }
  }

  // Get currency by country code
  getCurrencyByCountry(countryCode) {
    return this.countryToCurrency[countryCode.toUpperCase()] || 'USD';
  }

  // Get currency symbol
  getCurrencySymbol(currency) {
    const symbols = {
      'USD': '$', 'AED': 'د.إ', 'SAR': 'ر.س', 'EUR': '€',
      'LBP': 'ل.ل', 'EGP': 'ج.م', 'JOD': 'د.ا', 'QAR': 'ر.ق',
      'KWD': 'د.ك', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'GBP': '£',
      'CAD': 'C$', 'AUD': 'A$', 'TRY': '₺'
    };
    return symbols[currency] || currency;
  }

  // Get supported currencies list
  getSupportedCurrencies() {
    return Object.keys(this.fallbackRates).map(code => ({
      code,
      name: this.fallbackRates[code].name,
      symbol: this.getCurrencySymbol(code)
    }));
  }
}

module.exports = new ExchangeRateService(); 