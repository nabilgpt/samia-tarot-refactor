import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ArrowLeft, ArrowRight, Star, Gem, Zap, Heart } from 'lucide-react';
import { api } from '../lib/api';

const Services = () => {
  const [loading, setLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesFromApi, setServicesFromApi] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const services = [
    {
      id: 'tarot-basic',
      title: 'Basic Tarot Reading',
      description: 'Three-card reading revealing your past, present, and future',
      price: 25.00,
      icon: <Gem className="w-8 h-8" />,
      gradient: 'from-purple-500 via-purple-600 to-blue-600'
    },
    {
      id: 'tarot-detailed',
      title: 'Detailed Tarot Reading',
      description: 'Comprehensive Celtic Cross spread with detailed interpretation',
      price: 65.00,
      icon: <Gem className="w-8 h-8" />,
      gradient: 'from-purple-500 via-purple-600 to-blue-600'
    },
    {
      id: 'astrology-basic',
      title: 'Birth Chart Reading',
      description: 'Complete natal chart analysis with personality insights',
      price: 45.00,
      icon: <Star className="w-8 h-8" />,
      gradient: 'from-yellow-500 via-orange-500 to-red-500'
    },
    {
      id: 'numerology-reading',
      title: 'Numerology Analysis',
      description: 'Life path number and personal year forecast',
      price: 35.00,
      icon: <Zap className="w-8 h-8" />,
      gradient: 'from-cyan-500 via-blue-500 to-purple-500'
    },
    {
      id: 'palm-reading',
      title: 'Palm Reading',
      description: 'Virtual palm analysis through uploaded photos',
      price: 40.00,
      icon: <Heart className="w-8 h-8" />,
      gradient: 'from-pink-500 via-rose-500 to-red-500'
    }
  ];

  useEffect(() => {
    const loadServices = async () => {
      try {
        const apiServices = await api.getServices();
        setServicesFromApi(apiServices);
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setServicesLoading(false);
      }
    };

    loadServices();
  }, []);

  const handleOrderService = async (service) => {
    setLoading(true);
    setError(null);
    try {
      const order = await api.createOrder({
        service_id: service.id,
        service_name: service.title,
        amount: service.price,
        metadata: {
          service_type: service.id,
          requested_at: new Date().toISOString()
        }
      });

      navigate(`/orders/${order.order_id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      // Use a more user-friendly error message
      const errorMsg = error.message.includes('404')
        ? 'Service temporarily unavailable. Please try again later.'
        : 'Unable to create order. Please check your connection and try again.';
      setError(errorMsg);
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

  return (
    <div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-theme-card/80 backdrop-blur-lg border-b border-theme-cosmic/20 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold gradient-text flex items-center group">
            <Sparkles className="w-8 h-8 mr-2 text-gold-primary animate-pulse group-hover:rotate-12 transition-transform duration-300" />
            SAMIA TAROT
          </Link>
          <div className="flex items-center space-x-6">
            <Link
              to="/horoscopes"
              className="relative text-theme-secondary hover:text-gold-primary transition-colors duration-300 py-2 group hidden md:block"
            >
              Horoscopes
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-primary rounded-full group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              to="/"
              className="flex items-center px-4 py-2 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Link>
          </div>
        </div>
      </nav>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 pt-12 pb-20"
      >
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-6">
              Mystical Services
            </h1>
            <div className="w-32 h-1 bg-cosmic-gradient mx-auto mb-8 rounded-full shadow-theme-cosmic" />
            <p className="text-theme-secondary text-lg max-w-2xl mx-auto">
              Choose your spiritual journey and unlock the mysteries of the universe
            </p>
          </motion.div>

          {/* Inline Error Display */}
          {error && (
            <motion.div
              variants={itemVariants}
              className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center"
            >
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 text-xs mt-2 underline"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {servicesLoading ? (
              // Loading skeletons
              Array(6).fill(0).map((_, index) => (
                <div key={index} className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-8 animate-pulse">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-theme-tertiary rounded-full mx-auto mb-4"></div>
                  </div>
                  <div className="text-center mb-8">
                    <div className="h-8 bg-theme-tertiary rounded mb-4"></div>
                    <div className="h-4 bg-theme-tertiary rounded mb-6"></div>
                    <div className="h-12 bg-theme-tertiary rounded mb-6"></div>
                    <div className="space-y-2 mb-6">
                      <div className="h-4 bg-theme-tertiary rounded w-3/4 mx-auto"></div>
                      <div className="h-4 bg-theme-tertiary rounded w-2/3 mx-auto"></div>
                      <div className="h-4 bg-theme-tertiary rounded w-4/5 mx-auto"></div>
                    </div>
                  </div>
                  <div className="h-12 bg-theme-tertiary rounded"></div>
                </div>
              ))
            ) : (
              (servicesFromApi.length > 0 ? servicesFromApi : services).map((service) => (
              <motion.div
                key={service.id}
                variants={itemVariants}
                whileHover={{
                  y: -8,
                  transition: { type: "spring", stiffness: 400, damping: 25 }
                }}
                className="group relative h-full"
              >
                <div className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-8 hover:border-gold-primary transition-all duration-300 shadow-theme-card hover:shadow-theme-gold relative overflow-hidden h-full flex flex-col">
                  {/* Background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />

                  {/* Icon */}
                  <div className="relative z-10 mb-6 text-center">
                    <div className={`inline-flex p-4 rounded-full bg-gradient-to-br ${service.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {React.cloneElement(service.icon, { className: "w-8 h-8 text-white" })}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 flex-grow text-center mb-8">
                    <h3 className="text-2xl font-bold text-theme-primary mb-4 group-hover:text-gold-primary transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-theme-secondary text-sm leading-relaxed mb-6 min-h-[3rem]">
                      {service.description}
                    </p>

                    {/* Price Badge */}
                    <div className="mb-6">
                      <div className="inline-flex items-baseline">
                        <span className="text-4xl font-bold gradient-text">${service.price}</span>
                        <span className="text-theme-muted text-sm ml-2">USD</span>
                      </div>
                      <div className="text-theme-muted text-xs mt-1">One-time payment</div>
                    </div>

                    {/* Features */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center justify-center text-theme-secondary text-xs">
                        <span className="w-1.5 h-1.5 bg-gold-primary rounded-full mr-2"></span>
                        Instant delivery
                      </div>
                      <div className="flex items-center justify-center text-theme-secondary text-xs">
                        <span className="w-1.5 h-1.5 bg-gold-primary rounded-full mr-2"></span>
                        Professional reader
                      </div>
                      <div className="flex items-center justify-center text-theme-secondary text-xs">
                        <span className="w-1.5 h-1.5 bg-gold-primary rounded-full mr-2"></span>
                        Satisfaction guaranteed
                      </div>
                    </div>
                  </div>

                  {/* Order Button */}
                  <div className="relative z-10">
                    <button
                      onClick={() => handleOrderService(service)}
                      disabled={loading}
                      className="w-full px-6 py-4 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-theme-card disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-gold-gradient-theme"
                    >
                      <span className="flex items-center justify-center">
                        {loading ? 'Creating Order...' : 'Order Reading'}
                        {!loading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />}
                      </span>
                    </button>
                  </div>

                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gold-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                </div>
              </motion.div>
            ))
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default Services;