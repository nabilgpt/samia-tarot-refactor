/**
 * M37 — Language Context
 * Comprehensive language switching with WCAG 2.2 AA compliance and RTL/LTR support
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { pseudoLocalize, pseudoArabic } from '../utils/pseudoLocalization';

const LanguageContext = createContext({
  currentLanguage: 'ar',
  changeLanguage: () => {},
  getAvailableLanguages: () => [],
  isLoading: false,
  t: () => '',
  getDirectionClasses: () => '',
  isRTL: true
});

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Language configuration
const LANGUAGES = {
  ar: {
    code: 'ar',
    name: 'Arabic',
    native: 'العربية',
    label: 'Arabic',
    flag: '🇸🇦',
    dir: 'rtl',
    region: 'SA'
  },
  en: {
    code: 'en',
    name: 'English',
    native: 'English',
    label: 'English',
    flag: '🇺🇸',
    dir: 'ltr',
    region: 'US'
  }
};

// Enhanced translations with CLDR Arabic plural categories
const TRANSLATIONS = {
  ar: {
    'ui.language.switchLanguage': 'تبديل اللغة',
    'ui.language.toggleLanguage': 'التبديل بين العربية والإنجليزية',
    'ui.language.chooseLanguage': 'اختر اللغة',
    'ui.language.selectLanguage': 'اختر {{language}}',
    'ui.loading': 'جارٍ التحميل...',
    'ui.close': 'إغلاق',
    'ui.open': 'فتح',
    'ui.menu': 'القائمة',
    'ui.search': 'بحث',
    'ui.submit': 'إرسال',
    'ui.cancel': 'إلغاء',
    'ui.save': 'حفظ',
    'ui.edit': 'تعديل',
    'ui.delete': 'حذف',
    
    // CLDR Arabic plural examples
    'items.count': {
      zero: 'لا توجد عناصر',
      one: 'عنصر واحد',
      two: 'عنصران',
      few: '{{count}} عناصر',
      many: '{{count}} عنصراً',
      other: '{{count}} عنصر'
    },
    'messages.count': {
      zero: 'لا توجد رسائل',
      one: 'رسالة واحدة',
      two: 'رسالتان',
      few: '{{count}} رسائل',
      many: '{{count}} رسالة',
      other: '{{count}} رسالة'
    },
    'users.count': {
      zero: 'لا يوجد مستخدمون',
      one: 'مستخدم واحد',
      two: 'مستخدمان',
      few: '{{count}} مستخدمين',
      many: '{{count}} مستخدماً',
      other: '{{count}} مستخدم'
    },
    'minutes.ago': {
      zero: 'الآن',
      one: 'منذ دقيقة واحدة',
      two: 'منذ دقيقتين',
      few: 'منذ {{count}} دقائق',
      many: 'منذ {{count}} دقيقة',
      other: 'منذ {{count}} دقيقة'
    }
  },
  en: {
    'ui.language.switchLanguage': 'Switch language',
    'ui.language.toggleLanguage': 'Toggle between Arabic and English',
    'ui.language.chooseLanguage': 'Choose language',
    'ui.language.selectLanguage': 'Select {{language}}',
    'ui.loading': 'Loading...',
    'ui.close': 'Close',
    'ui.open': 'Open',
    'ui.menu': 'Menu',
    'ui.search': 'Search',
    'ui.submit': 'Submit',
    'ui.cancel': 'Cancel',
    'ui.save': 'Save',
    'ui.edit': 'Edit',
    'ui.delete': 'Delete',
    
    // English plural examples (simpler: one/other)
    'items.count': {
      one: '{{count}} item',
      other: '{{count}} items'
    },
    'messages.count': {
      one: '{{count}} message',
      other: '{{count}} messages'
    },
    'users.count': {
      one: '{{count}} user',
      other: '{{count}} users'
    },
    'minutes.ago': {
      one: '{{count}} minute ago',
      other: '{{count}} minutes ago'
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('ar');
  const [isLoading, setIsLoading] = useState(false);
  const [pseudoMode, setPseudoMode] = useState(null); // null, 'pseudo', or 'arabic'

  // Update document attributes when language changes
  const updateDocumentAttributes = useCallback((langCode) => {
    const language = LANGUAGES[langCode];
    if (!language) return;

    // Update html lang and dir attributes
    document.documentElement.lang = language.code;
    document.documentElement.dir = language.dir;
    
    // Update class for CSS styling
    if (language.dir === 'rtl') {
      document.documentElement.classList.add('rtl');
      document.documentElement.classList.remove('ltr');
    } else {
      document.documentElement.classList.add('ltr');
      document.documentElement.classList.remove('rtl');
    }

    // Update meta tags for better SEO and browser support
    let metaDir = document.querySelector('meta[name="direction"]');
    if (!metaDir) {
      metaDir = document.createElement('meta');
      metaDir.name = 'direction';
      document.head.appendChild(metaDir);
    }
    metaDir.content = language.dir;

    // Update content language meta
    let metaLang = document.querySelector('meta[http-equiv="content-language"]');
    if (!metaLang) {
      metaLang = document.createElement('meta');
      metaLang.setAttribute('http-equiv', 'content-language');
      document.head.appendChild(metaLang);
    }
    metaLang.content = `${language.code}-${language.region}`;
  }, []);

  // Initialize language from localStorage or default to Arabic
  useEffect(() => {
    const savedLanguage = localStorage.getItem('samia-tarot-language');
    const initialLanguage = savedLanguage && LANGUAGES[savedLanguage] ? savedLanguage : 'ar';
    
    setCurrentLanguage(initialLanguage);
    updateDocumentAttributes(initialLanguage);
  }, [updateDocumentAttributes]);

  const changeLanguage = useCallback(async (langCode) => {
    if (!LANGUAGES[langCode] || langCode === currentLanguage) return;

    setIsLoading(true);
    
    try {
      // Update state
      setCurrentLanguage(langCode);
      
      // Update document attributes
      updateDocumentAttributes(langCode);
      
      // Save to localStorage
      localStorage.setItem('samia-tarot-language', langCode);
      
      // Announce language change to screen readers
      const newLanguage = LANGUAGES[langCode];
      const announcement = langCode === 'ar' 
        ? `تم تغيير اللغة إلى ${newLanguage.native}`
        : `Language changed to ${newLanguage.native}`;
      
      // Create temporary live region for announcement
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'assertive');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.textContent = announcement;
      document.body.appendChild(liveRegion);
      
      setTimeout(() => {
        document.body.removeChild(liveRegion);
      }, 1000);
      
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentLanguage, updateDocumentAttributes]);

  const getAvailableLanguages = useCallback(() => {
    return Object.values(LANGUAGES);
  }, []);

  const getDirectionClasses = useCallback(() => {
    const language = LANGUAGES[currentLanguage];
    const isRTL = language?.dir === 'rtl';
    
    return {
      container: isRTL ? 'rtl' : 'ltr',
      text: isRTL ? 'text-right' : 'text-left',
      margin: isRTL ? 'ml-auto' : 'mr-auto',
      padding: isRTL ? 'pr-4' : 'pl-4',
      float: isRTL ? 'float-right' : 'float-left',
      border: isRTL ? 'border-r' : 'border-l'
    };
  }, [currentLanguage]);

  // CLDR Arabic plural rules implementation
  const getArabicPluralCategory = useCallback((count) => {
    const n = Math.abs(count);
    
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (n >= 3 && n <= 10) return 'few';
    if (n >= 11 && n <= 99) return 'many';
    return 'other';
  }, []);

  const getEnglishPluralCategory = useCallback((count) => {
    const n = Math.abs(count);
    return n === 1 ? 'one' : 'other';
  }, []);

  const getPluralCategory = useCallback((count, language = currentLanguage) => {
    if (language === 'ar') {
      return getArabicPluralCategory(count);
    }
    return getEnglishPluralCategory(count);
  }, [currentLanguage, getArabicPluralCategory, getEnglishPluralCategory]);

  // Enhanced translation function with plural and pseudo-localization support
  const t = useCallback((key, defaultValue = '', variables = {}) => {
    let translation = TRANSLATIONS[currentLanguage]?.[key] || defaultValue || key;
    let result = '';
    
    // Handle plural forms
    if (typeof translation === 'object' && variables.count !== undefined) {
      const category = getPluralCategory(variables.count);
      const pluralForm = translation[category] || translation.other || translation.one || String(translation);
      result = pluralForm;
    } else {
      result = String(translation);
    }
    
    // Replace variables
    result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] || match;
    });
    
    // Apply pseudo-localization if enabled
    if (pseudoMode === 'pseudo') {
      result = pseudoLocalize(result, 'medium', { preserveVariables: true });
    } else if (pseudoMode === 'arabic') {
      result = pseudoArabic(result, { preserveVariables: true });
    }
    
    return result;
  }, [currentLanguage, getPluralCategory, pseudoMode]);

  const enablePseudoMode = useCallback((mode) => {
    setPseudoMode(mode);
    localStorage.setItem('samia-tarot-pseudo-mode', mode || '');
  }, []);

  const disablePseudoMode = useCallback(() => {
    setPseudoMode(null);
    localStorage.removeItem('samia-tarot-pseudo-mode');
  }, []);

  // Initialize pseudo mode from localStorage
  useEffect(() => {
    const savedPseudoMode = localStorage.getItem('samia-tarot-pseudo-mode');
    if (savedPseudoMode && ['pseudo', 'arabic'].includes(savedPseudoMode)) {
      setPseudoMode(savedPseudoMode);
    }
  }, []);

  const contextValue = {
    currentLanguage,
    changeLanguage,
    getAvailableLanguages,
    isLoading,
    t,
    getDirectionClasses,
    getPluralCategory,
    pseudoMode,
    enablePseudoMode,
    disablePseudoMode,
    isRTL: LANGUAGES[currentLanguage]?.dir === 'rtl'
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider;