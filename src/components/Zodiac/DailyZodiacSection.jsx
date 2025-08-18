import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayIcon, PauseIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import TypewriterSync from './TypewriterSync';

// =====================================================
// DAILY ZODIAC SECTION COMPONENT
// =====================================================
// Homepage section displaying all 12 zodiac signs with audio

const DailyZodiacSection = () => {
  const { t, i18n } = useTranslation();
  const [zodiacReadings, setZodiacReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingSign, setPlayingSign] = useState(null);
  const [typewriterResets, setTypewriterResets] = useState({});
  const audioRefs = useRef({});

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
      } else {
        setError(data.error || 'Failed to load zodiac readings');
      }
    } catch (err) {
      console.error('Error fetching zodiac readings:', err);
      setError('Unable to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  // Handle audio playback with typewriter effect
  const handlePlayAudio = async (sign, reading) => {
    try {
      // CRITICAL: Stop any currently playing audio to prevent overlap
      if (playingSign && playingSign !== sign) {
        console.log(`🛑 Stopping ${playingSign} to play ${sign}`);
        stopAudio(playingSign);
      }

      const currentLang = i18n.language;
      const audioUrl = currentLang === 'ar' ? reading.audio_ar_url : reading.audio_en_url;
      const text = currentLang === 'ar' ? reading.text_ar : reading.text_en;

      if (!audioUrl) {
        console.warn(`⚠️ No audio available for ${sign} in ${currentLang}`);
        return;
      }

      console.log(`🔊 Playing ${sign} audio: ${audioUrl.substring(0, 100)}...`);

      // Create or get audio element
      if (!audioRefs.current[sign]) {
        audioRefs.current[sign] = new Audio();
      }

      const audio = audioRefs.current[sign];
      audio.src = audioUrl;

      // Set up audio event listeners for perfect sync
      audio.onloadedmetadata = () => {
        console.log(`📊 Audio metadata loaded for ${sign}: ${audio.duration}s duration`);
      };

      audio.onplay = () => {
        console.log(`▶️ Audio started for ${sign}`);
        setPlayingSign(sign);
        startTypewriterEffect(sign, text);
      };

      audio.onpause = () => {
        console.log(`⏸️ Audio paused for ${sign}`);
        setPlayingSign(null);
        pauseTypewriterEffect(sign);
      };

      audio.onended = () => {
        console.log(`🏁 Audio ended for ${sign}`);
        setPlayingSign(null);
        completeTypewriterEffect(sign, text);
      };

      audio.onerror = (e) => {
        console.error(`❌ Audio error for ${sign}:`, e);
        setPlayingSign(null);
        stopTypewriterEffect(sign);
      };

      // Play the audio
      await audio.play();

    } catch (error) {
      console.error(`💥 Error playing audio for ${sign}:`, error);
      setPlayingSign(null);
    }
  };

  // Handle pause/resume audio with typewriter sync
  const handlePauseAudio = (sign, reading) => {
    if (audioRefs.current[sign]) {
      if (audioRefs.current[sign].paused) {
        // Resume audio and typewriter
        const currentLang = i18n.language;
        const text = currentLang === 'ar' ? reading.text_ar : reading.text_en;
        
        audioRefs.current[sign].play();
        resumeTypewriterEffect(sign, text);
        console.log(`▶️ Resumed audio and typewriter for ${sign}`);
      } else {
        // Pause audio and typewriter
        audioRefs.current[sign].pause();
        console.log(`⏸️ Paused audio for ${sign}`);
      }
    }
  };

  // Stop audio playback and typewriter
  const stopAudio = (sign) => {
    if (audioRefs.current[sign]) {
      audioRefs.current[sign].pause();
      audioRefs.current[sign].currentTime = 0;
    }
    setPlayingSign(null);
    stopTypewriterEffect(sign);
    console.log(`🛑 Stopped audio and typewriter for ${sign}`);
  };

  // Pause typewriter effect (preserves current state)
  const pauseTypewriterEffect = (sign) => {
    if (typewriterResets[sign]) {
      clearInterval(typewriterResets[sign]);
      console.log(`⏸️ Typewriter paused for ${sign}`);
    }
    // Note: We don't change isActive to false, so it can be resumed
  };

  // Resume typewriter effect from current position
  const resumeTypewriterEffect = (sign, text) => {
    const currentState = typewriterResets[sign];
    if (!currentState || !currentState.isActive) return;

    const currentLang = i18n.language;
    const words = text.split(' ');
    const currentWordIndex = currentState.currentWordIndex || 0;
    
    if (currentWordIndex >= words.length) {
      completeTypewriterEffect(sign, text);
      return;
    }

    // Calculate remaining timing
    let intervalTime;
    if (currentLang === 'ar') {
      intervalTime = 600; // Syrian Arabic pace
    } else {
      intervalTime = 400; // English pace
    }

    console.log(`▶️ Resuming typewriter for ${sign} from word ${currentWordIndex}`);

    let wordIndex = currentWordIndex;
    typewriterResets[sign] = setInterval(() => {
      if (wordIndex < words.length) {
        const displayText = words.slice(0, wordIndex + 1).join(' ');
        
        setTypewriterResets(prev => ({
          ...prev,
          [sign]: {
            ...prev[sign],
            displayText,
            currentWordIndex: wordIndex + 1
          }
        }));
        wordIndex++;
      } else {
        clearInterval(typewriterResets[sign]);
        setTypewriterResets(prev => ({
          ...prev,
          [sign]: { 
            ...prev[sign], 
            isActive: false,
            displayText: text
          }
        }));
      }
    }, intervalTime);
  };

  // Start typewriter effect synchronized with audio - PERFECT SYNC
  const startTypewriterEffect = (sign, text) => {
    const currentLang = i18n.language;
    const audio = audioRefs.current[sign];
    
    // 🚨 CRITICAL: Get ACTUAL audio duration for perfect sync
    const actualDuration = audio?.duration;
    
    if (!actualDuration || actualDuration === 0) {
      console.warn(`⚠️ No audio duration available for ${sign}, using estimated timing`);
      // Fallback to estimated timing
      startEstimatedTypewriter(sign, text, currentLang);
      return;
    }
    
    // Split text into words
    const words = text.split(' ');
    const totalWords = words.length;
    
    // 🎯 PERFECT SYNC: Calculate exact timing to finish with audio
    const exactInterval = (actualDuration * 1000) / totalWords;
    
    // 🇸🇾 Syrian Arabic minimum readability constraints
    let finalInterval = exactInterval;
    if (currentLang === 'ar' && exactInterval < 500) {
      finalInterval = 500; // Minimum 0.5s per word for Syrian readability
    } else if (currentLang === 'en' && exactInterval < 300) {
      finalInterval = 300; // Minimum 0.3s per word for English readability
    }
    
    let currentWordIndex = 0;
    
    setTypewriterResets(prev => ({
      ...prev,
      [sign]: { displayText: '', isActive: true, currentWordIndex: 0 }
    }));

    console.log(`🎯 PERFECT SYNC: ${sign} (${currentLang}) - ${totalWords} words, ${finalInterval.toFixed(0)}ms per word, ${actualDuration.toFixed(1)}s total`);

    typewriterResets[sign] = setInterval(() => {
      if (currentWordIndex < words.length) {
        const displayText = words.slice(0, currentWordIndex + 1).join(' ');
        
        setTypewriterResets(prev => ({
          ...prev,
          [sign]: {
            ...prev[sign],
            displayText,
            currentWordIndex: currentWordIndex + 1
          }
        }));
        currentWordIndex++;
      } else {
        // Animation complete - should finish exactly when audio ends
        clearInterval(typewriterResets[sign]);
        setTypewriterResets(prev => ({
          ...prev,
          [sign]: { 
            ...prev[sign], 
            isActive: false,
            displayText: text // Ensure full text is shown
          }
        }));
        console.log(`✅ PERFECT SYNC COMPLETE: ${sign} typewriter finished with audio`);
      }
    }, finalInterval);
  };

  // Fallback estimated typewriter for when audio duration is unavailable
  const startEstimatedTypewriter = (sign, text, currentLang) => {
    const words = text.split(' ');
    const estimatedInterval = currentLang === 'ar' ? 600 : 400;
    
    let currentWordIndex = 0;
    
    setTypewriterResets(prev => ({
      ...prev,
      [sign]: { displayText: '', isActive: true, currentWordIndex: 0 }
    }));

    console.log(`📊 ESTIMATED SYNC: ${sign} (${currentLang}) - ${words.length} words, ${estimatedInterval}ms per word`);

    typewriterResets[sign] = setInterval(() => {
      if (currentWordIndex < words.length) {
        const displayText = words.slice(0, currentWordIndex + 1).join(' ');
        
        setTypewriterResets(prev => ({
          ...prev,
          [sign]: {
            ...prev[sign],
            displayText,
            currentWordIndex: currentWordIndex + 1
          }
        }));
        currentWordIndex++;
      } else {
        clearInterval(typewriterResets[sign]);
        setTypewriterResets(prev => ({
          ...prev,
          [sign]: { 
            ...prev[sign], 
            isActive: false,
            displayText: text
          }
        }));
        console.log(`✅ ESTIMATED SYNC COMPLETE: ${sign}`);
      }
    }, estimatedInterval);
  };

  // Stop typewriter effect
  const stopTypewriterEffect = (sign) => {
    if (typewriterResets[sign]) {
      clearInterval(typewriterResets[sign]);
    }
    setTypewriterResets(prev => ({
      ...prev,
      [sign]: { displayText: '', isActive: false }
    }));
  };

  // Complete typewriter effect (show full text)
  const completeTypewriterEffect = (sign, text) => {
    if (typewriterResets[sign]) {
      clearInterval(typewriterResets[sign]);
    }
    setTypewriterResets(prev => ({
      ...prev,
      [sign]: { displayText: text, isActive: false }
    }));
  };

  // Get display text for a sign
  const getDisplayText = (sign, reading) => {
    const currentLang = i18n.language;
    const fullText = currentLang === 'ar' ? reading.text_ar : reading.text_en;
    
    if (typewriterResets[sign]?.isActive) {
      return typewriterResets[sign].displayText;
    } else if (typewriterResets[sign]?.displayText) {
      return typewriterResets[sign].displayText;
    }
    
    return fullText;
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

  return (
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
            {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </motion.div>

        {/* Zodiac Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Object.keys(zodiacSigns).map((signKey, index) => {
            const signData = zodiacSigns[signKey];
            const reading = zodiacReadings.find(r => r.zodiac_sign === signKey);
            const isPlaying = playingSign === signKey;
            const currentLang = i18n.language;

            return (
              <motion.div
                key={signKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative group"
              >
                <div className={`
                  relative p-6 rounded-2xl backdrop-blur-sm border border-white/10
                  bg-gradient-to-br ${signData.color} bg-opacity-10
                  hover:bg-opacity-20 transition-all duration-300
                  ${isPlaying ? 'ring-2 ring-purple-400 shadow-lg shadow-purple-400/25' : ''}
                `}>
                  {/* Sign Header */}
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">{signData.emoji}</div>
                    <h3 className="text-xl font-bold text-white">
                      {signData.name[currentLang]}
                    </h3>
                    <div className="text-2xl text-purple-300 mb-1">{signData.symbol}</div>
                    <div className="text-xs text-gray-400">
                      {signData.dates[currentLang]}
                    </div>
                  </div>

                  {/* Reading Content */}
                  {reading ? (
                    <div className="space-y-4">
                      {/* Audio Control */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => isPlaying ? handlePauseAudio(signKey, reading) : handlePlayAudio(signKey, reading)}
                          disabled={!reading.audio_ar_url && !reading.audio_en_url}
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-full
                            transition-all duration-300 group/btn
                            ${isPlaying 
                              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' 
                              : 'bg-white/10 hover:bg-white/20 text-white'
                            }
                            ${(!reading.audio_ar_url && !reading.audio_en_url) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                          `}
                        >
                          {isPlaying ? (
                            <PauseIcon className="w-4 h-4" />
                          ) : (
                            <PlayIcon className="w-4 h-4" />
                          )}
                          <SpeakerWaveIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {isPlaying ? t('dailyZodiac.pause') : t('dailyZodiac.listen')}
                          </span>
                        </button>
                      </div>

                      {/* Horoscope Text */}
                      <div className="min-h-[120px] text-center">
                        <AnimatePresence>
                          <motion.p
                            key={`${signKey}-${currentLang}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`
                              text-sm text-gray-200 leading-relaxed
                              ${isPlaying ? 'text-purple-200' : ''}
                              ${currentLang === 'ar' ? 'text-right' : 'text-left'}
                            `}
                          >
                            {getDisplayText(signKey, reading)}
                            {typewriterResets[signKey]?.isActive && (
                              <span className="animate-pulse text-purple-400">|</span>
                            )}
                          </motion.p>
                        </AnimatePresence>
                      </div>

                      {/* Voice Provider Badge */}
                      <div className="text-center">
                        <span className="inline-block px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full">
                          {t('dailyZodiac.voiceBy')} {reading.voice_provider === 'openai' ? 'OpenAI' : 'ElevenLabs'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-sm">
                        {t('dailyZodiac.noReading')}
                      </div>
                    </div>
                  )}

                  {/* Cosmic Glow Effect */}
                  {isPlaying && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/20 to-pink-400/20 animate-pulse pointer-events-none" />
                  )}
                </div>
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
  );
};

export default DailyZodiacSection; 