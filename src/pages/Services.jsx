import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ArrowLeft, ArrowRight, Star, Gem, Zap, Heart } from 'lucide-react';
import api from '../lib/api';

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

  // Function to add default icons and gradients to API services
  const enrichApiServices = (apiServices) => {
    const defaultIcons = [<Sparkles />, <Star />, <Gem />, <Zap />, <Heart />];
    const defaultGradients = [
      'from-purple-500 via-purple-600 to-blue-600',
      'from-yellow-500 via-orange-500 to-red-500',
      'from-cyan-500 via-blue-500 to-purple-500',
      'from-pink-500 via-rose-500 to-red-500',
      'from-green-500 via-teal-500 to-blue-500'
    ];

    // Default prices for services (when base_price is 0)
    const defaultPrices = {
      'tarot': 25.00,
      'coffee': 35.00,
      'astro': 45.00,
      'healing': 75.00,
      'direct_call': 150.00
    };

    return apiServices.map((service, index) => ({
      ...service,
      // Map API fields to frontend expected fields
      id: service.code || service.id.toString(), // Use code as string ID, fallback to numeric id
      title: service.name, // Map name to title
      price: service.base_price > 0 ? service.base_price : (defaultPrices[service.code] || 25.00), // Use base_price or default
      icon: service.icon || defaultIcons[index % defaultIcons.length],
      gradient: service.gradient || defaultGradients[index % defaultGradients.length]
    }));
  };

  useEffect(() => {
    const loadServices = async () => {
      try {
        const apiServices = await api.getServices();
        const enrichedServices = enrichApiServices(apiServices);
        setServicesFromApi(enrichedServices);
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
      const orderData = {
        service_id: service.id, // Now correctly mapped from API
        service_name: service.title, // Now correctly mapped from API
        amount: service.price, // Now correctly mapped from API
        metadata: {
          service_type: service.id,
          service_code: service.code, // Store original code for reference
          requested_at: new Date().toISOString()
        }
      };

      // Only include question if we have one (avoid sending null)
      // For now, we'll omit it entirely since we don't have a question input field

      const order = await api.createOrder(orderData);

      if (order.order_id) {
        navigate(`/orders/${order.order_id}`);
      } else {
        throw new Error('Order creation failed - no order ID returned');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      // Provide specific user-friendly error messages
      let errorMsg = 'Unable to create order. Please try again.';

      if (error.message.includes('422')) {
        errorMsg = 'Invalid order data. Please refresh the page and try again.';
      } else if (error.message.includes('404')) {
        errorMsg = 'Service temporarily unavailable. Please try again later.';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorMsg = 'Please log in to place an order.';
      } else if (error.message.includes('500')) {
        errorMsg = 'Server error. Please try again in a few minutes.';
      } else if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')) {
        errorMsg = 'Connection error. Please check your internet and try again.';
      }

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
            Mystical Services
          </h1>
          <div className="w-32 h-1 bg-cosmic-gradient mx-auto mb-8 rounded-full shadow-theme-cosmic" />
          <p className="fluid-text-lg text-theme-secondary content-readable">
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
        <div className="grid-services">
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
                <div className="card-equal-height bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-6 md:p-8 hover:border-gold-primary transition-all duration-300 shadow-theme-card hover:shadow-theme-gold relative overflow-hidden">
                  {/* Background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient || 'from-purple-500 to-blue-600'} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />

                  {/* Icon */}
                  <div className="relative z-10 mb-6 text-center">
                    <div className={`inline-flex p-4 rounded-full bg-gradient-to-br ${service.gradient || 'from-purple-500 to-blue-600'} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {service.icon ? React.cloneElement(service.icon, { className: "w-8 h-8 text-white" }) : <Sparkles className="w-8 h-8 text-white" />}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 text-center mb-6 md:mb-8">
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
                      className="touch-target w-full px-6 py-4 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-theme-card disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-gold-gradient-theme"
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
  );
};

export default Services;