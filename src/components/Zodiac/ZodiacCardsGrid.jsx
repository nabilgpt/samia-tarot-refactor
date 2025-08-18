import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ZodiacCardModal from './ZodiacCardModal';

// =====================================================
// ZODIAC CARDS GRID COMPONENT
// =====================================================
// Simple card grid layout with modal popup

const ZodiacCardsGrid = () => {
  const { t, i18n } = useTranslation();
  const [zodiacReadings, setZodiacReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedZodiac, setSelectedZodiac] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Zodiac sign data with cosmic styling
  const zodiacSigns = {
    aries: { 
      name: { en: 'Aries', ar: 'الحمل' }, 
      symbol: '♈', 
      emoji: '🐏', 
      color: 'from-red-500 to-orange-500',
      dates: { en: 'Mar 21 - Apr 19', ar: '21 مارس - 19 أبريل' }
    },
    taurus: { 
      name: { en: 'Taurus', ar: 'الثور' }, 
      symbol: '♉', 
      emoji: '🐂', 
      color: 'from-green-500 to-emerald-500',
      dates: { en: 'Apr 20 - May 20', ar: '20 أبريل - 20 مايو' }
    },
    gemini: { 
      name: { en: 'Gemini', ar: 'الجوزاء' }, 
      symbol: '♊', 
      emoji: '👯', 
      color: 'from-yellow-500 to-amber-500',
      dates: { en: 'May 21 - Jun 20', ar: '21 مايو - 20 يونيو' }
    },
    cancer: { 
      name: { en: 'Cancer', ar: 'السرطان' }, 
      symbol: '♋', 
      emoji: '🦀', 
      color: 'from-blue-500 to-cyan-500',
      dates: { en: 'Jun 21 - Jul 22', ar: '21 يونيو - 22 يوليو' }
    },
    leo: { 
      name: { en: 'Leo', ar: 'الأسد' }, 
      symbol: '♌', 
      emoji: '🦁', 
      color: 'from-orange-500 to-yellow-500',
      dates: { en: 'Jul 23 - Aug 22', ar: '23 يوليو - 22 أغسطس' }
    },
    virgo: { 
      name: { en: 'Virgo', ar: 'العذراء' }, 
      symbol: '♍', 
      emoji: '👩', 
      color: 'from-green-500 to-teal-500',
      dates: { en: 'Aug 23 - Sep 22', ar: '23 أغسطس - 22 سبتمبر' }
    },
    libra: { 
      name: { en: 'Libra', ar: 'الميزان' }, 
      symbol: '♎', 
      emoji: '⚖️', 
      color: 'from-pink-500 to-rose-500',
      dates: { en: 'Sep 23 - Oct 22', ar: '23 سبتمبر - 22 أكتوبر' }
    },
    scorpio: { 
      name: { en: 'Scorpio', ar: 'العقرب' }, 
      symbol: '♏', 
      emoji: '🦂', 
      color: 'from-red-600 to-purple-600',
      dates: { en: 'Oct 23 - Nov 21', ar: '23 أكتوبر - 21 نوفمبر' }
    },
    sagittarius: { 
      name: { en: 'Sagittarius', ar: 'القوس' }, 
      symbol: '♐', 
      emoji: '🏹', 
      color: 'from-purple-500 to-indigo-500',
      dates: { en: 'Nov 22 - Dec 21', ar: '22 نوفمبر - 21 ديسمبر' }
    },
    capricorn: { 
      name: { en: 'Capricorn', ar: 'الجدي' }, 
      symbol: '♑', 
      emoji: '🐐', 
      color: 'from-gray-600 to-slate-600',
      dates: { en: 'Dec 22 - Jan 19', ar: '22 ديسمبر - 19 يناير' }
    },
    aquarius: { 
      name: { en: 'Aquarius', ar: 'الدلو' }, 
      symbol: '♒', 
      emoji: '🏺', 
      color: 'from-cyan-500 to-blue-500',
      dates: { en: 'Jan 20 - Feb 18', ar: '20 يناير - 18 فبراير' }
    },
    pisces: { 
      name: { en: 'Pisces', ar: 'الحوت' }, 
      symbol: '♓', 
      emoji: '🐟', 
      color: 'from-blue-600 to-purple-500',
      dates: { en: 'Feb 19 - Mar 20', ar: '19 فبراير - 20 مارس' }
    }
  };

  // Fetch today's zodiac readings
  useEffect(() => {
    fetchTodaysReadings();
  }, []);

  // Refetch when language changes
  useEffect(() => {
    if (zodiacReadings.length > 0) {
      fetchTodaysReadings();
    }
  }, [i18n.language]);

  const fetchTodaysReadings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/daily-zodiac');
      const data = await response.json();

      if (data.success) {
        setZodiacReadings(data.data.readings);
        console.log('✅ Loaded zodiac readings:', data.data.readings.length);
      } else {
        setError(data.error || 'Failed to load zodiac readings');
      }
    } catch (error) {
      console.error('❌ Error fetching zodiac readings:', error);
      setError('Unable to connect to zodiac service');
    } finally {
      setLoading(false);
    }
  };

  // Handle card click - open modal
  const handleCardClick = (signKey) => {
    const reading = zodiacReadings.find(r => r.zodiac_sign === signKey);
    const signInfo = zodiacSigns[signKey];
    
    if (reading && signInfo) {
      setSelectedZodiac({ reading, signInfo, signKey });
      setModalOpen(true);
      console.log('🔮 Opening modal for:', signKey);
    } else {
      console.warn('⚠️ No reading available for:', signKey);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedZodiac(null);
    console.log('❌ Closed zodiac modal');
  };

  // Handle loading state
  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="inline-block text-6xl mb-4"
            >
              🔮
            </motion.div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {t('dailyZodiac.loading')}
            </h2>
          </div>
        </div>
      </section>
    );
  }

  // Handle error state
  if (error) {
    return (
      <section className="py-20 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-400 mb-4">
              {t('dailyZodiac.error')}
            </h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={fetchTodaysReadings}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              {t('common.tryAgain')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const currentLang = i18n.language;

  return (
    <>
      <section className="py-20 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 relative overflow-hidden">
        {/* Cosmic Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="text-6xl mb-4">🌟</div>
            <h2 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
              {t('dailyZodiac.title')}
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              {t('dailyZodiac.subtitle')}
            </p>
            <div className="text-sm text-gray-400 mt-2">
              {new Date().toLocaleDateString(currentLang === 'ar' ? 'ar-SA' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </motion.div>

          {/* Simple Zodiac Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
            {Object.keys(zodiacSigns).map((signKey, index) => {
              const signData = zodiacSigns[signKey];
              const reading = zodiacReadings.find(r => r.zodiac_sign === signKey);
              const hasReading = !!reading;

              return (
                <motion.div
                  key={signKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="relative group"
                >
                  <motion.button
                    onClick={() => handleCardClick(signKey)}
                    disabled={!hasReading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      w-full aspect-square p-4 rounded-2xl backdrop-blur-sm border border-white/10
                      bg-gradient-to-br ${signData.color} bg-opacity-10
                      hover:bg-opacity-20 transition-all duration-300
                      ${hasReading 
                        ? 'cursor-pointer hover:shadow-lg hover:shadow-purple-400/25 hover:border-purple-400/50' 
                        : 'opacity-50 cursor-not-allowed'
                      }
                      focus:outline-none focus:ring-2 focus:ring-purple-400/50
                      disabled:hover:scale-100
                    `}
                  >
                    {/* Card Content */}
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                      {/* Zodiac Emoji */}
                      <div className="text-3xl md:text-4xl lg:text-5xl mb-2">
                        {signData.emoji}
                      </div>
                      
                      {/* Zodiac Name */}
                      <h3 className="text-sm md:text-base lg:text-lg font-bold text-white">
                        {signData.name[currentLang]}
                      </h3>
                      
                      {/* Zodiac Symbol */}
                      <div className="text-lg md:text-xl text-purple-300">
                        {signData.symbol}
                      </div>
                    </div>

                    {/* Available Indicator */}
                    {hasReading && (
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    )}

                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/0 to-pink-400/0 group-hover:from-purple-400/10 group-hover:to-pink-400/10 transition-all duration-300 pointer-events-none" />
                  </motion.button>

                  {/* Unavailable Overlay */}
                  {!hasReading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                      <div className="text-xs text-gray-400 text-center">
                        <div className="mb-1">⏳</div>
                        <div>Soon</div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Footer Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="text-center mt-16"
          >
            <p className="text-gray-400 text-sm">
              {t('dailyZodiac.footer')}
            </p>
            <div className="flex justify-center items-center gap-2 mt-2 text-xs text-gray-500">
              <span>✨</span>
              <span>{t('dailyZodiac.updatedDaily')}</span>
              <span>✨</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Zodiac Modal */}
      {selectedZodiac && (
        <ZodiacCardModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          zodiacData={selectedZodiac.signKey}
          reading={selectedZodiac.reading}
          signInfo={selectedZodiac.signInfo}
        />
      )}
    </>
  );
};

export default ZodiacCardsGrid;
