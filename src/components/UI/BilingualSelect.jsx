// =================================================
// SAMIA TAROT BILINGUAL SELECT COMPONENT
// Single-language select that shows ONLY the current language options
// =================================================

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const BilingualSelect = ({
  baseField,
  label,
  placeholder,
  options = [],
  value = {},
  onChange,
  onBlur,
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const { 
    currentLanguage, 
    getFieldName, 
    t, 
    direction,
    validateCurrentLanguageField,
    getLocalizedText
  } = useLanguage();

  const currentField = getFieldName(baseField);

  // Get current language value only
  const currentValue = value[currentField] || '';

  // Handle select change for current language only
  const handleCurrentChange = (e) => {
    const newValue = e.target.value;
    onChange({
      ...value,
      [currentField]: newValue
    });
  };

  // Get language-specific label and placeholder
  const getLocalizedLabel = () => {
    if (typeof label === 'string') {
      return label;
    }
    if (typeof label === 'object') {
      return label[currentLanguage] || label.en || label.ar || '';
    }
    return '';
  };

  const getLocalizedPlaceholder = () => {
    if (typeof placeholder === 'string') {
      return placeholder;
    }
    if (typeof placeholder === 'object') {
      return placeholder[currentLanguage] || placeholder.en || placeholder.ar || '';
    }
    return t('select');
  };

  // Localize options for current language only
  const getLocalizedOptions = () => {
    return options.map(option => ({
      ...option,
      label: getLocalizedText(option, 'label', option.label || option.name || ''),
      name: getLocalizedText(option, 'name', option.name || option.label || '')
    }));
  };

  // Validation
  const validation = validateCurrentLanguageField(value, baseField, required);

  // Base select classes with cosmic theme and RTL support
  const selectClasses = `
    w-full px-4 py-3 rounded-lg
    bg-slate-700/50 border-2 border-transparent
    text-white
    transition-all duration-300
    focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
    focus:outline-none focus:bg-slate-700/70
    cursor-pointer
    ${!validation.valid ? 'border-red-500 focus:border-red-500' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${currentLanguage === 'ar' ? 'text-right font-arabic' : 'text-left'}
    ${className}
  `.trim();

  const labelClasses = `
    block text-sm font-medium text-slate-300 mb-2
    ${currentLanguage === 'ar' ? 'text-right font-arabic' : 'text-left'}
  `.trim();

  const localizedOptions = getLocalizedOptions();

  // Single language display only
  return (
    <div className="w-full">
      <label className={labelClasses}>
        {getLocalizedLabel()}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <select
        value={currentValue}
        onChange={handleCurrentChange}
        onBlur={onBlur}
        disabled={disabled}
        dir={direction}
        className={selectClasses}
        {...props}
      >
        <option value="" disabled>
          {getLocalizedPlaceholder()}
        </option>
        {localizedOptions.map((option, index) => (
          <option key={option.value || index} value={option.value || option.id}>
            {option.label || option.name}
          </option>
        ))}
      </select>
      {!validation.valid && (
        <p className="text-red-400 text-sm mt-1">{validation.message}</p>
      )}
    </div>
  );
};

export default BilingualSelect; 