// =================================================
// SAMIA TAROT ADD SERVICE MODAL - NEW BILINGUAL UX
// Single-language form that dynamically shows only current language
// =================================================

import React, { useState, useEffect } from 'react';
import { X, Star, User, Clock, DollarSign, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import BilingualInput from '../UI/BilingualInput';
import BilingualTextarea from '../UI/BilingualTextarea';
import BilingualSelect from '../UI/BilingualSelect';
import AdminLanguageToggle from '../UI/AdminLanguageToggle';

/**
 * 🌟 NEW BILINGUAL ADD SERVICE MODAL
 * 
 * Features:
 * ✅ Single-language UX (shows only current language fields)
 * ✅ Admin dual-language toggle for editing both languages
 * ✅ Real-time language switching
 * ✅ Automatic backend translation
 * ✅ Proper RTL support
 * ✅ Clean cosmic theme preservation
 * ✅ Enhanced form validation
 */

const AddServiceModalBilingual = ({ 
  isOpen, 
  onClose, 
  onServiceAdded
}) => {
  const { 
    currentLanguage, 
    direction, 
    t, 
    createSingleLanguageFormData,
    validateCurrentLanguageField,
    isAdmin
  } = useLanguage();

  // ===================================
  // STATE MANAGEMENT
  // ===================================

  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    price: '',
    type: '',
    duration_minutes: '',
    is_active: true,
    is_vip: false,
    reader_id: ''
  });

  const [readers, setReaders] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingReaders, setLoadingReaders] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);

  // ===================================
  // DATA LOADING
  // ===================================

  useEffect(() => {
    if (isOpen) {
      loadReaders();
      loadServiceTypes();
    }
  }, [isOpen]);

  const loadReaders = async () => {
    setLoadingReaders(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('/api/services/readers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setReaders(data.data);
        console.log(`✅ Loaded ${data.data.length} readers for service assignment`);
      } else {
        throw new Error('Invalid readers data format');
      }

    } catch (error) {
      console.error('❌ Error loading readers:', error);
      setApiError(t('error'));
    } finally {
      setLoadingReaders(false);
    }
  };

  const loadServiceTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('/api/services/types', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setServiceTypes(data.data);
      }

    } catch (error) {
      console.error('❌ Error loading service types:', error);
      // Use fallback types if API fails
      setServiceTypes([
        { 
          value: 'tarot', 
          label_en: 'Tarot Reading', 
          label_ar: 'قراءة التاروت',
          name_en: 'Tarot Reading',
          name_ar: 'قراءة التاروت'
        },
        { 
          value: 'coffee', 
          label_en: 'Coffee Reading', 
          label_ar: 'قراءة القهوة',
          name_en: 'Coffee Reading',
          name_ar: 'قراءة القهوة'
        },
        { 
          value: 'dream', 
          label_en: 'Dream Interpretation', 
          label_ar: 'تفسير الأحلام',
          name_en: 'Dream Interpretation',
          name_ar: 'تفسير الأحلام'
        }
      ]);
    }
  };

  // ===================================
  // FORM VALIDATION
  // ===================================

  const validateForm = () => {
    const newErrors = {};

    // Validate current language fields only
    const validationFields = ['name', 'description'];
    
    validationFields.forEach(field => {
      const validation = validateCurrentLanguageField(formData, field, true);
      if (!validation.valid) {
        newErrors[field] = validation.message;
      }
    });

    // Validate non-bilingual fields
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = currentLanguage === 'ar' ? 'السعر مطلوب ويجب أن يكون أكبر من صفر' : 'Price is required and must be greater than zero';
    }

    if (!formData.type) {
      newErrors.type = currentLanguage === 'ar' ? 'نوع الخدمة مطلوب' : 'Service type is required';
    }

    if (!formData.duration_minutes || parseInt(formData.duration_minutes) <= 0) {
      newErrors.duration_minutes = currentLanguage === 'ar' ? 'المدة مطلوبة ويجب أن تكون أكبر من صفر' : 'Duration is required and must be greater than zero';
    }

    if (!formData.reader_id) {
      newErrors.reader_id = currentLanguage === 'ar' ? 'يجب اختيار قارئ' : 'Reader selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===================================
  // FORM SUBMISSION (SINGLE LANGUAGE)
  // ===================================

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token');
      }

      // Create single-language payload - backend will auto-translate
      const bilingualFields = ['name', 'description'];
      const singleLanguageData = createSingleLanguageFormData(formData, bilingualFields);

      const payload = {
        ...singleLanguageData,
        price: parseFloat(formData.price),
        type: formData.type,
        duration_minutes: parseInt(formData.duration_minutes),
        is_active: formData.is_active,
        is_vip: formData.is_vip,
        reader_id: formData.reader_id
      };

      console.log('🚀 Submitting single-language service data:', payload);

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
        console.log('✅ Service created successfully with auto-translation');
        
        // Reset form and close after delay
        setTimeout(() => {
          resetForm();
          onServiceAdded && onServiceAdded(result.data);
          onClose();
        }, 1500);
      } else {
        throw new Error(result.message || 'Service creation failed');
      }

    } catch (error) {
      console.error('❌ Error creating service:', error);
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ===================================
  // FORM HANDLERS
  // ===================================

  const handleBilingualChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      ...value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name_ar: '',
      name_en: '',
      description_ar: '',
      description_en: '',
      price: '',
      type: '',
      duration_minutes: '',
      is_active: true,
      is_vip: false,
      reader_id: ''
    });
    setErrors({});
    setApiError('');
    setSuccess(false);
  };

  // ===================================
  // RENDER HELPERS
  // ===================================

  const modalClasses = `
    fixed inset-0 bg-black/70 backdrop-blur-sm z-50 
    flex items-center justify-center p-4
    ${direction === 'rtl' ? 'rtl' : 'ltr'}
  `;

  const contentClasses = `
    bg-gradient-to-br from-slate-800 to-slate-900 
    border border-purple-500/30 rounded-xl shadow-2xl
    w-full max-w-2xl max-h-[90vh] overflow-y-auto
    relative
  `;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={modalClasses}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={contentClasses}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className={`text-2xl font-bold text-white ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
              {t('add')} {t('service')}
            </h2>
            
            {/* Admin Language Toggle */}
            {isAdmin && (
              <AdminLanguageToggle size="sm" className="mx-4" />
            )}
            
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* API Error */}
            {apiError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="text-red-400" size={20} />
                <span className="text-red-200">{apiError}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="text-green-400" size={20} />
                <span className="text-green-200">
                  {currentLanguage === 'ar' ? 'تم إنشاء الخدمة بنجاح!' : 'Service created successfully!'}
                </span>
              </div>
            )}

            {/* Service Name */}
            <BilingualInput
              baseField="name"
              label={{
                ar: 'اسم الخدمة',
                en: 'Service Name'
              }}
              placeholder={{
                ar: 'أدخل اسم الخدمة...',
                en: 'Enter service name...'
              }}
              value={formData}
              onChange={(value) => handleBilingualChange('name', value)}
              required
              showBothForAdmin
            />

            {/* Service Description */}
            <BilingualTextarea
              baseField="description"
              label={{
                ar: 'وصف الخدمة',
                en: 'Service Description'
              }}
              placeholder={{
                ar: 'أدخل وصف مفصل للخدمة...',
                en: 'Enter detailed service description...'
              }}
              value={formData}
              onChange={(value) => handleBilingualChange('description', value)}
              rows={4}
              required
              showBothForAdmin
            />

            {/* Service Type */}
            <BilingualSelect
              baseField="type"
              label={{
                ar: 'نوع الخدمة',
                en: 'Service Type'
              }}
              placeholder={{
                ar: 'اختر نوع الخدمة...',
                en: 'Select service type...'
              }}
              options={serviceTypes.map(type => ({
                value: type.value,
                label_ar: type.label_ar || type.name_ar,
                label_en: type.label_en || type.name_en
              }))}
              value={{ type: formData.type }}
              onChange={(value) => handleInputChange('type', value.type)}
              required
            />

            {/* Reader Selection */}
            <div>
              <label className={`block text-sm font-medium text-slate-300 mb-2 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                {currentLanguage === 'ar' ? 'القارئ' : 'Reader'}
                <span className="text-red-400 ml-1">*</span>
              </label>
              <select
                value={formData.reader_id}
                onChange={(e) => handleInputChange('reader_id', e.target.value)}
                disabled={loadingReaders}
                dir={direction}
                className={`
                  w-full px-4 py-3 rounded-lg
                  bg-slate-700/50 border-2 border-transparent
                  text-white
                  transition-all duration-300
                  focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                  focus:outline-none focus:bg-slate-700/70
                  ${errors.reader_id ? 'border-red-500' : ''}
                  ${currentLanguage === 'ar' ? 'text-right font-arabic' : 'text-left'}
                `}
              >
                <option value="" disabled>
                  {loadingReaders 
                    ? (currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...') 
                    : (currentLanguage === 'ar' ? 'اختر قارئاً...' : 'Select a reader...')
                  }
                </option>
                {readers.map((reader) => (
                  <option key={reader.id} value={reader.id}>
                    {reader.name || reader.full_name || `${reader.first_name} ${reader.last_name}`.trim()}
                  </option>
                ))}
              </select>
              {errors.reader_id && (
                <p className="text-red-400 text-sm mt-1">{errors.reader_id}</p>
              )}
            </div>

            {/* Price and Duration */}
            <div className="grid grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <label className={`block text-sm font-medium text-slate-300 mb-2 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                  {currentLanguage === 'ar' ? 'السعر' : 'Price'}
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <div className="relative">
                  <DollarSign className={`absolute top-1/2 transform -translate-y-1/2 text-slate-400 ${direction === 'rtl' ? 'right-3' : 'left-3'}`} size={20} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder={currentLanguage === 'ar' ? '0.00' : '0.00'}
                    dir={direction}
                    className={`
                      w-full py-3 rounded-lg
                      bg-slate-700/50 border-2 border-transparent
                      text-white placeholder-slate-400
                      transition-all duration-300
                      focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                      focus:outline-none focus:bg-slate-700/70
                      ${errors.price ? 'border-red-500' : ''}
                      ${direction === 'rtl' ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'}
                    `}
                  />
                </div>
                {errors.price && (
                  <p className="text-red-400 text-sm mt-1">{errors.price}</p>
                )}
              </div>

              {/* Duration */}
              <div>
                <label className={`block text-sm font-medium text-slate-300 mb-2 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                  {currentLanguage === 'ar' ? 'المدة (بالدقائق)' : 'Duration (minutes)'}
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <div className="relative">
                  <Clock className={`absolute top-1/2 transform -translate-y-1/2 text-slate-400 ${direction === 'rtl' ? 'right-3' : 'left-3'}`} size={20} />
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                    placeholder={currentLanguage === 'ar' ? '30' : '30'}
                    dir={direction}
                    className={`
                      w-full py-3 rounded-lg
                      bg-slate-700/50 border-2 border-transparent
                      text-white placeholder-slate-400
                      transition-all duration-300
                      focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                      focus:outline-none focus:bg-slate-700/70
                      ${errors.duration_minutes ? 'border-red-500' : ''}
                      ${direction === 'rtl' ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'}
                    `}
                  />
                </div>
                {errors.duration_minutes && (
                  <p className="text-red-400 text-sm mt-1">{errors.duration_minutes}</p>
                )}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              {/* VIP Service */}
              <div className={`flex items-center gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <input
                  type="checkbox"
                  id="is_vip"
                  checked={formData.is_vip}
                  onChange={(e) => handleInputChange('is_vip', e.target.checked)}
                  className="w-5 h-5 text-purple-500 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                />
                <label htmlFor="is_vip" className="text-white flex items-center gap-2">
                  <Star className="text-yellow-400" size={16} />
                  {currentLanguage === 'ar' ? 'خدمة مميزة (VIP)' : 'VIP Service'}
                </label>
              </div>

              {/* Active Status */}
              <div className={`flex items-center gap-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="w-5 h-5 text-green-500 bg-slate-700 border-slate-600 rounded focus:ring-green-500 focus:ring-2"
                />
                <label htmlFor="is_active" className="text-white">
                  {currentLanguage === 'ar' ? 'الخدمة نشطة' : 'Service Active'}
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className={`flex gap-4 pt-6 border-t border-slate-700 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <button
                type="submit"
                disabled={loading}
                className={`
                  flex-1 py-3 px-6 rounded-lg font-medium
                  bg-gradient-to-r from-purple-600 to-blue-600
                  text-white
                  hover:from-purple-700 hover:to-blue-700
                  transition-all duration-300
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                `}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {currentLanguage === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    {t('save')}
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 rounded-lg font-medium border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddServiceModalBilingual; 