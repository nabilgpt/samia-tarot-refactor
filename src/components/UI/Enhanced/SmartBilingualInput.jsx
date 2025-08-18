// =================================================
// SIMPLE BILINGUAL INPUT COMPONENT WITH DETAILED LOGGING
// Basic bilingual support with comprehensive debugging
// =================================================

import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * 🎯 SIMPLE BILINGUAL INPUT WITH EXTENSIVE LOGGING
 * - Shows only current language field
 * - No complex state management
 * - DETAILED LOGGING FOR DEBUGGING
 */
const SmartBilingualInput = ({
  baseField,
  label,
  placeholder,
  value = {},
  onChange,
  onBlur,
  required = false,
  type = 'text',
  disabled = false,
  className = '',
  showBothForAdmin = false,
  ...props
}) => {
  const { 
    currentLanguage, 
    getFieldName, 
    t, 
    direction,
    isAdmin,
    showBothLanguages
  } = useLanguage();

  const inputRef = useRef(null);
  const renderCountRef = useRef(0);
  
  // Increment render count
  renderCountRef.current += 1;

  // ===================================
  // EXTENSIVE LOGGING FOR DEBUGGING
  // ===================================
  
  console.log(`🔥 SmartBilingualInput [${baseField}] RENDER #${renderCountRef.current}:`, {
    timestamp: new Date().toISOString(),
    baseField,
    currentLanguage,
    value: value,
    currentValue: value[getFieldName(baseField)],
    direction,
    hasFocus: document.activeElement === inputRef.current,
    activeElement: document.activeElement?.tagName,
    activeElementId: document.activeElement?.id,
    activeElementName: document.activeElement?.name
  });

  // Log when component mounts/unmounts
  useEffect(() => {
    console.log(`🎯 SmartBilingualInput [${baseField}] MOUNTED`);
    return () => {
      console.log(`💀 SmartBilingualInput [${baseField}] UNMOUNTED`);
    };
  }, [baseField]);

  // Log when value changes
  useEffect(() => {
    console.log(`📝 SmartBilingualInput [${baseField}] VALUE CHANGED:`, {
      newValue: value,
      currentFieldValue: value[getFieldName(baseField)]
    });
  }, [value, baseField, getFieldName]);

  // Log when language changes
  useEffect(() => {
    console.log(`🌐 SmartBilingualInput [${baseField}] LANGUAGE CHANGED:`, {
      from: 'unknown',
      to: currentLanguage,
      newFieldName: getFieldName(baseField)
    });
  }, [currentLanguage, baseField, getFieldName]);

  // ===================================
  // SIMPLE FIELD CONFIGURATION
  // ===================================

  const currentField = getFieldName(baseField);
  const arField = `${baseField}_ar`;
  const enField = `${baseField}_en`;

  // Get current value - simple and direct
  const currentValue = value[currentField] || '';

  // Check if we should show both languages (admin mode)
  const shouldShowBoth = isAdmin && showBothLanguages && showBothForAdmin;

  console.log(`🔧 SmartBilingualInput [${baseField}] CONFIG:`, {
    currentField,
    arField,
    enField,
    currentValue,
    shouldShowBoth
  });

  // ===================================
  // SIMPLE INPUT HANDLER WITH LOGGING
  // ===================================

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    
    console.log(`⌨️ SmartBilingualInput [${baseField}] INPUT CHANGE:`, {
      timestamp: new Date().toISOString(),
      oldValue: currentValue,
      newValue: newValue,
      fieldName: currentField,
      eventType: e.type,
      target: e.target.tagName,
      hasFocusBeforeChange: document.activeElement === e.target
    });
    
    // Simple direct update - no complex state management
    onChange(prev => {
      const newState = {
        ...prev,
        [currentField]: newValue
      };
      
      console.log(`🔄 SmartBilingualInput [${baseField}] STATE UPDATE:`, {
        previousState: prev,
        newState: newState,
        changedField: currentField
      });
      
      return newState;
    });

    // Check focus after state update
    setTimeout(() => {
      console.log(`👁️ SmartBilingualInput [${baseField}] FOCUS CHECK AFTER CHANGE:`, {
        hasFocus: document.activeElement === e.target,
        activeElement: document.activeElement?.tagName,
        activeElementValue: document.activeElement?.value
      });
    }, 0);
  };

  // ===================================
  // ADMIN DUAL LANGUAGE HANDLER
  // ===================================

  const handleDualLanguageChange = (lang, newValue) => {
    const field = lang === 'ar' ? arField : enField;
    
    console.log(`🌍 SmartBilingualInput [${baseField}] DUAL LANG CHANGE:`, {
      language: lang,
      field: field,
      newValue: newValue
    });
    
    onChange(prev => ({
      ...prev,
      [field]: newValue
    }));
  };

  // ===================================
  // SIMPLE STYLING
  // ===================================

  const getInputClasses = () => {
    const baseClasses = "w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 text-base bg-slate-900/50 backdrop-blur-sm";
    const focusClasses = "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent";
    const borderClasses = "border-gray-600 hover:border-gray-500";
    const textClasses = "text-white placeholder-gray-400";
    
    return `${baseClasses} ${focusClasses} ${borderClasses} ${textClasses} ${className}`;
  };

  const getLocalizedLabel = () => {
    if (currentLanguage === 'ar') {
      return label?.ar || label || '';
    }
    return label?.en || label || '';
  };

  const getLocalizedPlaceholder = () => {
    if (currentLanguage === 'ar') {
      return placeholder?.ar || placeholder || '';
    }
    return placeholder?.en || placeholder || '';
  };

  // ===================================
  // RENDER WITH LOGGING
  // ===================================

  console.log(`🎨 SmartBilingualInput [${baseField}] RENDERING:`, {
    renderType: shouldShowBoth ? 'DUAL_LANGUAGE' : 'SINGLE_LANGUAGE',
    inputType: type,
    currentValue: currentValue
  });

  return (
    <div className="mb-6">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {getLocalizedLabel()}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* Single Language Mode - Simple Input */}
      {!shouldShowBoth && (
        <div className="relative">
          {type === 'textarea' ? (
            <textarea
              ref={inputRef}
              value={currentValue}
              onChange={handleInputChange}
              onBlur={onBlur}
              onFocus={(e) => {
                console.log(`🎯 SmartBilingualInput [${baseField}] FOCUS GAINED:`, {
                  timestamp: new Date().toISOString(),
                  value: e.target.value
                });
              }}
              placeholder={getLocalizedPlaceholder()}
              required={required}
              disabled={disabled}
              className={getInputClasses()}
              dir={direction}
              {...props}
            />
          ) : (
            <input
              ref={inputRef}
              type={type}
              value={currentValue}
              onChange={handleInputChange}
              onBlur={onBlur}
              onFocus={(e) => {
                console.log(`🎯 SmartBilingualInput [${baseField}] FOCUS GAINED:`, {
                  timestamp: new Date().toISOString(),
                  value: e.target.value
                });
              }}
              placeholder={getLocalizedPlaceholder()}
              required={required}
              disabled={disabled}
              className={getInputClasses()}
              dir={direction}
              {...props}
            />
          )}
        </div>
      )}

      {/* Admin Dual Language Mode */}
      {shouldShowBoth && (
        <div className="space-y-4">
          {/* Arabic Field */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              العربية (Arabic)
            </label>
            {type === 'textarea' ? (
              <textarea
                value={value[arField] || ''}
                onChange={(e) => handleDualLanguageChange('ar', e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder?.ar || ''}
                required={required}
                disabled={disabled}
                className={getInputClasses()}
                dir="rtl"
                {...props}
              />
            ) : (
              <input
                type={type}
                value={value[arField] || ''}
                onChange={(e) => handleDualLanguageChange('ar', e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder?.ar || ''}
                required={required}
                disabled={disabled}
                className={getInputClasses()}
                dir="rtl"
                {...props}
              />
            )}
          </div>

          {/* English Field */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              English
            </label>
            {type === 'textarea' ? (
              <textarea
                value={value[enField] || ''}
                onChange={(e) => handleDualLanguageChange('en', e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder?.en || ''}
                required={required}
                disabled={disabled}
                className={getInputClasses()}
                dir="ltr"
                {...props}
              />
            ) : (
              <input
                type={type}
                value={value[enField] || ''}
                onChange={(e) => handleDualLanguageChange('en', e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder?.en || ''}
                required={required}
                disabled={disabled}
                className={getInputClasses()}
                dir="ltr"
                {...props}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartBilingualInput; 