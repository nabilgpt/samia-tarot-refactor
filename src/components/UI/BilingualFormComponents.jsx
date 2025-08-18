import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslation } from 'react-i18next';

// Bilingual Input Component - shows only fields for selected language
export const BilingualInput = ({ 
  nameEn, 
  nameAr, 
  labelKeyEn, 
  labelKeyAr, 
  placeholderKeyEn, 
  placeholderKeyAr, 
  value, 
  onChange, 
  onBlur,
  type = 'text',
  required = false,
  disabled = false,
  error = null,
  className = '',
  ...props 
}) => {
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className={`space-y-2 ${className}`}>
      {currentLanguage === 'en' && (
        <>
          <label className="block text-sm font-medium text-gray-300">
            {t(labelKeyEn)}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <input
            type={type}
            name={nameEn}
            value={value.en || ''}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            onBlur={onBlur}
            placeholder={t(placeholderKeyEn)}
            required={required}
            disabled={disabled}
            className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 backdrop-blur-xl"
            {...props}
          />
        </>
      )}
      {currentLanguage === 'ar' && (
        <>
          <label className="block text-sm font-medium text-gray-300 text-right">
            {t(labelKeyAr)}
            {required && <span className="text-red-400 mr-1">*</span>}
          </label>
          <input
            type={type}
            name={nameAr}
            value={value.ar || ''}
            onChange={(e) => onChange({ ...value, ar: e.target.value })}
            onBlur={onBlur}
            placeholder={t(placeholderKeyAr)}
            required={required}
            disabled={disabled}
            className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 backdrop-blur-xl text-right"
            {...props}
          />
        </>
      )}
      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <span className="text-red-400">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
};

// Bilingual Textarea Component
export const BilingualTextarea = ({ 
  nameEn, 
  nameAr, 
  labelKeyEn, 
  labelKeyAr, 
  placeholderKeyEn, 
  placeholderKeyAr, 
  value, 
  onChange, 
  onBlur,
  required = false,
  disabled = false,
  error = null,
  rows = 4,
  className = '',
  ...props 
}) => {
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className={`space-y-2 ${className}`}>
      {currentLanguage === 'en' && (
        <>
          <label className="block text-sm font-medium text-gray-300">
            {t(labelKeyEn)}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <textarea
            name={nameEn}
            value={value.en || ''}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            onBlur={onBlur}
            placeholder={t(placeholderKeyEn)}
            required={required}
            disabled={disabled}
            rows={rows}
            className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 backdrop-blur-xl resize-vertical"
            {...props}
          />
        </>
      )}
      {currentLanguage === 'ar' && (
        <>
          <label className="block text-sm font-medium text-gray-300 text-right">
            {t(labelKeyAr)}
            {required && <span className="text-red-400 mr-1">*</span>}
          </label>
          <textarea
            name={nameAr}
            value={value.ar || ''}
            onChange={(e) => onChange({ ...value, ar: e.target.value })}
            onBlur={onBlur}
            placeholder={t(placeholderKeyAr)}
            required={required}
            disabled={disabled}
            rows={rows}
            className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 backdrop-blur-xl resize-vertical text-right"
            {...props}
          />
        </>
      )}
      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <span className="text-red-400">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
};

// Bilingual Select Component
export const BilingualSelect = ({ 
  nameEn, 
  nameAr, 
  labelKeyEn, 
  labelKeyAr, 
  placeholderKeyEn, 
  placeholderKeyAr, 
  value, 
  onChange, 
  onBlur,
  options = [],
  required = false,
  disabled = false,
  error = null,
  className = '',
  ...props 
}) => {
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className={`space-y-2 ${className}`}>
      {currentLanguage === 'en' && (
        <>
          <label className="block text-sm font-medium text-gray-300">
            {t(labelKeyEn)}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <select
            name={nameEn}
            value={value.en || ''}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            onBlur={onBlur}
            required={required}
            disabled={disabled}
            className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 backdrop-blur-xl"
            {...props}
          >
            <option value="">{t(placeholderKeyEn)}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.labelEn}
              </option>
            ))}
          </select>
        </>
      )}
      {currentLanguage === 'ar' && (
        <>
          <label className="block text-sm font-medium text-gray-300 text-right">
            {t(labelKeyAr)}
            {required && <span className="text-red-400 mr-1">*</span>}
          </label>
          <select
            name={nameAr}
            value={value.ar || ''}
            onChange={(e) => onChange({ ...value, ar: e.target.value })}
            onBlur={onBlur}
            required={required}
            disabled={disabled}
            className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 backdrop-blur-xl text-right"
            {...props}
          >
            <option value="">{t(placeholderKeyAr)}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.labelAr}
              </option>
            ))}
          </select>
        </>
      )}
      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <span className="text-red-400">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
};

