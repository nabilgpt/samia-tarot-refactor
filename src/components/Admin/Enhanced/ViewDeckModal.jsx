import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Users, Image, CheckCircle, AlertTriangle, Calendar, User } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import api from '../../../services/frontendApi';

/**
 * ==========================================
 * SAMIA TAROT - VIEW DECK MODAL
 * Comprehensive deck details display
 * ==========================================
 */

const ViewDeckModal = ({ isOpen, onClose, deckData }) => {
  const { currentLanguage } = useLanguage();
  
  // State for dynamic deck types
  const [deckTypes, setDeckTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // Load deck types from database
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
  
  // Don't render if no deck data
  if (!deckData) {
    return null;
  }

  const visibilityTypes = [
    { value: 'public', label: currentLanguage === 'ar' ? 'عام' : 'Public' },
    { value: 'private', label: currentLanguage === 'ar' ? 'خاص' : 'Private' },
    { value: 'assigned', label: currentLanguage === 'ar' ? 'مخصص للقراء' : 'Assigned to Readers' }
  ];

  const getDeckTypeLabel = (type) => {
    const found = deckTypes.find(t => t.value === type);
    return found ? found.label : type;
  };

  const getVisibilityLabel = (type) => {
    const found = visibilityTypes.find(t => t.value === type);
    return found ? found.label : type;
  };

  const getUploadProgress = () => {
    const uploaded = deckData.total_images_uploaded || 0;
    const required = deckData.total_images_required || deckData.total_cards + 1;
    return { uploaded, required, percentage: Math.round((uploaded / required) * 100) };
  };

  const uploadProgress = getUploadProgress();

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
            onClick={onClose}
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
              <div className="w-full bg-gradient-to-br from-[#180724] to-[#2d2340] rounded-2xl p-8 border border-purple-500/20"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600/20 rounded-lg">
                      <Eye className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {currentLanguage === 'ar' ? 'تفاصيل مجموعة التاروت' : 'Tarot Deck Details'}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {currentLanguage === 'ar' ? 'عرض معلومات مفصلة' : 'Detailed information'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                  {currentLanguage === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-dark-700/50 rounded-lg border border-gray-600">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      {currentLanguage === 'ar' ? 'الاسم الإنجليزي' : 'English Name'}
                    </h4>
                    <p className="text-white font-medium">{deckData.name || 'N/A'}</p>
                  </div>

                  <div className="p-4 bg-dark-700/50 rounded-lg border border-gray-600">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      {currentLanguage === 'ar' ? 'الاسم العربي' : 'Arabic Name'}
                    </h4>
                    <p className="text-white font-medium" dir="rtl">{deckData.name_ar || 'غير متوفر'}</p>
                  </div>

                  <div className="p-4 bg-dark-700/50 rounded-lg border border-gray-600 md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      {currentLanguage === 'ar' ? 'الوصف' : 'Description'}
                    </h4>
                    <p className="text-white">
                      {currentLanguage === 'ar' 
                        ? (deckData.description_ar || deckData.description || 'لا يوجد وصف')
                        : (deckData.description || 'No description available')
                      }
                    </p>
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
                  <div className="p-4 bg-dark-700/50 rounded-lg border border-gray-600">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      {currentLanguage === 'ar' ? 'عدد البطاقات' : 'Total Cards'}
                    </h4>
                    <p className="text-white font-bold text-xl">{deckData.total_cards}</p>
                  </div>

                  <div className="p-4 bg-dark-700/50 rounded-lg border border-gray-600">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      {currentLanguage === 'ar' ? 'نوع المجموعة' : 'Deck Type'}
                    </h4>
                    <p className="text-white font-medium">{getDeckTypeLabel(deckData.deck_type)}</p>
                  </div>

                  <div className="p-4 bg-dark-700/50 rounded-lg border border-gray-600">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      {currentLanguage === 'ar' ? 'مستوى الرؤية' : 'Visibility'}
                    </h4>
                    <p className="text-white font-medium">{getVisibilityLabel(deckData.visibility_type)}</p>
                  </div>
                </div>
              </div>

              {/* Upload Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  {currentLanguage === 'ar' ? 'حالة الصور' : 'Image Status'}
                </h3>

                <div className="space-y-3">
                  <div className="p-4 bg-dark-700/50 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-300">
                        {currentLanguage === 'ar' ? 'تقدم الرفع' : 'Upload Progress'}
                      </h4>
                      <span className="text-sm font-medium text-white">
                        {uploadProgress.uploaded}/{uploadProgress.required} ({uploadProgress.percentage}%)
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          uploadProgress.percentage === 100 ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(uploadProgress.percentage, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        {deckData.card_back_uploaded ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        )}
                        <span className="text-gray-300">
                          {currentLanguage === 'ar' ? 'صورة الخلف' : 'Card Back'}: 
                          <span className={deckData.card_back_uploaded ? 'text-green-400 ml-1' : 'text-yellow-400 ml-1'}>
                            {deckData.card_back_uploaded 
                              ? (currentLanguage === 'ar' ? 'مرفوعة' : 'Uploaded')
                              : (currentLanguage === 'ar' ? 'مطلوبة' : 'Required')
                            }
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-300">
                          {currentLanguage === 'ar' ? 'حالة الرفع' : 'Status'}: 
                          <span className="text-blue-400 ml-1 capitalize">{deckData.upload_status}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reader Assignments */}
              {deckData.deck_assignments && deckData.deck_assignments.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    {currentLanguage === 'ar' ? 'القراء المخصصون' : 'Assigned Readers'}
                  </h3>

                  <div className="p-4 bg-dark-700/50 rounded-lg border border-gray-600">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-orange-400" />
                      <span className="text-white font-medium">
                        {deckData.deck_assignments.length} {currentLanguage === 'ar' ? 'قارئ مخصص' : 'readers assigned'}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {deckData.deck_assignments.map((assignment, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-dark-600/50 rounded border border-gray-700">
                          <span className="text-gray-300">
                            Reader ID: {assignment.reader_id}
                          </span>
                          <span className="text-xs text-gray-400">
                            {currentLanguage === 'ar' ? 'مخصص في' : 'Assigned'}: {new Date(assignment.assigned_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  {currentLanguage === 'ar' ? 'معلومات إضافية' : 'Metadata'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-dark-700/30 rounded border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      {currentLanguage === 'ar' ? 'تاريخ الإنشاء' : 'Created'}
                    </div>
                    <p className="text-white">{new Date(deckData.created_at).toLocaleString()}</p>
                  </div>

                  <div className="p-3 bg-dark-700/30 rounded border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      {currentLanguage === 'ar' ? 'آخر تحديث' : 'Last Updated'}
                    </div>
                    <p className="text-white">{new Date(deckData.updated_at).toLocaleString()}</p>
                  </div>

                  <div className="p-3 bg-dark-700/30 rounded border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <User className="w-4 h-4" />
                      {currentLanguage === 'ar' ? 'منشئ' : 'Creator ID'}
                    </div>
                    <p className="text-white font-mono text-xs">{deckData.created_by}</p>
                  </div>

                  <div className="p-3 bg-dark-700/30 rounded border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Eye className="w-4 h-4" />
                      {currentLanguage === 'ar' ? 'معرف المجموعة' : 'Deck ID'}
                    </div>
                    <p className="text-white font-mono text-xs">{deckData.id}</p>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              {deckData.admin_notes && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    {currentLanguage === 'ar' ? 'ملاحظات الإدارة' : 'Admin Notes'}
                  </h3>

                  <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-lg">
                    <p className="text-gray-300 whitespace-pre-wrap">{deckData.admin_notes}</p>
                  </div>
                </div>
              )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ViewDeckModal; 