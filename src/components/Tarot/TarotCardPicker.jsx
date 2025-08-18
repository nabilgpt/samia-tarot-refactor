import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Sparkles, Eye, RotateCcw } from 'lucide-react';
import api from '../../services/frontendApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

const TarotCardPicker = ({ 
  bookingId, 
  sessionId, 
  spreadConfig, 
  onCardsSelected,
  onSessionComplete 
}) => {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [isShuffling, setIsShuffling] = useState(false);
  const [currentStep, setCurrentStep] = useState('shuffle'); // shuffle, select, reveal, complete
  const [revealIndex, setRevealIndex] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState('');

  // Initialize deck
  useEffect(() => {
    loadTarotDeck();
  }, []);

  const loadTarotDeck = async () => {
    try {
      const result = await api.getTarotDeck();
      if (result.success) {
        setCards(result.data);
      } else {
        setError('Failed to load tarot deck');
      }
    } catch (err) {
      setError('Error loading tarot deck');
    }
  };

  const shuffleDeck = async () => {
    setIsShuffling(true);
    setError('');

    // Visual shuffle animation
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Shuffle and prepare cards for selection
      const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
      setCards(shuffledCards);
      setCurrentStep('select');
    } catch (err) {
      setError('Error shuffling cards');
    } finally {
      setIsShuffling(false);
    }
  };

  const selectCard = async (cardIndex) => {
    if (selectedCards.length >= spreadConfig.card_count) return;

    const card = cards[cardIndex];
    const isReversed = Math.random() < 0.3; // 30% chance of reversed card

    const newSelection = {
      position: selectedCards.length + 1,
      card_id: card.id,
      card: card,
      is_reversed: isReversed,
      selected_at: new Date().toISOString()
    };

    const updatedSelection = [...selectedCards, newSelection];
    setSelectedCards(updatedSelection);

    // If we've selected all cards, move to reveal phase
    if (updatedSelection.length === spreadConfig.card_count) {
      setCurrentStep('reveal');
      await saveCardSelection(updatedSelection);
      startRevealSequence();
    }
  };

  const saveCardSelection = async (selection) => {
    try {
      const result = await api.saveCardSelection(sessionId, {
        booking_id: bookingId,
        cards_drawn: selection,
        spread_id: spreadConfig.id
      });

      if (!result.success) {
        setError('Failed to save card selection');
      }
    } catch (err) {
      setError('Error saving cards');
    }
  };

  const startRevealSequence = () => {
    setIsRevealing(true);
    setRevealIndex(0);
  };

  const revealNextCard = () => {
    if (revealIndex < selectedCards.length - 1) {
      setRevealIndex(revealIndex + 1);
    } else {
      // All cards revealed
      setCurrentStep('complete');
      setIsRevealing(false);
      onCardsSelected && onCardsSelected(selectedCards);
    }
  };

  const resetSelection = () => {
    setSelectedCards([]);
    setFlippedCards(new Set());
    setCurrentStep('shuffle');
    setRevealIndex(0);
    setIsRevealing(false);
  };

  const renderShufflePhase = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Prepare Your Reading
        </h2>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          Take a moment to focus on your question. When you&apos;re ready, shuffle the cards to begin.
        </p>
      </div>

      <motion.button
        onClick={shuffleDeck}
        disabled={isShuffling}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isShuffling ? (
          <div className="flex items-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="mr-3"
            >
              <Shuffle className="w-6 h-6" />
            </motion.div>
            Shuffling Cards...
          </div>
        ) : (
          <div className="flex items-center">
            <Shuffle className="w-6 h-6 mr-3" />
            Shuffle the Deck
          </div>
        )}
      </motion.button>
    </motion.div>
  );

  const renderSelectionPhase = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-8"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Select Your Cards
        </h2>
        <p className="text-gray-600">
          Choose {spreadConfig.card_count} cards that call to you
        </p>
        <div className="mt-4">
          <span className="text-lg font-semibold text-purple-600">
            {selectedCards.length} / {spreadConfig.card_count} selected
          </span>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 max-w-6xl mx-auto">
        {cards.slice(0, 24).map((card, index) => (
          <motion.div
            key={`${card.id}-${index}`}
            className="relative cursor-pointer"
            onClick={() => selectCard(index)}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="aspect-[2/3] bg-gradient-to-br from-indigo-900 to-purple-900 rounded-lg shadow-lg border-2 border-purple-300 flex items-center justify-center">
              <div className="text-center text-white">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-60" />
                <div className="text-xs opacity-80">Tarot</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Selected Cards Preview */}
      {selectedCards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 text-center"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Selected Cards
          </h3>
          <div className="flex justify-center gap-4 flex-wrap">
            {selectedCards.map((selection, index) => (
              <motion.div
                key={selection.card_id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="w-16 h-24 bg-gradient-to-br from-purple-600 to-indigo-600 rounded shadow-md flex items-center justify-center"
              >
                <span className="text-white font-bold">{index + 1}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  const renderRevealPhase = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-8"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Your Cards Revealed
        </h2>
        <p className="text-gray-600">
          Watch as your cards reveal themselves one by one
        </p>
      </div>

      {/* Spread Layout */}
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
          {selectedCards.map((selection, index) => (
            <motion.div
              key={selection.card_id}
              className="text-center"
              initial={{ opacity: 0, y: 50 }}
              animate={{ 
                opacity: index <= revealIndex ? 1 : 0.3,
                y: index <= revealIndex ? 0 : 50 
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Position Label */}
              <div className="mb-4">
                <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                  {spreadConfig.positions[index]?.name || `Card ${index + 1}`}
                </span>
              </div>

              {/* Card */}
              <motion.div
                className="relative w-32 h-48 mx-auto mb-4"
                initial={{ rotateY: 0 }}
                animate={{ rotateY: index <= revealIndex ? 180 : 0 }}
                transition={{ duration: 1, delay: index === revealIndex ? 0.5 : 0 }}
              >
                {/* Card Back */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-lg shadow-xl border-2 border-purple-300 flex items-center justify-center backface-hidden">
                  <Sparkles className="w-12 h-12 text-white opacity-60" />
                </div>

                {/* Card Front */}
                {index <= revealIndex && (
                  <motion.div
                    className="absolute inset-0 bg-white rounded-lg shadow-xl border-2 border-gray-200 overflow-hidden"
                    style={{ transform: 'rotateY(180deg)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                  >
                    {selection.card.image_url ? (
                      <img
                        src={selection.is_reversed ? selection.card.image_reversed_url || selection.card.image_url : selection.card.image_url}
                        alt={selection.card.name}
                        className={`w-full h-full object-cover ${selection.is_reversed ? 'transform rotate-180' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100">
                        <div className="text-center p-4">
                          <Eye className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                          <div className="text-sm font-medium text-purple-800">
                            {selection.card.name}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>

              {/* Card Name with Typewriter Effect */}
              {index <= revealIndex && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="text-center"
                >
                  <TypewriterText
                    text={`${selection.card.name}${selection.is_reversed ? ' (Reversed)' : ''}`}
                    className="text-lg font-semibold text-gray-900"
                    speed={50}
                  />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Next Card Button */}
        {isRevealing && revealIndex < selectedCards.length - 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="text-center mt-8"
          >
            <button
              onClick={revealNextCard}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Reveal Next Card
            </button>
          </motion.div>
        )}

        {/* Complete Button */}
        {!isRevealing && currentStep === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8"
          >
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Your Cards Have Been Drawn
              </h3>
              <p className="text-gray-600">
                Your reader will now provide your interpretation
              </p>
            </div>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={resetSelection}
                className="flex items-center px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Draw Again
              </button>
              
              {onSessionComplete && (
                <button
                  onClick={() => onSessionComplete(selectedCards)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Continue to Reading
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  // Typewriter effect component
  const TypewriterText = ({ text, className, speed = 100 }) => {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
      if (currentIndex < text.length) {
        const timeout = setTimeout(() => {
          setDisplayText(prev => prev + text[currentIndex]);
          setCurrentIndex(prev => prev + 1);
        }, speed);

        return () => clearTimeout(timeout);
      }
    }, [currentIndex, text, speed]);

    return <div className={className}>{displayText}</div>;
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => {
            setError('');
            loadTarotDeck();
          }}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {currentStep === 'shuffle' && renderShufflePhase()}
          {currentStep === 'select' && renderSelectionPhase()}
          {currentStep === 'reveal' && renderRevealPhase()}
          {currentStep === 'complete' && renderRevealPhase()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TarotCardPicker; 