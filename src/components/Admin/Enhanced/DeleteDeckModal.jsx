import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle, Loader, Info } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * ==========================================
 * SAMIA TAROT - DELETE DECK CONFIRMATION MODAL
 * Safe deck deletion with warnings
 * ==========================================
 */

const DeleteDeckModal = ({ isOpen, onClose, onConfirm, deckData, loading = false }) => {
  const { currentLanguage } = useLanguage();
  
  // Don't render if no deck data
  if (!deckData) {
    return null;
  }

  const handleConfirm = async () => {
    console.log('🗑️ [DeleteDeckModal] Confirming deletion for deck:', deckData.id);
    try {
      await onConfirm(deckData.id);
      onClose();
    } catch (error) {
      console.error('💥 [DeleteDeckModal] Delete failed:', error);
    }
  };

  const hasAssignments = deckData.deck_assignments && deckData.deck_assignments.length > 0;
  const hasImages = (deckData.total_images_uploaded || 0) > 0;
  const isInUse = hasAssignments || hasImages;

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
              className="w-auto max-w-lg mx-auto min-h-[calc(100vh-32px)]"
              style={{ top: '0px' }}
            >
              <div className="w-full bg-gradient-to-br from-[#180724] to-[#2d2340] rounded-2xl p-8 border border-red-500/30"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-600/20 rounded-lg">
                      <Trash2 className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {currentLanguage === 'ar' ? 'تأكيد حذف المجموعة' : 'Confirm Deck Deletion'}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {currentLanguage === 'ar' ? 'هذا الإجراء لا يمكن التراجع عنه' : 'This action cannot be undone'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
              {/* Deck Information */}
              <div className="p-4 bg-dark-700/50 rounded-lg border border-gray-600">
                <h3 className="font-semibold text-white mb-2">
                  {currentLanguage === 'ar' ? 'المجموعة المراد حذفها:' : 'Deck to be deleted:'}
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="text-white">
                    <span className="font-medium">
                      {currentLanguage === 'ar' ? 'الاسم:' : 'Name:'}
                    </span>
                    <span className="ml-2">
                      {currentLanguage === 'ar' ? (deckData.name_ar || deckData.name) : deckData.name}
                    </span>
                  </p>
                  <p className="text-gray-400">
                    <span className="font-medium">
                      {currentLanguage === 'ar' ? 'النوع:' : 'Type:'}
                    </span>
                    <span className="ml-2">{deckData.deck_type}</span>
                  </p>
                  <p className="text-gray-400">
                    <span className="font-medium">
                      {currentLanguage === 'ar' ? 'البطاقات:' : 'Cards:'}
                    </span>
                    <span className="ml-2">{deckData.total_cards}</span>
                  </p>
                  <p className="text-gray-400">
                    <span className="font-medium">
                      {currentLanguage === 'ar' ? 'الصور المرفوعة:' : 'Images:'}
                    </span>
                    <span className="ml-2">{deckData.total_images_uploaded || 0}</span>
                  </p>
                </div>
              </div>

              {/* Warnings */}
              {isInUse && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">
                      {currentLanguage === 'ar' ? 'تحذير: المجموعة قيد الاستخدام' : 'Warning: Deck is in use'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    {hasAssignments && (
                      <div className="p-3 bg-yellow-600/10 border border-yellow-600/20 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-400 mb-1">
                          <Info className="w-4 h-4" />
                          <span className="font-medium">
                            {currentLanguage === 'ar' ? 'مخصصة للقراء' : 'Reader Assignments'}
                          </span>
                        </div>
                        <p className="text-gray-300">
                          {currentLanguage === 'ar' 
                            ? `هذه المجموعة مخصصة لـ ${deckData.deck_assignments.length} قارئ. سيتم إلغاء هذه التخصيصات.`
                            : `This deck is assigned to ${deckData.deck_assignments.length} reader(s). These assignments will be removed.`
                          }
                        </p>
                      </div>
                    )}

                    {hasImages && (
                      <div className="p-3 bg-orange-600/10 border border-orange-600/20 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-400 mb-1">
                          <Info className="w-4 h-4" />
                          <span className="font-medium">
                            {currentLanguage === 'ar' ? 'الصور المرفوعة' : 'Uploaded Images'}
                          </span>
                        </div>
                        <p className="text-gray-300">
                          {currentLanguage === 'ar' 
                            ? `${deckData.total_images_uploaded} صورة مرفوعة ستفقد نهائياً.`
                            : `${deckData.total_images_uploaded} uploaded image(s) will be permanently lost.`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Final Warning */}
              <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">
                    {currentLanguage === 'ar' ? 'تأكيد الحذف النهائي' : 'Permanent Deletion'}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">
                  {currentLanguage === 'ar' 
                    ? 'بمجرد حذف هذه المجموعة، لن يمكن استردادها. جميع البيانات والصور والتخصيصات ستفقد نهائياً.'
                    : 'Once deleted, this deck cannot be recovered. All data, images, and assignments will be permanently lost.'
                  }
                </p>
              </div>

              {/* Confirmation Question */}
              <div className="text-center py-2">
                <p className="text-white font-medium">
                  {currentLanguage === 'ar' 
                    ? 'هل أنت متأكد من أنك تريد حذف هذه المجموعة؟'
                    : 'Are you sure you want to delete this deck?'
                  }
                </p>
              </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-red-500/20">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        {currentLanguage === 'ar' ? 'جاري الحذف...' : 'Deleting...'}
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        {currentLanguage === 'ar' ? 'نعم، احذف المجموعة' : 'Yes, Delete Deck'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DeleteDeckModal; 