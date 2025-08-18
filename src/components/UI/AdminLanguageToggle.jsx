// =================================================
// SAMIA TAROT LANGUAGE SWITCHER
// Simple language switcher for changing the current language
// =================================================

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const LanguageSwitcher = ({ 
  className = '',
  size = 'md'
}) => {
  const { 
    currentLanguage,
    changeLanguage,
    getAvailableLanguages,
    t
  } = useLanguage();

  const availableLanguages = getAvailableLanguages();

  const sizeConfig = {
    sm: {
      container: 'h-8 text-xs',
      padding: 'px-2 py-1',
      icon: 'w-3 h-3'
    },
    md: {
      container: 'h-10 text-sm',
      padding: 'px-3 py-2',
      icon: 'w-4 h-4'
    },
    lg: {
      container: 'h-12 text-base',
      padding: 'px-4 py-3',
      icon: 'w-5 h-5'
    }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const handleLanguageChange = () => {
    // Switch to opposite language
    const newLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    changeLanguage(newLanguage);
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className={`text-slate-300 font-medium ${config.container.includes('text-xs') ? 'text-xs' : config.container.includes('text-base') ? 'text-base' : 'text-sm'}`}>
        {t('language')}
      </span>
      
      <button
        onClick={handleLanguageChange}
        className={`
          ${config.container} ${config.padding}
          relative inline-flex items-center
          bg-gradient-to-r from-slate-600/20 to-slate-700/20
          border border-yellow-400/30
          rounded-lg
          transition-all duration-300
          hover:from-yellow-500/20 hover:to-yellow-600/20
          hover:border-yellow-400/50
          focus:outline-none focus:ring-2 focus:ring-yellow-400/20
          group
        `}
        title={`Switch to ${currentLanguage === 'ar' ? 'English' : 'Arabic'}`}
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
        
        {/* Language indicator */}
        <div className="relative flex items-center gap-2 text-yellow-400 transition-colors duration-300">
          {/* Globe icon */}
          <svg className={`${config.icon} relative z-10`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          
          {/* Current language display */}
          <span className="relative z-10 font-medium whitespace-nowrap">
            {currentLanguage === 'ar' ? 'العربية' : 'English'}
          </span>
          
          {/* Switch arrow */}
          <svg className={`${config.icon} relative z-10 opacity-70`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
      </button>
    </div>
  );
};

export default LanguageSwitcher; 