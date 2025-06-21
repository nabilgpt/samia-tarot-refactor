import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../../context/UIContext';
import {
  XMarkIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  CreditCardIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const PaymentMethodModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  method = null, 
  isEditing = false,
  loading = false 
}) => {
  const { language } = useUI();
  const [formData, setFormData] = useState({
    method: '',
    enabled: true,
    countries: [],
    details: {
      description: '',
      instructions: ''
    },
    fees: {
      type: 'percentage',
      percentage: '',
      fixed: '',
      description: ''
    },
    processing_time: '',
    auto_confirm: false,
    requires_receipt: false,
    display_order: 0
  });
  const [errors, setErrors] = useState({});

  // Available payment methods
  const availableMethods = [
    { value: 'stripe', label: 'Stripe', icon: '💳' },
    { value: 'square', label: 'Square', icon: '🔲' },
    { value: 'usdt', label: 'USDT', icon: '₿' },
    { value: 'western_union', label: 'Western Union', icon: '🌍' },
    { value: 'moneygram', label: 'MoneyGram', icon: '💸' },
    { value: 'ria', label: 'Ria Money Transfer', icon: '🏦' },
    { value: 'omt', label: 'OMT', icon: '💰' },
    { value: 'whish', label: 'Whish Money', icon: '📱' },
    { value: 'bob', label: 'BOB Finance', icon: '🏛️' },
    { value: 'wallet', label: 'Digital Wallet', icon: '👛' },
    { value: 'apple_pay', label: 'Apple Pay', icon: '🍎' },
    { value: 'google_pay', label: 'Google Pay', icon: '🔍' }
  ];

  useEffect(() => {
    if (method && isEditing) {
      setFormData({
        method: method.method || '',
        enabled: method.enabled !== false,
        countries: method.countries || [],
        details: {
          description: method.details?.description || '',
          instructions: method.details?.instructions || ''
        },
        fees: {
          type: method.fees?.percentage ? 'percentage' : method.fees?.fixed ? 'fixed' : 'description',
          percentage: method.fees?.percentage || '',
          fixed: method.fees?.fixed || '',
          description: method.fees?.description || ''
        },
        processing_time: method.processing_time || '',
        auto_confirm: method.auto_confirm || false,
        requires_receipt: method.requires_receipt || false,
        display_order: method.display_order || 0
      });
    } else {
      // Reset form for new method
      setFormData({
        method: '',
        enabled: true,
        countries: [],
        details: {
          description: '',
          instructions: ''
        },
        fees: {
          type: 'percentage',
          percentage: '',
          fixed: '',
          description: ''
        },
        processing_time: '',
        auto_confirm: false,
        requires_receipt: false,
        display_order: 0
      });
    }
    setErrors({});
  }, [method, isEditing, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.method) {
      newErrors.method = 'Payment method is required';
    }

    if (!formData.details.description) {
      newErrors.description = 'Description is required';
    }

    if (!formData.processing_time) {
      newErrors.processing_time = 'Processing time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const handleInputChange = (field, value, nested = null) => {
    if (nested) {
      setFormData(prev => ({
        ...prev,
        [nested]: {
          ...prev[nested],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field] || errors[nested]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
        [nested]: undefined
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isEditing 
                    ? (language === 'ar' ? 'تعديل وسيلة الدفع' : 'Edit Payment Method')
                    : (language === 'ar' ? 'إضافة وسيلة دفع جديدة' : 'Add New Payment Method')
                  }
                </h2>
                <p className="text-cosmic-300 text-sm">
                  {language === 'ar' 
                    ? 'قم بتكوين إعدادات وسيلة الدفع' 
                    : 'Configure payment method settings'
                  }
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-cosmic-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-cosmic-300 mb-2">
                {language === 'ar' ? 'وسيلة الدفع' : 'Payment Method'} *
              </label>
              <select
                value={formData.method}
                onChange={(e) => handleInputChange('method', e.target.value)}
                disabled={isEditing}
                className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:border-purple-400 ${
                  errors.method ? 'border-red-400' : 'border-white/20'
                } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">
                  {language === 'ar' ? 'اختر وسيلة الدفع' : 'Select payment method'}
                </option>
                {availableMethods.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.icon} {method.label}
                  </option>
                ))}
              </select>
              {errors.method && (
                <p className="text-red-400 text-sm mt-1">{errors.method}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-cosmic-300 mb-2">
                {language === 'ar' ? 'الوصف' : 'Description'} *
              </label>
              <input
                type="text"
                value={formData.details.description}
                onChange={(e) => handleInputChange('description', e.target.value, 'details')}
                placeholder={language === 'ar' ? 'وصف وسيلة الدفع' : 'Payment method description'}
                className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-cosmic-300 focus:outline-none focus:border-purple-400 ${
                  errors.description ? 'border-red-400' : 'border-white/20'
                }`}
              />
              {errors.description && (
                <p className="text-red-400 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            {/* Processing Time */}
            <div>
              <label className="block text-sm font-medium text-cosmic-300 mb-2">
                {language === 'ar' ? 'وقت المعالجة' : 'Processing Time'} *
              </label>
              <input
                type="text"
                value={formData.processing_time}
                onChange={(e) => handleInputChange('processing_time', e.target.value)}
                placeholder={language === 'ar' ? 'مثال: فوري، 1-3 أيام عمل' : 'e.g., Instant, 1-3 business days'}
                className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-cosmic-300 focus:outline-none focus:border-purple-400 ${
                  errors.processing_time ? 'border-red-400' : 'border-white/20'
                }`}
              />
              {errors.processing_time && (
                <p className="text-red-400 text-sm mt-1">{errors.processing_time}</p>
              )}
            </div>

            {/* Fee Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                {language === 'ar' ? 'إعدادات الرسوم' : 'Fee Configuration'}
              </h3>

              {/* Fee Type */}
              <div>
                <label className="block text-sm font-medium text-cosmic-300 mb-2">
                  {language === 'ar' ? 'نوع الرسوم' : 'Fee Type'}
                </label>
                <select
                  value={formData.fees.type}
                  onChange={(e) => handleInputChange('type', e.target.value, 'fees')}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="percentage">{language === 'ar' ? 'نسبة مئوية' : 'Percentage'}</option>
                  <option value="fixed">{language === 'ar' ? 'مبلغ ثابت' : 'Fixed Amount'}</option>
                  <option value="description">{language === 'ar' ? 'وصف مخصص' : 'Custom Description'}</option>
                </select>
              </div>

              {/* Fee Value */}
              {formData.fees.type === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    {language === 'ar' ? 'النسبة المئوية (%)' : 'Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fees.percentage}
                    onChange={(e) => handleInputChange('percentage', e.target.value, 'fees')}
                    placeholder="2.9"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}

              {formData.fees.type === 'fixed' && (
                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    {language === 'ar' ? 'المبلغ الثابت' : 'Fixed Amount'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fees.fixed}
                    onChange={(e) => handleInputChange('fixed', e.target.value, 'fees')}
                    placeholder="0.30"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}

              {formData.fees.type === 'description' && (
                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    {language === 'ar' ? 'وصف الرسوم' : 'Fee Description'}
                  </label>
                  <input
                    type="text"
                    value={formData.fees.description}
                    onChange={(e) => handleInputChange('description', e.target.value, 'fees')}
                    placeholder={language === 'ar' ? 'مثال: رسوم الشبكة فقط' : 'e.g., Network fees only'}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-cosmic-300 focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                {language === 'ar' ? 'الإعدادات' : 'Settings'}
              </h3>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">
                      {language === 'ar' ? 'مفعل' : 'Enabled'}
                    </p>
                    <p className="text-cosmic-300 text-sm">
                      {language === 'ar' ? 'متاح للمستخدمين' : 'Available to users'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInputChange('enabled', !formData.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.enabled ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">
                      {language === 'ar' ? 'يتطلب إيصال' : 'Requires Receipt'}
                    </p>
                    <p className="text-cosmic-300 text-sm">
                      {language === 'ar' ? 'رفع إيصال الدفع' : 'Upload payment receipt'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInputChange('requires_receipt', !formData.requires_receipt)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.requires_receipt ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.requires_receipt ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-cosmic-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                <span>
                  {loading 
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                    : isEditing 
                      ? (language === 'ar' ? 'تحديث' : 'Update')
                      : (language === 'ar' ? 'إضافة' : 'Add')
                  }
                </span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentMethodModal;
