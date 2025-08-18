import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Search, 
  Filter,
  RefreshCw, 
  Sparkles,
  Crown,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Languages,
  Globe
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/frontendApi';

/**
 * ==========================================
 * SAMIA TAROT - DECK TYPES MANAGER
 * Comprehensive deck types management with dynamic translation
 * ==========================================
 */

const DeckTypesManager = () => {
  const { currentLanguage, direction } = useLanguage();
  const { profile } = useAuth();
  
  // ===================================
  // STATE MANAGEMENT
  // ===================================
  const [deckTypes, setDeckTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeckType, setSelectedDeckType] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    is_active: true
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [translating, setTranslating] = useState(false);

  // ===================================
  // DATA LOADING
  // ===================================
  useEffect(() => {
    loadDeckTypes();
  }, []);

  const loadDeckTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/admin/tarot/deck-types');
      
      // Debug logging
      console.log('🔍 [DeckTypesManager] Response received:', {
        success: response.success,
        data: response.data,
        error: response.error,
        fullResponse: response
      });
      
      if (response.success) {
        console.log('✅ [DeckTypesManager] Setting deck types:', response.data);
        setDeckTypes(response.data || []);
      } else {
        console.error('❌ [DeckTypesManager] API returned error:', response.error);
        throw new Error(response.error || 'Failed to load deck types');
      }
    } catch (err) {
      console.error('❌ [DeckTypesManager] Catch block error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===================================
  // FORM MANAGEMENT
  // ===================================
  const resetForm = () => {
    setFormData({
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      is_active: true
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name_en?.trim()) {
      errors.name_en = currentLanguage === 'ar' ? 'الاسم بالإنجليزية مطلوب' : 'English name is required';
    }
    
    if (!formData.name_ar?.trim()) {
      errors.name_ar = currentLanguage === 'ar' ? 'الاسم بالعربية مطلوب' : 'Arabic name is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // ===================================
  // AUTO-TRANSLATION
  // ===================================
  const handleAutoTranslate = async (sourceField, targetField) => {
    const sourceValue = formData[sourceField];
    if (!sourceValue?.trim()) return;
    
    try {
      setTranslating(true);
      
      const response = await api.post('/admin/tarot/auto-translate', {
        text: sourceValue,
        source_language: sourceField.includes('_ar') ? 'ar' : 'en',
        target_language: targetField.includes('_ar') ? 'ar' : 'en'
      });
      
      if (response.data.success && response.data.translation) {
        handleInputChange(targetField, response.data.translation);
      }
    } catch (err) {
      console.error('Auto-translation failed:', err);
    } finally {
      setTranslating(false);
    }
  };

  // ===================================
  // CRUD OPERATIONS
  // ===================================
  const handleCreate = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      
      const response = await api.post('/admin/tarot/deck-types', formData);
      
      if (response.success) {
        await loadDeckTypes();
        setShowAddModal(false);
        resetForm();
      } else {
        throw new Error(response.error || 'Failed to create deck type');
      }
    } catch (err) {
      console.error('Error creating deck type:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!validateForm() || !selectedDeckType) return;
    
    try {
      setSaving(true);
      
      const response = await api.put(`/admin/tarot/deck-types/${selectedDeckType.id}`, formData);
      
      if (response.success) {
        await loadDeckTypes();
        setShowEditModal(false);
        setSelectedDeckType(null);
        resetForm();
      } else {
        throw new Error(response.error || 'Failed to update deck type');
      }
    } catch (err) {
      console.error('Error updating deck type:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDeckType) return;
    
    try {
      setSaving(true);
      
      const response = await api.delete(`/admin/tarot/deck-types/${selectedDeckType.id}`);
      
      if (response.success) {
        await loadDeckTypes();
        setShowDeleteModal(false);
        setSelectedDeckType(null);
      } else {
        throw new Error(response.error || 'Failed to delete deck type');
      }
    } catch (err) {
      console.error('Error deleting deck type:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ===================================
  // EVENT HANDLERS
  // ===================================
  const handleAddClick = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditClick = (deckType) => {
    setSelectedDeckType(deckType);
    setFormData({
      name_en: deckType.name_en || '',
      name_ar: deckType.name_ar || '',
      description_en: deckType.description_en || '',
      description_ar: deckType.description_ar || '',
      is_active: deckType.is_active !== false
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (deckType) => {
    setSelectedDeckType(deckType);
    setShowDeleteModal(true);
  };

  // ===================================
  // FILTERING
  // ===================================
  const filteredDeckTypes = deckTypes.filter(deckType => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      deckType.name_en?.toLowerCase().includes(searchLower) ||
      deckType.name_ar?.toLowerCase().includes(searchLower) ||
      deckType.description_en?.toLowerCase().includes(searchLower) ||
      deckType.description_ar?.toLowerCase().includes(searchLower)
    );
  });

  // ===================================
  // RENDER HELPERS
  // ===================================
  const getText = (ar, en) => currentLanguage === 'ar' ? ar : en;

  const renderFormField = (field, label, placeholder, type = 'text', multiline = false) => {
    const Component = multiline ? 'textarea' : 'input';
    const isError = formErrors[field];
    
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          {label} <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Component
            type={type}
            value={formData[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={placeholder}
            rows={multiline ? 3 : undefined}
            className={`w-full px-4 py-3 bg-[#1a1a2e] border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none ${
              isError ? 'border-red-500' : 'border-gray-600'
            }`}
            dir={field.includes('_ar') ? 'rtl' : 'ltr'}
          />
          {/* Auto-translate button */}
          {field.includes('name') && (
            <button
              type="button"
              onClick={() => {
                if (field.includes('_en')) {
                  handleAutoTranslate('name_en', 'name_ar');
                } else {
                  handleAutoTranslate('name_ar', 'name_en');
                }
              }}
              disabled={translating}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors"
              title={getText('ترجمة تلقائية', 'Auto-translate')}
            >
              {translating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Languages className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        {isError && (
          <p className="text-red-400 text-sm">{isError}</p>
        )}
      </div>
    );
  };

  const renderDeckTypeCard = (deckType) => (
    <motion.div
      key={deckType.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">
            {currentLanguage === 'ar' ? deckType.name_ar || deckType.name_en : deckType.name_en || deckType.name_ar}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs ${
            deckType.is_active 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {deckType.is_active ? getText('نشط', 'Active') : getText('غير نشط', 'Inactive')}
          </span>
        </div>
      </div>
      
      {(deckType.description_en || deckType.description_ar) && (
        <p className="text-gray-300 text-sm mb-4">
          {currentLanguage === 'ar' ? deckType.description_ar || deckType.description_en : deckType.description_en || deckType.description_ar}
        </p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {getText('تاريخ الإنشاء:', 'Created:')} {new Date(deckType.created_at).toLocaleDateString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US')}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditClick(deckType)}
            className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
            title={getText('تعديل', 'Edit')}
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteClick(deckType)}
            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            title={getText('حذف', 'Delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  // ===================================
  // MAIN RENDER
  // ===================================
  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="w-8 h-8 text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">
              {getText('إدارة أنواع مجموعات التاروت', 'Tarot Deck Types Management')}
            </h2>
            <p className="text-gray-300 mt-1">
              {getText('إدارة وتحرير أنواع مجموعات التاروت المختلفة', 'Manage and edit different tarot deck types')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDeckTypes}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {getText('تحديث', 'Refresh')}
          </button>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {getText('إضافة نوع جديد', 'Add New Type')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={getText('البحث في أنواع المجموعات...', 'Search deck types...')}
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5" />
          {error}
        </motion.div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      ) : (
        <>
          {/* Deck Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredDeckTypes.map(renderDeckTypeCard)}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredDeckTypes.length === 0 && (
            <div className="text-center py-12">
              <Crown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                {getText('لا توجد أنواع مجموعات', 'No deck types found')}
              </h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? getText('جرب مصطلح بحث مختلف', 'Try a different search term')
                  : getText('ابدأ بإضافة نوع مجموعة جديد', 'Start by adding a new deck type')
                }
              </p>
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#22173a] border border-[#2e1d53] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Plus className="w-6 h-6 text-purple-400" />
                  {getText('إضافة نوع مجموعة جديد', 'Add New Deck Type')}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {renderFormField('name_en', getText('الاسم بالإنجليزية', 'English Name'), getText('مثل: Rider-Waite', 'e.g., Rider-Waite'))}
                {renderFormField('name_ar', getText('الاسم بالعربية', 'Arabic Name'), getText('مثل: رايدر-وايت', 'e.g., رايدر-وايت'))}
                {renderFormField('description_en', getText('الوصف بالإنجليزية', 'English Description'), getText('وصف اختياري...', 'Optional description...'), 'text', true)}
                {renderFormField('description_ar', getText('الوصف بالعربية', 'Arabic Description'), getText('وصف اختياري...', 'Optional description...'), 'text', true)}
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active_add"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="is_active_add" className="text-gray-300">
                    {getText('نشط', 'Active')}
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? getText('جاري الحفظ...', 'Saving...') : getText('حفظ', 'Save')}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {getText('إلغاء', 'Cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedDeckType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#22173a] border border-[#2e1d53] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Edit3 className="w-6 h-6 text-blue-400" />
                  {getText('تعديل نوع المجموعة', 'Edit Deck Type')}
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {renderFormField('name_en', getText('الاسم بالإنجليزية', 'English Name'), getText('مثل: Rider-Waite', 'e.g., Rider-Waite'))}
                {renderFormField('name_ar', getText('الاسم بالعربية', 'Arabic Name'), getText('مثل: رايدر-وايت', 'e.g., رايدر-وايت'))}
                {renderFormField('description_en', getText('الوصف بالإنجليزية', 'English Description'), getText('وصف اختياري...', 'Optional description...'), 'text', true)}
                {renderFormField('description_ar', getText('الوصف بالعربية', 'Arabic Description'), getText('وصف اختياري...', 'Optional description...'), 'text', true)}
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active_edit"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="is_active_edit" className="text-gray-300">
                    {getText('نشط', 'Active')}
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? getText('جاري التحديث...', 'Updating...') : getText('تحديث', 'Update')}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {getText('إلغاء', 'Cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedDeckType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#22173a] border border-[#2e1d53] rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h3 className="text-xl font-bold text-white">
                  {getText('تأكيد الحذف', 'Confirm Delete')}
                </h3>
              </div>

              <p className="text-gray-300 mb-6">
                {getText(
                  `هل أنت متأكد من حذف نوع المجموعة "${selectedDeckType.name_ar || selectedDeckType.name_en}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
                  `Are you sure you want to delete the deck type "${selectedDeckType.name_en || selectedDeckType.name_ar}"? This action cannot be undone.`
                )}
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {saving ? getText('جاري الحذف...', 'Deleting...') : getText('حذف', 'Delete')}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {getText('إلغاء', 'Cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeckTypesManager; 