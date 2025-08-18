import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, AlertCircle, Save, Loader, Info } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import api from '../../../services/frontendApi';

/**
 * ==========================================
 * SAMIA TAROT - EDIT DECK MODAL
 * Unified layout with page-level scrolling
 * ==========================================
 */

const EditDeckModal = ({ isOpen, onClose, onSave, deckData, loading = false }) => {
  const { currentLanguage } = useLanguage();
  
  // ===================================
  // STATE MANAGEMENT
  // ===================================
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    total_cards: 78,
    deck_type: 'tarot',
    visibility_type: 'public',
    admin_notes: ''
  });
  
  const [originalData, setOriginalData] = useState({});
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // State for dynamic deck types
  const [deckTypes, setDeckTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // ===================================
  // LOAD DYNAMIC DATA
  // ===================================
  useEffect(() => {
    if (isOpen) {
      loadDeckTypes();
    }
  }, [isOpen]);

  const loadDeckTypes = async () => {
    try {
      setLoadingTypes(true);
      const response = await api.get('/admin/tarot/deck-types');
      
      if (response.success) {
        const types = (response.data || []).map(type => ({
          value: type.name_en?.toLowerCase().replace(/\s+/g, '_') || type.id,
          label: currentLanguage === 'ar' ? type.name_ar || type.name_en : type.name_en || type.name_ar,
          id: type.id
        }));
        setDeckTypes(types);
      }
    } catch (error) {
      console.error('Error loading deck types:', error);
      // Fallback to basic types if API fails
      setDeckTypes([
        { value: 'tarot', label: currentLanguage === 'ar' ? 'تاروت' : 'Tarot' },
        { value: 'oracle', label: currentLanguage === 'ar' ? 'أوراكل' : 'Oracle' },
        { value: 'custom', label: currentLanguage === 'ar' ? 'مخصص' : 'Custom' }
      ]);
    } finally {
      setLoadingTypes(false);
    }
  };

  // ===================================
  // CONFIGURATION
  // ===================================

  const visibilityTypes = [
    { value: 'public', label: currentLanguage === 'ar' ? 'عام' : 'Public' },
    { value: 'private', label: currentLanguage === 'ar' ? 'خاص' : 'Private' },
    { value: 'restricted', label: currentLanguage === 'ar' ? 'محدود' : 'Restricted' }
  ];

  // ===================================
  // VALIDATION
  // ===================================
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return currentLanguage === 'ar' ? 'الاسم مطلوب' : 'Name is required';
        if (value.length < 2) return currentLanguage === 'ar' ? 'الاسم قصير جداً' : 'Name too short';
        if (value.length > 100) return currentLanguage === 'ar' ? 'الاسم طويل جداً' : 'Name too long';
        break;
      case 'total_cards':
        const num = parseInt(value);
        if (!num || num < 1) return currentLanguage === 'ar' ? 'عدد البطاقات مطلوب' : 'Card count required';
        if (num > 200) return currentLanguage === 'ar' ? 'عدد البطاقات كبير جداً' : 'Too many cards';
        break;
      case 'description':
        if (value && value.length > 500) return currentLanguage === 'ar' ? 'الوصف طويل جداً' : 'Description too long';
        break;
      case 'description_ar':
        if (value && value.length > 500) return currentLanguage === 'ar' ? 'الوصف طويل جداً' : 'Description too long';
        break;
      case 'name_ar':
        if (value && value.length > 100) return currentLanguage === 'ar' ? 'الاسم طويل جداً' : 'Name too long';
        break;
      case 'admin_notes':
        if (value && value.length > 1000) return currentLanguage === 'ar' ? 'الملاحظات طويلة جداً' : 'Notes too long';
        break;
    }
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===================================
  // CHANGE DETECTION
  // ===================================
  const checkForChanges = (newData) => {
    const changed = Object.keys(newData).some(key => 
      newData[key] !== originalData[key]
    );
    setHasChanges(changed);
  };

  // ===================================
  // EVENT HANDLERS
  // ===================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear field error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    
    // Update form data
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    
    // Check for changes
    checkForChanges(newData);
    
    // Validate field
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.warn('❌ [EditDeckModal] Form validation failed');
      return;
    }
    
    console.log('💾 [EditDeckModal] Submitting form data:', formData);
    
    try {
      await onSave(deckData.id, formData);
      console.log('✅ [EditDeckModal] Deck updated successfully');
      onClose();
    } catch (error) {
      console.error('💥 [EditDeckModal] Save failed:', error);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm(
        currentLanguage === 'ar' 
          ? 'لديك تغييرات غير محفوظة. هل تريد الإغلاق؟'
          : 'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }
    
    // Reset form
    if (deckData) {
      const initialData = {
        name: deckData.name || '',
        name_ar: deckData.name_ar || '',
        description: deckData.description || '',
        description_ar: deckData.description_ar || '',
        total_cards: deckData.total_cards || 78,
        deck_type: deckData.deck_type || 'tarot',
        visibility_type: deckData.visibility_type || 'public',
        admin_notes: deckData.admin_notes || ''
      };
      setFormData(initialData);
      setOriginalData(initialData);
    }
    
    setErrors({});
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    const confirmReset = window.confirm(
      currentLanguage === 'ar'
        ? 'هل تريد إعادة تعيين جميع التغييرات؟'
        : 'Are you sure you want to reset all changes?'
    );
    
    if (confirmReset) {
      setFormData(originalData);
      setErrors({});
      setHasChanges(false);
    }
  };

  // ===================================
  // INITIALIZATION
  // ===================================
  useEffect(() => {
    if (isOpen && deckData) {
      const initialData = {
        name: deckData.name || '',
        name_ar: deckData.name_ar || '',
        description: deckData.description || '',
        description_ar: deckData.description_ar || '',
        total_cards: deckData.total_cards || 78,
        deck_type: deckData.deck_type || 'tarot',
        visibility_type: deckData.visibility_type || 'public',
        admin_notes: deckData.admin_notes || ''
      };
      
      setFormData(initialData);
      setOriginalData(initialData);
      setHasChanges(false);
    }
  }, [isOpen, deckData]);

  // Don't render if no deck data
  if (!deckData) {
    return null;
  }

  // ===================================
  // RENDER
  // ===================================
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={handleClose}
          />

          {/* Modal Container - Page-level scrolling */}
          <div className="fixed inset-4 top-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-auto max-w-6xl mx-auto min-h-[calc(100vh-32px)]"
              style={{ top: '0px' }}
            >
              <div className="w-full bg-gradient-to-br from-[#180724] to-[#2d2340] rounded-2xl p-8 border border-purple-500/20">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-600/20 rounded-lg">
                      <Edit3 className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {currentLanguage === 'ar' ? 'تعديل مجموعة التاروت' : 'Edit Tarot Deck'}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {currentLanguage === 'ar' ? `تعديل: ${deckData.name_ar || deckData.name}` : `Editing: ${deckData.name}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <div className="flex items-center gap-1 text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded">
                        <Info className="w-3 h-3" />
                        {currentLanguage === 'ar' ? 'تغييرات غير محفوظة' : 'Unsaved changes'}
                      </div>
                    )}
                    <button
                      onClick={handleClose}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                      {currentLanguage === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
                    </h3>

                    {/* Names */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {currentLanguage === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                            errors.name ? 'border-red-500' : hasChanges && formData.name !== originalData.name ? 'border-yellow-500' : 'border-gray-600'
                          }`}
                          placeholder="Enter deck name"
                          disabled={loading}
                        />
                        {errors.name && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {currentLanguage === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
                        </label>
                        <input
                          type="text"
                          name="name_ar"
                          value={formData.name_ar}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                            errors.name_ar ? 'border-red-500' : hasChanges && formData.name_ar !== originalData.name_ar ? 'border-yellow-500' : 'border-gray-600'
                          }`}
                          placeholder="أدخل اسم المجموعة"
                          disabled={loading}
                          dir="rtl"
                        />
                        {errors.name_ar && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.name_ar}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Descriptions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {currentLanguage === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={3}
                          className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all ${
                            errors.description ? 'border-red-500' : hasChanges && formData.description !== originalData.description ? 'border-yellow-500' : 'border-gray-600'
                          }`}
                          placeholder="Enter deck description"
                          disabled={loading}
                        />
                        {errors.description && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.description}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {currentLanguage === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
                        </label>
                        <textarea
                          name="description_ar"
                          value={formData.description_ar}
                          onChange={handleInputChange}
                          rows={3}
                          className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all ${
                            errors.description_ar ? 'border-red-500' : hasChanges && formData.description_ar !== originalData.description_ar ? 'border-yellow-500' : 'border-gray-600'
                          }`}
                          placeholder="أدخل وصف المجموعة"
                          disabled={loading}
                          dir="rtl"
                        />
                        {errors.description_ar && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.description_ar}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 bg-gold-400 rounded-full"></span>
                      {currentLanguage === 'ar' ? 'إعدادات المجموعة' : 'Deck Configuration'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Total Cards */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {currentLanguage === 'ar' ? 'عدد البطاقات' : 'Total Cards'} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          name="total_cards"
                          value={formData.total_cards}
                          onChange={handleInputChange}
                          min="1"
                          max="200"
                          className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                            errors.total_cards ? 'border-red-500' : hasChanges && formData.total_cards !== originalData.total_cards ? 'border-yellow-500' : 'border-gray-600'
                          }`}
                          disabled={loading}
                        />
                        {errors.total_cards && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.total_cards}
                          </p>
                        )}
                      </div>

                      {/* Deck Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {currentLanguage === 'ar' ? 'نوع المجموعة' : 'Deck Type'} <span className="text-red-400">*</span>
                        </label>
                        <select
                          name="deck_type"
                          value={formData.deck_type}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                            hasChanges && formData.deck_type !== originalData.deck_type ? 'border-yellow-500' : 'border-gray-600'
                          }`}
                          disabled={loading}
                        >
                          {deckTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Visibility */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {currentLanguage === 'ar' ? 'مستوى الرؤية' : 'Visibility'} <span className="text-red-400">*</span>
                        </label>
                        <select
                          name="visibility_type"
                          value={formData.visibility_type}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                            hasChanges && formData.visibility_type !== originalData.visibility_type ? 'border-yellow-500' : 'border-gray-600'
                          }`}
                          disabled={loading}
                        >
                          {visibilityTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      {currentLanguage === 'ar' ? 'ملاحظات الإدارة' : 'Admin Notes'}
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {currentLanguage === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}
                      </label>
                      <textarea
                        name="admin_notes"
                        value={formData.admin_notes}
                        onChange={handleInputChange}
                        rows={3}
                        className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all ${
                          hasChanges && formData.admin_notes !== originalData.admin_notes ? 'border-yellow-500' : 'border-gray-600'
                        }`}
                        placeholder={currentLanguage === 'ar' ? 'ملاحظات داخلية للإدارة...' : 'Internal admin notes...'}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Deck Info */}
                  {deckData && (
                    <div className="p-4 bg-dark-700/50 rounded-lg border border-gray-600">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">
                        {currentLanguage === 'ar' ? 'معلومات المجموعة' : 'Deck Information'}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                        <div>
                          <span className="font-medium">{currentLanguage === 'ar' ? 'معرف المجموعة:' : 'Deck ID:'}</span>
                          <span className="ml-1 font-mono">{deckData.id}</span>
                        </div>
                        <div>
                          <span className="font-medium">{currentLanguage === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'}</span>
                          <span className="ml-1">{new Date(deckData.created_at).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="font-medium">{currentLanguage === 'ar' ? 'حالة الرفع:' : 'Upload Status:'}</span>
                          <span className="ml-1">{deckData.upload_status}</span>
                        </div>
                        <div>
                          <span className="font-medium">{currentLanguage === 'ar' ? 'الصور المرفوعة:' : 'Images Uploaded:'}</span>
                          <span className="ml-1">{deckData.total_images_uploaded || 0}/{deckData.total_images_required || deckData.total_cards + 1}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-6 border-t border-purple-500/20">
                    <div className="flex items-center gap-3">
                      {hasChanges && (
                        <button
                          type="button"
                          onClick={handleReset}
                          disabled={loading}
                          className="px-4 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          {currentLanguage === 'ar' ? 'إعادة تعيين' : 'Reset'}
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                      
                      <button
                        type="submit"
                        disabled={loading || Object.keys(errors).length > 0 || !hasChanges}
                        className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            {currentLanguage === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            {currentLanguage === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditDeckModal; 