// Monolingual Input Component - for language-specific fields
export const MonolingualInput = ({ 
  name, 
  labelKey, 
  placeholderKey, 
  value, 
  onChange, 
  onBlur,
  type = 'text',
  required = false,
  disabled = false,
  error = null,
  className = '',
  ...props 
}) => {
  const { language } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className={`space-y-2 ${className}`}>
      <label className={`block text-sm font-medium text-gray-300 ${language === 'ar' ? 'text-right' : ''}`}>
        {t(labelKey)}
        {required && <span className={`text-red-400 ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={t(placeholderKey)}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/20 focus:border-gold-400 transition-all duration-300 hover:border-gray-500 ${language === 'ar' ? 'text-right' : ''}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <span className="text-red-400">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
};

// Monolingual Textarea Component - for language-specific textarea fields
export const MonolingualTextarea = ({ 
  name, 
  labelKey, 
  placeholderKey, 
  value, 
  onChange, 
  onBlur,
  required = false,
  disabled = false,
  error = null,
  rows = 4,
  className = '',
  ...props 
}) => {
  const { language } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className={`space-y-2 ${className}`}>
      <label className={`block text-sm font-medium text-gray-300 ${language === 'ar' ? 'text-right' : ''}`}>
        {t(labelKey)}
        {required && <span className={`text-red-400 ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>*</span>}
      </label>
      <textarea
        name={name}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={t(placeholderKey)}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/20 focus:border-gold-400 transition-all duration-300 hover:border-gray-500 resize-none ${language === 'ar' ? 'text-right' : ''}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <span className="text-red-400">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
};

// Search Input Component
export const SearchInput = ({ 
  value, 
  onChange, 
  placeholderKey, 
  className = '',
  ...props 
}) => {
  const { language } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(placeholderKey)}
        className={`w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/20 focus:border-gold-400 transition-all duration-300 hover:border-gray-500 ${language === 'ar' ? 'text-right pr-12' : 'pl-12'}`}
        {...props}
      />
      <div className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${language === 'ar' ? 'right-4' : 'left-4'}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
};

// Form Button Component
export const FormButton = ({ 
  textKey, 
  variant = 'primary', 
  type = 'button', 
  disabled = false,
  loading = false,
  className = '',
  onClick,
  ...props 
}) => {
  const { language } = useLanguage();
  const { t } = useTranslation();

  const baseClasses = "px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
  
  const variants = {
    primary: "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 focus:ring-gold-400/50 shadow-lg shadow-gold-500/30",
    secondary: "bg-dark-700/50 hover:bg-dark-600/50 text-white border border-gold-400/30 hover:border-gold-400 focus:ring-gold-400/50",
    danger: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white focus:ring-red-400/50 shadow-lg shadow-red-500/30",
    success: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white focus:ring-green-400/50 shadow-lg shadow-green-500/30"
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>{t('common.loading')}</span>
        </div>
      ) : (
        t(textKey)
      )}
    </button>
  );
};

// Form Section Component
export const FormSection = ({ 
  titleKey, 
  children, 
  className = '',
  ...props 
}) => {
  const { language } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className={`space-y-4 ${className}`} {...props}>
      <h3 className={`text-lg font-semibold text-white ${language === 'ar' ? 'text-right' : ''}`}>
        {t(titleKey)}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

// Form Container Component
export const FormContainer = ({ 
  titleKey, 
  subtitleKey, 
  children, 
  className = '',
  ...props 
}) => {
  const { language } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className={`bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10 ${className}`} {...props}>
      <div className={`text-center mb-6 ${language === 'ar' ? 'text-right' : ''}`}>
        <h2 className="text-xl font-bold text-white mb-2">
          {t(titleKey)}
        </h2>
        {subtitleKey && (
          <p className="text-gray-400">
            {t(subtitleKey)}
          </p>
        )}
      </div>
      {children}
    </div>
  );
};

export default {
  BilingualInput,
  BilingualTextarea,
  BilingualSelect,
  MonolingualInput,
  MonolingualTextarea,
  SearchInput,
  FormButton,
  FormSection,
  FormContainer
}; 