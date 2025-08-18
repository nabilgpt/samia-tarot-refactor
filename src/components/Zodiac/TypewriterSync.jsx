import React, { useState, useEffect, useRef, useCallback } from 'react';

// =====================================================
// TYPEWRITER SYNC COMPONENT - PRODUCTION SYSTEM
// =====================================================
// 🚨 CRITICAL: Perfect synchronization between typewriter text and TTS audio
// Auto-adjusts timing to match audio duration exactly

const TypewriterSync = ({ 
  text, 
  audioRef, 
  isPlaying, 
  onComplete, 
  language = 'en',
  className = '',
  resetTrigger = 0
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const wordsRef = useRef([]);
  const timingRef = useRef({
    intervalTime: 100,
    totalDuration: 0,
    wordsPerSecond: 2
  });

  // 🚨 CRITICAL: Calculate precise timing based on audio duration
  const calculateTiming = useCallback(() => {
    if (!text || !audioRef?.current) return;

    const audio = audioRef.current;
    const audioDuration = audio.duration;
    
    // Split text into words for smooth progression
    const words = text.split(' ');
    wordsRef.current = words;
    
    if (!audioDuration || audioDuration === 0) {
      // Fallback timing if audio duration not available
      const fallbackDuration = language === 'ar' 
        ? words.length * 0.8  // Syrian Arabic: slower pace
        : words.length * 0.6; // English: standard pace
        
      timingRef.current = {
        intervalTime: (fallbackDuration * 1000) / words.length,
        totalDuration: fallbackDuration,
        wordsPerSecond: words.length / fallbackDuration
      };
    } else {
      // Perfect sync with actual audio duration
      timingRef.current = {
        intervalTime: (audioDuration * 1000) / words.length,
        totalDuration: audioDuration,
        wordsPerSecond: words.length / audioDuration
      };
    }

    // Minimum intervals for readability
    const minInterval = language === 'ar' ? 400 : 300; // Arabic needs more time
    if (timingRef.current.intervalTime < minInterval) {
      timingRef.current.intervalTime = minInterval;
    }

    console.log('🎯 Typewriter timing calculated:', {
      words: words.length,
      audioDuration: audioDuration || 'fallback',
      intervalTime: timingRef.current.intervalTime,
      language
    });
  }, [text, audioRef, language]);

  // 🚨 CRITICAL: Start typewriter effect synchronized with audio
  const startTypewriter = useCallback(() => {
    if (!text || isActive) return;

    calculateTiming();
    
    setIsActive(true);
    setIsPaused(false);
    setCurrentIndex(0);
    setDisplayedText('');
    startTimeRef.current = Date.now();
    pausedTimeRef.current = 0;

    console.log('🚀 Starting typewriter sync with audio');

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const words = wordsRef.current;
        const nextIndex = prevIndex + 1;
        
        if (nextIndex <= words.length) {
          // Build displayed text progressively
          const newText = words.slice(0, nextIndex).join(' ');
          setDisplayedText(newText);
          
          // Check if we've completed all words
          if (nextIndex === words.length) {
            // Typewriter completed
            setIsActive(false);
            clearInterval(intervalRef.current);
            onComplete && onComplete();
            console.log('✅ Typewriter completed');
          }
          
          return nextIndex;
        }
        
        return prevIndex;
      });
    }, timingRef.current.intervalTime);
  }, [text, isActive, calculateTiming, onComplete]);

  // 🚨 CRITICAL: Pause typewriter when audio pauses
  const pauseTypewriter = useCallback(() => {
    if (!isActive || isPaused) return;

    setIsPaused(true);
    clearInterval(intervalRef.current);
    pausedTimeRef.current += Date.now() - startTimeRef.current;
    
    console.log('⏸️ Typewriter paused');
  }, [isActive, isPaused]);

  // 🚨 CRITICAL: Resume typewriter when audio resumes
  const resumeTypewriter = useCallback(() => {
    if (!isActive || !isPaused) return;

    setIsPaused(false);
    startTimeRef.current = Date.now();
    
    console.log('▶️ Typewriter resumed');
    
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const words = wordsRef.current;
        const nextIndex = prevIndex + 1;
        
        if (nextIndex <= words.length) {
          const newText = words.slice(0, nextIndex).join(' ');
          setDisplayedText(newText);
          
          if (nextIndex === words.length) {
            setIsActive(false);
            clearInterval(intervalRef.current);
            onComplete && onComplete();
            console.log('✅ Typewriter completed after resume');
          }
          
          return nextIndex;
        }
        
        return prevIndex;
      });
    }, timingRef.current.intervalTime);
  }, [isActive, isPaused, onComplete]);

  // 🚨 CRITICAL: Stop and reset typewriter
  const stopTypewriter = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    setCurrentIndex(0);
    setDisplayedText('');
    clearInterval(intervalRef.current);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    
    console.log('🛑 Typewriter stopped and reset');
  }, []);

  // 🚨 CRITICAL: Sync with audio play/pause state
  useEffect(() => {
    if (isPlaying && !isActive && !isPaused) {
      // Audio started - start typewriter
      startTypewriter();
    } else if (!isPlaying && isActive && !isPaused) {
      // Audio paused - pause typewriter
      pauseTypewriter();
    } else if (isPlaying && isActive && isPaused) {
      // Audio resumed - resume typewriter
      resumeTypewriter();
    } else if (!isPlaying && !isActive) {
      // Audio stopped - reset typewriter
      stopTypewriter();
    }
  }, [isPlaying, isActive, isPaused, startTypewriter, pauseTypewriter, resumeTypewriter, stopTypewriter]);

  // Reset when text changes or reset trigger changes
  useEffect(() => {
    stopTypewriter();
  }, [text, resetTrigger, stopTypewriter]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
    };
  }, []);

  // 🚨 CRITICAL: Handle audio events for perfect sync
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      calculateTiming();
    };

    const handleEnded = () => {
      // Ensure typewriter completes when audio ends
      if (isActive) {
        setDisplayedText(text);
        setIsActive(false);
        clearInterval(intervalRef.current);
        onComplete && onComplete();
        console.log('🎵 Audio ended - typewriter completed');
      }
    };

    const handleTimeUpdate = () => {
      // Sync check: ensure typewriter progress matches audio progress
      if (isActive && !isPaused && audio.duration > 0) {
        const audioProgress = audio.currentTime / audio.duration;
        const expectedWordIndex = Math.floor(audioProgress * wordsRef.current.length);
        
        // If typewriter is significantly behind audio, catch up
        if (Math.abs(currentIndex - expectedWordIndex) > 2) {
          console.log('🔄 Syncing typewriter with audio progress');
          setCurrentIndex(expectedWordIndex);
          setDisplayedText(wordsRef.current.slice(0, expectedWordIndex).join(' '));
        }
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioRef, isActive, isPaused, currentIndex, text, calculateTiming, onComplete]);

  return (
    <div className={`typewriter-sync ${className}`}>
      <div 
        className={`typewriter-text ${language === 'ar' ? 'text-right' : 'text-left'}`}
        style={{
          minHeight: '1.5em',
          lineHeight: '1.6',
          fontFamily: language === 'ar' ? 'Cairo, sans-serif' : 'Inter, sans-serif'
        }}
      >
        {displayedText}
        {isActive && !isPaused && (
          <span className="typewriter-cursor animate-pulse">|</span>
        )}
      </div>
      
      {/* Debug info (remove in production) */}
      {import.meta.env.MODE === 'development' && (
        <div className="text-xs text-gray-500 mt-2">
          <div>Progress: {currentIndex}/{wordsRef.current.length} words</div>
          <div>Status: {isActive ? (isPaused ? 'Paused' : 'Active') : 'Inactive'}</div>
          <div>Interval: {timingRef.current.intervalTime}ms</div>
        </div>
      )}
    </div>
  );
};

export default TypewriterSync; 