import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { 
  Star, 
  Sparkles, 
  Heart, 
  Eye, 
  Gem, 
  Zap,
  Clock,
  Users,
  ArrowRight,
  Crown,
  Moon,
  Sun
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import Button from '../components/Button';

const Services = () => {
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

  // Services data with enhanced cosmic styling
  const services = [
    {
      id: 'tarot',
      icon: <Gem className="w-8 h-8" />,
      title: language === 'ar' ? 'قراءة التاروت' : 'Tarot Reading',
      description: language === 'ar' ? 'اكتشف أسرار مستقبلك من خلال أوراق التاروت الصوفية' : 'Discover your future secrets through mystical tarot cards',
      price: language === 'ar' ? '150 ريال' : '$40',
      duration: language === 'ar' ? '45 دقيقة' : '45 minutes',
      gradient: 'from-purple-500 via-cosmic-600 to-blue-600'
    },
    {
      id: 'astrology',
      icon: <Star className="w-8 h-8" />,
      title: language === 'ar' ? 'علم التنجيم' : 'Astrology',
      description: language === 'ar' ? 'فهم شخصيتك ومصيرك من خلال النجوم والكواكب' : 'Understand your personality and destiny through stars and planets',
      price: language === 'ar' ? '200 ريال' : '$55',
      duration: language === 'ar' ? '60 دقيقة' : '60 minutes',
      gradient: 'from-gold-500 via-yellow-500 to-orange-500'
    },
    {
      id: 'numerology',
      icon: <Zap className="w-8 h-8" />,
      title: language === 'ar' ? 'علم الأرقام' : 'Numerology',
      description: language === 'ar' ? 'اكتشف المعاني الخفية وراء الأرقام في حياتك' : 'Discover hidden meanings behind numbers in your life',
      price: language === 'ar' ? '120 ريال' : '$30',
      duration: language === 'ar' ? '30 دقيقة' : '30 minutes',
      gradient: 'from-cyan-500 via-blue-500 to-purple-500'
    },
    {
      id: 'palmistry',
      icon: <Heart className="w-8 h-8" />,
      title: language === 'ar' ? 'قراءة الكف' : 'Palm Reading',
      description: language === 'ar' ? 'اقرأ خطوط كفك لتكشف رحلة حياتك' : 'Read your palm lines to reveal your life journey',
      price: language === 'ar' ? '100 ريال' : '$25',
      duration: language === 'ar' ? '30 دقيقة' : '30 minutes',
      gradient: 'from-pink-500 via-rose-500 to-red-500'
    },
    {
      id: 'crystal',
      icon: <Crown className="w-8 h-8" />,
      title: language === 'ar' ? 'قراءة الكريستال' : 'Crystal Reading',
      description: language === 'ar' ? 'استخدام طاقة الكريستال للكشف عن الحقائق الخفية' : 'Using crystal energy to reveal hidden truths',
      price: language === 'ar' ? '180 ريال' : '$45',
      duration: language === 'ar' ? '45 دقيقة' : '45 minutes',
      gradient: 'from-emerald-500 via-green-500 to-teal-500'
    },
    {
      id: 'dream',
      icon: <Moon className="w-8 h-8" />,
      title: language === 'ar' ? 'تفسير الأحلام' : 'Dream Interpretation',
      description: language === 'ar' ? 'فهم رسائل العقل الباطن من خلال أحلامك' : 'Understand subconscious messages through your dreams',
      price: language === 'ar' ? '130 ريال' : '$35',
      duration: language === 'ar' ? '40 دقيقة' : '40 minutes',
      gradient: 'from-indigo-500 via-purple-500 to-pink-500'
    }
  ];

  const features = [
    {
      icon: <Eye className="w-6 h-6" />,
      title: language === 'ar' ? 'رؤية واضحة' : 'Clear Vision',
      description: language === 'ar' ? 'نقدم رؤى واضحة ومفصلة' : 'We provide clear and detailed insights'
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
                {language === 'ar' ? 'خدماتنا الروحانية' : 'Our Spiritual Services'}
              </span>
            </motion.h1>

            <motion.p 
              className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed"
              variants={itemVariants}
            >
              {language === 'ar' 
                ? 'اكتشف مجموعة شاملة من الخدمات الروحانية المصممة لمساعدتك في رحلة اكتشاف الذات والمستقبل'
                : 'Discover a comprehensive range of spiritual services designed to help you on your journey of self-discovery and future exploration'
              }
            </motion.p>

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
                {language === 'ar' ? 'اختر خدمتك' : 'Choose Your Service'}
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {language === 'ar' 
                ? 'كل خدمة مصممة خصيصاً لتلبية احتياجاتك الروحانية الفريدة'
                : 'Each service is specially designed to meet your unique spiritual needs'
              }
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
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
                <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-white/10 hover:border-gold-400/50 transition-all duration-500 overflow-hidden h-full">
                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl`}></div>
                  
                  {/* Icon */}
                  <div className="relative z-10 mb-6">
                    <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${service.gradient} text-white shadow-xl`}>
                      {service.icon}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 space-y-4 flex-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-gold-300 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {service.description}
                    </p>
                    
                    {/* Price and Duration */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-700/50">
                      <div className="text-center">
                        <p className="text-gold-400 font-bold text-lg">{service.price}</p>
                        <p className="text-gray-500 text-xs">{language === 'ar' ? 'السعر' : 'Price'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-cosmic-400 font-semibold">{service.duration}</p>
                        <p className="text-gray-500 text-xs">{language === 'ar' ? 'المدة' : 'Duration'}</p>
                      </div>
                    </div>
                    
                    {/* Book Button */}
                    <div className="pt-4">
                      <Link to={`/services/${service.id}`}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button 
                            className="w-full bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-700 hover:to-purple-700 text-white border border-cosmic-400/50"
                          >
                            <span>{language === 'ar' ? 'احجز الآن' : 'Book Now'}</span>
                            <ArrowRight className="w-4 h-4 ml-2 rtl:ml-0 rtl:mr-2" />
                          </Button>
                        </motion.div>
                      </Link>
                    </div>
                  </div>

                  {/* Shine effect */}
                  <div className="absolute inset-0 -left-full group-hover:left-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-1000 transform skew-x-12"></div>
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
    </div>
  );
};

export default Services; 