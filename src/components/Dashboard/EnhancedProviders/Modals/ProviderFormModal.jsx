import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  CloudIcon,
  GlobeAltIcon,
  KeyIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../../../context/LanguageContext';

const ProviderFormModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  provider = null, 
  isEditing = false,
  saving = false 
}) => {
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === 'ar';

  const [formData, setFormData] = useState({
    name: '',
    provider_type: 'AI',
    logo_url: '',
    description: '',
    active: true
  });

  const [errors, setErrors] = useState({});

  // Provider types
  const providerTypes = [
    { value: 'AI', label: isRTL ? 'ذكاء اصطناعي' : 'AI' },
    { value: 'payments', label: isRTL ? 'مدفوعات' : 'Payments' },
    { value: 'tts', label: isRTL ? 'تحويل النص لكلام' : 'Text-to-Speech' },
    { value: 'storage', label: isRTL ? 'تخزين' : 'Storage' },
    { value: 'analytics', label: isRTL ? 'تحليلات' : 'Analytics' },
    { value: 'other', label: isRTL ? 'أخرى' : 'Other' }
  ];

  useEffect(() => {
    if (provider && isEditing) {
      setFormData({
        name: provider.name || '',
        provider_type: provider.provider_type || 'AI',
        logo_url: provider.logo_url || '',
        description: provider.description || '',
        active: provider.active !== false
      });
    } else {
      setFormData({
        name: '',
        provider_type: 'AI',
        logo_url: '',
        description: '',
        active: true
      });
    }
    setErrors({});
  }, [provider, isEditing, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = isRTL ? 'الاسم مطلوب' : 'Name is required';
    }
    
    if (!formData.provider_type) {
      newErrors.provider_type = isRTL ? 'النوع مطلوب' : 'Type is required';
    }

    if (formData.logo_url && !isValidUrl(formData.logo_url)) {
      newErrors.logo_url = isRTL ? 'رابط غير صالح' : 'Invalid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving provider:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/20 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <CloudIcon className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {isEditing 
                  ? (isRTL ? 'تحرير المقدم' : 'Edit Provider')
                  : (isRTL ? 'إضافة مقدم جديد' : 'Add New Provider')
                }
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Provider Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {isRTL ? 'اسم المقدم' : 'Provider Name'} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-800/50 border ${
                  errors.name ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all`}
                placeholder={isRTL ? 'مثل: OpenAI' : 'e.g., OpenAI'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Provider Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {isRTL ? 'نوع المقدم' : 'Provider Type'} *
              </label>
              <select
                value={formData.provider_type}
                onChange={(e) => handleChange('provider_type', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-800/50 border ${
                  errors.provider_type ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {providerTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.provider_type && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {errors.provider_type}
                </p>
              )}
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {isRTL ? 'رابط الشعار' : 'Logo URL'}
              </label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-800/50 border ${
                  errors.logo_url ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all`}
                placeholder={isRTL ? 'https://example.com/logo.png' : 'https://example.com/logo.png'}
                dir="ltr"
              />
              {errors.logo_url && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {errors.logo_url}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {isRTL ? 'الوصف' : 'Description'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                placeholder={isRTL ? 'وصف المقدم...' : 'Provider description...'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => handleChange('active', e.target.checked)}
                className="w-4 h-4 text-purple-500 bg-gray-800 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
              />
              <label htmlFor="active" className="text-sm text-gray-300">
                {isRTL ? 'مفعل' : 'Active'}
              </label>
            </div>

            {/* Action Buttons */}
            <div className={`flex gap-4 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {isRTL ? 'جاري الحفظ...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    {isRTL ? 'حفظ' : 'Save'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProviderFormModal; 