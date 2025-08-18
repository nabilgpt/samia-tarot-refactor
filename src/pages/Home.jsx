import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { 
  Star, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  Users, 
  Shield,
  Zap,
  Heart,
  Eye,
  Gem,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  LayoutDashboard,
  Crown,
  Settings,
  UserCheck,
  Monitor
} from 'lucide-react';
import Button from '../components/Button';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import ZodiacCardsGrid from '../components/Zodiac/ZodiacCardsGrid';

const Home = () => {
  const { t } = useTranslation();
  const { language } = useUI();
  const { isAuthenticated, profile } = useAuth();

  // Particle configuration for cosmic background
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

  // Services data with enhanced cosmic styling
  const services = [
    {
      id: 'tarot',
      icon: <Gem className="w-8 h-8" />,
      title: language === 'ar' ? 'قراءة التاروت' : 'Tarot Reading',
      description: language === 'ar' ? 'اكتشف أسرار مستقبلك من خلال أوراق التاروت الصوفية' : 'Discover your future secrets through mystical tarot cards',
      gradient: 'from-purple-500 via-cosmic-600 to-blue-600'
    },
    {
      id: 'astrology',
      icon: <Star className="w-8 h-8" />,
      title: language === 'ar' ? 'علم التنجيم' : 'Astrology',
      description: language === 'ar' ? 'فهم شخصيتك ومصيرك من خلال النجوم والكواكب' : 'Understand your personality and destiny through stars and planets',
      gradient: 'from-gold-500 via-yellow-500 to-orange-500'
    },
    {
      id: 'numerology',
      icon: <Zap className="w-8 h-8" />,
      title: language === 'ar' ? 'علم الأرقام' : 'Numerology',
      description: language === 'ar' ? 'اكتشف المعاني الخفية وراء الأرقام في حياتك' : 'Discover hidden meanings behind numbers in your life',
      gradient: 'from-cyan-500 via-blue-500 to-purple-500'
    },
    {
      id: 'palmistry',
      icon: <Heart className="w-8 h-8" />,
      title: language === 'ar' ? 'قراءة الكف' : 'Palm Reading',
      description: language === 'ar' ? 'اقرأ خطوط كفك لتكشف رحلة حياتك' : 'Read your palm lines to reveal your life journey',
      gradient: 'from-pink-500 via-rose-500 to-red-500'
    }
  ];

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: language === 'ar' ? 'آمن ومضمون' : 'Secure & Private',
      description: language === 'ar' ? 'خصوصية تامة وحماية معلوماتك' : 'Complete privacy and data protection'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: language === 'ar' ? 'متاح 24/7' : '24/7 Available',
      description: language === 'ar' ? 'خدمة متواصلة في أي وقت' : 'Continuous service anytime'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: language === 'ar' ? 'خبراء معتمدون' : 'Certified Experts',
      description: language === 'ar' ? 'قراء محترفون وذو خبرة عالية' : 'Professional and highly experienced readers'
    }
  ];

  // Dashboard configuration for different roles
  const getDashboardConfig = () => {
    if (!isAuthenticated || !profile?.role) return null;

    const dashboardConfigs = {
      super_admin: {
        name: language === 'ar' ? 'لوحة تحكم المدير العام' : 'Super Admin Dashboard',
        path: '/dashboard/super-admin',
        icon: <Crown className="w-8 h-8" />,
        gradient: 'from-purple-600 via-pink-600 to-red-600',
        description: language === 'ar' ? 'تحكم كامل في النظام والمنصة' : 'Complete system and platform control',
        priority: 1
      },
      admin: {
        name: language === 'ar' ? 'لوحة تحكم المدير' : 'Admin Dashboard',
        path: '/dashboard/admin',
        icon: <Settings className="w-8 h-8" />,
        gradient: 'from-red-600 via-orange-600 to-yellow-600',
        description: language === 'ar' ? 'إدارة النظام والمستخدمين' : 'System and user management',
        priority: 2
      },
      reader: {
        name: language === 'ar' ? 'لوحة تحكم القارئ' : 'Reader Dashboard',
        path: '/dashboard/reader',
        icon: <Eye className="w-8 h-8" />,
        gradient: 'from-purple-600 via-blue-600 to-cyan-600',
        description: language === 'ar' ? 'إدارة خدماتك وعملائك' : 'Manage your services and clients',
        priority: 3
      },
      monitor: {
        name: language === 'ar' ? 'لوحة المراقبة' : 'Monitor Dashboard',
        path: '/dashboard/monitor',
        icon: <Monitor className="w-8 h-8" />,
        gradient: 'from-green-600 via-teal-600 to-cyan-600',
        description: language === 'ar' ? 'مراقبة وتحليل النظام' : 'System monitoring and analytics',
        priority: 4
      },
      client: {
        name: language === 'ar' ? 'حسابي' : 'My Account',
        path: '/dashboard/client',
        icon: <UserCheck className="w-8 h-8" />,
        gradient: 'from-blue-600 via-indigo-600 to-purple-600',
        description: language === 'ar' ? 'حجوزاتك ومحفظتك' : 'Your bookings and wallet',
        priority: 5
      }
    };

    return dashboardConfigs[profile.role] || null;
  };

  const dashboardConfig = getDashboardConfig();

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Particle Background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={particlesConfig}
        className="absolute inset-0 z-0"
      />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Additional cosmic background effects */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cosmic-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <motion.div 
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="space-y-8">
            {/* Main headline with neon glow effect */}
            <motion.h1 
              className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight"
              variants={itemVariants}
            >
              <span className="block bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                {language === 'ar' ? 'اكتشف قدرك' : 'Discover Your Destiny'}
              </span>
              <span className="block mt-4 bg-gradient-to-r from-purple-400 via-pink-400 to-gold-400 bg-clip-text text-transparent">
                {language === 'ar' ? 'مع مدام سامية' : 'With Madame Samia'}
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed"
              variants={itemVariants}
            >
              {t('hero.subtitle')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12"
              variants={itemVariants}
            >
              <Link to="/services">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="xl" 
                    className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-gray-900 font-bold shadow-2xl shadow-gold-500/50 border-2 border-gold-400/50 animate-pulse-glow px-12 py-6 text-xl"
                  >
                    <Sparkles className="w-6 h-6 mr-3 rtl:mr-0 rtl:ml-3" />
                    {language === 'ar' ? 'ابدأ القراءة الآن' : 'Start Your Reading'}
                  </Button>
                </motion.div>
              </Link>
              
              <Link to="/services">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    size="xl"
                    className="border-2 border-cosmic-400/50 text-cosmic-300 hover:bg-cosmic-500/20 hover:border-cosmic-300 px-12 py-6 text-xl backdrop-blur-sm"
                  >
                    {language === 'ar' ? 'تعرف على خدماتنا' : 'Explore Services'}
                    <ArrowRight className="w-6 h-6 ml-3 rtl:ml-0 rtl:mr-3" />
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            {/* Features indicators */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto"
              variants={containerVariants}
            >
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  className="flex flex-col items-center space-y-3 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-gold-400/50 transition-all duration-300"
                >
                  <div className="p-3 rounded-xl bg-gradient-to-br from-gold-500/20 to-cosmic-500/20">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gold-300">{feature.title}</h3>
                  <p className="text-sm text-gray-400 text-center">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Floating elements */}
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

      {/* Dashboard Shortcuts Section - Only for logged-in users */}
      {isAuthenticated && dashboardConfig && (
        <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-gold-400 bg-clip-text text-transparent">
                  {language === 'ar' ? 'مرحباً بعودتك' : 'Welcome Back'}
                </span>
              </h2>
              <p className="text-lg text-gray-400">
                {language === 'ar' 
                  ? `مرحباً ${profile?.first_name || 'بك'}, يمكنك الوصول إلى لوحة التحكم الخاصة بك`
                  : `Hello ${profile?.first_name || 'there'}, access your dashboard quickly`
                }
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <Link to={dashboardConfig.path}>
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl border border-white/20 hover:border-gold-400/50 transition-all duration-500 overflow-hidden"
                >
                  {/* Cosmic Glow Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${dashboardConfig.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl`}></div>
                  
                  {/* Floating particles effect */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-4 right-8 w-16 h-16 bg-purple-500/30 rounded-full blur-xl animate-pulse"></div>
                    <div className="absolute bottom-6 left-6 w-12 h-12 bg-gold-500/30 rounded-full blur-lg animate-pulse delay-1000"></div>
                  </div>

                  <div className="relative z-10 flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8 rtl:space-x-reverse">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${dashboardConfig.gradient} flex items-center justify-center text-white shadow-2xl group-hover:shadow-purple-500/30 transition-all duration-500`}>
                        {dashboardConfig.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center md:text-left rtl:text-right">
                      <h3 className="text-2xl md:text-3xl font-bold text-white group-hover:text-gold-300 transition-colors duration-300 mb-2">
                        {dashboardConfig.name}
                      </h3>
                      <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300 text-lg">
                        {dashboardConfig.description}
                      </p>
                      <div className="mt-4 flex items-center justify-center md:justify-start rtl:justify-end">
                        <span className="text-sm text-purple-400 group-hover:text-purple-300 transition-colors flex items-center">
                          <LayoutDashboard className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                          {language === 'ar' ? 'انتقل إلى لوحة التحكم' : 'Go to Dashboard'}
                          <ArrowRight className="w-4 h-4 ml-2 rtl:ml-0 rtl:mr-2 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div className="flex-shrink-0">
                      <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 group-hover:border-purple-400/50 transition-all">
                        <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                          {profile?.role?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Shine effect */}
                  <div className="absolute inset-0 -left-full group-hover:left-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-1000 transform skew-x-12"></div>
                </motion.div>
              </Link>
            </motion.div>

            {/* Quick Stats for Super Admin */}
            {profile?.role === 'super_admin' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                {[
                  { label: language === 'ar' ? 'النظام' : 'System', value: '100%', color: 'green' },
                  { label: language === 'ar' ? 'المستخدمين' : 'Users', value: '2.1K', color: 'blue' },
                  { label: language === 'ar' ? 'الأمان' : 'Security', value: 'HIGH', color: 'purple' },
                  { label: language === 'ar' ? 'الأداء' : 'Performance', value: '98%', color: 'gold' }
                ].map((stat) => (
                  <motion.div
                    key={stat.label}
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-400/30 transition-all text-center"
                  >
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className={`text-lg font-bold ${
                      stat.color === 'green' ? 'text-green-400' :
                      stat.color === 'blue' ? 'text-blue-400' :
                      stat.color === 'purple' ? 'text-purple-400' :
                      'text-gold-400'
                    }`}>
                      {stat.value}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* Services Section */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cosmic-400 via-purple-400 to-gold-400 bg-clip-text text-transparent">
                {t('services.title')}
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {t('services.subtitle')}
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {services.map((service) => (
              <motion.div
                key={service.id}
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
                className="group relative"
              >
                <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-white/10 hover:border-gold-400/50 transition-all duration-500 overflow-hidden">
                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl`}></div>
                  
                  {/* Icon */}
                  <div className="relative z-10 mb-6">
                    <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${service.gradient} text-white shadow-xl`}>
                      {service.icon}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 space-y-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-gold-300 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  {/* Shine effect */}
                  <div className="absolute inset-0 -left-full group-hover:left-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-1000 transform skew-x-12"></div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA for services */}
          <motion.div 
            className="text-center mt-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <Link to="/services">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-700 hover:to-purple-700 text-white border-2 border-cosmic-400/50 shadow-2xl shadow-cosmic-500/30"
                >
                  {language === 'ar' ? 'عرض جميع الخدمات' : 'View All Services'}
                  <ArrowRight className="w-5 h-5 ml-3 rtl:ml-0 rtl:mr-3" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Daily Zodiac Section */}
      <ZodiacCardsGrid />

      {/* Testimonials Section */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
                {language === 'ar' ? 'آراء عملائنا' : 'Client Testimonials'}
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {language === 'ar' ? 'اكتشف تجارب عملائنا الحقيقية معنا' : 'Discover real experiences from our clients'}
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[1, 2, 3].map((index) => (
              <motion.div
                key={`testimonial-${index}`}
                variants={itemVariants}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="p-8 rounded-3xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-white/10 hover:border-gold-400/30 transition-all duration-500"
              >
                <div className="flex items-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={`testimonial-star-${index}-${i}`} className="w-5 h-5 text-gold-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  {language === 'ar' 
                    ? '"تجربة رائعة ودقيقة جداً، ساعدتني في فهم حياتي بشكل أفضل وأعطتني نظرة واضحة للمستقبل"'
                    : '"Amazing and very accurate experience, helped me understand my life better and gave me a clear vision of the future"'
                  }
                </p>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-cosmic-500 rounded-full flex items-center justify-center text-white font-bold">
                    {language === 'ar' ? 'ف' : 'F'}
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {language === 'ar' ? 'فاطمة أحمد' : 'Fatima Ahmed'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {language === 'ar' ? 'قراءة التاروت' : 'Tarot Reading'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto text-center"
        >
          <div className="relative p-16 rounded-3xl bg-gradient-to-br from-cosmic-900/50 to-purple-900/50 backdrop-blur-xl border border-cosmic-400/30 overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-cosmic-500/20 via-purple-500/20 to-gold-500/20 opacity-50"></div>
            
            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl md:text-6xl font-bold">
                <span className="bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
                  {language === 'ar' ? 'ابدأ رحلتك الروحية اليوم' : 'Start Your Spiritual Journey Today'}
                </span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                {language === 'ar' 
                  ? 'انضم إلى آلاف العملاء الذين اكتشفوا مستقبلهم واستكشفوا أسرار حياتهم معنا'
                  : 'Join thousands of clients who discovered their future and explored life\'s mysteries with us'
                }
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link to="/signup">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      size="xl"
                      className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-gray-900 font-bold shadow-2xl shadow-gold-500/50 px-12 py-6 text-xl"
                    >
                      <Eye className="w-6 h-6 mr-3 rtl:mr-0 rtl:ml-3" />
                      {language === 'ar' ? 'إنشاء حساب مجاني' : 'Create Free Account'}
                    </Button>
                  </motion.div>
                </Link>
                
                <Link to="/login">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      size="xl"
                      className="border-2 border-gold-400/50 text-gold-300 hover:bg-gold-500/20 hover:border-gold-300 px-12 py-6 text-xl backdrop-blur-sm"
                    >
                      {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
                      <ArrowRight className="w-6 h-6 ml-3 rtl:ml-0 rtl:mr-3" />
                    </Button>
                  </motion.div>
                </Link>
                
                <Link to="/readers">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      size="xl"
                      className="border-2 border-cosmic-400/50 text-cosmic-300 hover:bg-cosmic-500/20 hover:border-cosmic-300 px-12 py-6 text-xl backdrop-blur-sm"
                    >
                      {language === 'ar' ? 'تصفح القراء' : 'Browse Readers'}
                      <Users className="w-6 h-6 ml-3 rtl:ml-0 rtl:mr-3" />
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 px-4 sm:px-6 lg:px-8 z-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Logo and description */}
            <div className="col-span-1 md:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h3 className="text-2xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-gold-400 to-cosmic-400 bg-clip-text text-transparent">
                    {t('app.name')}
                  </span>
                </h3>
                <p className="text-gray-400 mb-6 max-w-md">
                  {language === 'ar' 
                    ? 'رفيقك الموثوق في الرحلة الروحانية لاكتشاف الذات واستكشاف أسرار المستقبل'
                    : 'Your trusted companion in the spiritual journey of self-discovery and exploring future mysteries'
                  }
                </p>
                <div className="flex space-x-4 rtl:space-x-reverse">
                  {[Facebook, Twitter, Instagram, Youtube].map((Icon, index) => (
                    <motion.a
                      key={`social-icon-${index}`}
                      href="#"
                      whileHover={{ scale: 1.2, rotate: 5 }}
                      className="p-2 rounded-xl bg-gradient-to-br from-cosmic-600/20 to-gold-600/20 border border-white/10 hover:border-gold-400/50 transition-all duration-300"
                    >
                      <Icon className="w-5 h-5 text-gold-400" />
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Quick Links */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <h4 className="text-lg font-semibold mb-4 text-gold-300">
                  {language === 'ar' ? 'روابط سريعة' : 'Quick Links'}
                </h4>
                <ul className="space-y-2">
                  {[
                    { label: language === 'ar' ? 'الرئيسية' : 'Home', href: '/' },
                    { label: language === 'ar' ? 'الخدمات' : 'Services', href: '/services' },
                    { label: language === 'ar' ? 'القراء' : 'Readers', href: '/readers' },
                    { label: language === 'ar' ? 'من نحن' : 'About', href: '/about' }
                  ].map((link) => (
                    <li key={link.href}>
                      <Link 
                        to={link.href}
                        className="text-gray-400 hover:text-gold-300 transition-colors duration-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Contact */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <h4 className="text-lg font-semibold mb-4 text-gold-300">
                  {language === 'ar' ? 'تواصل معنا' : 'Contact'}
                </h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li>{language === 'ar' ? 'الدعم: 24/7' : 'Support: 24/7'}</li>
                  <li>info@samia-tarot.com</li>
                  <li>+966 50 123 4567</li>
                </ul>
              </motion.div>
            </div>
          </div>

          {/* Copyright */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="pt-8 border-t border-white/10 text-center text-gray-400 text-sm"
          >
            <p>
              © 2024 {t('app.name')}. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.
            </p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
};

export default Home; 