import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Star, ArrowLeft } from 'lucide-react';
import api from '../lib/api';

const Horoscopes = () => {
  const [horoscopes, setHoroscopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const loadHoroscopes = async () => {
      try {
        const data = await api.dailyHoroscopes();
        setHoroscopes(data);
      } catch (error) {
        console.error('Error loading horoscopes:', error);
        setHoroscopes([]);
      } finally {
        setLoading(false);
      }
    };

    loadHoroscopes();
  }, []);

  const zodiacSigns = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative z-10 py-12 md:py-20"
    >
      <div className="container">
          {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12 md:mb-16">
          <h1 className="fluid-heading-xl font-bold gradient-text mb-6">
            Today's Cosmic Messages
          </h1>
          <div className="w-32 h-1 bg-cosmic-gradient mx-auto mb-8 rounded-full shadow-theme-cosmic" />
          <p className="fluid-text-lg text-theme-secondary content-readable">
            {horoscopes.length > 0
              ? `${horoscopes.length} cosmic insights await you today`
              : 'The stars are aligning for today\'s revelations'
            }
          </p>
        </motion.div>

          {/* Horoscopes Grid */}
        {loading ? (
          // Loading skeleton
          <div className="grid-horoscope">
              {zodiacSigns.map((sign) => (
                <div key={sign} className="bg-theme-card backdrop-blur-sm border border-theme-cosmic rounded-xl p-6 animate-pulse">
                  <div className="h-12 w-12 bg-theme-tertiary rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-theme-tertiary rounded mb-3"></div>
                  <div className="h-3 bg-theme-tertiary rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-3 bg-theme-tertiary rounded w-1/2 mx-auto"></div>
                </div>
              ))}
            </div>
        ) : (
          // Always show all zodiac signs
          <div className="grid-horoscope">
              {zodiacSigns.map((sign) => {
                const horoscope = horoscopes.find(h => h.zodiac === sign);

                return (
                  <motion.div
                    key={sign}
                    variants={itemVariants}
                    whileHover={{
                      y: -8,
                      transition: { type: "spring", stiffness: 400, damping: 25 }
                    }}
                    className={`group bg-theme-card backdrop-blur-sm border rounded-xl p-4 md:p-6 transition-all duration-300 shadow-theme-card ${
                      horoscope
                        ? 'border-theme-cosmic hover:border-gold-primary hover:shadow-theme-gold cursor-pointer'
                        : 'border-theme-muted/30 opacity-60'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`text-3xl mb-3 ${horoscope ? '' : 'grayscale opacity-50'}`}>✨</div>
                      <h3 className={`text-lg font-semibold mb-3 transition-colors ${
                        horoscope
                          ? 'text-theme-primary group-hover:text-gold-primary'
                          : 'text-theme-muted'
                      }`}>
                        {sign}
                      </h3>
                      {horoscope ? (
                        <p className="text-theme-secondary text-xs leading-relaxed line-clamp-4">
                          {horoscope.text_content || 'Your cosmic message awaits...'}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-theme-muted text-xs italic">
                            Coming soon...
                          </p>
                          <div className="text-xs text-theme-muted/60">
                            <div className="w-8 h-0.5 bg-theme-muted/20 mx-auto mb-1"></div>
                            <div className="w-6 h-0.5 bg-theme-muted/20 mx-auto"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}

        {/* Additional content when no horoscopes available */}
        {!loading && horoscopes.length === 0 && (
          <motion.div variants={itemVariants} className="text-center py-12 md:py-16 mt-12">
              <motion.div
                animate={shouldReduceMotion ? { y: 0 } : { y: [-8, 8, -8] }}
                transition={shouldReduceMotion ? {} : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-6xl mb-6 inline-block"
              >
                🔮
              </motion.div>
              <h3 className="text-2xl font-bold gradient-text mb-4">
                Today's Cosmic Messages Are Being Channeled
              </h3>
              <p className="text-theme-secondary mb-8 leading-relaxed max-w-lg mx-auto">
                Our mystical readers are connecting with celestial energies to bring you personalized insights.
              </p>
              <div className="button-group-mobile">
                <Link
                  to="/services"
                  className="button-responsive touch-target inline-flex items-center justify-center px-6 py-3 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
                >
                  Get Personal Reading
                  <Star className="ml-2 w-4 h-4" />
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="button-responsive touch-target px-6 py-3 bg-transparent border border-theme-cosmic text-theme-primary hover:bg-theme-cosmic hover:text-theme-inverse rounded-xl transition-all duration-300"
                >
                  Refresh
                </button>
              </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Horoscopes;