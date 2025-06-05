import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Particles from 'react-particles';
import { loadSlim } from 'tsparticles-slim';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getZodiacSign, isValidDateFormat, formatDateForAPI } from '../utils/zodiacHelper';
import { getCountryList, getCountryCode } from '../utils/countryHelpers';
import { UserIcon, CalendarIcon, PhoneIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { Sparkles, User, Save, X, Edit } from 'lucide-react';
import Button from '../components/Button';

const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Particle configuration for cosmic background (EXACT SAME AS HOMEPAGE)
  const particlesInit = useCallback(async engine => {
    await loadSlim(engine);
  }, []);

  const particlesConfig = useMemo(() => ({
    background: {
      color: {
        value: "transparent",
      },
    },
    fpsLimit: 120,
    interactivity: {
      events: {
        onClick: {
          enable: true,
          mode: "push",
        },
        onHover: {
          enable: true,
          mode: "repulse",
        },
        resize: true,
      },
      modes: {
        push: {
          quantity: 4,
        },
        repulse: {
          distance: 200,
          duration: 0.4,
        },
      },
    },
    particles: {
      color: {
        value: ["#fbbf24", "#d946ef", "#06b6d4", "#ffffff"],
      },
      links: {
        color: "#fbbf24",
        distance: 150,
        enable: true,
        opacity: 0.2,
        width: 1,
      },
      collisions: {
        enable: true,
      },
      move: {
        direction: "none",
        enable: true,
        outModes: {
          default: "bounce",
        },
        random: false,
        speed: 1,
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 800,
        },
        value: 80,
      },
      opacity: {
        value: 0.3,
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1, max: 3 },
      },
    },
    detectRetina: true,
  }), []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const floatVariants = {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 4,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut"
      }
    }
  };

  // Form state - including country_code
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    country: '',
    country_code: '',
    date_of_birth: '',
    zodiac: '',
    maritalStatus: ''
  });

  // Get country list for dropdown
  const countryList = getCountryList();

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        country: profile.country || '',
        country_code: profile.country_code || getCountryCode(profile.country) || '',
        date_of_birth: profile.date_of_birth || '',
        zodiac: profile.zodiac || '',
        maritalStatus: profile.maritalStatus || ''
      });
    }
  }, [profile]);

  // Auto-calculate zodiac when date of birth changes
  useEffect(() => {
    if (formData.date_of_birth && isValidDateFormat(formData.date_of_birth)) {
      const calculatedZodiac = getZodiacSign(formData.date_of_birth, i18n.language);
      if (calculatedZodiac !== formData.zodiac) {
        setFormData(prev => ({
          ...prev,
          zodiac: calculatedZodiac
        }));
        
        // Show zodiac calculation message
        if (isEditing && calculatedZodiac) {
          setSuccessMessage(t('profile.form.zodiacCalculated', { zodiac: calculatedZodiac }));
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      }
    }
  }, [formData.date_of_birth, i18n.language, isEditing, t]);

  // Auto-fill country code when country changes
  useEffect(() => {
    if (formData.country) {
      const countryCode = getCountryCode(formData.country);
      if (countryCode && countryCode !== formData.country_code) {
        setFormData(prev => ({
          ...prev,
          country_code: countryCode
        }));
      }
    }
  }, [formData.country]);

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name?.trim()) {
      newErrors.first_name = t('profile.form.firstNameRequired');
    }

    if (!formData.last_name?.trim()) {
      newErrors.last_name = t('profile.form.lastNameRequired');
    }

    if (formData.phone && !/^[+]?[\d\s\-()]+$/.test(formData.phone.trim())) {
      newErrors.phone = t('profile.form.phoneInvalid');
    }

    if (formData.date_of_birth && !isValidDateFormat(formData.date_of_birth)) {
      newErrors.date_of_birth = t('profile.form.dateInvalid');
    }

    if (!formData.country?.trim()) {
      newErrors.country = t('profile.form.countryRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Don't allow direct zodiac or country_code input - they're readonly
    if (name === 'zodiac' || name === 'country_code') {
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear messages when user starts typing
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  // Handle date of birth change with special handling
  const handleDateChange = (e) => {
    const dateValue = e.target.value;
    setFormData(prev => ({
      ...prev,
      date_of_birth: dateValue
    }));

    // Clear date error
    if (errors.date_of_birth) {
      setErrors(prev => ({
        ...prev,
        date_of_birth: ''
      }));
    }
  };

  // Save profile changes
  const handleSave = async () => {
    if (!validateForm()) {
      setErrorMessage(t('profile.form.validationError'));
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Prepare payload - ensure all required fields are included
      const updatePayload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim() || null,
        country: formData.country.trim(),
        country_code: formData.country_code || null,
        date_of_birth: formData.date_of_birth ? formatDateForAPI(formData.date_of_birth) : null,
        zodiac: formData.zodiac || null,
        maritalStatus: formData.maritalStatus || null
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditing(false);
      setSuccessMessage(t('profile.form.saveSuccess'));
      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage(t('profile.form.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        country: profile.country || '',
        country_code: profile.country_code || getCountryCode(profile.country) || '',
        date_of_birth: profile.date_of_birth || '',
        zodiac: profile.zodiac || '',
        maritalStatus: profile.maritalStatus || ''
      });
    }
    setIsEditing(false);
    setErrors({});
    setSuccessMessage('');
    setErrorMessage('');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={particlesConfig}
          className="absolute inset-0 z-0"
        />
        <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-white/10">
              <div className="animate-pulse">
                <div className="h-8 bg-gold-400/20 rounded w-1/4 mb-6"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-cosmic-400/20 rounded w-3/4"></div>
                  <div className="h-4 bg-cosmic-400/20 rounded w-1/2"></div>
                  <div className="h-4 bg-cosmic-400/20 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Particle Background - EXACT SAME AS HOMEPAGE */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={particlesConfig}
        className="absolute inset-0 z-0"
      />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Additional cosmic background effects - EXACT SAME AS HOMEPAGE */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cosmic-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <motion.div 
          className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="space-y-8">
            {/* Header */}
            <div className="text-center mb-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full mb-8"
              >
                <User className="w-10 h-10 text-white" />
              </motion.div>

              <motion.h1 
                className="text-4xl md:text-6xl font-bold leading-tight mb-4"
                variants={itemVariants}
              >
                <span className="bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
                  {t('profile.title')}
                </span>
              </motion.h1>

              <motion.p 
                className="text-xl text-gray-300 max-w-2xl mx-auto"
                variants={itemVariants}
              >
                {t('profile.subtitle')}
              </motion.p>
            </div>

            {/* Profile Form */}
            <motion.div
              variants={itemVariants}
              className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-white/10 overflow-hidden"
            >
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-cosmic-500/10 via-purple-500/10 to-gold-500/10 opacity-50"></div>
              
              <div className="relative z-10">
                {/* Edit Toggle */}
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-gold-300">
                    {t('profile.personalInfo')}
                  </h2>
                  {!isEditing ? (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-700 hover:to-purple-700 text-white"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {t('profile.edit')}
                      </Button>
                    </motion.div>
                  ) : (
                    <div className="flex space-x-3">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                        >
                          {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          {t('profile.save')}
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <X className="w-4 h-4 mr-2" />
                          {t('profile.cancel')}
                        </Button>
                      </motion.div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-green-900/30 border border-green-400/30 rounded-lg backdrop-blur-xl"
                  >
                    <p className="text-green-300">{successMessage}</p>
                  </motion.div>
                )}

                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-900/30 border border-red-400/30 rounded-lg backdrop-blur-xl"
                  >
                    <p className="text-red-300">{errorMessage}</p>
                  </motion.div>
                )}

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-gold-300 font-semibold mb-2">
                      {t('profile.form.firstName')} *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-xl bg-gray-800/50 border text-white placeholder-gray-400 transition-all duration-300 ${
                        isEditing 
                          ? 'border-gray-600 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20' 
                          : 'border-gray-700 cursor-not-allowed'
                      } ${errors.first_name ? 'border-red-400' : ''}`}
                      placeholder={t('profile.form.firstNamePlaceholder')}
                    />
                    {errors.first_name && (
                      <p className="text-red-400 text-sm mt-1">{errors.first_name}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-gold-300 font-semibold mb-2">
                      {t('profile.form.lastName')} *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-xl bg-gray-800/50 border text-white placeholder-gray-400 transition-all duration-300 ${
                        isEditing 
                          ? 'border-gray-600 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20' 
                          : 'border-gray-700 cursor-not-allowed'
                      } ${errors.last_name ? 'border-red-400' : ''}`}
                      placeholder={t('profile.form.lastNamePlaceholder')}
                    />
                    {errors.last_name && (
                      <p className="text-red-400 text-sm mt-1">{errors.last_name}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-gold-300 font-semibold mb-2">
                      {t('profile.form.phone')}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-xl bg-gray-800/50 border text-white placeholder-gray-400 transition-all duration-300 ${
                        isEditing 
                          ? 'border-gray-600 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20' 
                          : 'border-gray-700 cursor-not-allowed'
                      } ${errors.phone ? 'border-red-400' : ''}`}
                      placeholder={t('profile.form.phonePlaceholder')}
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-gold-300 font-semibold mb-2">
                      {t('profile.form.country')} *
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-xl bg-gray-800/50 border text-white transition-all duration-300 ${
                        isEditing 
                          ? 'border-gray-600 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20' 
                          : 'border-gray-700 cursor-not-allowed'
                      } ${errors.country ? 'border-red-400' : ''}`}
                    >
                      <option value="">{t('profile.form.selectCountry')}</option>
                      {countryList.map(country => (
                        <option key={country.code} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    {errors.country && (
                      <p className="text-red-400 text-sm mt-1">{errors.country}</p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-gold-300 font-semibold mb-2">
                      {t('profile.form.dateOfBirth')}
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleDateChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-xl bg-gray-800/50 border text-white transition-all duration-300 ${
                        isEditing 
                          ? 'border-gray-600 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20' 
                          : 'border-gray-700 cursor-not-allowed'
                      } ${errors.date_of_birth ? 'border-red-400' : ''}`}
                    />
                    {errors.date_of_birth && (
                      <p className="text-red-400 text-sm mt-1">{errors.date_of_birth}</p>
                    )}
                  </div>

                  {/* Zodiac Sign */}
                  <div>
                    <label className="block text-gold-300 font-semibold mb-2">
                      {t('profile.form.zodiacSign')}
                    </label>
                    <input
                      type="text"
                      name="zodiac"
                      value={formData.zodiac}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-cosmic-400 cursor-not-allowed"
                      placeholder={t('profile.form.zodiacPlaceholder')}
                    />
                    <p className="text-gray-500 text-sm mt-1">
                      {t('profile.form.zodiacAutoCalculated')}
                    </p>
                  </div>

                  {/* Marital Status */}
                  <div>
                    <label className="block text-gold-300 font-semibold mb-2">
                      💍 {i18n.language === 'ar' ? 'الوضع العائلي' : 'Marital Status'}
                    </label>
                    <select
                      name="maritalStatus"
                      value={formData.maritalStatus}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:border-white/30 ${
                        isEditing 
                          ? 'focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400' 
                          : 'border-gray-700 cursor-not-allowed'
                      } ${errors.maritalStatus ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                      dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                    >
                      <option value="">{i18n.language === 'ar' ? 'اختر الوضع العائلي' : 'Select marital status'}</option>
                      <option value="single">{i18n.language === 'ar' ? 'أعزب/عزباء' : 'Single'}</option>
                      <option value="married">{i18n.language === 'ar' ? 'متزوج/متزوجة' : 'Married'}</option>
                      <option value="engaged">{i18n.language === 'ar' ? 'مخطوب/مخطوبة' : 'Engaged'}</option>
                      <option value="relationship">{i18n.language === 'ar' ? 'في علاقة' : 'In a Relationship'}</option>
                      <option value="complicated">{i18n.language === 'ar' ? 'الأمر معقد' : "It's Complicated"}</option>
                    </select>
                    {errors.maritalStatus && (
                      <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                        {errors.maritalStatus}
                      </p>
                    )}
                  </div>
                </div>

                {/* Account Info */}
                <div className="mt-8 pt-8 border-t border-gray-700/50">
                  <h3 className="text-xl font-bold text-gold-300 mb-4">
                    {t('profile.accountInfo')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-400 font-medium mb-2">
                        {t('profile.email')}
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        readOnly
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-gray-400 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 font-medium mb-2">
                        {t('profile.memberSince')}
                      </label>
                      <input
                        type="text"
                        value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
                        readOnly
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-gray-400 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Floating elements - EXACT SAME AS HOMEPAGE */}
        <motion.div
          variants={floatVariants}
          animate="animate"
          className="absolute top-20 right-20 hidden lg:block"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-cosmic-500 to-purple-600 rounded-full opacity-60 blur-sm"></div>
        </motion.div>
        <motion.div
          variants={floatVariants}
          animate="animate"
          className="absolute bottom-32 left-20 hidden lg:block"
          style={{ animationDelay: '1s' }}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-yellow-600 rounded-full opacity-60 blur-sm"></div>
        </motion.div>
      </section>
    </div>
  );
};

export default ProfilePage; 