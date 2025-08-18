import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlayIcon, PauseIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

// =====================================================
// ZODIAC CARD MODAL COMPONENT
// =====================================================
// Modal popup with perfect audio-text synchronization

const ZodiacCardModal = ({ 
  isOpen, 
  onClose, 
  zodiacData, 
  reading, 
  signInfo 
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  
  // Audio states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState(null);
  
  // Typewriter states
  const [displayText, setDisplayText] = useState('');
  const [wordTimings, setWordTimings] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  
  // Refs
  const audioRef = useRef(null);
  const syncTimerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Get text and audio URL
  const fullText = currentLang === 'ar' ? reading?.text_ar : reading?.text_en;
  const audioUrl = currentLang === 'ar' ? reading?.audio_ar_url : reading?.audio_en_url;

  // Initialize component
  useEffect(() => {
    if (isOpen && reading) {
      resetState();
      extractWordTimings();
      
      // Auto-play after modal animation (300ms delay)
      const autoPlayTimer = setTimeout(() => {
        if (audioUrl && audioRef.current) {
          playAudio();
        }
      }, 300);

      return () => clearTimeout(autoPlayTimer);
    }
  }, [isOpen, reading, currentLang]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCharacterSync();
      resetState();
    };
  }, []);

  // Extract or generate word timings
  const extractWordTimings = () => {
    if (!fullText) return;

    // Check if reading has word timings
    const wordTimingsData = currentLang === 'ar' ? reading?.word_timings_ar : reading?.word_timings_en;
    
    if (wordTimingsData && Array.isArray(wordTimingsData) && wordTimingsData.length > 0) {
      console.log(`📊 Using real word timings: ${wordTimingsData.length} words`);
      setWordTimings(wordTimingsData);
    } else {
      // Generate estimated timings
      console.log('⚠️ No real timings found, generating estimated timings');
      const words = fullText.split(/\s+/);
      const estimatedTimings = generateEstimatedTimings(words, currentLang);
      setWordTimings(estimatedTimings);
    }
  };

  // Generate estimated word timings with Syrian Arabic characteristics
  const generateEstimatedTimings = (words, language) => {
    const baseSpeed = language === 'ar' ? 0.6 : 0.4; // Syrian Arabic: 600ms, English: 400ms
    
    let currentTime = 0;
    const timings = words.map((word, index) => {
      let wordDuration = baseSpeed;
      
      if (language === 'ar') {
        // Syrian Arabic timing adjustments
        if (word.length > 6) wordDuration += 0.2; // Longer words
        if (word.includes('ّ') || word.includes('ً')) wordDuration += 0.1; // Diacritics
        if (['حبيبي', 'روحي', 'يلا', 'شلونك', 'أهلاً', 'وسهلاً'].includes(word)) wordDuration += 0.15; // Expressive words
        if (word.endsWith('،') || word.endsWith('.') || word.endsWith('؟') || word.endsWith('!')) wordDuration += 0.3; // Punctuation pauses
      } else {
        // English timing adjustments
        if (word.length > 7) wordDuration += 0.15;
        if (word.endsWith(',') || word.endsWith('.') || word.endsWith('?') || word.endsWith('!')) wordDuration += 0.2;
      }

      const timing = {
        word,
        start: currentTime,
        end: currentTime + wordDuration
      };
      
      currentTime += wordDuration;
      return timing;
    });

    console.log(`📊 Generated ${timings.length} estimated word timings for ${language}, total duration: ${currentTime.toFixed(1)}s`);
    return timings;
  };

  // Play audio with character sync
  const playAudio = async () => {
    try {
      if (!audioRef.current || !audioUrl) {
        setAudioError('Audio not available');
        return;
      }

      setAudioError(null);
      setIsPlaying(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();

      await audioRef.current.play();
      startCharacterSync();
      
      console.log('▶️ Audio playback started with character-by-character sync');
    } catch (error) {
      console.error('❌ Audio play error:', error);
      setAudioError('Failed to play audio');
      setIsPlaying(false);
    }
  };

  // Pause audio and sync
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
      stopCharacterSync();
      console.log('⏸️ Audio paused');
    }
  };

  // Resume audio and sync
  const resumeAudio = async () => {
    try {
      if (audioRef.current) {
        await audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
        startCharacterSync();
        console.log('▶️ Audio resumed');
      }
    } catch (error) {
      console.error('❌ Audio resume error:', error);
      setAudioError('Failed to resume audio');
    }
  };

  // Stop audio completely
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
    stopCharacterSync();
    resetTypewriter();
  };

  // Start character-by-character synchronization (IMPROVED)
  const startCharacterSync = () => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
    }

    // Ultra-smooth 20ms intervals for perfect character sync
    syncTimerRef.current = setInterval(() => {
      if (audioRef.current && wordTimings.length > 0 && !audioRef.current.paused) {
        const currentTime = audioRef.current.currentTime;
        updateTypewriterAtTime(currentTime);
      }
    }, 20);
    
    console.log('🔄 Started character-by-character sync (20ms intervals)');
  };

  // Stop character synchronization
  const stopCharacterSync = () => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
      console.log('⏹️ Stopped character sync');
    }
  };

  // Update typewriter with PERFECT character-by-character timing
  const updateTypewriterAtTime = (currentTime) => {
    // Find current word
    const currentWordData = wordTimings.find((timing) => 
      currentTime >= timing.start && currentTime < timing.end
    );

    if (currentWordData) {
      const wordIndex = wordTimings.indexOf(currentWordData);
      
      // Calculate precise character progress
      const wordProgress = (currentTime - currentWordData.start) / (currentWordData.end - currentWordData.start);
      const progressClamped = Math.max(0, Math.min(1, wordProgress));
      
      // Build completed words
      const completedWords = wordTimings.slice(0, wordIndex).map(t => t.word);
      const completedText = completedWords.length > 0 ? completedWords.join(' ') + ' ' : '';
      
      // Calculate characters to show in current word
      const currentWord = currentWordData.word;
      const totalChars = currentWord.length;
      
      // Smooth character progression with better timing
      let charsToShow = Math.floor(totalChars * progressClamped);
      
      // Ensure progression starts early and ends properly
      if (progressClamped > 0.05 && charsToShow === 0) charsToShow = 1;
      if (progressClamped > 0.95) charsToShow = totalChars;
      
      const partialWord = currentWord.substring(0, charsToShow);
      const newDisplayText = completedText + partialWord;
      
      // Update only when text changes
      if (newDisplayText !== displayText) {
        setDisplayText(newDisplayText);
        
        if (wordIndex !== currentWordIndex) {
          setCurrentWordIndex(wordIndex);
        }
      }
    } else if (currentTime >= (wordTimings[wordTimings.length - 1]?.end || 0)) {
      // Show complete text when audio ends
      if (displayText !== fullText) {
        setDisplayText(fullText);
        setCurrentWordIndex(wordTimings.length);
      }
    }
  };

  // Reset typewriter state
  const resetTypewriter = () => {
    setCurrentWordIndex(0);
    setDisplayText('');
  };

  // Reset all state
  const resetState = () => {
    stopCharacterSync();
    resetTypewriter();
    setIsPlaying(false);
    setIsPaused(false);
    setAudioError(null);
  };

  // Handle audio events
  const handleAudioLoad = () => {
    setAudioLoaded(true);
    setAudioError(null);
    console.log('✅ Audio loaded successfully');
  };

  const handleAudioError = (error) => {
    console.error('❌ Audio loading error:', error);
    setAudioError('Failed to load audio');
    setAudioLoaded(false);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setIsPaused(false);
    stopCharacterSync();
    
    // Show complete text when audio ends
    setDisplayText(fullText);
    setCurrentWordIndex(wordTimings.length);
    
    console.log('🏁 Audio ended, showing complete text');
  };

  // Handle modal close
  const handleClose = () => {
    stopAudio();
    resetState();
    onClose();
  };

  // Handle click outside modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen || !reading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-gray-900/95 via-purple-900/95 to-black/95 backdrop-blur-sm border border-purple-500/30 rounded-3xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>

          {/* Modal Content */}
          <div className="p-8 space-y-6">
            {/* Zodiac Header */}
            <div className="text-center">
              <div className="text-8xl mb-4">{signInfo.emoji}</div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {signInfo.name[currentLang]}
              </h2>
              <div className="text-4xl text-purple-300 mt-2">{signInfo.symbol}</div>
              <div className="text-sm text-gray-400 mt-1">
                {signInfo.dates[currentLang]}
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex justify-center items-center space-x-4">
              {audioError ? (
                <div className="text-red-400 text-sm text-center">
                  <span className="block">❌ {audioError}</span>
                  <span className="text-xs text-gray-500 mt-1">Audio temporarily unavailable</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={isPlaying ? pauseAudio : (isPaused ? resumeAudio : playAudio)}
                    disabled={!audioLoaded}
                    className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white rounded-full transition-all duration-300 shadow-lg"
                  >
                    {isPlaying ? (
                      <PauseIcon className="w-8 h-8" />
                    ) : (
                      <PlayIcon className="w-8 h-8 ml-1" />
                    )}
                  </button>
                  
                  <div className="flex items-center text-sm text-gray-400">
                    <SpeakerWaveIcon className="w-5 h-5 mr-2" />
                    <span>{reading.voice_provider === 'openai' ? 'OpenAI' : 'ElevenLabs'}</span>
                    {isPlaying && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="ml-2 w-2 h-2 bg-green-400 rounded-full"
                      />
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Character-by-Character Typewriter Text Display */}
            <div className="min-h-[200px] max-h-[300px] overflow-y-auto">
              <div className={`text-lg leading-relaxed ${currentLang === 'ar' ? 'text-right' : 'text-left'}`}>
                {audioError ? (
                  <div className="text-center text-gray-300 p-8">
                    <p className="mb-4">{fullText}</p>
                    <div className="text-sm text-gray-500">
                      Text available • Audio temporarily unavailable
                    </div>
                  </div>
                ) : (
                  <motion.p
                    className="text-gray-200"
                    style={{ 
                      fontFamily: currentLang === 'ar' ? 'Arabic, serif' : 'system-ui, sans-serif',
                      lineHeight: '1.8',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {displayText || (isPlaying ? '' : fullText)}
                  </motion.p>
                )}
              </div>
            </div>

            {/* Progress Indicator */}
            {wordTimings.length > 0 && !audioError && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Word {currentWordIndex} of {wordTimings.length}</span>
                  <span>
                    {isPlaying ? '🔊 Playing' : isPaused ? '⏸️ Paused' : '⏹️ Ready'}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <motion.div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-1 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(currentWordIndex / Math.max(wordTimings.length, 1)) * 100}%` 
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Voice Attribution */}
            <div className="text-center">
              <div className="inline-block px-3 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full">
                🇸🇾 Syrian Arabic • {reading.voice_provider === 'openai' ? 'OpenAI Nova Voice' : 'ElevenLabs TTS'}
              </div>
            </div>
          </div>

          {/* Hidden Audio Element */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onLoadedData={handleAudioLoad}
              onError={handleAudioError}
              onEnded={handleAudioEnded}
              preload="auto"
              style={{ display: 'none' }}
            />
          )}

          {/* Cosmic Background Effects */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZodiacCardModal;
