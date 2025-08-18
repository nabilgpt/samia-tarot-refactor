import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

/**
 * CurrencyDisplay Component
 * Displays USD price with local currency conversion underneath
 * Preserves the cosmic theme and adds no extra styling
 */
const CurrencyDisplay = ({ 
  amount, 
  className = '', 
  primaryClassName = '', 
  secondaryClassName = '',
  showSecondary = true,
  countryCode = null,
  animate = false
}) => {
  const { profile } = useAuth();
  const [displayData, setDisplayData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get user's country code
  const getUserCountryCode = () => {
    if (countryCode) return countryCode;
    if (profile?.country_code) return profile.country_code;
    
    // Try to detect from browser/localStorage
    try {
      const savedCountry = localStorage.getItem('samia-tarot-user-country');
      if (savedCountry) return savedCountry;
    } catch (e) {
      // Ignore localStorage errors
    }
    
    return null;
  };

  // Fetch currency display data
  const fetchDisplayData = async () => {
    if (!amount || amount <= 0 || !showSecondary) {
      setDisplayData({
        primaryDisplay: `${amount} USD`,
        secondaryDisplay: null,
        hasLocalCurrency: false
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCountryCode = getUserCountryCode();
      
      const response = await fetch('/api/exchange-rates/format-display', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          countryCode: userCountryCode
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDisplayData(result.data);
      } else {
        throw new Error(result.error || 'Conversion failed');
      }

    } catch (err) {
      console.warn('Currency conversion failed:', err.message);
      setError(err.message);
      
      // Fallback to USD only
      setDisplayData({
        primaryDisplay: `${amount} USD`,
        secondaryDisplay: null,
        hasLocalCurrency: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch display data when component mounts or dependencies change
  useEffect(() => {
    fetchDisplayData();
  }, [amount, profile?.country_code, countryCode, showSecondary]);

  // Auto-refresh every hour
  useEffect(() => {
    if (!showSecondary) return;
    
    const interval = setInterval(() => {
      fetchDisplayData();
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [amount, profile?.country_code, countryCode, showSecondary]);

  // Loading state
  if (loading && !displayData) {
    return (
      <div className={className}>
        <div className={primaryClassName}>
          {amount} USD
        </div>
        {showSecondary && (
          <div className={`text-xs opacity-50 ${secondaryClassName}`}>
            Loading...
          </div>
        )}
      </div>
    );
  }

  // Error state (fallback to USD only)
  if (error && !displayData) {
    return (
      <div className={className}>
        <div className={primaryClassName}>
          {amount} USD
        </div>
      </div>
    );
  }

  // No display data
  if (!displayData) {
    return (
      <div className={className}>
        <div className={primaryClassName}>
          {amount} USD
        </div>
      </div>
    );
  }

  // Render the currency display
  const content = (
    <div className={className}>
      {/* Primary USD Display */}
      <div className={primaryClassName}>
        {displayData.primaryDisplay}
      </div>
      
      {/* Secondary Local Currency Display */}
      {showSecondary && displayData.hasLocalCurrency && displayData.secondaryDisplay && (
        <div className={`text-xs opacity-75 mt-1 ${secondaryClassName}`}>
          {displayData.secondaryDisplay}
        </div>
      )}
      
      {/* Stale rate warning (only for developers/admins) */}
      {displayData.isStale && import.meta.env.MODE === 'development' && (
        <div className="text-xs text-yellow-400 opacity-50 mt-1">
          ⚠️ Exchange rate may be outdated
        </div>
      )}
    </div>
  );

  // Return with animation if requested
  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
};

/**
 * Preset components for common use cases
 */

// For service cards and pricing displays
export const ServicePriceCurrency = ({ amount, ...props }) => (
  <CurrencyDisplay
    amount={amount}
    className="text-center"
    primaryClassName="text-2xl font-bold text-purple-600"
    secondaryClassName="text-gray-500"
    animate={true}
    {...props}
  />
);

// For payment summaries
export const PaymentSummaryCurrency = ({ amount, ...props }) => (
  <CurrencyDisplay
    amount={amount}
    className="text-right"
    primaryClassName="text-lg font-bold text-gray-900"
    secondaryClassName="text-gray-600"
    {...props}
  />
);

// For booking confirmations
export const BookingPriceCurrency = ({ amount, ...props }) => (
  <CurrencyDisplay
    amount={amount}
    className="text-right"
    primaryClassName="font-medium text-gold-400"
    secondaryClassName="text-gray-400"
    {...props}
  />
);

// For admin displays
export const AdminPriceCurrency = ({ amount, ...props }) => (
  <CurrencyDisplay
    amount={amount}
    className="text-left"
    primaryClassName="text-sm font-medium text-gray-900"
    secondaryClassName="text-gray-500"
    {...props}
  />
);

// For wallet displays
export const WalletBalanceCurrency = ({ amount, ...props }) => (
  <CurrencyDisplay
    amount={amount}
    className="text-right"
    primaryClassName="text-xl font-bold text-green-600"
    secondaryClassName="text-green-500"
    {...props}
  />
);

export default CurrencyDisplay; 