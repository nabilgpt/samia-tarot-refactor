// =================================================
// SAMIA TAROT PURE LANGUAGE CONTEXT
// Single Global Language Management - Zero Persistence
// =================================================

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // 🎯 PURE STATE: Always starts with default, no persistence
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);

  // =================================================
  // INSTANT LANGUAGE SWITCHING (ZERO STORAGE)
  // =================================================

  const changeLanguage = useCallback((newLanguage) => {
    if (!['ar', 'en'].includes(newLanguage)) {
      console.error('Invalid language:', newLanguage);
      return;
    }
    
    // 🎯 INSTANT STATE UPDATE
    setCurrentLanguage(newLanguage);

    // 🎯 INSTANT DOM UPDATES
    const direction = newLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = newLanguage;
    
    // Update body classes for styling
    document.body.classList.remove('rtl', 'ltr');
    document.body.classList.add(direction);
  }, [currentLanguage]);

  // =================================================
  // HELPER FUNCTIONS (MEMOIZED FOR PERFORMANCE)
  // =================================================

  const getDirection = useCallback(() => currentLanguage === 'ar' ? 'rtl' : 'ltr', [currentLanguage]);
  const isRTL = useCallback(() => currentLanguage === 'ar', [currentLanguage]);
  const getTextAlign = useCallback(() => currentLanguage === 'ar' ? 'right' : 'left', [currentLanguage]);
  const getOppositeTextAlign = useCallback(() => currentLanguage === 'ar' ? 'left' : 'right', [currentLanguage]);

  // Get available languages (static, memoized)
  const getAvailableLanguages = useCallback(() => [
    { code: 'ar', label: 'العربية', native: 'العربية', flag: '🇸🇾' },
    { code: 'en', label: 'English', native: 'English', flag: '🇺🇸' }
  ], []);

  // CSS direction classes
  const getDirectionClasses = useCallback(() => ({
    dir: getDirection(),
    textAlign: getTextAlign(),
    marginStart: isRTL() ? 'ml' : 'mr',
    marginEnd: isRTL() ? 'mr' : 'ml',
    paddingStart: isRTL() ? 'pl' : 'pr',
    paddingEnd: isRTL() ? 'pr' : 'pl'
  }), [currentLanguage]);

  // Get localized text from bilingual object
  const getLocalizedText = useCallback((data, field, fallback = '') => {
    if (!data || typeof data !== 'object') {
      return fallback;
    }

    const currentField = `${field}_${currentLanguage}`;
    const fallbackField = `${field}_${currentLanguage === 'ar' ? 'en' : 'ar'}`;

    return data[currentField] || data[fallbackField] || fallback;
  }, [currentLanguage]);

  // Get field name for current language
  const getFieldName = useCallback((baseField) => `${baseField}_${currentLanguage}`, [currentLanguage]);

  // Get opposite language field name
  const getOppositeFieldName = useCallback((baseField) => {
    const oppositeLang = currentLanguage === 'ar' ? 'en' : 'ar';
    return `${baseField}_${oppositeLang}`;
  }, [currentLanguage]);

  // Format date based on language
  const formatDate = useCallback((date, options = {}) => {
    if (!date) return '';
    
    const locale = currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
    const dateObj = new Date(date);
    
    return dateObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    });
  }, [currentLanguage]);

  // Basic translation function
  const t = useCallback((key, fallback = key) => {
    // Basic translations for common UI elements
    const translations = {
      ar: {
        loading: 'جاري التحميل...',
        save: 'حفظ',
        cancel: 'إلغاء',
        edit: 'تعديل',
        delete: 'حذف',
        add: 'إضافة',
        search: 'بحث',
        filter: 'تصفية',
        close: 'إغلاق'
      },
      en: {
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        delete: 'Delete',
        add: 'Add',
        search: 'Search',
        filter: 'Filter',
        close: 'Close'
      }
    };

    return translations[currentLanguage]?.[key] || fallback;
  }, [currentLanguage]);

  // =================================================
  // CONTEXT VALUE (MEMOIZED TO PREVENT UNNECESSARY RE-RENDERS)
  // =================================================

  const value = useMemo(() => ({
    // Core state
    currentLanguage,
    direction: getDirection(),
    isLoading,
    
    // Core functions
    changeLanguage,
    
    // Utilities
    getDirection,
    isRTL,
    getTextAlign,
    getOppositeTextAlign,
    getDirectionClasses,
    getAvailableLanguages,
    getLocalizedText,
    getFieldName,
    getOppositeFieldName,
    formatDate,
    t
  }), [
    currentLanguage,
    isLoading,
    changeLanguage,
    getDirection,
    isRTL,
    getTextAlign,
    getOppositeTextAlign,
    getDirectionClasses,
    getAvailableLanguages,
    getLocalizedText,
    getFieldName,
    getOppositeFieldName,
    formatDate,
    t
  ]);



  // 🎯 INITIAL DOM SETUP
  useEffect(() => {
    const direction = getDirection();
    document.documentElement.dir = direction;
    document.documentElement.lang = currentLanguage;
    document.body.classList.remove('rtl', 'ltr');
    document.body.classList.add(direction);
  }, []);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}; 