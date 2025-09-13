// =================================================
// SAMIA TAROT LANGUAGE SWITCHER
// Comprehensive bilingual language switching component
// =================================================

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { FaGlobe, FaCheck } from 'react-icons/fa';

const LanguageSwitcher = ({ 
  variant = 'dropdown', // 'dropdown', 'toggle', 'buttons'
  size = 'medium', // 'small', 'medium', 'large'
  showFlag = true,
  showLabel = true,
  className = '',
  position = 'auto' // 'auto', 'top', 'bottom', 'left', 'right'
}) => {
  const {
    currentLanguage,
    changeLanguage,
    getAvailableLanguages,
    isLoading,
    t,
    getDirectionClasses
  } = useLanguage();
  
  const [isOpen, setIsOpen] = useState(false);
  const availableLanguages = getAvailableLanguages();
  const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);
  const directionClasses = getDirectionClasses();
  
  // Generate unique IDs for ARIA
  const menuId = `language-menu-${Math.random().toString(36).substr(2, 9)}`;
  const buttonId = `language-button-${Math.random().toString(36).substr(2, 9)}`;

  const handleLanguageChange = async (langCode) => {
    if (langCode !== currentLanguage) {
      await changeLanguage(langCode);
      setIsOpen(false);
    }
  };

  // Keyboard navigation for dropdown
  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-2 py-1 text-sm';
      case 'large':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  const getDropdownPositionClasses = () => {
    const baseClasses = 'absolute z-50 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg';
    
    switch (position) {
      case 'top':
        return `${baseClasses} bottom-full mb-1 mt-0`;
      case 'bottom':
        return `${baseClasses} top-full`;
      case 'left':
        return `${baseClasses} right-full mr-1 mt-0`;
      case 'right':
        return `${baseClasses} left-full ml-1 mt-0`;
      default:
        return `${baseClasses} ${currentLanguage === 'ar' ? 'left-0' : 'right-0'}`;
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center ${getSizeClasses()} ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  // Toggle variant (simple switch)
  if (variant === 'toggle') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <button
          onClick={() => handleLanguageChange(currentLanguage === 'ar' ? 'en' : 'ar')}
          className={`
            ${getSizeClasses()}
            bg-gray-800 hover:bg-gray-700 text-white rounded-lg 
            transition-all duration-200 flex items-center space-x-2
            border border-gray-700 hover:border-purple-500
          `}
          disabled={isLoading}
          aria-label={t('ui.language.toggleLanguage', 'Toggle between Arabic and English')}
          aria-pressed={currentLanguage === 'ar'}
        >
          {showFlag && currentLang && (
            <span className="text-lg">{currentLang.flag}</span>
          )}
          {showLabel && (
            <span className="font-medium">{currentLang?.native}</span>
          )}
        </button>
      </div>
    );
  }

  // Buttons variant (separate button for each language)
  if (variant === 'buttons') {
    return (
      <div 
        className={`flex items-center space-x-2 ${className}`}
        role="radiogroup"
        aria-label={t('ui.language.chooseLanguage', 'Choose language')}
      >
        {availableLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`
              ${getSizeClasses()}
              rounded-lg transition-all duration-200 flex items-center space-x-2
              border font-medium
              ${
                currentLanguage === lang.code
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 hover:border-purple-500'
              }
            `}
            disabled={isLoading}
            role="radio"
            aria-checked={currentLanguage === lang.code}
            aria-label={t('ui.language.selectLanguage', 'Select {{language}}', { language: lang.native })}
          >
            {showFlag && (
              <span className="text-lg" aria-hidden="true">{lang.flag}</span>
            )}
            {showLabel && (
              <span>{lang.native}</span>
            )}
            {currentLanguage === lang.code && (
              <FaCheck className="w-3 h-3" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <div className={`relative ${className}`}>
      <button
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          ${getSizeClasses()}
          bg-gray-800 hover:bg-gray-700 text-white rounded-lg 
          transition-all duration-200 flex items-center space-x-2
          border border-gray-700 hover:border-purple-500
          ${isOpen ? 'ring-2 ring-purple-500' : ''}
        `}
        disabled={isLoading}
        aria-label={t('ui.language.switchLanguage', 'Switch language')}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
      >
        <FaGlobe className="w-4 h-4" />
        {showFlag && currentLang && (
          <span className="text-lg">{currentLang.flag}</span>
        )}
        {showLabel && (
          <span className="font-medium">{currentLang?.native}</span>
        )}
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div 
            id={menuId}
            className={getDropdownPositionClasses()}
            role="menu"
            aria-labelledby={buttonId}
          >
            <div className="py-2">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`
                    w-full px-4 py-2 text-left hover:bg-gray-700 
                    transition-colors duration-150 flex items-center space-x-3
                    ${currentLanguage === lang.code ? 'bg-purple-600 text-white' : 'text-gray-300'}
                  `}
                  role="menuitem"
                  aria-current={currentLanguage === lang.code ? 'true' : undefined}
                  aria-label={t('ui.language.selectLanguage', 'Select {{language}}', { language: lang.native })}
                >
                  <span className="text-lg" aria-hidden="true">{lang.flag}</span>
                  <span className="font-medium">{lang.native}</span>
                  <span className="text-sm text-gray-400">({lang.label})</span>
                  {currentLanguage === lang.code && (
                    <FaCheck className="w-3 h-3 ml-auto" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher; 