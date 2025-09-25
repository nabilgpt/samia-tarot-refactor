import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import AnimatedBackground from '../components/UI/AnimatedBackground';

const Home = () => {
  const { user, profile } = useAuth();
  const [dailyHoroscopes, setDailyHoroscopes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyHoroscopes();
  }, []);

  const fetchDailyHoroscopes = async () => {
    try {
      const response = await fetch('/api/horoscopes/daily');
      if (response.ok) {
        const data = await response.json();
        setDailyHoroscopes(data);
      }
    } catch (error) {
      console.error('Error fetching daily horoscopes:', error);
    } finally {
      setLoading(false);
    }
  };

  const zodiacSigns = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black relative overflow-hidden">
      <AnimatedBackground />

      {/* Hero Section */}
      <motion.section
        className="relative z-10 pt-20 pb-12"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1
              className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              SAMIA TAROT
            </motion.h1>
            <motion.p
              className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Discover your cosmic path with personalized tarot readings and spiritual guidance
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              {user ? (
                <Link
                  to="/services"
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                >
                  Book Your Reading
                </Link>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                  >
                    Start Your Journey
                  </Link>
                  <Link
                    to="/login"
                    className="px-8 py-4 border-2 border-purple-500 hover:bg-purple-500/10 text-purple-300 hover:text-purple-200 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Daily Horoscopes Section */}
      <motion.section
        className="relative z-10 py-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Today's Cosmic Messages
            </h2>
            <p className="text-gray-300 text-lg">
              Listen to your personalized daily horoscope
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {zodiacSigns.map((sign) => (
                <div key={sign} className="bg-gray-800/30 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 animate-pulse">
                  <div className="h-16 w-16 bg-gray-700 rounded-full mx-auto mb-4"></div>
                  <div className="h-6 bg-gray-700 rounded mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {zodiacSigns.map((sign) => {
                const horoscope = dailyHoroscopes.find(h => h.zodiac === sign);

                return (
                  <motion.div
                    key={sign}
                    className="bg-gray-800/30 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all duration-300 transform hover:scale-105"
                    whileHover={{ y: -5 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: zodiacSigns.indexOf(sign) * 0.1 }}
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <span className="text-2xl text-white font-bold">
                          {sign[0]}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-3">
                        {sign}
                      </h3>
                      {horoscope && horoscope.audio_media_id ? (
                        <div className="space-y-3">
                          <audio
                            controls
                            className="w-full"
                            preload="none"
                          >
                            <source src={`/api/horoscopes/${horoscope.id}/media`} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                          <p className="text-sm text-gray-400">
                            {new Date().toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">
                          Today's message coming soon...
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.section>

      {/* Services Preview Section */}
      <motion.section
        className="relative z-10 py-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.0 }}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Our Spiritual Services
            </h2>
            <p className="text-gray-300 text-lg">
              Choose your path to cosmic enlightenment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Tarot Reading",
                description: "Discover insights about your past, present, and future through ancient tarot wisdom",
                icon: "🔮",
                color: "from-purple-600 to-indigo-600"
              },
              {
                title: "Coffee Cup Reading",
                description: "Uncover hidden messages in the patterns of coffee grounds",
                icon: "☕",
                color: "from-amber-600 to-orange-600"
              },
              {
                title: "Astro Natal Chart",
                description: "Comprehensive astrological analysis based on your birth details",
                icon: "⭐",
                color: "from-cyan-600 to-blue-600"
              }
            ].map((service, index) => (
              <motion.div
                key={service.title}
                className="bg-gray-800/30 backdrop-blur-sm border border-purple-500/20 rounded-xl p-8 hover:border-purple-500/40 transition-all duration-300"
                whileHover={{ y: -10, scale: 1.05 }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 + (index * 0.2) }}
              >
                <div className="text-center">
                  <div className={`w-16 h-16 bg-gradient-to-r ${service.color} rounded-full mx-auto mb-6 flex items-center justify-center text-2xl`}>
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">
                    {service.title}
                  </h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    {service.description}
                  </p>
                  <Link
                    to="/services"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
                  >
                    Learn More
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="relative z-10 py-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.4 }}
      >
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Explore Your Cosmic Journey?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands who have discovered their path through our spiritual guidance
            </p>
            {!user && (
              <Link
                to="/signup"
                className="inline-block px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
              >
                Begin Your Journey Today
              </Link>
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default Home;