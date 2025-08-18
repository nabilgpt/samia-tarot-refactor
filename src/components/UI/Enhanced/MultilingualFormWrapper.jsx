// =================================================
// SAMIA TAROT MULTILINGUAL FORM WRAPPER
// Fixed to use correct LanguageContext
// =================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../context/LanguageContext';
import { Globe, AlertCircle, CheckCircle } from 'lucide-react';

const MultilingualFormWrapper = ({ 
  children, 
  title = '',
  onLanguageChange = () => {},
  showLanguageToggle = true,
  className = '',
  validation = {},
  onValidationChange = () => {}
}) => {
  // ✅ PURE LANGUAGE CONTEXT
  const { currentLanguage, changeLanguage, direction, isRtl } = useLanguage();
  
  // States
  const [showBothLanguages, setShowBothLanguages] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isValid, setIsValid] = useState(true);

  // Handle language change
  const handleLanguageChange = (newLanguage) => {
    changeLanguage(newLanguage);
    onLanguageChange(newLanguage);
  };

  // Handle validation
  useEffect(() => {
    const errors = {};
    let valid = true;

    // Check validation rules
    Object.keys(validation).forEach(field => {
      const rules = validation[field];
      if (rules.required && !rules.value) {
        errors[field] = currentLanguage === 'ar' 
          ? 'هذا الحقل مطلوب' 
          : 'This field is required';
        valid = false;
      }
      
      if (rules.minLength && rules.value && rules.value.length < rules.minLength) {
        errors[field] = currentLanguage === 'ar' 
          ? `يجب أن يكون النص أطول من ${rules.minLength} أحرف`
          : `Text must be longer than ${rules.minLength} characters`;
        valid = false;
      }
      
      if (rules.maxLength && rules.value && rules.value.length > rules.maxLength) {
        errors[field] = currentLanguage === 'ar' 
          ? `يجب أن يكون النص أقصر من ${rules.maxLength} أحرف`
          : `Text must be shorter than ${rules.maxLength} characters`;
        valid = false;
      }
    });

    setValidationErrors(errors);
    setIsValid(valid);
    onValidationChange(valid, errors);
  }, [validation, currentLanguage, onValidationChange]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.3, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`multilingual-form-wrapper ${className}`}
      dir={direction}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {title && (
            <h2 className="text-xl font-semibold text-white">
              {title}
            </h2>
          )}
          
          {/* Validation status */}
          <div className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
        </div>

        {/* Language controls */}
        {showLanguageToggle && (
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              type="button"
              onClick={() => setShowBothLanguages(!showBothLanguages)}
              className={`p-2 rounded-lg transition-colors ${
                showBothLanguages 
                  ? 'bg-gold-500/20 text-gold-400' 
                  : 'bg-gray-700/50 text-gray-400 hover:text-white'
              }`}
              title={currentLanguage === 'ar' ? 'عرض كلا اللغتين' : 'Show both languages'}
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Language selector */}
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-1">
              <button
                type="button"
                onClick={() => handleLanguageChange('ar')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  currentLanguage === 'ar' 
                    ? 'bg-gold-500/20 text-gold-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  currentLanguage === 'en' 
                    ? 'bg-gold-500/20 text-gold-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={showBothLanguages ? 'both' : 'single'}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="space-y-6"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Validation errors */}
      {Object.keys(validationErrors).length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-medium text-red-400">
              {currentLanguage === 'ar' ? 'يرجى إصلاح الأخطاء التالية:' : 'Please fix the following errors:'}
            </h3>
          </div>
          <ul className="space-y-1 text-sm text-red-300">
            {Object.entries(validationErrors).map(([field, error]) => (
              <li key={field} className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MultilingualFormWrapper; 