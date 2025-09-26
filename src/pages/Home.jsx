import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../lib/api';
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
  Gem
} from 'lucide-react';

const Home = () => {
  const [dailyHoroscopes, setDailyHoroscopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  // Simulated values for missing contexts
  const language = 'en';
  const isAuthenticated = false;
  const profile = null;

  useEffect(() => {
    fetchDailyHoroscopes();
  }, []);

  const fetchDailyHoroscopes = async () => {
    try {
      const horoscopes = await api.dailyHoroscopes();
      setDailyHoroscopes(horoscopes);
    } catch (error) {
      console.error('Error fetching daily horoscopes:', error);
      setDailyHoroscopes([]);
    } finally {
      setLoading(false);
    }
  };


  // Animation variants with reduced motion support
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.3 } : {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.3 } : {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const floatVariants = {
    animate: shouldReduceMotion ? { y: 0 } : {
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
      title: 'Tarot Reading',
      description: 'Discover your future secrets through mystical tarot cards',
      gradient: 'from-purple-500 via-purple-600 to-blue-600'
    },
    {
      id: 'astrology',
      icon: <Star className="w-8 h-8" />,
      title: 'Astrology',
      description: 'Understand your personality and destiny through stars and planets',
      gradient: 'from-yellow-500 via-orange-500 to-red-500'
    },
    {
      id: 'numerology',
      icon: <Zap className="w-8 h-8" />,
      title: 'Numerology',
      description: 'Discover hidden meanings behind numbers in your life',
      gradient: 'from-cyan-500 via-blue-500 to-purple-500'
    },
    {
      id: 'palmistry',
      icon: <Heart className="w-8 h-8" />,
      title: 'Palm Reading',
      description: 'Read your palm lines to reveal your life journey',
      gradient: 'from-pink-500 via-rose-500 to-red-500'
    }
  ];

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Secure & Private',
      description: 'Complete privacy and data protection'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: '24/7 Available',
      description: 'Continuous service anytime'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Certified Experts',
      description: 'Professional and highly experienced readers'
    }
  ];

  const zodiacSigns = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];

  return (
    <div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-theme-card/80 backdrop-blur-lg border-b border-theme-cosmic/20 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold gradient-text flex items-center group">
            <Sparkles className="w-8 h-8 mr-2 text-gold-primary animate-pulse group-hover:rotate-12 transition-transform duration-300" />
            SAMIA TAROT
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/services"
              className="relative text-theme-secondary hover:text-gold-primary transition-colors duration-300 py-2 group"
            >
              Services
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-primary rounded-full group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              to="/horoscopes"
              className="relative text-theme-secondary hover:text-gold-primary transition-colors duration-300 py-2 group"
            >
              Horoscopes
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-primary rounded-full group-hover:w-full transition-all duration-300"></span>
            </Link>
            {!isAuthenticated ? (
              <Link
                to="/login"
                className="px-4 py-2 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Login
              </Link>
            ) : (
              <Link
                to="/dashboard"
                className="relative text-theme-secondary hover:text-gold-primary transition-colors duration-300 py-2 group"
              >
                Dashboard
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-primary rounded-full group-hover:w-full transition-all duration-300"></span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10"
      >
        {/* Hero Section */}
        <motion.section variants={itemVariants} className="section-spacing-lg">
          <div className="container">
            <div className="text-center max-w-5xl mx-auto">
              <motion.div
                variants={itemVariants}
                className="mb-12"
              >
                <div className="flex justify-center mb-8">
                  <motion.div
                    animate={shouldReduceMotion ? {} : {
                      rotate: 360,
                      scale: [1, 1.05, 1],
                    }}
                    transition={shouldReduceMotion ? {} : {
                      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                      scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="relative"
                  >
                    <Eye className="w-20 h-20 text-gold-primary drop-shadow-2xl" />
                    <div className="absolute inset-0 w-20 h-20 rounded-full bg-gold-primary opacity-30 blur-xl animate-pulse" />
                  </motion.div>
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 gradient-text leading-tight tracking-tight">
                  Unlock Your Cosmic Destiny
                </h1>

                <div className="w-24 h-1 bg-cosmic-gradient mx-auto mb-8 rounded-full shadow-theme-cosmic" />
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="mb-16 max-w-3xl mx-auto"
              >
                <p className="text-xl md:text-2xl text-theme-secondary mb-6 leading-relaxed font-light">
                  Professional spiritual guidance through ancient mystical arts
                </p>
                <p className="text-lg text-theme-muted leading-relaxed">
                  Discover personalized tarot readings, astrology insights, and cosmic wisdom tailored to your unique journey
                </p>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-lg mx-auto"
              >
                <Link
                  to="/services"
                  className="w-full sm:w-auto cta-primary"
                >
                  Get Your Reading
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>

                <Link
                  to="/horoscopes"
                  className="w-full sm:w-auto cta-secondary"
                >
                  Daily Horoscopes
                  <Sparkles className="ml-2 w-5 h-5" />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Services Preview */}
        <motion.section variants={itemVariants} className="section-spacing relative">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4">
                Our Mystical Services
              </h2>
              <div className="w-20 h-1 bg-cosmic-gradient mx-auto rounded-full shadow-theme-cosmic mb-6" />
              <p className="text-theme-secondary text-lg max-w-2xl mx-auto leading-relaxed">
                Discover ancient wisdom through personalized spiritual guidance and professional readings
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.slice(0, 4).map((service, index) => (
                <motion.div
                  key={service.id}
                  variants={itemVariants}
                  whileHover={{
                    y: -8,
                    transition: { type: "spring", stiffness: 400, damping: 25 }
                  }}
                  className="group relative"
                >
                  <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 text-center hover:border-gold-primary transition-all duration-300 shadow-theme-card hover:shadow-theme-gold relative overflow-hidden h-full">
                    {/* Background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />

                    {/* Icon */}
                    <div className="relative z-10 mb-6">
                      <div className={`inline-flex p-3 rounded-full bg-gradient-to-br ${service.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {React.cloneElement(service.icon, { className: "w-6 h-6 text-white" })}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      <h3 className="text-lg font-bold text-theme-primary mb-3 group-hover:text-gold-primary transition-colors duration-300">
                        {service.title}
                      </h3>
                      <p className="text-theme-secondary text-sm leading-relaxed mb-4 line-clamp-2">
                        {service.description}
                      </p>
                      <span className="inline-block text-xs text-theme-muted bg-theme-tertiary/20 px-3 py-1 rounded-full">
                        Available 24/7
                      </span>
                    </div>

                    {/* Hover effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gold-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA to full services */}
            <motion.div variants={itemVariants} className="text-center mt-12">
              <Link
                to="/services"
                className="cta-secondary"
              >
                View All Services
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </motion.section>

        {/* Daily Horoscopes Preview */}
        <motion.section variants={itemVariants} className="section-spacing relative bg-theme-secondary/5">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4">
                Today's Cosmic Messages
              </h2>
              <div className="w-20 h-1 bg-cosmic-gradient mx-auto rounded-full shadow-theme-cosmic mb-6" />
              <p className="text-theme-secondary text-lg max-w-2xl mx-auto leading-relaxed">
                {dailyHoroscopes.length > 0
                  ? `${dailyHoroscopes.length} cosmic insights reveal your destiny today`
                  : 'The celestial energies are gathering for today\'s revelations'
                }
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
                {zodiacSigns.slice(0, 6).map((sign) => (
                  <div key={sign} className="bg-theme-card backdrop-blur-sm border border-theme-cosmic rounded-xl p-4 animate-pulse">
                    <div className="h-12 w-12 bg-theme-tertiary rounded-full mx-auto mb-3"></div>
                    <div className="h-4 bg-theme-tertiary rounded mb-2"></div>
                    <div className="h-3 bg-theme-tertiary rounded w-3/4 mx-auto"></div>
                  </div>
                ))}
              </div>
            ) : dailyHoroscopes.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-4xl mx-auto mb-12">
                  {zodiacSigns.slice(0, 6).map((sign) => {
                    const horoscope = dailyHoroscopes.find(h => h.zodiac === sign);

                    return (
                      <motion.div
                        key={sign}
                        variants={itemVariants}
                        whileHover={{
                          y: -5,
                          transition: { type: "spring", stiffness: 400, damping: 25 }
                        }}
                        className="group bg-theme-card backdrop-blur-sm border border-theme-cosmic rounded-xl p-4 hover:border-gold-primary transition-all duration-300 shadow-theme-card hover:shadow-theme-gold cursor-pointer"
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">✨</div>
                          <h3 className="text-sm font-semibold text-theme-primary mb-2 group-hover:text-gold-primary transition-colors">
                            {sign}
                          </h3>
                          {horoscope ? (
                            <p className="text-theme-muted text-xs leading-relaxed line-clamp-3">
                              {horoscope.text_content?.slice(0, 60)}...
                            </p>
                          ) : (
                            <p className="text-theme-muted text-xs italic">
                              Coming soon...
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <motion.div variants={itemVariants} className="text-center">
                  <Link
                    to="/horoscopes"
                    className="cta-primary"
                  >
                    Read All Horoscopes
                    <Sparkles className="ml-2 w-4 h-4" />
                  </Link>
                </motion.div>
              </>
            ) : (
              <div className="text-center py-16 max-w-2xl mx-auto">
                <motion.div
                  variants={floatVariants}
                  animate="animate"
                  className="text-6xl mb-6 inline-block"
                >
                  🔮
                </motion.div>
                <h3 className="text-2xl font-bold gradient-text mb-4">
                  Cosmic Energies Gathering
                </h3>
                <p className="text-theme-secondary mb-8 leading-relaxed">
                  Our mystical readers are channeling today's celestial insights.
                  Return soon for personalized cosmic guidance.
                </p>
                <Link
                  to="/services"
                  className="cta-primary"
                >
                  Get Personal Reading
                  <Star className="ml-2 w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section variants={itemVariants} className="section-spacing relative">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="text-center p-8"
                >
                  <div className="inline-flex p-4 rounded-full bg-cosmic-gradient shadow-theme-cosmic mb-6">
                    {React.cloneElement(feature.icon, { className: "w-6 h-6 text-white" })}
                  </div>
                  <h3 className="text-xl font-bold text-theme-primary mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-theme-secondary">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default Home;