import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import ReaderLayout from '../../components/Layout/ReaderLayout.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import api from '../../services/frontendApi.js';
import WorkingHoursManager from '../../components/reader/WorkingHoursManager';
import RewardsDashboard from '../../components/Rewards/RewardsDashboard';
import ReaderSpreadsTab from './ReaderSpreadsTab.jsx';
import { 
  User, 
  Settings, 
  Calendar, 
  MessageCircle, 
  Phone, 
  Video, 
  Star, 
  Bell,
  BookOpen,
  Save,
  Edit3,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Users,
  DollarSign,
  Award,
  Sparkles
} from 'lucide-react';
import Button from '../../components/Button';
import BilingualBio from '../../components/UI/BilingualBio';

const ReaderDashboard = () => {
  // ✅ PURE LANGUAGE CONTEXT - No more useTranslation
  const { currentLanguage, direction, getTextAlign } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [readerData, setReaderData] = useState({
    bookings: [],
    services: [],
    conversations: [],
    notifications: [],
    stats: {},
    feedback: []
  });

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && tabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Update URL when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const urlParams = new URLSearchParams(location.search);
    urlParams.set('tab', tabId);
    navigate(`${location.pathname}?${urlParams.toString()}`, { replace: true });
  };

  // Particle configuration for cosmic background (EXACT SAME AS HOME.JSX)
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

  // Animation variants (EXACT SAME AS HOME.JSX)
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

  // Load reader data
  const loadReaderData = async () => {
    if (!user || profile?.role !== 'reader') return;
    
    try {
      setLoading(true);
      
      // Load reader's bookings
      const bookingsResult = await api.getReaderBookings(user.id);
      if (bookingsResult.success) {
        setReaderData(prev => ({ ...prev, bookings: bookingsResult.data }));
      }

      // Load other data...
      // TODO: Add other data loading

    } catch (error) {
      console.error('Error loading reader data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReaderData();
  }, [user, profile]);

  // Tab configuration with consistent language context
  const tabs = [
    { id: 'profile', name: currentLanguage === 'ar' ? 'الملف الشخصي' : 'Profile', icon: User },
    { id: 'services', name: currentLanguage === 'ar' ? 'الخدمات' : 'Services', icon: Settings },
    { id: 'spreads', name: currentLanguage === 'ar' ? 'إدارة الانتشارات' : 'Tarot Spreads', icon: Sparkles },
    { id: 'working-hours', name: currentLanguage === 'ar' ? 'ساعات العمل' : 'Working Hours', icon: Clock },
    { id: 'calendar', name: currentLanguage === 'ar' ? 'التقويم' : 'Calendar', icon: Calendar },
    { id: 'bookings', name: currentLanguage === 'ar' ? 'الحجوزات' : 'Bookings', icon: BookOpen },
    { id: 'chat', name: currentLanguage === 'ar' ? 'المحادثة' : 'Chat', icon: MessageCircle },
    { id: 'rewards', name: currentLanguage === 'ar' ? 'المكافآت' : 'Rewards', icon: Award },
    { id: 'calls', name: currentLanguage === 'ar' ? 'المكالمات' : 'Calls', icon: Phone },
    { id: 'notifications', name: currentLanguage === 'ar' ? 'الإشعارات' : 'Notifications', icon: Bell },
    { id: 'feedback', name: currentLanguage === 'ar' ? 'التقييمات' : 'Feedback', icon: Star }
  ];

    return (
    <ReaderLayout>
      {/* Particle Background - EXACT SAME AS HOME.JSX */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={particlesConfig}
        className="absolute inset-0 z-0"
      />

      {/* Additional cosmic background effects - EXACT SAME AS HOME.JSX */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cosmic-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        <motion.div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-12">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full mb-6"
              >
                <Sparkles className="w-10 h-10 text-white animate-spin-slow" />
              </motion.div>

              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">
                <span className="bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
                  {currentLanguage === 'ar' ? 
                    (profile?.gender === 'female' ? 'القارئة' : 'القارئ') : 
                    'Reader'
                  }
                </span>
              </h1>

              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                {currentLanguage === 'ar' ? 'إدارة خدماتك وحجوزاتك ومتابعة أدائك' : 'Manage your services, bookings, and track your performance'}
          </p>
        </div>
          </motion.div>

        {/* Quick Stats */}
          <motion.div variants={itemVariants} className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { 
                  icon: Calendar, 
                  label: currentLanguage === 'ar' ? 'حجوزات اليوم' : 'Today\'s Bookings', 
                  value: readerData.bookings.filter(b => 
                    new Date(b.scheduled_at).toDateString() === new Date().toDateString()
                  ).length,
                  gradient: 'from-blue-500 to-cyan-500'
                },
                { 
                  icon: Star, 
                  label: currentLanguage === 'ar' ? 'الجلسات المكتملة' : 'Completed Sessions', 
                  value: readerData.bookings.filter(b => b.status === 'completed').length,
                  gradient: 'from-green-500 to-emerald-500'
                },
                { 
                  icon: Settings, 
                  label: currentLanguage === 'ar' ? 'الخدمات النشطة' : 'Active Services', 
                  value: readerData.services.length,
                  gradient: 'from-purple-500 to-pink-500'
                },
                { 
                  icon: MessageCircle, 
                  label: currentLanguage === 'ar' ? 'المحادثات النشطة' : 'Active Chats', 
                  value: readerData.conversations.length,
                  gradient: 'from-orange-500 to-red-500'
                }
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="relative p-6 rounded-3xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-white/10 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cosmic-500/10 via-purple-500/10 to-gold-500/10 opacity-50"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl bg-gradient-to-r ${stat.gradient}`}>
                        <stat.icon className="w-6 h-6 text-white" />
              </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                        <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          </div>
              </div>
                </motion.div>
              ))}
              </div>
          </motion.div>

        {/* Tab Navigation */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="relative p-2 rounded-3xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-white/10">
              <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                    className={`relative flex items-center gap-2 px-4 py-3 rounded-2xl font-medium transition-all duration-300 ${
                    activeTab === tab.id
                        ? 'bg-gradient-to-r from-cosmic-600 to-purple-600 text-white shadow-lg shadow-cosmic-500/25'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.name}</span>
                </button>
              ))}
          </div>
            </div>
          </motion.div>

          {/* Tab Content */}
          <motion.div variants={itemVariants}>
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-white/10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cosmic-500/10 via-purple-500/10 to-gold-500/10 opacity-50"></div>
              <div className="relative z-10">
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'services' && <ServicesTab />}
                {activeTab === 'spreads' && <SpreadsTab />}
                {activeTab === 'working-hours' && <WorkingHoursManager />}
                {activeTab === 'calendar' && <CalendarTab />}
                {activeTab === 'bookings' && <BookingsTab />}
                            {activeTab === 'chat' && <ChatTab />}
            {activeTab === 'rewards' && <RewardsDashboard />}
            {activeTab === 'calls' && <CallsTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'feedback' && <FeedbackTab />}
          </div>
        </div>
          </motion.div>
        </motion.div>

        {/* Floating elements - EXACT SAME AS HOME.JSX */}
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
      </div>
    </ReaderLayout>
  );
};

