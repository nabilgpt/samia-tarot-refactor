import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import SpreadBasedReading from './SpreadBasedReading';
import EnhancedReadingResults from './EnhancedReadingResults';
import { SpreadAPI } from '../../api/spreadApi';
import { TarotAPI } from '../../api/tarotApi';

const TarotSystem = ({ 
  bookingId,
  serviceId,
  readerId,
  mode = 'full', // 'full', 'quick', 'demo'
  onComplete,
  onBack 
}) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { language, showSuccess, showError } = useUI();
  
  const [currentView, setCurrentView] = useState('reading'); // 'reading', 'results'
  const [readingData, setReadingData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing reading session
  useEffect(() => {
    checkExistingSession();
  }, [bookingId]);

  const checkExistingSession = async () => {
    if (!bookingId) return;
    
    setIsLoading(true);
    try {
      // Check if there's an existing spread selection
      const selectionResult = await SpreadAPI.getClientSpreadSelection(bookingId);
      
      if (selectionResult.success && selectionResult.data?.is_completed) {
        // There's a completed selection, check for reading results
        const readingResult = await TarotAPI.getBookingReading(bookingId);
        
        if (readingResult.success && readingResult.data) {
          setReadingData(readingResult.data);
          setCurrentView('results');
        }
      }
    } catch (error) {
      console.error('Failed to check existing session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReadingComplete = (reading) => {
    setReadingData(reading);
    setCurrentView('results');
    
    // If there's a completion callback, call it
    if (onComplete) {
      onComplete(reading);
    }
  };

  const handleNewReading = async () => {
    try {
      // Clear existing session data
      if (bookingId) {
        await SpreadAPI.clearBookingSession(bookingId);
      }
      
      // Reset state
      setReadingData(null);
      setCurrentView('reading');
      
      showSuccess(
        language === 'ar' 
          ? 'تم إعداد جلسة قراءة جديدة'
          : 'New reading session prepared'
      );
    } catch (error) {
      showError('Failed to start new reading');
    }
  };

  const handleBack = () => {
    if (currentView === 'results') {
      setCurrentView('reading');
    } else if (onBack) {
      onBack();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-purple-900/20 to-dark-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {currentView === 'reading' && (
          <motion.div
            key="reading"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            <SpreadBasedReading
              bookingId={bookingId}
              serviceId={serviceId}
              readerId={readerId}
              onReadingComplete={handleReadingComplete}
              onBack={handleBack}
            />
          </motion.div>
        )}
        
        {currentView === 'results' && readingData && (
          <motion.div
            key="results"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="min-h-screen bg-gradient-to-br from-dark-900 via-purple-900/20 to-dark-900 relative overflow-hidden"
          >
            {/* Cosmic background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold-400/5 rounded-full blur-3xl" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-600/5 to-pink-600/5 rounded-full blur-3xl" />
            </div>
            
            <div className="relative z-10 px-4 py-16">
              <EnhancedReadingResults
                spread={readingData.spread}
                cards={readingData.cards_drawn}
                question={readingData.question}
                questionCategory={readingData.question_category}
                reading={readingData}
                readerId={readerId}
                onNewReading={handleNewReading}
                onBack={handleBack}
                onComplete={onComplete}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TarotSystem; 