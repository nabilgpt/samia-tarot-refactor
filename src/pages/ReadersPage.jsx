import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Particles from 'react-particles';
import { loadSlim } from 'tsparticles-slim';
import { Star, Clock, Users, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import EmergencyCallButton from '../components/EmergencyCallButton';

const ReadersPage = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { language } = useUI();
  const [readers, setReaders] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Mock data for readers
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setReaders([
        {
          id: 1,
          name: language === 'ar' ? 'سامية الأحمد' : 'Samia Ahmed',
          avatar: '/avatars/samia.jpg',
          rating: 4.9,
          experience: 15,
          specialties: language === 'ar' ? ['التاروت', 'علم الفلك', 'الأبراج'] : ['Tarot', 'Astrology', 'Zodiac'],
          isOnline: true,
          price: 50,
          reviews: 1250
        },
        {
          id: 2,
          name: language === 'ar' ? 'فاطمة العلي' : 'Fatima Ali',
          avatar: '/avatars/fatima.jpg',
          rating: 4.8,
          experience: 10,
          specialties: language === 'ar' ? ['قراءة الكف', 'الأحلام', 'الطاقة'] : ['Palm Reading', 'Dreams', 'Energy'],
          isOnline: false,
          price: 40,
          reviews: 890
        },
        {
          id: 3,
          name: language === 'ar' ? 'نور الدين' : 'Nour Aldeen',
          avatar: '/avatars/nour.jpg',
          rating: 4.7,
          experience: 8,
          specialties: language === 'ar' ? ['علم الأرقام', 'الروحانيات', 'التأمل'] : ['Numerology', 'Spirituality', 'Meditation'],
          isOnline: true,
          price: 35,
          reviews: 654
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [language]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white overflow-hidden" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={particlesConfig}
          className="absolute inset-0 z-0"
        />
        <div className="relative min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Particle Background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={particlesConfig}
        className="absolute inset-0 z-0"
      />

      {/* Emergency Call Button */}
      <EmergencyCallButton />
      
      {/* Main Section */}
      <section className="relative min-h-screen px-4 sm:px-6 lg:px-8 py-16">
        {/* Additional cosmic background effects */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cosmic-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Header */}
          <motion.div 
            className="text-center mb-16"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="flex justify-center mb-6">
              <motion.div 
                className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center shadow-2xl shadow-gold-500/50"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Sparkles className="w-8 h-8 text-gray-900" />
              </motion.div>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-6"
              variants={itemVariants}
            >
              <span className="bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
                {language === 'ar' ? 'قراؤنا المعتمدون' : 'Our Certified Readers'}
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-300 max-w-3xl mx-auto"
              variants={itemVariants}
            >
              {language === 'ar' ? 'اختر من بين أفضل القراء الروحانيين المعتمدين' : 'Choose from our finest certified spiritual readers'}
            </motion.p>
          </motion.div>

          {/* Readers Grid */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {readers.map((reader, index) => (
              <motion.div
                key={reader.id}
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
                className="group relative glassmorphism rounded-3xl p-6 shadow-cosmic hover:shadow-2xl hover:shadow-gold-500/20 transition-all duration-500 overflow-hidden"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 to-cosmic-500/10 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl"></div>
                
                {/* Reader Avatar */}
                <div className="relative z-10 text-center mb-6">
                  <div className="relative inline-block">
                    <motion.div 
                      className="w-24 h-24 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-2xl shadow-gold-500/50"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <span className="text-2xl font-bold text-gray-900">
                        {reader.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </motion.div>
                    {/* Online Status */}
                    <div className={`absolute bottom-2 ${language === 'ar' ? 'left-2' : 'right-2'} w-4 h-4 rounded-full border-2 border-gray-900 ${
                      reader.isOnline ? 'bg-green-400' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-gold-300 transition-colors">
                    {reader.name}
                  </h3>
                  <p className={`text-sm ${reader.isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                    {reader.isOnline ? 
                      (language === 'ar' ? 'متاح الآن' : 'Available Now') : 
                      (language === 'ar' ? 'غير متصل' : 'Offline')
                    }
                  </p>
                </div>

                {/* Reader Stats */}
                <div className="relative z-10 space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gold-400">
                      <Star className="w-4 h-4 mr-1 rtl:mr-0 rtl:ml-1 fill-current" />
                      <span className="text-sm font-medium">{reader.rating}</span>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <Users className="w-4 h-4 mr-1 rtl:mr-0 rtl:ml-1" />
                      <span className="text-sm">{reader.reviews} {language === 'ar' ? 'تقييم' : 'reviews'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-400">
                      <Clock className="w-4 h-4 mr-1 rtl:mr-0 rtl:ml-1" />
                      <span className="text-sm">{reader.experience} {language === 'ar' ? 'سنوات خبرة' : 'years exp'}</span>
                    </div>
                    <div className="text-gold-400 font-bold">
                      ${reader.price}/{language === 'ar' ? 'جلسة' : 'session'}
                    </div>
                  </div>
                </div>

                {/* Specialties */}
                <div className="relative z-10 mb-6">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'التخصصات' : 'Specialties'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {reader.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-cosmic-500/20 border border-cosmic-400/30 text-cosmic-300 text-xs rounded-full backdrop-blur-sm"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <motion.button
                  className={`relative z-10 w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center shadow-xl ${
                    reader.isOnline
                      ? 'bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-gray-900 shadow-gold-500/50'
                      : 'bg-gray-600/30 text-gray-400 cursor-not-allowed shadow-gray-500/20'
                  }`}
                  disabled={!reader.isOnline || !isAuthenticated}
                  whileHover={reader.isOnline ? { scale: 1.02 } : {}}
                  whileTap={reader.isOnline ? { scale: 0.98 } : {}}
                >
                  <MessageCircle className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  {reader.isOnline ? 
                    (language === 'ar' ? 'بدء القراءة' : 'Start Reading') : 
                    (language === 'ar' ? 'غير متصل' : 'Offline')
                  }
                </motion.button>

                {/* Shine effect */}
                <div className="absolute inset-0 -left-full group-hover:left-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-1000 transform skew-x-12"></div>
              </motion.div>
            ))}
          </motion.div>

          {/* Call to Action */}
          {!isAuthenticated && (
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="glassmorphism rounded-3xl p-8 shadow-cosmic max-w-2xl mx-auto">
                <motion.h3 
                  className="text-2xl font-bold bg-gradient-to-r from-gold-400 to-cosmic-400 bg-clip-text text-transparent mb-4"
                  whileInView={{ scale: [0.95, 1.05, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  {language === 'ar' ? 'ابدأ رحلتك الروحانية اليوم' : 'Start Your Spiritual Journey Today'}
                </motion.h3>
                <p className="text-gray-300 mb-6">
                  {language === 'ar' ? 
                    'سجل الآن للحصول على قراءة مجانية مع أول استشارة' : 
                    'Sign up now to get a free reading with your first consultation'
                  }
                </p>
                <motion.button 
                  className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-gray-900 px-8 py-3 rounded-lg font-bold shadow-2xl shadow-gold-500/50 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {language === 'ar' ? 'إنشاء حساب مجاناً' : 'Create Free Account'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ReadersPage; 