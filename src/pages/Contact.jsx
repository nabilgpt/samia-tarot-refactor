import React, { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Particles from 'react-particles';
import { loadSlim } from 'tsparticles-slim';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  MessageCircle,
  Star,
  Sparkles,
  Heart,
  Eye
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import Button from '../components/Button';

const Contact = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const contactInfo = [
    {
      icon: Phone,
      title: language === 'ar' ? 'الهاتف' : 'Phone',
      value: '+966 50 123 4567',
      description: language === 'ar' ? 'متاح 24/7' : 'Available 24/7',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: Mail,
      title: language === 'ar' ? 'البريد الإلكتروني' : 'Email',
      value: 'info@samia-tarot.com',
      description: language === 'ar' ? 'رد سريع خلال ساعة' : 'Quick response within 1 hour',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: MapPin,
      title: language === 'ar' ? 'الموقع' : 'Location',
      value: language === 'ar' ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia',
      description: language === 'ar' ? 'خدمة عبر الإنترنت' : 'Online service',
      gradient: 'from-purple-500 to-indigo-500'
    },
    {
      icon: Clock,
      title: language === 'ar' ? 'ساعات العمل' : 'Working Hours',
      value: language === 'ar' ? 'متاح دائماً' : 'Always Available',
      description: language === 'ar' ? 'خدمة 24/7' : '24/7 Service',
      gradient: 'from-gold-500 to-yellow-500'
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showSuccess(
        language === 'ar' 
          ? 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً'
          : 'Your message has been sent successfully! We will contact you soon'
      );
      
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      showError(
        language === 'ar' 
          ? 'حدث خطأ في إرسال الرسالة. يرجى المحاولة مرة أخرى'
          : 'An error occurred while sending the message. Please try again'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <MessageCircle className="w-10 h-10 text-white" />
            </motion.div>

            <motion.h1 
              className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight"
              variants={itemVariants}
            >
              <span className="block bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
              </span>
            </motion.h1>

            <motion.p 
              className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed"
              variants={itemVariants}
            >
              {language === 'ar' 
                ? 'نحن هنا لمساعدتك في رحلتك الروحانية. تواصل معنا في أي وقت للحصول على الإرشاد والدعم'
                : 'We are here to help you on your spiritual journey. Contact us anytime for guidance and support'
              }
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap justify-center gap-4"
            >
              {[Mail, Phone, MapPin, Clock].map((Icon, index) => (
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

      {/* Contact Info Section */}
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
                {language === 'ar' ? 'طرق التواصل' : 'Get In Touch'}
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {language === 'ar' 
                ? 'اختر الطريقة الأنسب لك للتواصل معنا'
                : 'Choose the most convenient way to contact us'
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
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
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
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-white/10 hover:border-gold-400/50 transition-all duration-500 overflow-hidden text-center">
                    {/* Glow effect on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${info.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl`}></div>
                    
                    {/* Icon */}
                    <div className="relative z-10 mb-6">
                      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${info.gradient} text-white shadow-xl`}>
                        <Icon className="w-8 h-8" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 space-y-4">
                      <h3 className="text-xl font-bold text-white group-hover:text-gold-300 transition-colors">
                        {info.title}
                      </h3>
                      <p className="text-gold-400 font-semibold">
                        {info.value}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {info.description}
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

      {/* Contact Form Section */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gold-400 via-cosmic-400 to-cyan-400 bg-clip-text text-transparent">
                {language === 'ar' ? 'أرسل رسالة' : 'Send Message'}
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {language === 'ar' 
                ? 'املأ النموذج أدناه وسنتواصل معك في أقرب وقت ممكن'
                : 'Fill out the form below and we will contact you as soon as possible'
              }
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-white/10 overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-cosmic-500/10 via-purple-500/10 to-gold-500/10 opacity-50"></div>
            
            <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gold-300 font-semibold mb-2">
                    {language === 'ar' ? 'الاسم' : 'Name'}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all duration-300"
                    placeholder={language === 'ar' ? 'اسمك الكامل' : 'Your full name'}
                  />
                </div>
                <div>
                  <label className="block text-gold-300 font-semibold mb-2">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all duration-300"
                    placeholder={language === 'ar' ? 'بريدك الإلكتروني' : 'Your email address'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gold-300 font-semibold mb-2">
                    {language === 'ar' ? 'رقم الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all duration-300"
                    placeholder={language === 'ar' ? 'رقم هاتفك' : 'Your phone number'}
                  />
                </div>
                <div>
                  <label className="block text-gold-300 font-semibold mb-2">
                    {language === 'ar' ? 'الموضوع' : 'Subject'}
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all duration-300"
                    placeholder={language === 'ar' ? 'موضوع الرسالة' : 'Message subject'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gold-300 font-semibold mb-2">
                  {language === 'ar' ? 'الرسالة' : 'Message'}
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-600 text-white placeholder-gray-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all duration-300 resize-none"
                  placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
                />
              </div>

              <div className="text-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="xl"
                    className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-gray-900 font-bold shadow-2xl shadow-gold-500/50 px-12 py-6 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                        <span>{language === 'ar' ? 'جاري الإرسال...' : 'Sending...'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Send className="w-6 h-6" />
                        <span>{language === 'ar' ? 'إرسال الرسالة' : 'Send Message'}</span>
                      </div>
                    )}
                  </Button>
                </motion.div>
              </div>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Contact; 