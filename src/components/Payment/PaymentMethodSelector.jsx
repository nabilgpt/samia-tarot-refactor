import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUI } from '../../context/UIContext';
import PaymentMethodService from '../../services/paymentMethodService';
import StripePayment from './StripePayment.jsx';
import SquarePayment from './SquarePayment.jsx';
import USDTPayment from './USDTPayment.jsx';
import TransferPayment from './TransferPayment.jsx';
import WalletPayment from './WalletPayment.jsx';

const PaymentMethodSelector = ({ 
  service, 
  amount, 
  onPaymentSuccess, 
  onPaymentError,
  bookingId 
}) => {
  const { user, profile } = useAuth();
  const { language } = useUI();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [availableMethods, setAvailableMethods] = useState([]);
  const [userCountryCode, setUserCountryCode] = useState('XX');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailablePaymentMethods();
  }, [profile]);

  const loadAvailablePaymentMethods = async () => {
    try {
      setLoading(true);
      
      // Get user's country code
      const countryCode = await PaymentMethodService.getUserCountryCode(profile);
      setUserCountryCode(countryCode);
      
      // Get available payment methods for this country
      const methods = await PaymentMethodService.getAvailablePaymentMethods(countryCode);
      setAvailableMethods(methods);
      
    } catch (error) {
      console.error('Error loading payment methods:', error);
      // Use fallback methods if service fails
      const fallbackMethods = PaymentMethodService.getFallbackMethods(userCountryCode);
      setAvailableMethods(fallbackMethods);
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
  };

  const handleBackToSelection = () => {
    setSelectedMethod(null);
  };

  const renderPaymentComponent = () => {
    if (!selectedMethod) return null;

    const commonProps = {
      service,
      amount,
      onPaymentSuccess,
      onPaymentError,
      onBack: handleBackToSelection,
      bookingId,
      method: selectedMethod,
      countryCode: userCountryCode
    };

    switch (selectedMethod.method) {
      case 'stripe':
        return <StripePayment {...commonProps} />;
      case 'square':
        return <SquarePayment {...commonProps} />;
      case 'usdt':
        return <USDTPayment {...commonProps} />;
      case 'wallet':
        return <WalletPayment {...commonProps} />;
      case 'western_union':
      case 'moneygram':
      case 'ria':
      case 'omt':
      case 'whish':
      case 'bob':
        return <TransferPayment {...commonProps} />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-red-400">
              {language === 'ar' ? 'طريقة الدفع غير مدعومة' : 'Payment method not supported'}
            </p>
            <button
              onClick={handleBackToSelection}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg"
            >
              {language === 'ar' ? 'العودة' : 'Back'}
            </button>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glassmorphism rounded-2xl p-8 border border-white/10">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400"></div>
            <span className="text-gray-300">
              {language === 'ar' ? 'جاري تحميل طرق الدفع...' : 'Loading payment methods...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (selectedMethod) {
    return renderPaymentComponent();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glassmorphism rounded-2xl p-8 border border-white/10">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            {language === 'ar' ? 'اختر طريقة الدفع' : 'Select Payment Method'}
          </h2>
          <p className="text-gray-400">
            {language === 'ar' ? 'اختر الطريقة المفضلة لديك للدفع' : 'Choose your preferred payment method'}
          </p>
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <div className="text-3xl font-bold text-gold-400">${amount}</div>
            <div className="text-sm text-gray-400">
              {service?.name} • {language === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'}
            </div>
          </div>
        </div>

        {/* Payment Methods Grid */}
        <div className="space-y-4">
          {availableMethods.length > 0 ? (
            availableMethods.map((method, index) => (
              <motion.div
                key={method.method}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative cursor-pointer rounded-xl border-2 transition-all duration-200 hover:border-gold-400/50 ${method.color}`}
                onClick={() => handleMethodSelect(method)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">{method.icon}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {method.details?.description || method.method}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>⚡ {method.processing_time}</span>
                          {method.fees && (
                            <span>
                              💰 {method.fees.percentage && `${method.fees.percentage}%`}
                              {method.fees.fixed && ` + $${method.fees.fixed}`}
                              {method.fees.range && `$${method.fees.range}`}
                              {method.fees.description && method.fees.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Features and badges */}
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex space-x-2">
                        {method.supports_apple_pay && (
                          <span className="px-3 py-1 bg-black/30 text-white text-xs rounded-full">
                             Pay
                          </span>
                        )}
                        {method.supports_google_pay && (
                          <span className="px-3 py-1 bg-blue-500/30 text-blue-300 text-xs rounded-full">
                            G Pay
                          </span>
                        )}
                      </div>
                      
                      {method.auto_confirm ? (
                        <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
                          {language === 'ar' ? 'فوري' : 'Instant'}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                          {language === 'ar' ? 'يدوي' : 'Manual'}
                        </span>
                      )}
                      
                      {method.requires_receipt && (
                        <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full">
                          {language === 'ar' ? 'إيصال مطلوب' : 'Receipt Required'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Hover arrow */}
                <div className="absolute right-6 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-gold-400">→</div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">😞</div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                {language === 'ar' ? 'لا توجد طرق دفع متاحة' : 'No Payment Methods Available'}
              </h3>
              <p className="text-gray-500">
                {language === 'ar' 
                  ? 'لا توجد طرق دفع متاحة في منطقتك حالياً' 
                  : 'No payment methods are currently available in your region'
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <span>🔒</span>
              <span>{language === 'ar' ? 'آمن ومشفر' : 'Secure & Encrypted'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>🌍</span>
              <span>{userCountryCode}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>⚡</span>
              <span>{language === 'ar' ? 'دفع سريع' : 'Fast Payment'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector; 