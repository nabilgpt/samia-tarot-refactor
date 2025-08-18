// =================================================
// SAMIA TAROT ADMIN LANGUAGE MANAGEMENT TAB
// Fixed to use correct LanguageContext
// =================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../context/LanguageContext';
import { Globe, Settings, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

const AdminLanguageManagementTab = () => {
  // ✅ PURE LANGUAGE CONTEXT
  const { currentLanguage, changeLanguage, direction, isRtl } = useLanguage();
  
  // States
  const [settings, setSettings] = useState({
    defaultLanguage: 'en',
    supportedLanguages: ['ar', 'en'],
    autoDetectLanguage: false,
    fallbackLanguage: 'en',
    rtlSupport: true
  });
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Available languages
  const availableLanguages = [
    { code: 'ar', name: 'العربية', nativeName: 'العربية', rtl: true },
    { code: 'en', name: 'English', nativeName: 'English', rtl: false },
    { code: 'fr', name: 'Français', nativeName: 'Français', rtl: false },
    { code: 'es', name: 'Español', nativeName: 'Español', rtl: false },
  ];

  // Get current language text
  const getText = (ar, en) => {
    return currentLanguage === 'ar' ? ar : en;
  };

  // Handle settings change
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setSaved(false);
  };

  // Handle language toggle
  const handleLanguageToggle = (langCode) => {
    const supported = settings.supportedLanguages;
    const newSupported = supported.includes(langCode)
      ? supported.filter(code => code !== langCode)
      : [...supported, langCode];
    
    handleSettingChange('supportedLanguages', newSupported);
  };

  // Save settings
  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would save to your backend
      console.log('Saving language settings:', settings);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(getText(
        'حدث خطأ أثناء حفظ الإعدادات',
        'An error occurred while saving settings'
      ));
    } finally {
      setLoading(false);
    }
  };

  // Reset settings
  const handleReset = () => {
    setSettings({
      defaultLanguage: 'en',
      supportedLanguages: ['ar', 'en'],
      autoDetectLanguage: false,
      fallbackLanguage: 'en',
      rtlSupport: true
    });
    setSaved(false);
    setError(null);
  };

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
      className="admin-language-management-tab p-6 space-y-6"
      dir={direction}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-gold-400" />
          <h2 className="text-2xl font-bold text-white">
            {getText('إدارة اللغات', 'Language Management')}
          </h2>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-600/20 text-gray-400 rounded-lg hover:bg-gray-600/30 transition-colors flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4" />
            {getText('إعادة تعيين', 'Reset')}
          </button>
          
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gold-600/20 text-gold-400 rounded-lg hover:bg-gold-600/30 transition-colors flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {getText('حفظ', 'Save')}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400">
              {getText('تم حفظ الإعدادات بنجاح', 'Settings saved successfully')}
            </span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <motion.div
          variants={itemVariants}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {getText('الإعدادات الأساسية', 'Basic Settings')}
          </h3>

          <div className="space-y-4">
            {/* Default Language */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {getText('اللغة الافتراضية', 'Default Language')}
              </label>
              <select
                value={settings.defaultLanguage}
                onChange={(e) => handleSettingChange('defaultLanguage', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400"
              >
                {availableLanguages.map(lang => (
                  <option key={lang.code} value={lang.code} className="bg-gray-800">
                    {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Fallback Language */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {getText('اللغة الاحتياطية', 'Fallback Language')}
              </label>
              <select
                value={settings.fallbackLanguage}
                onChange={(e) => handleSettingChange('fallbackLanguage', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400"
              >
                {availableLanguages.map(lang => (
                  <option key={lang.code} value={lang.code} className="bg-gray-800">
                    {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-detect Language */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                {getText('الكشف التلقائي عن اللغة', 'Auto-detect Language')}
              </label>
              <button
                onClick={() => handleSettingChange('autoDetectLanguage', !settings.autoDetectLanguage)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.autoDetectLanguage 
                    ? 'bg-gold-500' 
                    : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.autoDetectLanguage 
                    ? 'translate-x-6' 
                    : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* RTL Support */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                {getText('دعم اللغات المكتوبة من اليمين لليسار', 'RTL Language Support')}
              </label>
              <button
                onClick={() => handleSettingChange('rtlSupport', !settings.rtlSupport)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.rtlSupport 
                    ? 'bg-gold-500' 
                    : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.rtlSupport 
                    ? 'translate-x-6' 
                    : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Supported Languages */}
        <motion.div
          variants={itemVariants}
          className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">
            {getText('اللغات المدعومة', 'Supported Languages')}
          </h3>

          <div className="space-y-3">
            {availableLanguages.map(lang => (
              <div
                key={lang.code}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{lang.nativeName}</span>
                  <span className="text-gray-400 text-sm">({lang.name})</span>
                  {lang.rtl && (
                    <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-1 rounded">
                      RTL
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => handleLanguageToggle(lang.code)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.supportedLanguages.includes(lang.code)
                      ? 'bg-gold-500' 
                      : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.supportedLanguages.includes(lang.code)
                      ? 'translate-x-6' 
                      : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Current Language Preview */}
      <motion.div
        variants={itemVariants}
        className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">
          {getText('معاينة اللغة الحالية', 'Current Language Preview')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-sm text-gray-400">
              {getText('اللغة الحالية', 'Current Language')}
            </span>
            <div className="text-white font-medium">
              {currentLanguage === 'ar' ? 'العربية' : 'English'}
            </div>
          </div>
          
          <div className="space-y-2">
            <span className="text-sm text-gray-400">
              {getText('الاتجاه', 'Direction')}
            </span>
            <div className="text-white font-medium">
              {isRtl ? 'RTL (من اليمين لليسار)' : 'LTR (Left to Right)'}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminLanguageManagementTab; 