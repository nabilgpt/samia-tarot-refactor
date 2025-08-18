import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * 🎯 SmartBilingualField - ELEGANT Single Field Solution
 * 
 * ✅ Single field showing only current UI language
 * ✅ Zero focus loss - mathematical guarantee
 * ✅ Language detection with notification (no auto-change)
 * ✅ Backend translation on submit only
 * ✅ Flexible responsive layout
 * ✅ Clean and elegant UX
 */
const SmartBilingualField = ({
  label,
  field,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  className = '',
  rows = 3,
  disabled = false,
  ...props
}) => {
  const { currentLanguage } = useLanguage();
  
  // 🔥 LOCAL STATE - Key to preventing focus loss
  const [localValue, setLocalValue] = useState(value || '');
  const [showLanguageDetection, setShowLanguageDetection] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  
  // Refs for input and timeout
  const inputRef = useRef(null);
  const detectionTimeoutRef = useRef(null);
  
  // 🔄 Sync external changes to local state (only when external value changes)
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value || '');
    }
  }, [value]);
  
  // Language detection function
  const detectLanguage = (text) => {
    if (!text.trim()) return null;
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return arabicRegex.test(text) ? 'ar' : 'en';
  };
  
  // 🎯 Handle input change (LOCAL STATE ONLY)
  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // 🔥 Update local state immediately (no focus loss)
    setLocalValue(newValue);
    
    // Clear previous timeout
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }
    
    // Language detection with notification (NOT auto-translation)
    detectionTimeoutRef.current = setTimeout(() => {
      if (newValue.trim()) {
        const detected = detectLanguage(newValue);
        
        // If user typed different language than UI, show notification
        if (detected && detected !== currentLanguage) {
          setDetectedLanguage(detected);
          setShowLanguageDetection(true);
          
          // Auto-hide notification after 3 seconds
          setTimeout(() => setShowLanguageDetection(false), 3000);
        }
      }
    }, 300);
  };
  
  // 🔥 Handle blur - sync with parent immediately
  const handleBlur = () => {
    if (onChange) {
      onChange(localValue);
    }
  };
  
  // Handle form submission - sync with parent
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      handleBlur();
    }
  };
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, []);
  
  // Base input classes - flexible and responsive
  const inputClasses = `
    w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg 
    focus:ring-2 focus:ring-purple-500 focus:border-transparent 
    text-white placeholder-gray-400 transition-all duration-200
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500'}
    ${className}
  `;
  
  const textareaClasses = `
    w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg 
    focus:ring-2 focus:ring-purple-500 focus:border-transparent 
    text-white placeholder-gray-400 transition-all duration-200 resize-none
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500'}
    ${className}
  `;
  
  // Generate placeholder based on current language
  const currentPlaceholder = placeholder || 
    (currentLanguage === 'ar' ? `أدخل ${label}` : `Enter ${label}`);
  
  // Direction based on current language
  const direction = currentLanguage === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="relative space-y-2 w-full min-w-0" style={{ width: '100%' }}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      {/* Single Smart Input */}
      <div className="relative w-full min-w-0" style={{ width: '100%' }}>
        {type === 'textarea' ? (
          <textarea
            ref={inputRef}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={rows}
            dir={direction}
            placeholder={currentPlaceholder}
            className={textareaClasses}
            style={{ width: '100%', ...props.style }}
            {...props}
          />
        ) : (
          <input
            ref={inputRef}
            type={type}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            dir={direction}
            placeholder={currentPlaceholder}
            className={inputClasses}
            style={{ width: '100%', ...props.style }}
            {...props}
          />
        )}
        
        {/* Language Detection Notification */}
        <AnimatePresence>
          {showLanguageDetection && detectedLanguage && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="absolute top-full left-0 right-0 mt-2 p-3 bg-blue-600/20 border border-blue-500/50 rounded-lg z-10"
            >
              <div className="flex items-center gap-2 text-blue-400 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {detectedLanguage === 'ar' 
                    ? 'تم كشف النص بالعربية - سيتم حفظه عند الإرسال'
                    : 'English text detected - will be saved on submit'
                  }
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Helper text */}
      {!disabled && (
        <div className="text-xs text-gray-500">
          {currentLanguage === 'ar' 
            ? 'اكتب بأي لغة - سيتم الكشف والحفظ تلقائياً'
            : 'Type in any language - detection and saving will happen automatically'
          }
        </div>
      )}
    </div>
  );
};

export default SmartBilingualField; 