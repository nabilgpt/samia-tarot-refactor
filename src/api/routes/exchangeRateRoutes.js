const express = require('express');
const router = express.Router();

// Exchange rate service
const exchangeRateService = {
  // Mock exchange rates - in production, fetch from real API
  rates: {
    'USD': 1.0,
    'EUR': 0.85,
    'GBP': 0.73,
    'CAD': 1.25,
    'AUD': 1.35,
    'JPY': 110.0,
    'CHF': 0.92,
    'CNY': 6.45,
    'SEK': 8.7,
    'NZD': 1.4
  },

  async getCurrentRates() {
    console.log('🔧 Mock mode: Returning cached exchange rates');
    return {
      success: true,
      data: {
        base: 'USD',
        rates: this.rates,
        timestamp: new Date().toISOString()
      }
    };
  },

  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      const fromRate = this.rates[fromCurrency] || 1;
      const toRate = this.rates[toCurrency] || 1;
      const convertedAmount = (amount / fromRate) * toRate;
      
      return {
        success: true,
        data: {
          originalAmount: amount,
          fromCurrency,
          toCurrency,
          convertedAmount: Math.round(convertedAmount * 100) / 100,
          rate: toRate / fromRate,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Get current exchange rates
router.get('/rates', async (req, res) => {
  try {
    const result = await exchangeRateService.getCurrentRates();
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching exchange rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exchange rates'
    });
  }
});

// Convert currency
router.post('/convert', async (req, res) => {
  try {
    const { amount, from, to } = req.body;
    
    if (!amount || !from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: amount, from, to'
      });
    }

    const result = await exchangeRateService.convertCurrency(amount, from, to);
    res.json(result);
  } catch (error) {
    console.error('❌ Error converting currency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert currency'
    });
  }
});

// Get supported currencies
router.get('/currencies', (req, res) => {
  try {
    const currencies = Object.keys(exchangeRateService.rates).map(code => ({
      code,
      rate: exchangeRateService.rates[code]
    }));

    res.json({
      success: true,
      data: currencies
    });
  } catch (error) {
    console.error('❌ Error fetching currencies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supported currencies'
    });
  }
});

module.exports = router; 