import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  Gem
} from 'lucide-react';

const Home = () => {
  const [dailyHoroscopes, setDailyHoroscopes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulated values for missing contexts
  const language = 'en';
  const isAuthenticated = false;
  const profile = null;

  useEffect(() => {
    fetchDailyHoroscopes();
  }, []);

  const fetchDailyHoroscopes = async () => {
    try {
      const response = await fetch('/api/horoscopes/daily');
      if (response.ok) {
        const data = await response.json();
        setDailyHoroscopes(data.horoscopes || []);
      }
    } catch (error) {
      console.error('Error fetching daily horoscopes:', error);
      setDailyHoroscopes([]);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-primary-gradient relative overflow-hidden">
      {/* Cosmic Particles Background */}
      <div className="absolute inset-0 z-0">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={particlesConfig}
          className="absolute inset-0"
        />
      </div>

      {/* Cosmic Orbs - Floating Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 rounded-full opacity-20 blur-xl"
          style={{ background: 'var(--orb-gradient-primary)' }}
          variants={floatVariants}
          animate="animate"
        />
        <motion.div
          className="absolute top-40 right-32 w-24 h-24 rounded-full opacity-15 blur-xl"
          style={{ background: 'var(--orb-gradient-secondary)' }}
          variants={floatVariants}
          animate="animate"
          transition={{ delay: 1 }}
        />
        <motion.div
          className="absolute bottom-32 left-40 w-40 h-40 rounded-full opacity-10 blur-xl"
          style={{ background: 'var(--orb-gradient-tertiary)' }}
          variants={floatVariants}
          animate="animate"
          transition={{ delay: 2 }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-28 h-28 rounded-full opacity-25 blur-xl"
          style={{ background: 'var(--orb-gradient-primary)' }}
          variants={floatVariants}
          animate="animate"
          transition={{ delay: 0.5 }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold gradient-text flex items-center">
            <Sparkles className="w-8 h-8 mr-2 text-gold-primary animate-pulse" />
            SAMIA TAROT
          </div>
          <div className="hidden md:flex space-x-8">
            <Link to="/services" className="text-theme-secondary hover:text-gold-primary transition-colors duration-300">
              Services
            </Link>
            <Link to="/about" className="text-theme-secondary hover:text-gold-primary transition-colors duration-300">
              About
            </Link>
            <Link to="/contact" className="text-theme-secondary hover:text-gold-primary transition-colors duration-300">
              Contact
            </Link>
            {!isAuthenticated ? (
              <Link to="/login" className="text-theme-secondary hover:text-gold-primary transition-colors duration-300">
                Login
              </Link>
            ) : (
              <Link to="/dashboard" className="text-theme-secondary hover:text-gold-primary transition-colors duration-300">
                Dashboard
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
        <motion.section variants={itemVariants} className="pt-12 pb-20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-6xl mx-auto">
              <motion.div
                variants={itemVariants}
                className="mb-8"
              >
                <div className="flex justify-center mb-6">
                  <motion.div
                    animate={{
                      rotate: 360,
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="relative"
                  >
                    <Eye className="w-24 h-24 text-gold-primary drop-shadow-lg" />
                    <div className="absolute inset-0 w-24 h-24 rounded-full bg-gold-primary opacity-20 blur-xl animate-pulse" />
                  </motion.div>
                </div>
                <h1 className="text-6xl md:text-8xl font-bold mb-6 gradient-text leading-tight">
                  SAMIA TAROT
                </h1>
                <div className="w-32 h-1 bg-gold-gradient-theme mx-auto mb-8 rounded-full shadow-theme-gold" />
              </motion.div>

              <motion.p
                variants={itemVariants}
                className="text-xl md:text-2xl text-theme-secondary mb-12 leading-relaxed max-w-4xl mx-auto"
              >
                Discover your cosmic destiny through ancient mystical arts.
                Professional tarot readings, astrology insights, and spiritual guidance await you.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-6 justify-center items-center"
              >
                <Link
                  to="/services"
                  className="group px-10 py-5 bg-gold-gradient-theme hover:shadow-theme-gold text-theme-inverse font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-theme-card relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    Get Your Reading
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Link>

                <Link
                  to="/horoscopes"
                  className="group px-10 py-5 bg-transparent border-2 border-theme-cosmic text-theme-primary hover:bg-cosmic-gradient hover:text-theme-inverse font-bold rounded-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm"
                >
                  <span className="flex items-center">
                    Daily Horoscopes
                    <Sparkles className="ml-2 w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                  </span>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Services Section */}
        <motion.section variants={itemVariants} className="py-20 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
                Mystical Services
              </h2>
              <div className="w-24 h-1 bg-cosmic-gradient mx-auto rounded-full shadow-theme-cosmic" />
              <p className="text-theme-secondary text-lg mt-6 max-w-2xl mx-auto">
                Explore the ancient arts of divination and spiritual guidance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  variants={itemVariants}
                  whileHover={{
                    y: -10,
                    transition: { type: "spring", stiffness: 300, damping: 15 }
                  }}
                  className="group relative"
                >
                  <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-8 text-center hover:border-gold-primary transition-all duration-500 shadow-theme-card hover:shadow-theme-gold relative overflow-hidden">
                    {/* Background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />

                    {/* Icon */}
                    <div className="relative z-10 mb-6">
                      <div className={`inline-flex p-4 rounded-full bg-gradient-to-br ${service.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {React.cloneElement(service.icon, { className: "w-8 h-8 text-white" })}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold text-theme-primary mb-3 group-hover:text-gold-primary transition-colors duration-300">
                        {service.title}
                      </h3>
                      <p className="text-theme-secondary text-sm leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    {/* Hover effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gold-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Daily Horoscopes Section */}
        <motion.section variants={itemVariants} className="py-20 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
                Today's Cosmic Messages
              </h2>
              <div className="w-24 h-1 bg-cosmic-gradient mx-auto rounded-full shadow-theme-cosmic" />
              <p className="text-theme-secondary text-lg mt-6">
                {dailyHoroscopes.length > 0 ? 'Your personalized daily horoscopes await' : 'The stars are aligning for today\'s revelations'}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {zodiacSigns.slice(0, 8).map((sign) => (
                  <div key={sign} className="bg-theme-card backdrop-blur-sm border border-theme-cosmic rounded-xl p-6 animate-pulse">
                    <div className="h-16 w-16 bg-theme-tertiary rounded-full mx-auto mb-4"></div>
                    <div className="h-6 bg-theme-tertiary rounded mb-4"></div>
                    <div className="h-4 bg-theme-tertiary rounded"></div>
                  </div>
                ))}
              </div>
            ) : dailyHoroscopes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {zodiacSigns.map((sign) => {
                  const horoscope = dailyHoroscopes.find(h => h.zodiac === sign);

                  return (
                    <motion.div
                      key={sign}
                      variants={itemVariants}
                      whileHover={{
                        y: -5,
                        transition: { type: "spring", stiffness: 300, damping: 15 }
                      }}
                      className="bg-theme-card backdrop-blur-sm border border-theme-cosmic rounded-xl p-6 hover:border-gold-primary transition-all duration-300 transform hover:scale-105 shadow-theme-card hover:shadow-theme-gold"
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-3">✨</div>
                        <h3 className="text-xl font-semibold text-theme-primary mb-3">{sign}</h3>
                        {horoscope ? (
                          <p className="text-theme-secondary text-sm leading-relaxed">
                            {horoscope.text_content || 'Your cosmic message awaits...'}
                          </p>
                        ) : (
                          <p className="text-theme-muted text-sm italic">
                            Cosmic energies gathering...
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <motion.div
                  variants={floatVariants}
                  animate="animate"
                  className="text-8xl mb-8 inline-block"
                >
                  🔮
                </motion.div>
                <h3 className="text-3xl font-bold gradient-text mb-6">
                  The Stars Are Aligning
                </h3>
                <p className="text-theme-secondary text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
                  Our cosmic readers are channeling today's celestial energies.
                  Return soon for your personalized horoscopes and mystical insights.
                </p>
                <Link
                  to="/services"
                  className="inline-flex items-center px-10 py-5 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-theme-card"
                >
                  Get Personal Reading
                  <Star className="ml-2 w-5 h-5" />
                </Link>
              </div>
            )}
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section variants={itemVariants} className="py-20 relative">
          <div className="container mx-auto px-4">
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