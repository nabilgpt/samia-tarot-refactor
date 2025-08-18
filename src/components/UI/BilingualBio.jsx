// =================================================
// SAMIA TAROT BILINGUAL BIO COMPONENT
// Handles display and editing of bio information in both languages
// =================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Edit3, Save, X, Globe, User, Users, FileText } from 'lucide-react';

const BilingualBio = ({ 
  profile, 
  isEditing = false, 
  onSave, 
  onCancel,
  showLanguageToggle = true,
  className = "",
  placeholder = null
}) => {
  // ✅ PURE LANGUAGE CONTEXT: Only language management
  const { currentLanguage } = useLanguage();
  
  // ✅ AUTH CONTEXT: For admin role checking
  const { profile: userProfile } = useAuth();
  
  // ✅ Check if current user is admin (boolean, not function)
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  const [bioData, setBioData] = useState({
    bio_ar: '',
    bio_en: ''
  });
  const [showBothLanguages, setShowBothLanguages] = useState(false);
  const [isInternalEditing, setIsInternalEditing] = useState(false);

  // Update bio data when profile changes
  useEffect(() => {
    if (profile) {
      setBioData({
        bio_ar: profile.bio_ar || '',
        bio_en: profile.bio_en || ''
      });
    }
  }, [profile]);

  // Get current language bio
  const getCurrentBio = () => {
    return currentLanguage === 'ar' ? bioData.bio_ar : bioData.bio_en;
  };

  // Get opposite language bio
  const getOppositeBio = () => {
    return currentLanguage === 'ar' ? bioData.bio_en : bioData.bio_ar;
  };

  // Handle text change
  const handleBioChange = (field, value) => {
    setBioData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle save
  const handleSave = async () => {
    if (onSave) {
      await onSave(bioData);
    }
    setIsInternalEditing(false);
  };

  // Handle cancel
  const handleCancel = () => {
    if (profile) {
      setBioData({
        bio_ar: profile.bio_ar || '',
        bio_en: profile.bio_en || ''
      });
    }
    if (onCancel) {
      onCancel();
    }
    setIsInternalEditing(false);
  };

  // Start editing
  const startEditing = () => {
    setIsInternalEditing(true);
  };

  // Check if editing mode
  const isEditingMode = isEditing || isInternalEditing;

  // Get placeholder text
  const getPlaceholder = (language) => {
    if (placeholder) {
      return typeof placeholder === 'string' 
        ? placeholder 
        : (language === 'ar' ? placeholder.ar : placeholder.en);
    }
    
    return language === 'ar' 
      ? 'اكتب نبذة عن نفسك...' 
      : 'Write a brief description about yourself...';
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  const textVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`bio-component ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-gold-400" />
          <h3 className="text-lg font-semibold text-white">
            {currentLanguage === 'ar' ? 'النبذة التعريفية' : 'Bio'}
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Language toggle for admins */}
          {isAdmin && showLanguageToggle && (
            <button
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
          )}

          {/* Edit button */}
          {!isEditingMode && (
            <button
              onClick={startEditing}
              className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              title={currentLanguage === 'ar' ? 'تحرير' : 'Edit'}
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isEditingMode ? (
          <motion.div
            key="editing"
            variants={textVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-4"
          >
            {showBothLanguages && isAdmin ? (
              // Both languages for admins
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    العربية
                  </label>
                  <textarea
                    value={bioData.bio_ar}
                    onChange={(e) => handleBioChange('bio_ar', e.target.value)}
                    placeholder={getPlaceholder('ar')}
                    className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 resize-none"
                    rows={4}
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    English
                  </label>
                  <textarea
                    value={bioData.bio_en}
                    onChange={(e) => handleBioChange('bio_en', e.target.value)}
                    placeholder={getPlaceholder('en')}
                    className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 resize-none"
                    rows={4}
                    dir="ltr"
                  />
                </div>
              </div>
            ) : (
              // Single language
              <div>
                <textarea
                  value={getCurrentBio()}
                  onChange={(e) => handleBioChange(
                    currentLanguage === 'ar' ? 'bio_ar' : 'bio_en', 
                    e.target.value
                  )}
                  placeholder={getPlaceholder(currentLanguage)}
                  className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 resize-none"
                  rows={4}
                  dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-600/20 text-gray-400 rounded-lg hover:bg-gray-600/30 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-gold-600/20 text-gold-400 rounded-lg hover:bg-gold-600/30 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {currentLanguage === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="display"
            variants={textVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-4"
          >
            {showBothLanguages && isAdmin ? (
              // Both languages display for admins
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-admin-dual-language="true">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-400">العربية</span>
                  </div>
                  <div className="p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
                    <p className="text-gray-300 whitespace-pre-wrap" dir="rtl">
                      {bioData.bio_ar || (
                        <span className="text-gray-500 italic">
                          لا توجد نبذة تعريفية باللغة العربية
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-400">English</span>
                  </div>
                  <div className="p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
                    <p className="text-gray-300 whitespace-pre-wrap" dir="ltr">
                      {bioData.bio_en || (
                        <span className="text-gray-500 italic">
                          No bio available in English
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Single language display
              <div className="p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg" data-single-language="true">
                <p className="text-gray-300 whitespace-pre-wrap" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                  {getCurrentBio() || (
                    <span className="text-gray-500 italic">
                      {currentLanguage === 'ar' 
                        ? 'لا توجد نبذة تعريفية' 
                        : 'No bio available'}
                    </span>
                  )}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BilingualBio; 