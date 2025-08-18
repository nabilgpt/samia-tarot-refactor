import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../../../context/LanguageContext';

const DeleteConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  item = null,
  itemType = 'provider',
  loading = false 
}) => {
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === 'ar';
  
  const [confirmText, setConfirmText] = useState('');

  const getItemTypeName = () => {
    const types = {
      provider: isRTL ? 'المقدم' : 'provider',
      service: isRTL ? 'الخدمة' : 'service',
      model: isRTL ? 'النموذج' : 'model',
      secret: isRTL ? 'السر' : 'secret'
    };
    return types[itemType] || itemType;
  };

  const getConfirmationText = () => {
    if (!item) return '';
    
    const itemName = item.name || item.config_key || item.service_name || item.model_name || 'item';
    return isRTL ? `احذف ${itemName}` : `delete ${itemName}`;
  };

  const handleConfirm = async () => {
    if (confirmText.toLowerCase() !== getConfirmationText().toLowerCase()) {
      return;
    }

    try {
      await onConfirm(item);
      onClose();
      setConfirmText('');
    } catch (error) {
      console.error('Error during deletion:', error);
    }
  };

  const handleClose = () => {
    onClose();
    setConfirmText('');
  };

  const isConfirmValid = confirmText.toLowerCase() === getConfirmationText().toLowerCase();

  if (!isOpen || !item) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 max-w-md w-full border border-red-500/20 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {isRTL ? 'تأكيد الحذف' : 'Confirm Deletion'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Warning Content */}
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-400 mb-1">
                    {isRTL ? 'تحذير: هذا الإجراء لا يمكن التراجع عنه' : 'Warning: This action cannot be undone'}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {isRTL 
                      ? `سيتم حذف ${getItemTypeName()} "${item.name || item.config_key || item.service_name || item.model_name}" نهائياً من النظام.`
                      : `The ${getItemTypeName()} "${item.name || item.config_key || item.service_name || item.model_name}" will be permanently deleted from the system.`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {isRTL 
                  ? `اكتب "${getConfirmationText()}" للتأكيد:`
                  : `Type "${getConfirmationText()}" to confirm:`
                }
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className={`w-full px-4 py-3 bg-gray-800/50 border ${
                  confirmText && !isConfirmValid ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                placeholder={getConfirmationText()}
                dir={isRTL ? 'rtl' : 'ltr'}
                autoComplete="off"
              />
              {confirmText && !isConfirmValid && (
                <p className="text-red-400 text-sm mt-1">
                  {isRTL ? 'النص غير مطابق' : 'Text does not match'}
                </p>
              )}
            </div>

            {/* Item Details */}
            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">
                {isRTL ? 'تفاصيل العنصر:' : 'Item Details:'}
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">
                    {isRTL ? 'الاسم:' : 'Name:'}
                  </span>
                  <span className="text-white">
                    {item.name || item.config_key || item.service_name || item.model_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">
                    {isRTL ? 'النوع:' : 'Type:'}
                  </span>
                  <span className="text-white">
                    {getItemTypeName()}
                  </span>
                </div>
                {item.provider_type && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">
                      {isRTL ? 'فئة المقدم:' : 'Provider Type:'}
                    </span>
                    <span className="text-white">
                      {item.provider_type}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex gap-4 pt-6 mt-6 border-t border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isConfirmValid || loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isRTL ? 'جاري الحذف...' : 'Deleting...'}
                </>
              ) : (
                <>
                  <TrashIcon className="w-5 h-5" />
                  {isRTL ? 'حذف نهائي' : 'Delete Forever'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeleteConfirmModal; 