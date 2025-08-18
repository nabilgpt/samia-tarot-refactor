import React from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon, 
  ExclamationTriangleIcon,
  CheckIcon,
  ClockIcon,
  StarIcon,
  BookOpenIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../context/LanguageContext';

/**
 * ==========================================
 * SPREAD MODAL WRAPPER COMPONENT
 * Contains Edit, Delete, and View Modals
 * ==========================================
 */

// Edit Spread Modal
const EditSpreadModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  formData, 
  setFormData, 
  errors, 
  submitting, 
  categories, 
  decks,
  spread 
}) => {
  const { currentLanguage, direction } = useLanguage();
  
  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl mx-auto my-10 rounded-2xl shadow-xl bg-gradient-to-br from-[#180724] to-[#2d2340] p-6 flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        dir={direction}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-center text-gold-300">
            {currentLanguage === 'ar' ? 'تحرير انتشار التاروت' : 'Edit Tarot Spread'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
          {/* Dynamic Name Field */}
          <div>
            <label className="block text-lg font-semibold mb-1 text-gold-300" htmlFor="edit-spread-name">
              {currentLanguage === 'ar' ? 'اسم الانتشار' : 'Spread Name'}
            </label>
            <input
              id="edit-spread-name"
              type="text"
              className="w-full rounded-lg px-4 py-2 bg-[#22173a] border border-[#2e1d53] focus:ring-2 focus:ring-[#a259ef] text-base text-white placeholder-gray-400 transition-all duration-300"
              placeholder={currentLanguage === 'ar' ? 'ادخل اسم الانتشار بالعربية' : 'Enter spread name in English'}
              value={currentLanguage === 'ar' ? formData.name_ar : formData.name_en}
              onChange={e => handleInputChange(
                currentLanguage === 'ar' ? 'name_ar' : 'name_en', 
                e.target.value
              )}
              dir={direction}
            />
            {errors[currentLanguage === 'ar' ? 'name_ar' : 'name_en'] && (
              <p className="text-red-400 text-xs mt-1">
                {errors[currentLanguage === 'ar' ? 'name_ar' : 'name_en']}
              </p>
            )}
          </div>

          {/* Dynamic Description Field */}
          <div>
            <label className="block text-lg font-semibold mb-1 text-gold-300" htmlFor="edit-spread-desc">
              {currentLanguage === 'ar' ? 'الوصف' : 'Description'}
            </label>
            <textarea
              id="edit-spread-desc"
              className="w-full rounded-lg px-4 py-2 bg-[#22173a] border border-[#2e1d53] focus:ring-2 focus:ring-[#a259ef] text-base text-white placeholder-gray-400 min-h-[80px] resize-none transition-all duration-300"
              placeholder={currentLanguage === 'ar' ? 'ادخل وصف الانتشار بالعربية' : 'Enter spread description in English'}
              value={currentLanguage === 'ar' ? formData.description_ar : formData.description_en}
              onChange={e => handleInputChange(
                currentLanguage === 'ar' ? 'description_ar' : 'description_en', 
                e.target.value
              )}
              dir={direction}
            />
            {errors[currentLanguage === 'ar' ? 'description_ar' : 'description_en'] && (
              <p className="text-red-400 text-xs mt-1">
                {errors[currentLanguage === 'ar' ? 'description_ar' : 'description_en']}
              </p>
            )}
          </div>

          {/* Card Count, Difficulty, Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card Count */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gold-300">
                {currentLanguage === 'ar' ? 'عدد الأوراق' : 'Card Count'}
              </label>
              <input
                type="number"
                min={1}
                max={78}
                value={formData.card_count}
                onChange={(e) => handleInputChange('card_count', parseInt(e.target.value) || 1)}
                className="w-full rounded-lg px-3 py-1.5 bg-[#22173a] border border-[#2e1d53] focus:ring-2 focus:ring-[#a259ef] text-white transition-all duration-300"
                dir={direction}
              />
              {errors.card_count && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.card_count}
                </p>
              )}
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gold-300">
                {currentLanguage === 'ar' ? 'مستوى الصعوبة' : 'Difficulty'}
              </label>
              <select
                value={formData.difficulty_level}
                onChange={(e) => handleInputChange('difficulty_level', e.target.value)}
                className="w-full rounded-lg px-3 py-1.5 bg-[#22173a] border border-[#2e1d53] focus:ring-2 focus:ring-[#a259ef] text-white transition-all duration-300"
                dir={direction}
              >
                <option value="beginner">{currentLanguage === 'ar' ? 'مبتدئ' : 'Beginner'}</option>
                <option value="intermediate">{currentLanguage === 'ar' ? 'متوسط' : 'Intermediate'}</option>
                <option value="advanced">{currentLanguage === 'ar' ? 'متقدم' : 'Advanced'}</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gold-300">
                {currentLanguage === 'ar' ? 'الفئة' : 'Category'}
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full rounded-lg px-3 py-1.5 bg-[#22173a] border border-[#2e1d53] focus:ring-2 focus:ring-[#a259ef] text-white transition-all duration-300"
                dir={direction}
              >
                <option value="general">{currentLanguage === 'ar' ? 'عام' : 'General'}</option>
                <option value="love">{currentLanguage === 'ar' ? 'حب' : 'Love'}</option>
                <option value="career">{currentLanguage === 'ar' ? 'مهنة' : 'Career'}</option>
                <option value="spiritual">{currentLanguage === 'ar' ? 'روحاني' : 'Spiritual'}</option>
                <option value="health">{currentLanguage === 'ar' ? 'صحة' : 'Health'}</option>
                <option value="finance">{currentLanguage === 'ar' ? 'مال' : 'Finance'}</option>
              </select>
            </div>
          </div>

          {/* Layout Type */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gold-300">
              {currentLanguage === 'ar' ? 'نوع التخطيط' : 'Layout Type'}
            </label>
            <select
              value={formData.layout_type}
              onChange={(e) => handleInputChange('layout_type', e.target.value)}
              className="w-full rounded-lg px-3 py-1.5 bg-[#22173a] border border-[#2e1d53] focus:ring-2 focus:ring-[#a259ef] text-white transition-all duration-300"
              dir={direction}
            >
              <option value="linear">{currentLanguage === 'ar' ? 'خطي' : 'Linear'}</option>
              <option value="circle">{currentLanguage === 'ar' ? 'دائري' : 'Circle'}</option>
              <option value="cross">{currentLanguage === 'ar' ? 'صليب' : 'Cross'}</option>
              <option value="custom">{currentLanguage === 'ar' ? 'مخصص' : 'Custom'}</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            onClick={onSubmit}
            disabled={submitting}
            className="w-full mt-4 bg-gradient-to-r from-[#a259ef] to-[#4e21a8] hover:from-[#4e21a8] hover:to-[#a259ef] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-2xl text-xl shadow-lg transition-all duration-300"
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                {currentLanguage === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}
              </div>
            ) : (
              currentLanguage === 'ar' ? 'حفظ التغييرات' : 'Save Changes'
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Delete Spread Modal
const DeleteSpreadModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  spread, 
  submitting 
}) => {
  const { currentLanguage } = useLanguage();
  
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-red-900/95 to-black/95 backdrop-blur-xl rounded-2xl border border-red-400/20 shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-white/10 ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
          <h2 className={`text-xl font-bold text-red-300 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
            {currentLanguage === 'ar' ? 'حذف الانتشار' : 'Delete Spread'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className={`flex items-start gap-4 mb-6 ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold text-white mb-2 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
                {currentLanguage === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?'}
              </h3>
              <p className={`text-gray-300 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
                {currentLanguage === 'ar' ? 
                  `هذا سيحذف انتشار "${spread?.name_ar || spread?.name_en || 'Unknown'}" نهائياً. هذا الإجراء لا يمكن التراجع عنه.` :
                  `This will permanently delete the spread "${spread?.name_en || spread?.name_ar || 'Unknown'}". This action cannot be undone.`
                }
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex gap-4 ${currentLanguage === 'ar' ? 'flex-row-reverse' : 'justify-end'}`}>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={onConfirm}
              disabled={submitting}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 
                (currentLanguage === 'ar' ? 'جاري الحذف...' : 'Deleting...') :
                (currentLanguage === 'ar' ? 'حذف' : 'Delete')
              }
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// View Spread Modal
const ViewSpreadModal = ({ 
  isOpen, 
  onClose, 
  spread 
}) => {
  const { currentLanguage } = useLanguage();
  
  if (!isOpen) return null;

  const getStatusInfo = (status) => {
    const statusMap = {
      approved: {
        color: 'bg-green-900/30 text-green-300 border-green-400/30',
        text: currentLanguage === 'ar' ? 'معتمد' : 'Approved',
        icon: CheckIcon
      },
      pending: {
        color: 'bg-yellow-900/30 text-yellow-300 border-yellow-400/30',
        text: currentLanguage === 'ar' ? 'في الانتظار' : 'Pending',
        icon: ClockIcon
      },
      rejected: {
        color: 'bg-red-900/30 text-red-300 border-red-400/30',
        text: currentLanguage === 'ar' ? 'مرفوض' : 'Rejected',
        icon: XMarkIcon
      }
    };
    return statusMap[status] || statusMap.pending;
  };

  const getDifficultyInfo = (difficulty) => {
    const difficultyMap = {
      beginner: {
        stars: 1,
        text: currentLanguage === 'ar' ? 'مبتدئ' : 'Beginner',
        color: 'text-green-400'
      },
      intermediate: {
        stars: 2,
        text: currentLanguage === 'ar' ? 'متوسط' : 'Intermediate',
        color: 'text-yellow-400'
      },
      advanced: {
        stars: 3,
        text: currentLanguage === 'ar' ? 'متقدم' : 'Advanced',
        color: 'text-red-400'
      }
    };
    return difficultyMap[difficulty] || difficultyMap.beginner;
  };

  const statusInfo = getStatusInfo(spread?.approval_status);
  const difficultyInfo = getDifficultyInfo(spread?.difficulty_level);
  const StatusIcon = statusInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-emerald-900/95 to-black/95 backdrop-blur-xl rounded-2xl border border-emerald-400/20 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-white/10 ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
          <h2 className={`text-xl font-bold text-emerald-300 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
            {currentLanguage === 'ar' ? 'تفاصيل الانتشار' : 'Spread Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title and Status */}
          <div className="space-y-3">
            <div className={`flex items-center gap-3 ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
              <h3 className={`text-2xl font-bold text-white ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
                {currentLanguage === 'ar' ? 
                  spread?.name_ar || spread?.name_en || 'Unnamed Spread' : 
                  spread?.name_en || spread?.name_ar || 'Unnamed Spread'
                }
              </h3>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${statusInfo.color}`}>
                <StatusIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{statusInfo.text}</span>
              </div>
            </div>
            
            {/* Difficulty */}
            <div className={`flex items-center gap-2 ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
              <span className={`text-sm text-gray-400 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
                {currentLanguage === 'ar' ? 'المستوى:' : 'Level:'}
              </span>
              <div className={`flex items-center gap-1 ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
                {[...Array(3)].map((_, i) => (
                  <StarIcon 
                    key={i} 
                    className={`w-4 h-4 ${i < difficultyInfo.stars ? difficultyInfo.color : 'text-gray-600'}`}
                  />
                ))}
                <span className={`text-sm ${difficultyInfo.color} ml-2`}>
                  {difficultyInfo.text}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h4 className={`text-lg font-semibold text-emerald-300 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
              {currentLanguage === 'ar' ? 'الوصف' : 'Description'}
            </h4>
            <p className={`text-gray-300 leading-relaxed ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
              {currentLanguage === 'ar' ? 
                spread?.description_ar || spread?.description_en || 'No description available' : 
                spread?.description_en || spread?.description_ar || 'No description available'
              }
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Count */}
            <div className={`bg-white/5 rounded-lg p-4 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-2 mb-2">
                <BookOpenIcon className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">
                  {currentLanguage === 'ar' ? 'عدد الأوراق' : 'Card Count'}
                </span>
              </div>
              <p className="text-white text-lg font-semibold">
                {spread?.card_count || 0}
              </p>
            </div>

            {/* Category */}
            <div className={`bg-white/5 rounded-lg p-4 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-2 mb-2">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">
                  {currentLanguage === 'ar' ? 'الفئة' : 'Category'}
                </span>
              </div>
              <p className="text-white font-medium capitalize">
                {spread?.category || 'General'}
              </p>
            </div>

            {/* Layout Type */}
            <div className={`bg-white/5 rounded-lg p-4 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-2 mb-2">
                <BookOpenIcon className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">
                  {currentLanguage === 'ar' ? 'نوع التخطيط' : 'Layout Type'}
                </span>
              </div>
              <p className="text-white font-medium capitalize">
                {spread?.layout_type || 'Linear'}
              </p>
            </div>

            {/* Creator */}
            <div className={`bg-white/5 rounded-lg p-4 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-2 mb-2">
                <BookOpenIcon className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">
                  {currentLanguage === 'ar' ? 'المنشئ' : 'Creator'}
                </span>
              </div>
              <p className="text-white font-medium">
                {spread?.creator_name || 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex justify-end p-6 border-t border-white/10 ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            {currentLanguage === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main Wrapper Component
const SpreadModalWrapper = ({ 
  editModal,
  deleteModal, 
  viewModal
}) => {
  return (
    <>
      <EditSpreadModal {...editModal} />
      <DeleteSpreadModal {...deleteModal} />
      <ViewSpreadModal {...viewModal} />
    </>
  );
};

export default SpreadModalWrapper; 