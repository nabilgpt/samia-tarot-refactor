// =================================================
// SAMIA TAROT BILINGUAL DATA DISPLAY COMPONENT
// Reusable component for displaying real-time bilingual data
// =================================================

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import useRealTimeTranslations from '../../hooks/useRealTimeTranslations';
import { FaSearch, FaFilter, FaSync, FaLanguage, FaGlobe, FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';

const BilingualDataDisplayComponent = ({ 
  table, 
  fields = ['name', 'description'],
  displayMode = 'grid', // 'grid', 'list', 'cards'
  showSearch = true,
  showFilters = true,
  showStats = true,
  onItemClick = null,
  onItemEdit = null,
  className = '',
  emptyMessage = null,
  loadingMessage = null,
  customRendering = null
}) => {
  const { currentLanguage, getLocalizedText } = useLanguage();
  const { profile: userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
  
  // Use the real-time translations hook
  const {
    data,
    isLoading,
    error,
    stats,
    searchTerm,
    filters,
    updateSearchTerm,
    updateFilters,
    clearFilters,
    refresh,
    tableInfo
  } = useRealTimeTranslations(table, {
    fields,
    enableSearch: showSearch,
    enableFiltering: showFilters
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // =================================================
  // RENDER FUNCTIONS
  // =================================================

  // Render search bar
  const renderSearchBar = () => {
    if (!showSearch) return null;

    return (
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => updateSearchTerm(e.target.value)}
            placeholder={currentLanguage === 'ar' ? 'البحث...' : 'Search...'}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        {showFilters && (
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
              showAdvancedFilters || Object.keys(filters).length > 0
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <FaFilter />
            <span>{currentLanguage === 'ar' ? 'تصفية' : 'Filter'}</span>
          </button>
        )}
        
        <button
          onClick={refresh}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <FaSync className={isLoading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">
            {currentLanguage === 'ar' ? 'تحديث' : 'Refresh'}
          </span>
        </button>
      </div>
    );
  };

  // Render advanced filters
  const renderAdvancedFilters = () => {
    if (!showFilters || !showAdvancedFilters) return null;

    return (
      <div className="bg-gray-800 p-4 rounded-lg mb-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-white">
            {currentLanguage === 'ar' ? 'تصفية متقدمة' : 'Advanced Filters'}
          </h4>
          <button
            onClick={() => setShowAdvancedFilters(false)}
            className="text-gray-400 hover:text-white"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Language filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {currentLanguage === 'ar' ? 'اللغة' : 'Language'}
            </label>
            <select
              value={filters.language || ''}
              onChange={(e) => updateFilters({ language: e.target.value || undefined })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">{currentLanguage === 'ar' ? 'جميع اللغات' : 'All Languages'}</option>
              <option value="ar">{currentLanguage === 'ar' ? 'العربية فقط' : 'Arabic Only'}</option>
              <option value="en">{currentLanguage === 'ar' ? 'الإنجليزية فقط' : 'English Only'}</option>
            </select>
          </div>
          
          {/* Completeness filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {currentLanguage === 'ar' ? 'الاكتمال' : 'Completeness'}
            </label>
            <select
              value={filters.completeness || ''}
              onChange={(e) => updateFilters({ completeness: e.target.value || undefined })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">{currentLanguage === 'ar' ? 'الكل' : 'All'}</option>
              <option value="complete">{currentLanguage === 'ar' ? 'مكتمل' : 'Complete'}</option>
              <option value="incomplete">{currentLanguage === 'ar' ? 'ناقص' : 'Incomplete'}</option>
              <option value="empty">{currentLanguage === 'ar' ? 'فارغ' : 'Empty'}</option>
            </select>
          </div>
          
          {/* Clear filters */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
            >
              {currentLanguage === 'ar' ? 'مسح التصفية' : 'Clear Filters'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render statistics
  const renderStats = () => {
    if (!showStats) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg text-center border border-gray-700">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-gray-400">
            {currentLanguage === 'ar' ? 'المجموع' : 'Total'}
          </div>
        </div>
        <div className="bg-green-900/50 p-4 rounded-lg text-center border border-green-700">
          <div className="text-2xl font-bold text-green-400">{stats.completeAr}</div>
          <div className="text-sm text-green-300">
            {currentLanguage === 'ar' ? 'عربي' : 'Arabic'}
          </div>
        </div>
        <div className="bg-blue-900/50 p-4 rounded-lg text-center border border-blue-700">
          <div className="text-2xl font-bold text-blue-400">{stats.completeEn}</div>
          <div className="text-sm text-blue-300">
            {currentLanguage === 'ar' ? 'إنجليزي' : 'English'}
          </div>
        </div>
        <div className="bg-yellow-900/50 p-4 rounded-lg text-center border border-yellow-700">
          <div className="text-2xl font-bold text-yellow-400">{stats.incomplete}</div>
          <div className="text-sm text-yellow-300">
            {currentLanguage === 'ar' ? 'ناقص' : 'Incomplete'}
          </div>
        </div>
        <div className="bg-red-900/50 p-4 rounded-lg text-center border border-red-700">
          <div className="text-2xl font-bold text-red-400">{stats.empty}</div>
          <div className="text-sm text-red-300">
            {currentLanguage === 'ar' ? 'فارغ' : 'Empty'}
          </div>
        </div>
      </div>
    );
  };

  // Render loading state
  const renderLoading = () => (
    <div className="bg-gray-800 p-8 rounded-lg text-center border border-gray-700">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
      <p className="text-gray-400">
        {loadingMessage || (currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...')}
      </p>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="bg-red-900/20 border border-red-700 p-6 rounded-lg text-center">
      <FaExclamationCircle className="mx-auto text-4xl text-red-400 mb-4" />
      <h3 className="text-xl font-bold text-red-400 mb-2">
        {currentLanguage === 'ar' ? 'خطأ في التحميل' : 'Loading Error'}
      </h3>
      <p className="text-red-300 mb-4">{error}</p>
      <button
        onClick={refresh}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
      >
        {currentLanguage === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
      </button>
    </div>
  );

  // Render empty state
  const renderEmpty = () => (
    <div className="bg-gray-800 p-8 rounded-lg text-center border border-gray-700">
      <FaLanguage className="mx-auto text-4xl text-gray-500 mb-4" />
      <p className="text-gray-400">
        {emptyMessage || (currentLanguage === 'ar' ? 'لا توجد بيانات للعرض' : 'No data to display')}
      </p>
    </div>
  );

  // Get completion status
  const getCompletionStatus = (item) => {
    let hasArabic = false;
    let hasEnglish = false;
    
    fields.forEach(field => {
      const arValue = item[`${field}_ar`];
      const enValue = item[`${field}_en`];
      
      if (arValue && arValue.trim()) hasArabic = true;
      if (enValue && enValue.trim()) hasEnglish = true;
    });
    
    if (hasArabic && hasEnglish) return 'complete';
    if (hasArabic || hasEnglish) return 'incomplete';
    return 'empty';
  };

  // Render individual item
  const renderItem = (item) => {
    if (customRendering) {
      return customRendering(item);
    }

    const completionStatus = getCompletionStatus(item);
    
    const statusColors = {
      complete: 'border-green-500 bg-green-900/10',
      incomplete: 'border-yellow-500 bg-yellow-900/10',
      empty: 'border-red-500 bg-red-900/10'
    };

    const statusIcons = {
      complete: <FaCheckCircle className="text-green-400" />,
      incomplete: <FaExclamationCircle className="text-yellow-400" />,
      empty: <FaExclamationCircle className="text-red-400" />
    };

    return (
      <div
        key={item.id}
        className={`
          bg-gray-800 border rounded-lg p-4 transition-all duration-200 hover:bg-gray-750
          ${statusColors[completionStatus]}
          ${onItemClick ? 'cursor-pointer hover:scale-105' : ''}
        `}
        onClick={() => onItemClick && onItemClick(item)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {statusIcons[completionStatus]}
            <span className="text-xs text-gray-400 uppercase font-medium">
              {table.replace('-', ' ')}
            </span>
          </div>
          {isAdmin() && onItemEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onItemEdit(item);
              }}
              className="text-purple-400 hover:text-purple-300 transition-colors"
              title={currentLanguage === 'ar' ? 'تعديل' : 'Edit'}
            >
              <FaGlobe />
            </button>
          )}
        </div>

        {fields.map(field => (
          <div key={field} className="mb-3">
            <div className="text-sm font-medium text-gray-400 mb-1 capitalize">
              {field.replace('_', ' ')}
            </div>
            
            {/* Current language display */}
            <div className="text-white mb-1" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
              {getLocalizedText(item, field) || (
                <span className="text-gray-500 italic">
                  {currentLanguage === 'ar' ? 'غير متوفر' : 'Not available'}
                </span>
              )}
            </div>
            
            {/* Admin: Show both languages */}
            {isAdmin() && (
              <div className="text-xs text-gray-500 space-y-1">
                <div dir="rtl">🇸🇾 {item[`${field}_ar`] || '—'}</div>
                <div dir="ltr">🇺🇸 {item[`${field}_en`] || '—'}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render data grid/list
  const renderData = () => {
    if (displayMode === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(renderItem)}
        </div>
      );
    }
    
    if (displayMode === 'list') {
      return (
        <div className="space-y-4">
          {data.map(renderItem)}
        </div>
      );
    }
    
    // Default cards mode
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.map(renderItem)}
      </div>
    );
  };

  // =================================================
  // MAIN RENDER
  // =================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">
            {currentLanguage === 'ar' ? 'البيانات المترجمة' : 'Translated Data'}
          </h3>
          <p className="text-gray-400 text-sm">
            {tableInfo.filteredItems} / {tableInfo.totalItems} {currentLanguage === 'ar' ? 'عنصر' : 'items'}
          </p>
        </div>
      </div>

      {/* Search and filters */}
      {renderSearchBar()}
      {renderAdvancedFilters()}

      {/* Statistics */}
      {renderStats()}

      {/* Data display */}
      {isLoading ? renderLoading() : 
       error ? renderError() : 
       data.length === 0 ? renderEmpty() : 
       renderData()}
    </div>
  );
};

export default BilingualDataDisplayComponent; 