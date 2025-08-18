import React from 'react';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../context/LanguageContext';

/**
 * ==========================================
 * SPREAD LIST COMPONENT
 * Main List, Search, and Filters
 * ==========================================
 */
const SpreadList = ({ 
  spreads,
  filters,
  setFilters,
  loading,
  error,
  message,
  setMessage,
  user,
  onViewSpread,
  onEditSpread,
  onDeleteSpread,
  onRetry
}) => {
  const { currentLanguage } = useLanguage();

  // Status information helper
  const getStatusInfo = (status) => {
    const baseClasses = "border";
    switch (status) {
      case 'approved':
        return {
          color: `${baseClasses} border-green-500/50 bg-green-500/10 text-green-300`,
          text: currentLanguage === 'ar' ? 'معتمد' : 'Approved',
          icon: CheckCircleIcon
        };
      case 'rejected':
        return {
          color: `${baseClasses} border-red-500/50 bg-red-500/10 text-red-300`,
          text: currentLanguage === 'ar' ? 'مرفوض' : 'Rejected',
          icon: XCircleIcon
        };
      case 'pending':
      default:
        return {
          color: `${baseClasses} border-yellow-500/50 bg-yellow-500/10 text-yellow-300`,
          text: currentLanguage === 'ar' ? 'في الانتظار' : 'Pending',
          icon: ClockIcon
        };
    }
  };

  // Difficulty information helper
  const getDifficultyInfo = (difficulty) => {
    switch (difficulty) {
      case 'beginner':
        return {
          color: 'bg-green-500/10 text-green-300',
          text: currentLanguage === 'ar' ? 'مبتدئ' : 'Beginner',
          stars: 1
        };
      case 'intermediate':
        return {
          color: 'bg-yellow-500/10 text-yellow-300',
          text: currentLanguage === 'ar' ? 'متوسط' : 'Intermediate',
          stars: 2
        };
      case 'advanced':
        return {
          color: 'bg-red-500/10 text-red-300',
          text: currentLanguage === 'ar' ? 'متقدم' : 'Advanced',
          stars: 3
        };
      default:
        return {
          color: 'bg-gray-500/10 text-gray-300',
          text: currentLanguage === 'ar' ? 'غير محدد' : 'Not Set',
          stars: 0
        };
    }
  };

  // Loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-gray-600 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-600 rounded w-2/3 mb-4"></div>
          <div className="flex gap-2 mb-3">
            <div className="h-6 bg-gray-600 rounded-full w-20"></div>
            <div className="h-6 bg-gray-600 rounded-full w-16"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-3 bg-gray-600 rounded w-16"></div>
            <div className="h-3 bg-gray-600 rounded w-20"></div>
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state
  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="w-24 h-24 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center">
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {currentLanguage === 'ar' ? 'لا توجد انتشارات' : 'No Spreads Found'}
      </h3>
      <p className="text-gray-400 mb-6">
        {currentLanguage === 'ar' ? 
          'ابدأ بإنشاء انتشار التاروت الأول الخاص بك' : 
          'Start by creating your first tarot spread'
        }
      </p>
    </div>
  );

  // Error state
  const renderErrorState = () => (
    <div className="text-center py-12">
      <div className="w-24 h-24 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center">
        <XCircleIcon className="w-12 h-12 text-red-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {currentLanguage === 'ar' ? 'خطأ في تحميل البيانات' : 'Error Loading Data'}
      </h3>
      <p className="text-gray-400 mb-6">
        {currentLanguage === 'ar' ? 
          'حدث خطأ أثناء تحميل الانتشارات. يرجى المحاولة مرة أخرى.' : 
          'An error occurred while loading spreads. Please try again.'
        }
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {currentLanguage === 'ar' ? 'إعادة المحاولة' : 'Retry'}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}
      >
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className={`absolute ${currentLanguage === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5`} />
            <input
              type="text"
              placeholder={currentLanguage === 'ar' ? 'ابحث في الانتشارات...' : 'Search spreads...'}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className={`w-full ${currentLanguage === 'ar' ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400`}
              dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className={`px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
          >
            <option value="all">{currentLanguage === 'ar' ? 'جميع الحالات' : 'All Status'}</option>
            <option value="approved">{currentLanguage === 'ar' ? 'معتمد' : 'Approved'}</option>
            <option value="pending">{currentLanguage === 'ar' ? 'في الانتظار' : 'Pending'}</option>
            <option value="rejected">{currentLanguage === 'ar' ? 'مرفوض' : 'Rejected'}</option>
          </select>
          
          {/* Difficulty Filter */}
          <select
            value={filters.difficulty}
            onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
            className={`px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
          >
            <option value="all">{currentLanguage === 'ar' ? 'جميع المستويات' : 'All Levels'}</option>
            <option value="beginner">{currentLanguage === 'ar' ? 'مبتدئ' : 'Beginner'}</option>
            <option value="intermediate">{currentLanguage === 'ar' ? 'متوسط' : 'Intermediate'}</option>
            <option value="advanced">{currentLanguage === 'ar' ? 'متقدم' : 'Advanced'}</option>
          </select>
          
          {/* Sort */}
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters(prev => ({ ...prev, sortBy, sortOrder }));
            }}
            className={`px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
          >
            <option value="created_at-desc">{currentLanguage === 'ar' ? 'الأحدث أولاً' : 'Newest First'}</option>
            <option value="created_at-asc">{currentLanguage === 'ar' ? 'الأقدم أولاً' : 'Oldest First'}</option>
            <option value="name_en-asc">{currentLanguage === 'ar' ? 'الاسم (أ-ي)' : 'Name (A-Z)'}</option>
            <option value="name_en-desc">{currentLanguage === 'ar' ? 'الاسم (ي-أ)' : 'Name (Z-A)'}</option>
            <option value="card_count-asc">{currentLanguage === 'ar' ? 'عدد الأوراق (قليل-كثير)' : 'Cards (Low-High)'}</option>
            <option value="card_count-desc">{currentLanguage === 'ar' ? 'عدد الأوراق (كثير-قليل)' : 'Cards (High-Low)'}</option>
          </select>
        </div>
      </motion.div>

      {/* Message Display */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-lg border ${message.includes('❌') ? 'bg-red-900/20 border-red-500/30 text-red-300' : message.includes('⚠️') ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300' : 'bg-green-900/20 border-green-500/30 text-green-300'} ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}
        >
          <div className={`flex items-center justify-between ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
            <span>{message}</span>
            <button 
              onClick={() => setMessage('')}
              className="ml-4 text-current hover:opacity-80"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Content Area */}
      <div className="min-h-[400px]">
        {loading ? renderLoadingSkeleton() : 
         error ? renderErrorState() : 
         !Array.isArray(spreads) || spreads.length === 0 ? renderEmptyState() : (
          
          /* Spreads Grid */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {spreads.map((spread, index) => {
              const statusInfo = getStatusInfo(spread.approval_status);
              const difficultyInfo = getDifficultyInfo(spread.difficulty_level);
              const StatusIcon = statusInfo.icon;
              
              return (
                <motion.div
                  key={spread.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 group"
                >
                  {/* Spread Header */}
                  <div className={`flex items-start justify-between mb-4 ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-1 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
                      <h3 className={`text-lg font-semibold text-white mb-1 group-hover:text-purple-300 transition-colors ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
                        {currentLanguage === 'ar' ? spread.name_ar || spread.name : spread.name_en || spread.name}
                      </h3>
                      <p className={`text-sm text-gray-400 line-clamp-2 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
                        {currentLanguage === 'ar' ? spread.description_ar || spread.description : spread.description_en || spread.description}
                      </p>
                    </div>
                    
                    {/* Actions */}
                    <div className={`flex items-center gap-2 ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <button
                        onClick={() => onViewSpread(spread)}
                        className="p-2 text-gray-400 hover:text-purple-300 hover:bg-white/10 rounded-lg transition-all duration-200"
                        title={currentLanguage === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      
                      {(spread.created_by === user.id || spread.creator_id === user.id) && (
                        <>
                          <button
                            onClick={() => onEditSpread(spread)}
                            className="p-2 text-gray-400 hover:text-blue-300 hover:bg-white/10 rounded-lg transition-all duration-200"
                            title={currentLanguage === 'ar' ? 'تحرير' : 'Edit'}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => onDeleteSpread(spread)}
                            className="p-2 text-gray-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-all duration-200"
                            title={currentLanguage === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Spread Details */}
                  <div className="space-y-3">
                    {/* Status and Difficulty */}
                    <div className={`flex items-center gap-3 ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium ${statusInfo.color} ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.text}
                      </div>
                      
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${difficultyInfo.color} ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
                          {[...Array(3)].map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`w-3 h-3 ${i < difficultyInfo.stars ? 'text-current' : 'text-current/30'}`}
                              fill="currentColor"
                            />
                          ))}
                        </div>
                        {difficultyInfo.text}
                      </div>
                    </div>
                    
                    {/* Card Count and Category */}
                    <div className={`flex items-center justify-between text-sm text-gray-400 ${currentLanguage === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <span>
                        {currentLanguage === 'ar' ? `${spread.card_count} أوراق` : `${spread.card_count} Cards`}
                      </span>
                      <span className="capitalize">
                        {spread.category || (currentLanguage === 'ar' ? 'عام' : 'General')}
                      </span>
                    </div>
                    
                    {/* Creation Date */}
                    <div className={`text-xs text-gray-500 ${currentLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
                      {currentLanguage === 'ar' ? 'تم الإنشاء في' : 'Created on'} {new Date(spread.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SpreadList; 