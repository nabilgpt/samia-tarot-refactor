import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { 
  Star, 
  Sparkles, 
  Heart, 
  Eye, 
  Gem, 
  Users, 
  Award, 
  Clock,
  Shield,
  Zap
} from 'lucide-react';
import { useUI } from '../context/UIContext';

const About = () => {
  const { t } = useTranslation();
  const { language } = useUI();

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

  const features = [
    {
      icon: Star,
      title: language === 'ar' ? 'خبرة عميقة' : 'Deep Expertise',
      description: language === 'ar' 
        ? 'أكثر من 15 عاماً من الخبرة في قراءة التاروت والعلوم الروحانية'
        : 'Over 15 years of experience in tarot reading and spiritual sciences',
      gradient: 'from-gold-500 to-yellow-500'
    },
    {
      icon: Heart,
      title: language === 'ar' ? 'رعاية شخصية' : 'Personal Care',
      description: language === 'ar' 
        ? 'نهتم بكل عميل كفرد فريد له احتياجاته الخاصة'
        : 'We care for each client as a unique individual with special needs',
      gradient: 'from-pink-500 to-rose-500'
    },
    {
      icon: Eye,
      title: language === 'ar' ? 'رؤية واضحة' : 'Clear Vision',
      description: language === 'ar' 
        ? 'نقدم رؤى واضحة ومفصلة لمساعدتك في اتخاذ القرارات الصحيحة'
        : 'We provide clear and detailed insights to help you make the right decisions',
      gradient: 'from-purple-500 to-indigo-500'
    },
    {
      icon: Shield,
      title: language === 'ar' ? 'سرية تامة' : 'Complete Privacy',
      description: language === 'ar' 
        ? 'جميع جلساتك محمية بأعلى مستويات الأمان والخصوصية'
        : 'All your sessions are protected with the highest levels of security and privacy',
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  const stats = [
    {
      number: '10,000+',
      label: language === 'ar' ? 'عميل سعيد' : 'Happy Clients',
      icon: Users
    },
    {
      number: '50,000+',
      label: language === 'ar' ? 'جلسة مكتملة' : 'Sessions Completed',
      icon: Clock
    },
    {
      number: '98%',
      label: language === 'ar' ? 'معدل الرضا' : 'Satisfaction Rate',
      icon: Award
    },
    {
      number: '24/7',
      label: language === 'ar' ? 'متاح دائماً' : 'Always Available',
      icon: Zap
    }
  ];

  const values = [
    {
      title: language === 'ar' ? 'الأصالة' : 'Authenticity',
      description: language === 'ar' 
        ? 'نؤمن بالصدق والشفافية في كل ما نقدمه'
        : 'We believe in honesty and transparency in everything we offer'
    },
    {
      title: language === 'ar' ? 'التعاطف' : 'Empathy',
      description: language === 'ar' 
        ? 'نتفهم مشاعرك ونقدر ظروفك الشخصية'
        : 'We understand your feelings and appreciate your personal circumstances'
    },
    {
      title: language === 'ar' ? 'الحكمة' : 'Wisdom',
      description: language === 'ar' 
        ? 'نجمع بين المعرفة القديمة والفهم الحديث'
        : 'We combine ancient knowledge with modern understanding'
    },
    {
      title: language === 'ar' ? 'التطور' : 'Growth',
      description: language === 'ar' 
        ? 'نساعدك على النمو والتطور الشخصي'
        : 'We help you grow and develop personally'
    }
  ];

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
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="space-y-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full mb-8"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>

            <motion.h1 
              className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight"
              variants={itemVariants}
            >
              <span className="block bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                {language === 'ar' ? 'من نحن' : 'About Us'}
              </span>
            </motion.h1>

            <motion.p 
              className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed"
              variants={itemVariants}
            >
              {language === 'ar' 
                ? 'نحن فريق من الخبراء الروحانيين المتخصصين في قراءة التاروت والعلوم الفلكية، نقدم لك الإرشاد والبصيرة لتجد طريقك في الحياة'
                : 'We are a team of spiritual experts specialized in tarot reading and astrological sciences, providing you with guidance and insight to find your path in life'
              }
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap justify-center gap-4"
            >
              {[Star, Heart, Eye, Gem].map((Icon, index) => (
                <motion.div
                  key={index}
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    delay: index * 0.5,
                    ease: "easeInOut"
                  }}
                  className="w-12 h-12 bg-gradient-to-br from-cosmic-500/20 to-gold-500/20 rounded-lg flex items-center justify-center border border-gold-400/30"
                >
                  <Icon className="w-6 h-6 text-gold-400" />
                </motion.div>
              ))}
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

      {/* Features Section */}
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
                {language === 'ar' ? 'ما يميزنا' : 'What Makes Us Special'}
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {language === 'ar' 
                ? 'نجمع بين الحكمة القديمة والتقنيات الحديثة لنقدم لك أفضل تجربة روحانية'
                : 'We combine ancient wisdom with modern techniques to provide you with the best spiritual experience'
              }
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
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
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl`}></div>
                    
                    {/* Icon */}
                    <div className="relative z-10 mb-6">
                      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-xl`}>
                        <Icon className="w-8 h-8" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 space-y-4">
                      <h3 className="text-xl font-bold text-white group-hover:text-gold-300 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>

                    {/* Shine effect */}
                    <div className="absolute inset-0 -left-full group-hover:left-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-1000 transform skew-x-12"></div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ y: -10, transition: { duration: 0.3 } }}
                  className="text-center p-8 rounded-3xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-white/10 hover:border-gold-400/30 transition-all duration-500"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cosmic-500 to-gold-500 rounded-full mb-6">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-gold-400 mb-2">
                    {stat.number}
                  </h3>
                  <p className="text-gray-400">
                    {stat.label}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
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
                {language === 'ar' ? 'قيمنا' : 'Our Values'}
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {language === 'ar' 
                ? 'القيم التي نؤمن بها وتوجه عملنا في خدمتكم'
                : 'The values we believe in and that guide our work in serving you'
              }
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {values.map((value, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="p-8 rounded-3xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-white/10 hover:border-gold-400/30 transition-all duration-500"
              >
                <h3 className="text-2xl font-bold text-gold-400 mb-4">
                  {value.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {value.description}
                </p>
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
                  {language === 'ar' ? 'ابدأ رحلتك معنا' : 'Start Your Journey With Us'}
                </span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                {language === 'ar' 
                  ? 'اكتشف ما يخبئه لك المستقبل واحصل على الإرشاد الذي تحتاجه'
                  : 'Discover what the future holds for you and get the guidance you need'
                }
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default About; 