import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import AnimatedBackground from '../components/UI/AnimatedBackground';

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookService = (serviceId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/book/${serviceId}`);
  };

  const serviceIcons = {
    'tarot': '🔮',
    'coffee': '☕',
    'astro': '⭐',
    'healing': '💫',
    'direct_call': '📞'
  };

  const serviceColors = {
    'tarot': 'from-purple-600 to-indigo-600',
    'coffee': 'from-amber-600 to-orange-600',
    'astro': 'from-cyan-600 to-blue-600',
    'healing': 'from-green-600 to-teal-600',
    'direct_call': 'from-pink-600 to-rose-600'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 pt-20 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Spiritual Services
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Discover the perfect spiritual guidance tailored to your cosmic journey.
              Each service is crafted to provide you with deep insights and clarity.
            </p>
          </motion.div>

          {/* Services Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="bg-gray-800/30 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8 animate-pulse">
                  <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-6"></div>
                  <div className="h-6 bg-gray-700 rounded mb-4"></div>
                  <div className="space-y-2 mb-6">
                    <div className="h-4 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  </div>
                  <div className="h-12 bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  className="bg-gray-800/30 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8 hover:border-purple-500/40 transition-all duration-500 group"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -10, scale: 1.02 }}
                >
                  {/* Service Icon */}
                  <motion.div
                    className={`w-16 h-16 bg-gradient-to-r ${serviceColors[service.code] || 'from-purple-600 to-pink-600'} rounded-full mx-auto mb-6 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.8 }}
                  >
                    {serviceIcons[service.code] || '✨'}
                  </motion.div>

                  {/* Service Details */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-300 transition-colors">
                      {service.name}
                    </h3>

                    <div className="mb-6">
                      {service.is_premium && (
                        <span className="inline-block px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-bold rounded-full mb-3">
                          PREMIUM
                        </span>
                      )}

                      <p className="text-gray-300 leading-relaxed mb-4">
                        {getServiceDescription(service.code)}
                      </p>

                      <div className="flex items-center justify-center space-x-4 text-sm text-gray-400 mb-6">
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Available 24/7
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          Instant Delivery
                        </span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="mb-6">
                      {service.base_price > 0 ? (
                        <div className="text-center">
                          <span className="text-3xl font-bold text-white">
                            ${service.base_price}
                          </span>
                          <span className="text-gray-400 ml-2">per session</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-2xl font-bold text-green-400">
                            Free
                          </span>
                          <span className="text-gray-400 ml-2">limited time</span>
                        </div>
                      )}
                    </div>

                    {/* Book Button */}
                    <motion.button
                      onClick={() => handleBookService(service.id)}
                      className={`w-full py-3 bg-gradient-to-r ${serviceColors[service.code] || 'from-purple-600 to-pink-600'} hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25 group-hover:scale-105`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {user ? 'Book Now' : 'Sign In to Book'}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Features Section */}
          <motion.section
            className="mt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Why Choose SAMIA TAROT?
              </h2>
              <p className="text-gray-300 text-lg">
                Experience the difference with our premium spiritual services
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: '🎯',
                  title: 'Personalized Readings',
                  description: 'Each session is tailored specifically to your unique cosmic energy and questions'
                },
                {
                  icon: '🔒',
                  title: 'Complete Privacy',
                  description: 'Your sessions are completely confidential with secure, encrypted delivery'
                },
                {
                  icon: '⚡',
                  title: 'Instant Access',
                  description: 'Get your readings delivered immediately via secure audio messages'
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="text-center p-6 bg-gray-800/20 backdrop-blur-sm border border-purple-500/10 rounded-xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + (index * 0.1) }}
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* CTA Section */}
          {!user && (
            <motion.section
              className="mt-20 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.0 }}
            >
              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-12">
                <h2 className="text-3xl font-bold text-white mb-6">
                  Ready to Begin Your Spiritual Journey?
                </h2>
                <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                  Join thousands who have discovered clarity and guidance through our services
                </p>
                <Link
                  to="/signup"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                >
                  Create Your Account
                </Link>
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get service descriptions
const getServiceDescription = (serviceCode) => {
  const descriptions = {
    'tarot': 'Unlock the mysteries of your past, present, and future through the ancient wisdom of tarot cards. Get personalized insights into love, career, and life decisions.',
    'coffee': 'Discover hidden messages in the sacred art of coffee cup reading. Turkish coffee grounds reveal secrets about your destiny and upcoming opportunities.',
    'astro': 'Receive a comprehensive astrological analysis based on your exact birth time and location. Understand your personality, strengths, and cosmic purpose.',
    'healing': 'Experience powerful energy healing sessions designed to restore balance, remove blockages, and align your chakras for optimal well-being.',
    'direct_call': 'Have a personal one-on-one conversation with Samia herself. Get immediate answers to your most pressing questions through live guidance.'
  };

  return descriptions[serviceCode] || 'A unique spiritual service crafted to provide you with cosmic insights and guidance.';
};

export default Services;