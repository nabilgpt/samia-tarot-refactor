import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  CloudIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  UserIcon,
  GlobeAltIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../../../context/LanguageContext';

const ProviderViewModal = ({ 
  isOpen, 
  onClose, 
  provider = null,
  onEdit,
  onDelete
}) => {
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage === 'ar';

  if (!isOpen || !provider) return null;

  const formatDate = (dateString) => {
    if (!dateString) return isRTL ? 'غير محدد' : 'Not specified';
    
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (active) => {
    return active ? 'text-green-400' : 'text-red-400';
  };

  const getStatusIcon = (active) => {
    return active ? CheckCircleIcon : XCircleIcon;
  };

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
                {provider.logo_url ? (
                  <img 
                    src={provider.logo_url} 
                    alt={provider.name}
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <CloudIcon className="w-6 h-6 text-purple-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {provider.name}
                </h2>
                <p className="text-sm text-gray-400">
                  {isRTL ? 'تفاصيل المقدم' : 'Provider Details'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Provider Info */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TagIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-gray-300">
                    {isRTL ? 'النوع' : 'Type'}
                  </span>
                </div>
                <p className="text-white font-medium">
                  {provider.provider_type || (isRTL ? 'غير محدد' : 'Not specified')}
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {React.createElement(getStatusIcon(provider.active), {
                    className: `w-4 h-4 ${getStatusColor(provider.active)}`
                  })}
                  <span className="text-sm font-medium text-gray-300">
                    {isRTL ? 'الحالة' : 'Status'}
                  </span>
                </div>
                <p className={`font-medium ${getStatusColor(provider.active)}`}>
                  {provider.active 
                    ? (isRTL ? 'مفعل' : 'Active')
                    : (isRTL ? 'غير مفعل' : 'Inactive')
                  }
                </p>
              </div>
            </div>

            {/* Description */}
            {provider.description && (
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <GlobeAltIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-gray-300">
                    {isRTL ? 'الوصف' : 'Description'}
                  </span>
                </div>
                <p className="text-white" dir={isRTL ? 'rtl' : 'ltr'}>
                  {provider.description}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-gray-300">
                    {isRTL ? 'تاريخ الإنشاء' : 'Created'}
                  </span>
                </div>
                <p className="text-white">
                  {formatDate(provider.created_at)}
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-gray-300">
                    {isRTL ? 'آخر تحديث' : 'Last Updated'}
                  </span>
                </div>
                <p className="text-white">
                  {formatDate(provider.updated_at)}
                </p>
              </div>
            </div>

            {/* Logo Preview */}
            {provider.logo_url && (
              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <GlobeAltIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-gray-300">
                    {isRTL ? 'الشعار' : 'Logo'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <img 
                    src={provider.logo_url} 
                    alt={provider.name}
                    className="w-16 h-16 object-contain bg-white/10 rounded-lg p-2"
                  />
                  <div>
                    <p className="text-white text-sm font-medium">{provider.name}</p>
                    <p className="text-gray-400 text-xs break-all">
                      {provider.logo_url}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className={`flex gap-4 pt-6 mt-6 border-t border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {isRTL ? 'إغلاق' : 'Close'}
            </button>
            {onEdit && (
              <button
                onClick={() => {
                  onEdit(provider);
                  onClose();
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all"
              >
                {isRTL ? 'تحرير' : 'Edit'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(provider);
                  onClose();
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all"
              >
                {isRTL ? 'حذف' : 'Delete'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProviderViewModal; 