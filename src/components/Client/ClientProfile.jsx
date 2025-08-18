import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Star,
  Edit,
  Save,
  X,
  Camera,
  Upload,
  Check,
  AlertCircle,
  Heart,
  Globe,
  Lock,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import api from '../../services/frontendApi.js';

const ClientProfile = () => {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    country: '',
    birth_date: '',
    zodiac_sign: '',
    gender: '',
    marital_status: '',
    bio: '',
    avatar_url: ''
  });

  const [errors, setErrors] = useState({});

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.05
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

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        country: profile.country || '',
        birth_date: profile.birth_date || '',
        zodiac_sign: profile.zodiac_sign || '',
        gender: profile.gender || '',
        marital_status: profile.marital_status || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  const zodiacSigns = [
    { value: 'aries', label: language === 'ar' ? 'الحمل' : 'Aries' },
    { value: 'taurus', label: language === 'ar' ? 'الثور' : 'Taurus' },
    { value: 'gemini', label: language === 'ar' ? 'الجوزاء' : 'Gemini' },
    { value: 'cancer', label: language === 'ar' ? 'السرطان' : 'Cancer' },
    { value: 'leo', label: language === 'ar' ? 'الأسد' : 'Leo' },
    { value: 'virgo', label: language === 'ar' ? 'العذراء' : 'Virgo' },
    { value: 'libra', label: language === 'ar' ? 'الميزان' : 'Libra' },
    { value: 'scorpio', label: language === 'ar' ? 'العقرب' : 'Scorpio' },
    { value: 'sagittarius', label: language === 'ar' ? 'القوس' : 'Sagittarius' },
    { value: 'capricorn', label: language === 'ar' ? 'الجدي' : 'Capricorn' },
    { value: 'aquarius', label: language === 'ar' ? 'الدلو' : 'Aquarius' },
    { value: 'pisces', label: language === 'ar' ? 'الحوت' : 'Pisces' }
  ];

  const genders = [
    { value: 'male', label: language === 'ar' ? 'ذكر' : 'Male' },
    { value: 'female', label: language === 'ar' ? 'أنثى' : 'Female' },
    { value: 'other', label: language === 'ar' ? 'آخر' : 'Other' }
  ];

  const maritalStatuses = [
    { value: 'single', label: language === 'ar' ? 'أعزب' : 'Single' },
    { value: 'married', label: language === 'ar' ? 'متزوج' : 'Married' },
    { value: 'divorced', label: language === 'ar' ? 'مطلق' : 'Divorced' },
    { value: 'widowed', label: language === 'ar' ? 'أرمل' : 'Widowed' }
  ];

  const countries = [
    'Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
    'Egypt', 'Jordan', 'Lebanon', 'Syria', 'Iraq', 'Morocco',
    'Algeria', 'Tunisia', 'Libya', 'Sudan', 'Yemen', 'Palestine'
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = language === 'ar' ? 'الاسم الأول مطلوب' : 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = language === 'ar' ? 'اسم العائلة مطلوب' : 'Last name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = language === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required';
    }
    if (!formData.country) {
      newErrors.country = language === 'ar' ? 'البلد مطلوب' : 'Country is required';
    }
    if (!formData.birth_date) {
      newErrors.birth_date = language === 'ar' ? 'تاريخ الميلاد مطلوب' : 'Birth date is required';
    }
    if (!formData.zodiac_sign) {
      newErrors.zodiac_sign = language === 'ar' ? 'البرج مطلوب' : 'Zodiac sign is required';
    }
    if (!formData.gender) {
      newErrors.gender = language === 'ar' ? 'الجنس مطلوب' : 'Gender is required';
    }
    if (!formData.marital_status) {
      newErrors.marital_status = language === 'ar' ? 'الحالة الاجتماعية مطلوبة' : 'Marital status is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError(language === 'ar' ? 'يرجى اختيار صورة صالحة' : 'Please select a valid image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError(language === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' : 'Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      const response = await api.uploadAvatar(file);
      
      if (response.success) {
        setFormData(prev => ({
          ...prev,
          avatar_url: response.data.avatar_url
        }));
        showSuccess(language === 'ar' ? 'تم تحديث الصورة بنجاح' : 'Avatar updated successfully');
        await refreshProfile();
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في تحديث الصورة' : 'Failed to update avatar'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تحديث الصورة' : 'Failed to update avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showError(language === 'ar' ? 'يرجى تصحيح الأخطاء أولاً' : 'Please fix the errors first');
      return;
    }

    try {
      setLoading(true);
      const response = await api.updateProfile(formData);
      
      if (response.success) {
        showSuccess(language === 'ar' ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully');
        setEditing(false);
        await refreshProfile();
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في تحديث الملف الشخصي' : 'Failed to update profile'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تحديث الملف الشخصي' : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      country: profile?.country || '',
      birth_date: profile?.birth_date || '',
      zodiac_sign: profile?.zodiac_sign || '',
      gender: profile?.gender || '',
      marital_status: profile?.marital_status || '',
      bio: profile?.bio || '',
      avatar_url: profile?.avatar_url || ''
    });
    setErrors({});
    setEditing(false);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Profile Header */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-8 border border-white/10 text-center"
      >
        <div className="relative inline-block">
          {/* Avatar */}
          <div className="relative w-32 h-32 mx-auto">
            <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 p-1">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-900">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Upload Button */}
            <motion.label
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-br from-gold-500 to-yellow-500 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
            >
              {uploadingAvatar ? (
                <div className="animate-spin w-5 h-5 border-b-2 border-white rounded-full"></div>
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploadingAvatar}
              />
            </motion.label>
          </div>
          
          <h2 className="text-2xl font-bold text-white mt-4 mb-2">
            {profile?.first_name && profile?.last_name 
              ? `${profile.first_name} ${profile.last_name}`
              : (language === 'ar' ? 'عميل جديد' : 'New Client')
            }
          </h2>
          
          <div className="flex items-center justify-center space-x-2 text-gray-400">
            <Mail className="w-4 h-4" />
            <span>{profile?.email}</span>
            <Lock className="w-4 h-4 ml-2" />
          </div>
        </div>
      </motion.div>

      {/* Profile Form */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-8 border border-white/10"
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
          </h3>
          
          <div className="flex items-center space-x-3">
            {!editing ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
              </motion.button>
            ) : (
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إلغاء' : 'Cancel'}</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin w-4 h-4 border-b-2 border-white rounded-full"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{language === 'ar' ? 'حفظ' : 'Save'}</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'الاسم الأول *' : 'First Name *'}
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors ${
                  errors.first_name ? 'border-red-500' : 'border-white/20'
                }`}
                placeholder={language === 'ar' ? 'أدخل الاسم الأول' : 'Enter first name'}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white">
                {formData.first_name || (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
            )}
            {errors.first_name && (
              <p className="text-red-400 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.first_name}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'اسم العائلة *' : 'Last Name *'}
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors ${
                  errors.last_name ? 'border-red-500' : 'border-white/20'
                }`}
                placeholder={language === 'ar' ? 'أدخل اسم العائلة' : 'Enter last name'}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white">
                {formData.last_name || (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
            )}
            {errors.last_name && (
              <p className="text-red-400 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.last_name}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'رقم الهاتف *' : 'Phone Number *'}
            </label>
            {editing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors ${
                  errors.phone ? 'border-red-500' : 'border-white/20'
                }`}
                placeholder={language === 'ar' ? 'أدخل رقم الهاتف' : 'Enter phone number'}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white">
                {formData.phone || (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
            )}
            {errors.phone && (
              <p className="text-red-400 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'البلد *' : 'Country *'}
            </label>
            {editing ? (
              <select
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors ${
                  errors.country ? 'border-red-500' : 'border-white/20'
                }`}
              >
                <option value="">{language === 'ar' ? 'اختر البلد' : 'Select Country'}</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            ) : (
              <div className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white">
                {formData.country || (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
            )}
            {errors.country && (
              <p className="text-red-400 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.country}
              </p>
            )}
          </div>

          {/* Birth Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'تاريخ الميلاد *' : 'Birth Date *'}
            </label>
            {editing ? (
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleInputChange('birth_date', e.target.value)}
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors ${
                  errors.birth_date ? 'border-red-500' : 'border-white/20'
                }`}
              />
            ) : (
              <div className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white">
                {formData.birth_date ? new Date(formData.birth_date).toLocaleDateString() : (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
            )}
            {errors.birth_date && (
              <p className="text-red-400 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.birth_date}
              </p>
            )}
          </div>

          {/* Zodiac Sign */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'البرج *' : 'Zodiac Sign *'}
            </label>
            {editing ? (
              <select
                value={formData.zodiac_sign}
                onChange={(e) => handleInputChange('zodiac_sign', e.target.value)}
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors ${
                  errors.zodiac_sign ? 'border-red-500' : 'border-white/20'
                }`}
              >
                <option value="">{language === 'ar' ? 'اختر البرج' : 'Select Zodiac Sign'}</option>
                {zodiacSigns.map(sign => (
                  <option key={sign.value} value={sign.value}>{sign.label}</option>
                ))}
              </select>
            ) : (
              <div className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white">
                {zodiacSigns.find(sign => sign.value === formData.zodiac_sign)?.label || (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
            )}
            {errors.zodiac_sign && (
              <p className="text-red-400 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.zodiac_sign}
              </p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'الجنس *' : 'Gender *'}
            </label>
            {editing ? (
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors ${
                  errors.gender ? 'border-red-500' : 'border-white/20'
                }`}
              >
                <option value="">{language === 'ar' ? 'اختر الجنس' : 'Select Gender'}</option>
                {genders.map(gender => (
                  <option key={gender.value} value={gender.value}>{gender.label}</option>
                ))}
              </select>
            ) : (
              <div className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white">
                {genders.find(gender => gender.value === formData.gender)?.label || (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
            )}
            {errors.gender && (
              <p className="text-red-400 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.gender}
              </p>
            )}
          </div>

          {/* Marital Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'الحالة الاجتماعية *' : 'Marital Status *'}
            </label>
            {editing ? (
              <select
                value={formData.marital_status}
                onChange={(e) => handleInputChange('marital_status', e.target.value)}
                className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors ${
                  errors.marital_status ? 'border-red-500' : 'border-white/20'
                }`}
              >
                <option value="">{language === 'ar' ? 'اختر الحالة الاجتماعية' : 'Select Marital Status'}</option>
                {maritalStatuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            ) : (
              <div className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white">
                {maritalStatuses.find(status => status.value === formData.marital_status)?.label || (language === 'ar' ? 'غير محدد' : 'Not specified')}
              </div>
            )}
            {errors.marital_status && (
              <p className="text-red-400 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.marital_status}
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'نبذة شخصية' : 'Bio'}
          </label>
          {editing ? (
            <textarea
              rows={4}
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors resize-none"
              placeholder={language === 'ar' ? 'اكتب نبذة عن نفسك...' : 'Write something about yourself...'}
            />
          ) : (
            <div className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white min-h-[100px]">
              {formData.bio || (language === 'ar' ? 'لم يتم إضافة نبذة شخصية بعد' : 'No bio added yet')}
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-blue-300 font-medium mb-1">
                {language === 'ar' ? 'ملاحظة أمنية' : 'Security Notice'}
              </h4>
              <p className="text-blue-200 text-sm">
                {language === 'ar' 
                  ? 'لا يمكن تعديل عنوان البريد الإلكتروني بعد التفعيل. جميع المعلومات الأخرى قابلة للتعديل.'
                  : 'Email address cannot be changed after verification. All other information can be updated.'
                }
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ClientProfile; 