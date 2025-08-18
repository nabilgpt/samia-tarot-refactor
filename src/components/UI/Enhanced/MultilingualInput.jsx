// =================================================
// SAMIA TAROT MULTILINGUAL INPUT COMPONENT
// Fixed to use correct LanguageContext
// =================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../context/LanguageContext';
import { Globe, Edit3, Save, X } from 'lucide-react';

const MultilingualInput = ({ 
  value = { ar: '', en: '' }, 
  onChange = () => {}, 
  placeholder = { ar: 'أدخل النص بالعربية', en: 'Enter text in English' },
  className = '',
  label = '',
  required = false,
  disabled = false,
  type = 'text',
  maxLength = null,
  showCharacterCount = false,
  allowEmpty = false,
  onValidation = () => {},
  autoResize = false,
  isTextarea = false,
  rows = 3
}) => {
  // ✅ PURE LANGUAGE CONTEXT
  const { currentLanguage, direction, isRtl } = useLanguage();
  
  // States
  const [showBoth, setShowBoth] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [errors, setErrors] = useState({ ar: '', en: '' });
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-resize textarea
  useEffect(() => {
    if (autoResize && isTextarea && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localValue, autoResize, isTextarea]);

  // Handle input change
  const handleChange = (lang, newValue) => {
    const updatedValue = { ...localValue, [lang]: newValue };
    setLocalValue(updatedValue);
    
    // Validate
    const newErrors = validateInput(updatedValue);
    setErrors(newErrors);
    
    // Call onChange
    onChange(updatedValue);
    
    // Call validation callback
    onValidation(Object.keys(newErrors).length === 0, newErrors);
  };

  // Validation
  const validateInput = (val) => {
    const newErrors = {};
    
    if (required && !allowEmpty) {
      if (!val.ar || val.ar.trim() === '') {
        newErrors.ar = 'النص مطلوب بالعربية';
      }
      if (!val.en || val.en.trim() === '') {
        newErrors.en = 'Text required in English';
      }
    }
    
    if (maxLength) {
      if (val.ar && val.ar.length > maxLength) {
        newErrors.ar = `النص طويل جداً (الحد الأقصى ${maxLength} حرف)`;
      }
      if (val.en && val.en.length > maxLength) {
        newErrors.en = `Text too long (max ${maxLength} characters)`;
      }
    }
    
    return newErrors;
  };

  // Get current placeholder
  const getCurrentPlaceholder = () => {
    if (typeof placeholder === 'string') return placeholder;
    return placeholder[currentLanguage] || placeholder.en;
  };

  // Get current value
  const getCurrentValue = () => {
    return localValue[currentLanguage] || '';
  };

  // Input component
  const InputComponent = isTextarea ? 'textarea' : 'input';
  
  const inputProps = {
    value: getCurrentValue(),
    onChange: (e) => handleChange(currentLanguage, e.target.value),
    placeholder: getCurrentPlaceholder(),
    className: `w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
      errors[currentLanguage] ? 'border-red-500' : ''
    } ${className}`,
    disabled,
    maxLength,
    dir: direction,
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    ...(isTextarea && { rows, ref: textareaRef })
  };

  if (!isTextarea) {
    inputProps.type = type;
  }

  return (
    <div className="multilingual-input-container">
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-300">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
          
          {/* Language toggle */}
          <button
            type="button"
            onClick={() => setShowBoth(!showBoth)}
            className={`p-2 rounded-lg transition-colors ${
              showBoth 
                ? 'bg-gold-500/20 text-gold-400' 
                : 'bg-gray-700/50 text-gray-400 hover:text-white'
            }`}
            title={currentLanguage === 'ar' ? 'عرض كلا اللغتين' : 'Show both languages'}
          >
            <Globe className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input(s) */}
      <AnimatePresence mode="wait">
        {showBoth ? (
          <motion.div
            key="both"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Arabic */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                العربية
              </label>
              <InputComponent
                {...inputProps}
                value={localValue.ar}
                onChange={(e) => handleChange('ar', e.target.value)}
                placeholder={typeof placeholder === 'string' ? placeholder : placeholder.ar}
                dir="rtl"
                className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                  errors.ar ? 'border-red-500' : ''
                } ${className}`}
              />
              {errors.ar && (
                <p className="text-red-400 text-sm mt-1">{errors.ar}</p>
              )}
            </div>

            {/* English */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                English
              </label>
              <InputComponent
                {...inputProps}
                value={localValue.en}
                onChange={(e) => handleChange('en', e.target.value)}
                placeholder={typeof placeholder === 'string' ? placeholder : placeholder.en}
                dir="ltr"
                className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                  errors.en ? 'border-red-500' : ''
                } ${className}`}
              />
              {errors.en && (
                <p className="text-red-400 text-sm mt-1">{errors.en}</p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="single"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <InputComponent {...inputProps} />
            {errors[currentLanguage] && (
              <p className="text-red-400 text-sm mt-1">{errors[currentLanguage]}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character count */}
      {showCharacterCount && maxLength && (
        <div className="flex justify-between items-center mt-2 text-sm text-gray-400">
          <span>
            {currentLanguage === 'ar' ? 'عدد الأحرف:' : 'Character count:'}
          </span>
          <span className={getCurrentValue().length > maxLength * 0.8 ? 'text-yellow-400' : ''}>
            {getCurrentValue().length} / {maxLength}
          </span>
        </div>
      )}
    </div>
  );
};

export default MultilingualInput; 