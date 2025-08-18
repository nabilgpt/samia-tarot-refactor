// =================================================
// SAMIA TAROT ENHANCED LANGUAGE SWITCHER
// Instant language switching with error handling for Step 3
// =================================================

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import apiErrorHandler from '../../utils/apiErrorHandler';
import { FaGlobe, FaCheck, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const EnhancedLanguageSwitcher = ({ 
  variant = 'dropdown', 
  size = 'medium',
  showFlag = true,
  showLabel = true,
  className = '',
  position = 'auto',
  showTestButton = false // For testing purposes
}) => {
  const {
    currentLanguage,
    changeLanguage,
    getAvailableLanguages,
    isLoading,
    getDirectionClasses
  } = useLanguage();
  
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [lastSwitchTime, setLastSwitchTime] = useState(0);
  const [switchError, setSwitchError] = useState(null);
  
  const availableLanguages = getAvailableLanguages();
  const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);
  const directionClasses = getDirectionClasses();

  // Handle language switching with error handling
  const handleLanguageChange = async (langCode) => {
    if (langCode === currentLanguage || isSwitching) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setSwitchError(null);
    const startTime = Date.now();

    try {
      // Instant UI feedback
      document.body.dir = langCode === 'ar' ? 'rtl' : 'ltr';
      document.body.classList.toggle('rtl', langCode === 'ar');
      document.body.classList.toggle('ltr', langCode === 'en');

      // Perform the actual language change
      await changeLanguage(langCode);
      
      const endTime = Date.now();
      setLastSwitchTime(endTime - startTime);
      
      console.log(`✅ Language switched to ${langCode} in ${endTime - startTime}ms`);
      
      // Trigger re-render of all components
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { 
          language: langCode, 
          timestamp: endTime,
          duration: endTime - startTime
        } 
      }));
      
    } catch (error) {
      console.error('❌ Language switching failed:', error);
      
      // Handle the error through our error handler
      const errorInfo = apiErrorHandler.handleError(error, {
        endpoint: 'language-change',
        language: currentLanguage,
        showToast: true
      });
      
      setSwitchError(errorInfo);
      
      // Revert UI changes
      document.body.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
      document.body.classList.toggle('rtl', currentLanguage === 'ar');
      document.body.classList.toggle('ltr', currentLanguage === 'en');
      
    } finally {
      setIsSwitching(false);
      setIsOpen(false);
    }
  };

  // Test rapid language switching for validation
  const testRapidSwitching = async () => {
    const languages = ['ar', 'en', 'ar', 'en', 'ar'];
    for (const lang of languages) {
      await handleLanguageChange(lang);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
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
    const baseClasses = 'absolute z-50 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden';
    
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

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center ${getSizeClasses()} ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
        <span className="ml-2 text-gray-400">
          {currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </span>
      </div>
    );
  }

  // Error state
  if (switchError) {
    return (
      <div className={`flex items-center ${getSizeClasses()} ${className}`}>
        <FaExclamationTriangle className="text-red-400 mr-2" />
        <span className="text-red-400 text-sm">
          {switchError.message}
        </span>
        <button
          onClick={() => setSwitchError(null)}
          className="ml-2 text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
    );
  }

  // Toggle variant (simple switch)
  if (variant === 'toggle') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <motion.button
          onClick={() => handleLanguageChange(currentLanguage === 'ar' ? 'en' : 'ar')}
          className={`
            ${getSizeClasses()}
            bg-gray-800 hover:bg-gray-700 text-white rounded-lg 
            transition-all duration-200 flex items-center space-x-2
            border border-gray-700 hover:border-purple-500
            ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          disabled={isSwitching}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isSwitching ? (
            <FaSync className="animate-spin" />
          ) : (
            <>
              {showFlag && currentLang && (
                <span className="text-lg">{currentLang.flag}</span>
              )}
              {showLabel && (
                <span className="font-medium">{currentLang?.native}</span>
              )}
            </>
          )}
        </motion.button>
        
        {/* Performance indicator */}
        {lastSwitchTime > 0 && (
          <span className="text-xs text-gray-500">
            {lastSwitchTime}ms
          </span>
        )}
      </div>
    );
  }

  // Buttons variant (separate button for each language)
  if (variant === 'buttons') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {availableLanguages.map((lang) => (
          <motion.button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`
              ${getSizeClasses()}
              rounded-lg transition-all duration-200 flex items-center space-x-2
              border font-medium
              ${
                currentLanguage === lang.code
                  ? 'bg-purple-600 text-white border-purple-500 shadow-lg'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 hover:border-purple-500'
              }
              ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            disabled={isSwitching}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isSwitching && currentLanguage === lang.code ? (
              <FaSync className="animate-spin w-3 h-3" />
            ) : (
              <>
                {showFlag && (
                  <span className="text-lg">{lang.flag}</span>
                )}
                {showLabel && (
                  <span>{lang.native}</span>
                )}
                {currentLanguage === lang.code && (
                  <FaCheck className="w-3 h-3" />
                )}
              </>
            )}
          </motion.button>
        ))}
        
        {/* Test button for development */}
        {showTestButton && (
          <button
            onClick={testRapidSwitching}
            className="px-2 py-1 bg-yellow-600 text-yellow-100 rounded text-xs"
            title="Test rapid switching"
          >
            Test
          </button>
        )}
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${getSizeClasses()}
          bg-gray-800 hover:bg-gray-700 text-white rounded-lg 
          transition-all duration-200 flex items-center space-x-2
          border border-gray-700 hover:border-purple-500
          ${isOpen ? 'ring-2 ring-purple-500' : ''}
          ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        disabled={isSwitching}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isSwitching ? (
          <FaSync className="w-4 h-4 animate-spin" />
        ) : (
          <FaGlobe className="w-4 h-4" />
        )}
        
        {showFlag && currentLang && !isSwitching && (
          <span className="text-lg">{currentLang.flag}</span>
        )}
        
        {showLabel && !isSwitching && (
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
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div 
              className={getDropdownPositionClasses()}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="py-2">
                {availableLanguages.map((lang) => (
                  <motion.button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-gray-700 
                      transition-colors duration-150 flex items-center space-x-3
                      ${currentLanguage === lang.code ? 'bg-purple-600 text-white' : 'text-gray-300'}
                      ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    disabled={isSwitching}
                    whileHover={{ backgroundColor: currentLanguage === lang.code ? undefined : 'rgba(55, 65, 81, 1)' }}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <div className="flex-1">
                      <div className="font-medium">{lang.native}</div>
                      <div className="text-sm opacity-70">({lang.label})</div>
                    </div>
                    {currentLanguage === lang.code && (
                      <FaCheck className="w-3 h-3" />
                    )}
                  </motion.button>
                ))}
              </div>
              
              {/* Performance info */}
              {lastSwitchTime > 0 && (
                <div className="px-4 py-2 bg-gray-900 border-t border-gray-700">
                  <div className="text-xs text-gray-500">
                    {currentLanguage === 'ar' 
                      ? `آخر تبديل: ${lastSwitchTime}ms`
                      : `Last switch: ${lastSwitchTime}ms`
                    }
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedLanguageSwitcher; 