// Tab Components
const ProfileTab = () => {
  const { profile, user } = useAuth();
  const { currentLanguage, direction, getTextAlign } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    country: profile?.country || '',
    date_of_birth: profile?.date_of_birth || '',
    zodiac: profile?.zodiac || '',
    maritalStatus: profile?.maritalStatus || '',
    bio_ar: profile?.bio_ar || '',
    bio_en: profile?.bio_en || ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setErrors({});

    try {
      const updates = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        country: formData.country,
        date_of_birth: formData.date_of_birth,
        zodiac: formData.zodiac,
        maritalStatus: formData.maritalStatus,
        bio_ar: formData.bio_ar,
        bio_en: formData.bio_en
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setSuccessMessage(currentLanguage === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Profile updated successfully');
      setIsEditing(false);
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.first_name?.trim()) {
      newErrors.first_name = currentLanguage === 'ar' ? 'الاسم الأول مطلوب' : 'First name is required';
    }
    if (!formData.last_name?.trim()) {
      newErrors.last_name = currentLanguage === 'ar' ? 'اسم العائلة مطلوب' : 'Last name is required';
    }
    if (!formData.phone?.trim()) {
      newErrors.phone = currentLanguage === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required';
    }
    if (!formData.country?.trim()) {
      newErrors.country = currentLanguage === 'ar' ? 'البلد مطلوب' : 'Country is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
          {currentLanguage === 'ar' ? 'الملف الشخصي' : 'Profile'}
        </h2>
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {currentLanguage === 'ar' ? 'حفظ' : 'Save'}
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-700 hover:to-purple-700"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              {currentLanguage === 'ar' ? 'تعديل' : 'Edit'}
            </Button>
          )}
        </div>
      </div>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-900/30 border border-green-400/30 rounded-lg backdrop-blur-xl"
        >
          <p className="text-green-300">{successMessage}</p>
        </motion.div>
      )}

      {errors.general && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-900/30 border border-red-400/30 rounded-lg backdrop-blur-xl"
        >
          <p className="text-red-300">{errors.general}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Avatar Section */}
        <div className="lg:col-span-1">
          <div className="relative p-6 rounded-3xl bg-gradient-to-br from-gray-900/30 to-gray-800/30 backdrop-blur-xl border border-white/10">
          <div className="text-center">
            <div className="relative inline-block">
                <div className="w-32 h-32 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full flex items-center justify-center text-4xl font-bold text-white">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center text-white hover:bg-gold-600 transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
              )}
            </div>
              <h3 className="mt-4 text-xl font-bold text-white">
              {profile?.first_name} {profile?.last_name}
              </h3>
              <p className="text-cosmic-400">
                {profile?.role === 'reader' ? (currentLanguage === 'ar' ? 'قارئ' : 'Reader') : profile?.role}
              </p>
              
              {/* Status Toggle */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-sm text-gray-400">{currentLanguage === 'ar' ? 'الحالة' : 'Status'}</span>
                <button
                  onClick={() => handleInputChange({ target: { name: 'status', value: formData.status === 'available' ? 'busy' : 'available' }})}
                  disabled={!isEditing}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    formData.status === 'available' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  } ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                >
                  {formData.status === 'available' ? (currentLanguage === 'ar' ? 'متاح' : 'Available') : (currentLanguage === 'ar' ? 'مشغول' : 'Busy')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gold-300">
                {currentLanguage === 'ar' ? 'الاسم الأول' : 'First Name'} *
              </label>
                <input
                  type="text"
                name="first_name"
                  value={formData.first_name}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                  !isEditing ? 'opacity-50 cursor-not-allowed' : ''
                } ${errors.first_name ? 'border-red-500' : ''}`}
                dir={direction}
              />
              {errors.first_name && (
                <p className="text-red-400 text-sm">{errors.first_name}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gold-300">
                {currentLanguage === 'ar' ? 'اسم العائلة' : 'Last Name'} *
              </label>
                <input
                  type="text"
                name="last_name"
                  value={formData.last_name}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                  !isEditing ? 'opacity-50 cursor-not-allowed' : ''
                } ${errors.last_name ? 'border-red-500' : ''}`}
                dir={direction}
              />
              {errors.last_name && (
                <p className="text-red-400 text-sm">{errors.last_name}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gold-300">
                {currentLanguage === 'ar' ? 'رقم الهاتف' : 'Phone'}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                  !isEditing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gold-300">
                {currentLanguage === 'ar' ? 'البلد' : 'Country'}
              </label>
                <input
                  type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                  !isEditing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                dir={direction}
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gold-300">
                {currentLanguage === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                  !isEditing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
          </div>

            {/* Zodiac Sign */}
              <div className="space-y-2">
              <label className="block text-sm font-medium text-gold-300">
                ⭐ {currentLanguage === 'ar' ? 'البرج' : 'Zodiac Sign'}
              </label>
                    <input
                type="text"
                name="zodiac"
                value={formData.zodiac}
                readOnly
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-cosmic-400 cursor-not-allowed"
                placeholder={currentLanguage === 'ar' ? 'يتم حساب البرج تلقائياً' : 'Zodiac calculated automatically'}
              />
            </div>

            {/* Marital Status */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gold-300">
                💍 {currentLanguage === 'ar' ? 'الوضع العائلي' : 'Marital Status'}
                  </label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                  !isEditing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                dir={direction}
              >
                <option value="">{currentLanguage === 'ar' ? 'اختر الوضع العائلي' : 'Select marital status'}</option>
                <option value="single">{currentLanguage === 'ar' ? 'أعزب/عزباء' : 'Single'}</option>
                <option value="married">{currentLanguage === 'ar' ? 'متزوج/متزوجة' : 'Married'}</option>
                <option value="engaged">{currentLanguage === 'ar' ? 'مخطوب/مخطوبة' : 'Engaged'}</option>
                <option value="relationship">{currentLanguage === 'ar' ? 'في علاقة' : 'In a Relationship'}</option>
                <option value="complicated">{currentLanguage === 'ar' ? 'الأمر معقد' : "It's Complicated"}</option>
              </select>
          </div>

            {/* Experience Years */}
              <div className="space-y-2">
              <label className="block text-sm font-medium text-gold-300">
                🎯 {currentLanguage === 'ar' ? 'سنوات الخبرة' : 'Experience Years'}
              </label>
                    <input
                type="number"
                name="experience_years"
                value={formData.experience_years}
                onChange={handleInputChange}
                disabled={!isEditing}
                min="0"
                max="50"
                className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                  !isEditing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            {/* Bio */}
            <div className="md:col-span-2 space-y-2">
              <BilingualBio
                profile={profile}
                isEditing={isEditing}
                onSave={async (bioData) => {
                  // Update formData with the new bio data
                  setFormData(prev => ({
                    ...prev,
                    bio_ar: bioData.bio_ar,
                    bio_en: bioData.bio_en
                  }));
                }}
                placeholder={{
                  ar: 'اكتب نبذة تعريفية عن نفسك وخبراتك في قراءة التاروت...',
                  en: 'Write a brief description about yourself and your tarot reading experience...'
                }}
                className="w-full"
                showLanguageToggle={true}
              />
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Services Tab Component
const ServicesTab = () => {
  const { user } = useAuth();
  const { currentLanguage, direction } = useLanguage();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const loadServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('reader_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceStatus = async (serviceId, isActive) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !isActive })
        .eq('id', serviceId);

      if (error) throw error;
      loadServices();
    } catch (error) {
      console.error('Error updating service status:', error);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const serviceTypes = [
    { id: 'tarot', name: currentLanguage === 'ar' ? 'قراءة التاروت' : 'Tarot Reading', icon: '🔮' },
    { id: 'astrology', name: currentLanguage === 'ar' ? 'علم الفلك' : 'Astrology', icon: '⭐' },
    { id: 'numerology', name: currentLanguage === 'ar' ? 'علم الأرقام' : 'Numerology', icon: '🔢' },
    { id: 'palmistry', name: currentLanguage === 'ar' ? 'قراءة الكف' : 'Palmistry', icon: '✋' },
    { id: 'dream_interpretation', name: currentLanguage === 'ar' ? 'تفسير الأحلام' : 'Dream Interpretation', icon: '💭' },
    { id: 'spiritual_guidance', name: currentLanguage === 'ar' ? 'الإرشاد الروحي' : 'Spiritual Guidance', icon: '🙏' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
          {currentLanguage === 'ar' ? 'الخدمات' : 'Services'}
        </h2>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-700 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {currentLanguage === 'ar' ? 'إضافة خدمة جديدة' : 'Add New Service'}
        </Button>
      </div>

      {services.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            🔮
          </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            {currentLanguage === 'ar' ? 'لا توجد خدمات' : 'No Services Yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {currentLanguage === 'ar' ? 'أضف خدمتك الأولى لتبدأ في استقبال الحجوزات' : 'Add your first service to start receiving bookings'}
          </p>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-700 hover:to-purple-700"
          >
            {currentLanguage === 'ar' ? 'ابدأ الآن' : 'Get Started'}
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="relative p-6 rounded-3xl bg-gradient-to-br from-gray-900/30 to-gray-800/30 backdrop-blur-xl border border-white/10 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cosmic-500/10 via-purple-500/10 to-gold-500/10 opacity-50"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-2xl flex items-center justify-center text-xl">
                      {serviceTypes.find(t => t.id === service.type)?.icon || '🔮'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{service.name}</h3>
                      <p className="text-sm text-gray-400">{service.type}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleServiceStatus(service.id, service.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        service.is_active 
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      {service.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingService(service)}
                      className="p-2 rounded-lg bg-cosmic-500/20 text-cosmic-400 hover:bg-cosmic-500/30 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                  {service.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gold-400">${service.price}</p>
                      <p className="text-xs text-gray-500">{currentLanguage === 'ar' ? 'لكل جلسة' : 'Per Session'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-cyan-400">{service.duration}min</p>
                      <p className="text-xs text-gray-500">{currentLanguage === 'ar' ? 'المدة' : 'Duration'}</p>
                    </div>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    service.is_active 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {service.is_active ? (currentLanguage === 'ar' ? 'نشط' : 'Active') : (currentLanguage === 'ar' ? 'غير نشط' : 'Inactive')}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Service Modal */}
      {(showAddModal || editingService) && (
        <ServiceModal
          service={editingService}
          onClose={() => {
            setShowAddModal(false);
            setEditingService(null);
          }}
          onSave={() => {
            loadServices();
            setShowAddModal(false);
            setEditingService(null);
          }}
        />
      )}
    </div>
  );
};

// Spreads Tab Component
const SpreadsTab = () => {
  return <ReaderSpreadsTab />;
};

// Service Modal Component
const ServiceModal = ({ service, onClose, onSave }) => {
  const { user } = useAuth();
  const { currentLanguage, direction } = useLanguage();
  const [formData, setFormData] = useState({
    name: service?.name || '',
    type: service?.type || '',
    description: service?.description || '',
    price: service?.price || '',
    duration: service?.duration || 30,
    is_active: service?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const serviceTypes = [
    { id: 'tarot', name: currentLanguage === 'ar' ? 'قراءة التاروت' : 'Tarot Reading' },
    { id: 'astrology', name: currentLanguage === 'ar' ? 'علم الفلك' : 'Astrology' },
    { id: 'numerology', name: currentLanguage === 'ar' ? 'علم الأرقام' : 'Numerology' },
    { id: 'palmistry', name: currentLanguage === 'ar' ? 'قراءة الكف' : 'Palmistry' },
    { id: 'dream_interpretation', name: currentLanguage === 'ar' ? 'تفسير الأحلام' : 'Dream Interpretation' },
    { id: 'spiritual_guidance', name: currentLanguage === 'ar' ? 'الإرشاد الروحي' : 'Spiritual Guidance' }
  ];

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        reader_id: user.id,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration)
      };

      let error;
      if (service) {
        const { error: updateError } = await supabase
          .from('services')
          .update(payload)
          .eq('id', service.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('services')
          .insert(payload);
        error = insertError;
      }

      if (error) throw error;
      onSave();
    } catch (error) {
      console.error('Error saving service:', error);
      setErrors({ general: error.message });
    } finally {
      setSaving(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = currentLanguage === 'ar' ? 'اسم الخدمة مطلوب' : 'Service name is required';
    if (!formData.type) newErrors.type = currentLanguage === 'ar' ? 'نوع الخدمة مطلوب' : 'Service type is required';
    if (!formData.price || formData.price <= 0) newErrors.price = currentLanguage === 'ar' ? 'السعر مطلوب' : 'Price is required';
    if (!formData.duration || formData.duration <= 0) newErrors.duration = currentLanguage === 'ar' ? 'المدة مطلوبة' : 'Duration is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl p-8 rounded-3xl bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gold-300">
            {service ? (currentLanguage === 'ar' ? 'تعديل الخدمة' : 'Edit Service') : (currentLanguage === 'ar' ? 'إضافة خدمة' : 'Add Service')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
          >
            ✕
        </button>
      </div>

        {errors.general && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-400/30 rounded-lg">
            <p className="text-red-300">{errors.general}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gold-300">
              {currentLanguage === 'ar' ? 'اسم الخدمة' : 'Service Name'} *
            </label>
                <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                errors.name ? 'border-red-500' : ''
              }`}
              dir={direction}
            />
            {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gold-300">
              {currentLanguage === 'ar' ? 'نوع الخدمة' : 'Service Type'} *
              </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                errors.type ? 'border-red-500' : ''
              }`}
            >
              <option value="">{currentLanguage === 'ar' ? 'اختر نوع الخدمة' : 'Select Service Type'}</option>
              {serviceTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            {errors.type && <p className="text-red-400 text-sm">{errors.type}</p>}
            </div>
            
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gold-300">
              {currentLanguage === 'ar' ? 'السعر' : 'Price'} *
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              min="0"
              step="0.01"
              className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                errors.price ? 'border-red-500' : ''
              }`}
            />
            {errors.price && <p className="text-red-400 text-sm">{errors.price}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gold-300">
              {currentLanguage === 'ar' ? 'المدة' : 'Duration'} ({currentLanguage === 'ar' ? 'دقيقة' : 'Minutes'}) *
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              min="15"
              max="120"
              step="15"
              className={`w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 ${
                errors.duration ? 'border-red-500' : ''
              }`}
            />
            {errors.duration && <p className="text-red-400 text-sm">{errors.duration}</p>}
            </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-gold-300">
              {currentLanguage === 'ar' ? 'الوصف' : 'Description'}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 transition-all duration-300 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 resize-none"
              dir={direction}
              placeholder={currentLanguage === 'ar' ? 'اكتب وصفاً للخدمة...' : 'Write a description for the service...'}
            />
          </div>
      </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-700 hover:to-purple-700"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {currentLanguage === 'ar' ? 'حفظ' : 'Save'}
          </Button>
    </div>
      </motion.div>
    </motion.div>
  );
};

// Bookings Tab Component
const BookingsTab = () => {
  const { user } = useAuth();
  const { currentLanguage, direction } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          profiles!bookings_user_id_fkey(first_name, last_name, avatar_url, phone),
          messages(id)
        `)
        .eq('reader_id', user.id)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;
      loadBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'confirmed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_progress': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'completed': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const isSessionTime = (booking) => {
    const now = new Date();
    const scheduledTime = new Date(booking.scheduled_at);
    const sessionEnd = new Date(scheduledTime.getTime() + (booking.service?.duration || 30) * 60000);
    return now >= scheduledTime && now <= sessionEnd;
  };

  const canStartSession = (booking) => {
    return booking.status === 'confirmed' && isSessionTime(booking);
  };

  if (loading) {
  return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
          {currentLanguage === 'ar' ? 'الحجوزات' : 'Bookings'}
        </h2>
        <div className="flex gap-2">
          {['all', 'pending', 'confirmed', 'in_progress', 'completed'].map(status => (
            <button
              key={`booking-status-${status}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === 'all' 
                  ? 'bg-cosmic-500/20 text-cosmic-400' 
                  : `${getStatusColor(status)} hover:opacity-80`
              }`}
            >
              {currentLanguage === 'ar' ? 
                (status === 'all' ? 'الكل' : 
                 status === 'pending' ? 'في الانتظار' : 
                 status === 'confirmed' ? 'مؤكد' : 
                 status === 'in_progress' ? 'جاري' : 
                 status === 'completed' ? 'مكتمل' : 
                 'ملغي') : 
                (status === 'all' ? 'All' : 
                 status === 'pending' ? 'Pending' : 
                 status === 'confirmed' ? 'Confirmed' : 
                 status === 'in_progress' ? 'In Progress' : 
                 status === 'completed' ? 'Completed' : 
                 'Cancelled')
              }
            </button>
          ))}
        </div>
      </div>

      {bookings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            📅
                  </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            {currentLanguage === 'ar' ? 'لا توجد حجوزات' : 'No Bookings Yet'}
          </h3>
          <p className="text-gray-500">
            {currentLanguage === 'ar' ? 'ستظهر الحجوزات هنا عند توفرها' : 'Bookings will appear here when available'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative p-6 rounded-3xl bg-gradient-to-br from-gray-900/30 to-gray-800/30 backdrop-blur-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cosmic-500/10 via-purple-500/10 to-gold-500/10 opacity-50"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Client Avatar */}
                    <div className="w-14 h-14 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full flex items-center justify-center text-xl font-bold text-white">
                      {booking.profiles?.first_name?.[0]}{booking.profiles?.last_name?.[0]}
                </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {booking.profiles?.first_name} {booking.profiles?.last_name}
                        </h3>
                                                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                          {currentLanguage === 'ar' ? 
                            (booking.status === 'pending' ? 'في الانتظار' : 
                             booking.status === 'confirmed' ? 'مؤكد' : 
                             booking.status === 'in_progress' ? 'جاري' : 
                             booking.status === 'completed' ? 'مكتمل' : 
                             'ملغي') : 
                            (booking.status === 'pending' ? 'Pending' : 
                             booking.status === 'confirmed' ? 'Confirmed' : 
                             booking.status === 'in_progress' ? 'In Progress' : 
                             booking.status === 'completed' ? 'Completed' : 
                             'Cancelled')
                          }
                        </div>
                        {canStartSession(booking) && (
                          <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse">
                            {currentLanguage === 'ar' ? 'جلسة مباشرة' : 'Session Live'}
                          </div>
          )}
        </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                <div>
                          <p className="text-sm text-gray-400 mb-1">{currentLanguage === 'ar' ? 'الخدمة' : 'Service'}</p>
                          <p className="text-white font-medium">{booking.service?.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">{currentLanguage === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</p>
                          <p className="text-white font-medium">
                            {new Date(booking.scheduled_at).toLocaleDateString()} • {new Date(booking.scheduled_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">{currentLanguage === 'ar' ? 'المدة' : 'Duration'}</p>
                          <p className="text-white font-medium">{booking.service?.duration || 30} {currentLanguage === 'ar' ? 'دقيقة' : 'minutes'}</p>
                        </div>
                      </div>

                                        {booking.notes && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-400 mb-1">{currentLanguage === 'ar' ? 'ملاحظات العميل' : 'Client Notes'}</p>
                          <p className="text-gray-300 text-sm italic">&ldquo;{booking.notes}&rdquo;</p>
                        </div>
                      )}
                </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 ml-4">
                    {booking.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-sm px-3 py-1"
                        >
                          {currentLanguage === 'ar' ? 'قبول' : 'Accept'}
                        </Button>
                        <Button
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-700 text-sm px-3 py-1"
                        >
                          {currentLanguage === 'ar' ? 'رفض' : 'Decline'}
                        </Button>
                      </>
                    )}

                    {booking.status === 'confirmed' && (
                      <>
                        {canStartSession(booking) ? (
                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-sm px-3 py-1"
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              {currentLanguage === 'ar' ? 'بدء المحادثة' : 'Start Chat'}
                            </Button>
                            {booking.service?.type !== 'text_only' && (
                              <Button
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm px-3 py-1"
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                {currentLanguage === 'ar' ? 'بدء المكالمة' : 'Start Call'}
                              </Button>
                            )}
            </div>
          ) : (
                          <div className="text-center">
                            <p className="text-xs text-gray-400 mb-1">{currentLanguage === 'ar' ? 'بداية الجلسة' : 'Session Starts'}</p>
                            <p className="text-xs text-cyan-400 font-medium">
                              {new Date(booking.scheduled_at).toLocaleTimeString()}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {booking.status === 'in_progress' && (
                      <div className="flex flex-col gap-2">
                        <Button
                          className="bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-700 hover:to-purple-700 text-sm px-3 py-1"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          {currentLanguage === 'ar' ? 'متابعة المحادثة' : 'Continue Chat'}
                        </Button>
                        <Button
                          onClick={() => updateBookingStatus(booking.id, 'completed')}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-sm px-3 py-1"
                        >
                          {currentLanguage === 'ar' ? 'إكمال الجلسة' : 'Complete Session'}
                        </Button>
                      </div>
                    )}

                    <Button
                      onClick={() => setSelectedBooking(booking)}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 text-sm px-3 py-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {currentLanguage === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                    </Button>
        </div>
      </div>

                {/* Progress indicator for in-progress sessions */}
                {booking.status === 'in_progress' && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                                        <div className="flex items-center gap-2 text-sm text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      {currentLanguage === 'ar' ? 'جلسة جارية' : 'Session In Progress'}
                      <div className="ml-auto text-xs text-gray-400">
                        {booking.messages?.length || 0} {currentLanguage === 'ar' ? 'رسالة' : 'messages'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
};

// Booking Details Modal Component
const BookingDetailsModal = ({ booking, onClose }) => {
  const { currentLanguage, direction } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl p-8 rounded-3xl bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gold-300">
            {currentLanguage === 'ar' ? 'تفاصيل الحجز' : 'Booking Details'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Client Information */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-800/30 to-gray-700/30 backdrop-blur-xl border border-white/10">
                        <h4 className="text-lg font-semibold text-cosmic-400 mb-3">{currentLanguage === 'ar' ? 'معلومات العميل' : 'Client Info'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">{currentLanguage === 'ar' ? 'الاسم' : 'Name'}</p>
                <p className="text-white font-medium">
                  {booking.profiles?.first_name} {booking.profiles?.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">{currentLanguage === 'ar' ? 'الهاتف' : 'Phone'}</p>
                <p className="text-white font-medium">{booking.profiles?.phone || (currentLanguage === 'ar' ? 'غير محدد' : 'Not Provided')}</p>
              </div>
            </div>
        </div>

          {/* Session Information */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-800/30 to-gray-700/30 backdrop-blur-xl border border-white/10">
                        <h4 className="text-lg font-semibold text-cosmic-400 mb-3">{currentLanguage === 'ar' ? 'معلومات الجلسة' : 'Session Info'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">{currentLanguage === 'ar' ? 'الخدمة' : 'Service'}</p>
                <p className="text-white font-medium">{booking.service?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">{currentLanguage === 'ar' ? 'النوع' : 'Type'}</p>
                <p className="text-white font-medium">{booking.service?.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">{currentLanguage === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</p>
                <p className="text-white font-medium">
                  {new Date(booking.scheduled_at).toLocaleDateString()} • {new Date(booking.scheduled_at).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">{currentLanguage === 'ar' ? 'السعر' : 'Price'}</p>
                <p className="text-white font-medium">${booking.service?.price}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-800/30 to-gray-700/30 backdrop-blur-xl border border-white/10">
              <h4 className="text-lg font-semibold text-cosmic-400 mb-3">{currentLanguage === 'ar' ? 'ملاحظات العميل' : 'Client Notes'}</h4>
              <p className="text-gray-300 italic">&ldquo;{booking.notes}&rdquo;</p>
            </div>
          )}

          {/* Payment Information */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-800/30 to-gray-700/30 backdrop-blur-xl border border-white/10">
            <h4 className="text-lg font-semibold text-cosmic-400 mb-3">{currentLanguage === 'ar' ? 'معلومات الدفع' : 'Payment Info'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">{currentLanguage === 'ar' ? 'حالة الدفع' : 'Payment Status'}</p>
                <p className="text-white font-medium">{booking.payment_status || (currentLanguage === 'ar' ? 'في الانتظار' : 'Pending')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">{currentLanguage === 'ar' ? 'حالة الحجز' : 'Booking Status'}</p>
                <p className="text-white font-medium">
                  {currentLanguage === 'ar' ? 
                    (booking.status === 'pending' ? 'في الانتظار' : 
                     booking.status === 'confirmed' ? 'مؤكد' : 
                     booking.status === 'in_progress' ? 'جاري' : 
                     booking.status === 'completed' ? 'مكتمل' : 
                     'ملغي') : 
                    (booking.status === 'pending' ? 'Pending' : 
                     booking.status === 'confirmed' ? 'Confirmed' : 
                     booking.status === 'in_progress' ? 'In Progress' : 
                     booking.status === 'completed' ? 'Completed' : 
                     'Cancelled')
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-700 hover:to-purple-700"
          >
            {currentLanguage === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Chat Tab Component
const ChatTab = () => {
  const { user } = useAuth();
  const { currentLanguage, direction } = useLanguage();
  const [activeChats, setActiveChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadActiveChats = async () => {
    setLoading(true);
    try {
      // Get bookings that are currently in progress or recent
      const { data: chats, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          profiles!bookings_user_id_fkey(first_name, last_name, avatar_url),
          messages!messages_booking_id_fkey(*)
        `)
        .eq('reader_id', user.id)
        .in('status', ['in_progress', 'confirmed'])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Filter only those with messages or active sessions
      const activeChatSessions = chats.filter(chat => 
        chat.messages?.length > 0 || 
        chat.status === 'in_progress' ||
        (chat.status === 'confirmed' && isSessionTime(chat))
      );

      setActiveChats(activeChatSessions || []);
    } catch (error) {
      console.error('Error loading active chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const isSessionTime = (booking) => {
    const now = new Date();
    const scheduledTime = new Date(booking.scheduled_at);
    const sessionEnd = new Date(scheduledTime.getTime() + (booking.service?.duration || 30) * 60000);
    return now >= scheduledTime && now <= sessionEnd;
  };

  useEffect(() => {
    loadActiveChats();
    
    // Set up real-time subscription for new messages
    const messagesSubscription = supabase
      .channel('reader_messages')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `booking_id=in.(${activeChats.map(c => c.id).join(',')})`
        }, 
        () => {
          loadActiveChats();
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [user.id]);

  if (loading) {
  return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
          {currentLanguage === 'ar' ? 'المحادثات' : 'Chat'}
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-400">{currentLanguage === 'ar' ? `${activeChats.length} محادثة مباشرة` : `${activeChats.length} Live Chats`}</span>
        </div>
      </div>

      {activeChats.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            💬
                    </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            {currentLanguage === 'ar' ? 'لا توجد محادثات نشطة' : 'No Active Chats'}
          </h3>
          <p className="text-gray-500">
            {currentLanguage === 'ar' ? 'ستظهر المحادثات هنا عند بدء الجلسات' : 'Chats will appear here when sessions start'}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Chat List */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gold-300 mb-4">
              {currentLanguage === 'ar' ? 'المحادثات النشطة' : 'Active Chats'}
            </h3>
            {activeChats.map((chat, index) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedChat(chat)}
                className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                  selectedChat?.id === chat.id
                    ? 'bg-gradient-to-br from-cosmic-500/20 to-purple-500/20 border border-cosmic-400/50'
                    : 'bg-gradient-to-br from-gray-900/30 to-gray-800/30 border border-white/10 hover:border-white/20'
                } backdrop-blur-xl`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full flex items-center justify-center text-lg font-bold text-white">
                      {chat.profiles?.first_name?.[0]}{chat.profiles?.last_name?.[0]}
                    </div>
                    {chat.status === 'in_progress' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse"></div>
                      )}
                    </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">
                      {chat.profiles?.first_name} {chat.profiles?.last_name}
                    </h4>
                    <p className="text-sm text-gray-400 truncate">
                      {chat.service?.name}
                    </p>
                  </div>
                </div>
              </motion.div>
              ))}
            </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            {selectedChat ? (
              <ChatInterface chat={selectedChat} onUpdate={loadActiveChats} />
            ) : (
              <div className="h-full flex items-center justify-center rounded-3xl bg-gradient-to-br from-gray-900/30 to-gray-800/30 backdrop-blur-xl border border-white/10">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">
                    {currentLanguage === 'ar' ? 'اختر محادثة' : 'Select a Chat'}
                  </h3>
                  <p className="text-gray-500">
                    {currentLanguage === 'ar' ? 'اختر محادثة من القائمة لبدء التفاعل' : 'Select a chat from the list to start interacting'}
                  </p>
                </div>
              </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
};

// Chat Interface Component
const ChatInterface = ({ chat, onUpdate }) => {
  const { user } = useAuth();
  const { currentLanguage, direction } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', chat.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          booking_id: chat.id,
          sender_id: user.id,
          content: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;
      
      setNewMessage('');
      loadMessages();
      onUpdate();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    loadMessages();
    
    // Set up real-time subscription for this chat
    const messagesSubscription = supabase
      .channel(`chat_${chat.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `booking_id=eq.${chat.id}`
        }, 
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [chat.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isSessionActive = () => {
    return chat.status === 'in_progress' || 
           (chat.status === 'confirmed' && isSessionTime(chat));
  };

  const isSessionTime = (booking) => {
    const now = new Date();
    const scheduledTime = new Date(booking.scheduled_at);
    const sessionEnd = new Date(scheduledTime.getTime() + (booking.service?.duration || 30) * 60000);
    return now >= scheduledTime && now <= sessionEnd;
  };

  return (
    <div className="h-full flex flex-col rounded-3xl bg-gradient-to-br from-gray-900/30 to-gray-800/30 backdrop-blur-xl border border-white/10 overflow-hidden">
              {/* Chat Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full flex items-center justify-center text-lg font-bold text-white">
              {chat.profiles?.first_name?.[0]}{chat.profiles?.last_name?.[0]}
                  </div>
                  <div>
              <h3 className="text-lg font-semibold text-white">
                {chat.profiles?.first_name} {chat.profiles?.last_name}
              </h3>
              <p className="text-sm text-gray-400">{chat.service?.name}</p>
                  </div>
                </div>

          <div className="flex items-center gap-3">
            {isSessionActive() && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                {currentLanguage === 'ar' ? 'جلسة نشطة' : 'Session Active'}
              </div>
            )}
            <button className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors">
              <Video className="w-4 h-4" />
                </button>
          </div>
        </div>
              </div>

      {/* Messages */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {currentLanguage === 'ar' ? 'لا توجد رسائل' : 'No messages yet'}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  message.sender_id === user.id
                    ? 'bg-gradient-to-r from-cosmic-600 to-purple-600 text-white'
                    : 'bg-white/10 text-white border border-white/20'
                }`}
                dir={direction}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-6 border-t border-white/10">
        {isSessionActive() ? (
          <div className="flex gap-3">
            <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={currentLanguage === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
              className="flex-1 px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400"
              rows={2}
              dir={direction}
            />
                    <button
                      onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="px-6 py-3 bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                currentLanguage === 'ar' ? 'إرسال' : 'Send'
              )}
                    </button>
                  </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm mb-2">
              {currentLanguage === 'ar' ? 'الجلسة غير نشطة' : 'Session not active'}
            </p>
            <p className="text-xs text-gray-500">
              {currentLanguage === 'ar' ? 'وقت الجلسة' : 'Session time'}: {new Date(chat.scheduled_at).toLocaleString()}
            </p>
            </div>
          )}
        </div>
      </div>
  );
};

// Other tab components
const CalendarTab = () => {
  const { currentLanguage } = useLanguage();
  
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
        {currentLanguage === 'ar' ? 'التقويم' : 'Calendar'}
      </h2>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
          📅
        </div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          {currentLanguage === 'ar' ? 'عرض التقويم قريباً' : 'Calendar View Coming Soon'}
        </h3>
        <p className="text-gray-500">
          {currentLanguage === 'ar' ? 'تكامل تقويم متقدم لإدارة الحجوزات' : 'Advanced calendar integration for booking management'}
        </p>
      </motion.div>
    </div>
  );
};

const CallsTab = () => {
  const { currentLanguage } = useLanguage();
  
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
        {currentLanguage === 'ar' ? 'المكالمات' : 'Calls'}
      </h2>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
          📞
        </div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          {currentLanguage === 'ar' ? 'المكالمات الصوتية والمرئية' : 'Voice & Video Calls'}
        </h3>
        <p className="text-gray-500">
          {currentLanguage === 'ar' ? 'تكامل WebRTC للجلسات الصوتية والمرئية السلسة' : 'WebRTC integration for seamless audio/video sessions'}
        </p>
      </motion.div>
    </div>
  );
};

const NotificationsTab = () => {
  const { currentLanguage } = useLanguage();
  
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
        {currentLanguage === 'ar' ? 'الإشعارات' : 'Notifications'}
      </h2>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
          🔔
        </div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          {currentLanguage === 'ar' ? 'إشعارات الإدارة' : 'Admin Notifications'}
        </h3>
        <p className="text-gray-500">
          {currentLanguage === 'ar' ? 'إشعارات فورية من الإدارة وتحديثات النظام' : 'Real-time notifications from admins and system updates'}
        </p>
      </motion.div>
    </div>
  );
};

const FeedbackTab = () => {
  const { currentLanguage } = useLanguage();
  
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
        {currentLanguage === 'ar' ? 'التقييمات' : 'Feedback'}
      </h2>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
          ⭐
        </div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          {currentLanguage === 'ar' ? 'تقييمات ومراجعات العملاء' : 'Client Feedback & Reviews'}
        </h3>
        <p className="text-gray-500">
          {currentLanguage === 'ar' ? 'عرض التقييمات والشهادات من عملائك' : 'View ratings and testimonials from your clients'}
        </p>
      </motion.div>
    </div>
  );
};

export default ReaderDashboard; 