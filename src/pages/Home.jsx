import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../lib/api';
import {
  Star,
  Sparkles,
  ArrowRight,
  Shield,
  Lock,
  CreditCard,
  Zap,
  Heart,
  Gem
} from 'lucide-react';

const Home = () => {
  const [dailyHoroscopes, setDailyHoroscopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    fetchDailyHoroscopes();
  }, []);

  const fetchDailyHoroscopes = async () => {
    try {
      const horoscopes = await api.getDailyHoroscopes();
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
        staggerChildren: 0.1
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

  // Trust signals data
  const trustSignals = [
    {
      icon: <Lock className="w-5 h-5" />,
      text: "Private Audio"
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      text: "Secure Payments"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      text: "18+ Only"
    }
  ];

  // Featured services for teaser
  const featuredServices = [
    {
      id: 'tarot',
      title: 'Tarot Reading',
      description: 'Discover your future through mystical tarot cards',
      price: 25.00,
      icon: <Gem className="w-8 h-8" />,
      gradient: 'from-purple-500 via-purple-600 to-blue-600'
    },
    {
      id: 'astrology',
      title: 'Astrology Analysis',
      description: 'Understand your destiny through stars and planets',
      price: 45.00,
      icon: <Star className="w-8 h-8" />,
      gradient: 'from-yellow-500 via-orange-500 to-red-500'
    },
    {
      id: 'numerology',
      title: 'Numerology Reading',
      description: 'Unlock your life path through sacred numbers',
      price: 35.00,
      icon: <Zap className="w-8 h-8" />,
      gradient: 'from-cyan-500 via-blue-500 to-purple-500'
    }
  ];

  // Zodiac signs for empty state
  const zodiacSigns = [
    { name: 'Aries', symbol: '♈', icon: '🐏' },
    { name: 'Taurus', symbol: '♉', icon: '🐂' },
    { name: 'Gemini', symbol: '♊', icon: '👯' },
    { name: 'Cancer', symbol: '♋', icon: '🦀' },
    { name: 'Leo', symbol: '♌', icon: '🦁' },
    { name: 'Virgo', symbol: '♍', icon: '👸' },
    { name: 'Libra', symbol: '♎', icon: '⚖️' },
    { name: 'Scorpio', symbol: '♏', icon: '🦂' },
    { name: 'Sagittarius', symbol: '♐', icon: '🏹' },
    { name: 'Capricorn', symbol: '♑', icon: '🐐' },
    { name: 'Aquarius', symbol: '♒', icon: '🏺' },
    { name: 'Pisces', symbol: '♓', icon: '🐟' }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative z-10"
    >
      {/* Hero Section */}
      <motion.section variants={itemVariants} className="py-12 md:py-20">
        <div className="container">
          <div className="text-center space-y-8">
            {/* Hero Content */}
            <motion.div variants={itemVariants} className="space-y-6">
              <h1 className="fluid-heading-xl font-bold gradient-text content-narrow">
                Unlock Your Cosmic Destiny
              </h1>
              <p className="fluid-text-lg text-theme-secondary content-readable">
                Discover the mysteries of your future through ancient wisdom and modern insight.
                Connect with certified readers for personalized guidance.
              </p>
            </motion.div>

            {/* Hero CTAs */}
            <motion.div variants={itemVariants} className="button-group-mobile touch-target-large">
              <Link
                to="/services"
                className="btn-base btn-primary group"
              >
                <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                Get Your Reading
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link
                to="/horoscopes"
                className="btn-base btn-secondary group"
              >
                <Star className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                Daily Horoscopes
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </motion.div>

            {/* Trust Signals */}
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 md:gap-6 max-w-md mx-auto pt-4">
              {trustSignals.map((signal, index) => (
                <div key={index} className="flex flex-col items-center space-y-2 text-center">
                  <div className="text-gold-primary">
                    {signal.icon}
                  </div>
                  <span className="text-sm font-medium text-theme-secondary">{signal.text}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Daily Horoscopes Preview */}
      <motion.section variants={itemVariants} className="py-12 md:py-16">
        <div className="container">
          <div className="text-center space-y-6 mb-12">
            <h2 className="fluid-heading-lg font-bold gradient-text">
              Today's Cosmic Guidance
            </h2>
            <p className="fluid-text-base text-theme-secondary content-narrow">
              Discover what the stars have in store for you today
            </p>
          </div>

          {loading ? (
            <div className="grid-horoscope max-w-4xl mx-auto">
              {Array(6).fill(0).map((_, index) => (
                <div key={index} className="skeleton-card skeleton-horoscope">
                  <div className="skeleton skeleton-horoscope-icon"></div>
                  <div className="skeleton skeleton-horoscope-title"></div>
                  <div className="skeleton skeleton-horoscope-text"></div>
                  <div className="skeleton skeleton-horoscope-text"></div>
                </div>
              ))}
            </div>
          ) : dailyHoroscopes.length > 0 ? (
            <div className="grid-horoscope max-w-4xl mx-auto">
              {dailyHoroscopes.slice(0, 6).map((horoscope) => (
                <motion.div
                  key={horoscope.zodiac}
                  variants={itemVariants}
                  className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-lg p-4 hover:border-gold-primary transition-all duration-300 group aspect-square flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2"
                  tabIndex="0"
                >
                  <div className="text-center space-y-2">
                    <div className="text-2xl">{zodiacSigns.find(z => z.name === horoscope.zodiac)?.icon || '⭐'}</div>
                    <h3 className="font-semibold text-theme-primary text-sm">{horoscope.zodiac}</h3>
                    <p className="text-xs text-theme-secondary line-clamp-2 leading-relaxed">{horoscope.preview || 'Cosmic energies align for you today...'}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid-horoscope max-w-4xl mx-auto">
              {zodiacSigns.map((sign) => (
                <motion.div
                  key={sign.name}
                  variants={itemVariants}
                  className="bg-theme-card/50 backdrop-blur-lg border border-theme-cosmic/50 rounded-lg p-4 opacity-50 hover:opacity-75 transition-all duration-300 aspect-square flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-cosmic focus-visible:ring-offset-2"
                  tabIndex="0"
                >
                  <div className="text-center space-y-2">
                    <div className="text-2xl">{sign.icon}</div>
                    <h3 className="font-medium text-theme-primary text-xs">{sign.name}</h3>
                    <p className="text-xs text-theme-muted">Coming soon...</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <Link
              to="/horoscopes"
              className="inline-flex items-center text-theme-secondary hover:text-gold-primary transition-colors duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2"
            >
              View All Horoscopes
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Services Teaser */}
      <motion.section variants={itemVariants} className="py-12 md:py-16">
        <div className="container">
          <div className="text-center space-y-6 mb-12">
            <h2 className="fluid-heading-lg font-bold gradient-text">
              Spiritual Services
            </h2>
            <p className="fluid-text-base text-theme-secondary content-readable">
              Choose from our range of mystical readings and spiritual guidance
            </p>
          </div>

          <div className="grid-services mb-8">
            {featuredServices.map((service) => (
              <motion.div
                key={service.id}
                variants={itemVariants}
                className="card-equal-height bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 hover:border-gold-primary transition-all duration-300 group relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2"
                tabIndex="0"
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />

                <div className="relative z-10 text-center space-y-4">
                  {/* Icon */}
                  <div>
                    <div className={`inline-flex p-3 rounded-full bg-gradient-to-br ${service.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <div className="text-white">
                        {service.icon}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-theme-primary group-hover:text-gold-primary transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-theme-secondary text-sm leading-relaxed">
                      {service.description}
                    </p>
                    <div className="text-2xl font-bold gradient-text">
                      ${service.price.toFixed(2)}
                    </div>
                  </div>

                  <Link
                    to="/services"
                    className="btn-base btn-primary"
                  >
                    Book Now
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/services"
              className="btn-base btn-secondary"
            >
              View All Services
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer variants={itemVariants} className="py-8 md:py-12 border-t border-theme-cosmic/20">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-gold-primary" />
              <span className="text-lg font-bold gradient-text">SAMIA TAROT</span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link
                to="/legal/terms"
                className="text-theme-secondary hover:text-gold-primary transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2"
              >
                Terms of Service
              </Link>
              <Link
                to="/legal/privacy"
                className="text-theme-secondary hover:text-gold-primary transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2"
              >
                Privacy Policy
              </Link>
              <Link
                to="/legal/refund"
                className="text-theme-secondary hover:text-gold-primary transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2"
              >
                Refund Policy
              </Link>
            </div>

            <div className="text-sm text-theme-muted">
              © 2025 Samia Tarot. All rights reserved.
            </div>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  );
};

export default Home;