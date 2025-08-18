import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Star, 
  Eye, 
  Lock, 
  CheckCircle, 
  Clock,
  ArrowRight,
  Hand,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/frontendApi.js';

const ManualCardOpeningInterface = ({ 
  sessionId, 
  spread, 
  question,
  onCardOpened, 
  onAllCardsOpened,
  readerId 
}) => {
  const { profile } = useAuth();
  const socket = useSocket();
  
  const [openedCards, setOpenedCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isOpening, setIsOpening] = useState(false);
  const [cardData, setCardData] = useState([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [error, setError] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Initialize card positions based on spread
  useEffect(() => {
    if (spread?.positions) {
      const initialCards = spread.positions.map((position, index) => ({
        id: `card-${index}`,
        position: index,
        positionName: position.name || `Card ${index + 1}`,
        positionMeaning: position.meaning || '',
        x: position.x || 50,
        y: position.y || 50,
        isOpened: false,
        card: null,
        openedAt: null
      }));
      setCardData(initialCards);
    }
  }, [spread]);

  // WebSocket event handlers for live sync
  useEffect(() => {
    if (socket && sessionId) {
      socket.emit('join-reading-session', { sessionId, userType: 'client' });
      
      // Listen for reader connection
      socket.on('reader-connected', (data) => {
        console.log('📡 Reader connected to session:', data);
      });

      // Listen for session updates
      socket.on('session-updated', (data) => {
        console.log('📡 Session updated:', data);
      });

      return () => {
        socket.off('reader-connected');
        socket.off('session-updated');
      };
    }
  }, [socket, sessionId]);

  // Play cosmic sound effect
  const playCardSound = useCallback(() => {
    if (audioEnabled) {
      try {
        const audio = new Audio('/sounds/card-flip.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio play failed:', e));
      } catch (e) {
        // Silently handle audio errors
      }
    }
  }, [audioEnabled]);

  // Open a specific card
  const openCard = async (cardIndex) => {
    if (cardIndex !== currentCardIndex || isOpening || sessionComplete) {
      return;
    }

    if (cardData[cardIndex]?.isOpened) {
      return;
    }

    setIsOpening(true);
    setError('');

    try {
      // Call API to reveal the card
      const result = await api.openCard(sessionId, {
        cardIndex,
        position: spread.positions[cardIndex],
        timestamp: new Date().toISOString()
      });

      if (result.success) {
        const revealedCard = result.data.card;
        
        // Update local state
        const updatedCardData = [...cardData];
        updatedCardData[cardIndex] = {
          ...updatedCardData[cardIndex],
          isOpened: true,
          card: revealedCard,
          openedAt: new Date().toISOString()
        };
        setCardData(updatedCardData);
        setOpenedCards(prev => [...prev, revealedCard]);

        // Play sound effect
        playCardSound();

        // Emit to reader via WebSocket
        if (socket) {
          socket.emit('card-opened', {
            sessionId,
            cardIndex,
            cardData: revealedCard,
            position: spread.positions[cardIndex],
            timestamp: Date.now(),
            clientId: profile.id
          });
        }

        // Move to next card or complete session
        if (cardIndex < spread.positions.length - 1) {
          setCurrentCardIndex(cardIndex + 1);
          onCardOpened && onCardOpened(revealedCard, cardIndex);
        } else {
          // All cards opened
          setSessionComplete(true);
          onAllCardsOpened && onAllCardsOpened(updatedCardData);
          
          // Notify reader of completion
          if (socket) {
            socket.emit('session-completed', {
              sessionId,
              allCards: updatedCardData,
              completedAt: Date.now()
            });
          }
        }
      } else {
        setError(result.error || 'Failed to open card');
      }
    } catch (err) {
      setError('Error opening card. Please try again.');
      console.error('Card opening error:', err);
    } finally {
      setIsOpening(false);
    }
  };

  // Card position component
  const CardPosition = ({ card, index, canOpen, onClick }) => {
    const isActive = index === currentCardIndex;
    const isOpened = card.isOpened;
    const isPending = index > currentCardIndex;

    return (
      <motion.div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
        style={{ left: `${card.x}%`, top: `${card.y}%` }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.2 }}
        onClick={() => canOpen && onClick(index)}
        whileHover={canOpen ? { scale: 1.05 } : {}}
        whileTap={canOpen ? { scale: 0.95 } : {}}
      >
        {/* Position Label */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-10">
          <span className="text-xs font-medium text-purple-300 bg-purple-900/50 px-2 py-1 rounded-full border border-purple-500/30">
            {card.positionName}
          </span>
        </div>

        {/* Card Container */}
        <div className={`relative w-24 h-36 perspective-1000 ${canOpen ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
          <motion.div
            className="card-inner w-full h-full"
            animate={{ rotateY: isOpened ? 180 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Card Back */}
            <div className="card-face absolute inset-0 backface-hidden">
              <div className={`w-full h-full rounded-lg border-2 transition-all duration-300 ${
                isActive 
                  ? 'border-gold-400 shadow-lg shadow-gold-400/25 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900' 
                  : isPending
                  ? 'border-gray-500 bg-gradient-to-br from-gray-800 to-gray-900'
                  : 'border-purple-500/50 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900'
              }`}>
                {/* Card Back Design */}
                <div className="w-full h-full flex items-center justify-center p-2">
                  <div className="text-center">
                    {isActive ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-8 h-8 text-gold-400 mx-auto mb-2" />
                      </motion.div>
                    ) : isPending ? (
                      <Lock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    ) : (
                      <Star className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                    )}
                    
                    <div className="text-xs text-white opacity-80">
                      {index + 1}
                    </div>
                    
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-gold-300 mt-1"
                      >
                        Tap to Open
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Cosmic Glow Effect for Active Card */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(255, 215, 0, 0.3)',
                        '0 0 30px rgba(255, 215, 0, 0.5)',
                        '0 0 20px rgba(255, 215, 0, 0.3)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Card Front (Revealed) */}
              {isOpened && card.card && (
                <div 
                  className="card-face absolute inset-0 backface-hidden bg-white rounded-lg shadow-xl border-2 border-gold-400 overflow-hidden"
                  style={{ transform: 'rotateY(180deg)' }}
                >
                  {card.card.image_url ? (
                    <img
                      src={card.card.is_reversed ? 
                        card.card.image_reversed_url || card.card.image_url : 
                        card.card.image_url
                      }
                      alt={card.card.name}
                      className={`w-full h-full object-cover ${
                        card.card.is_reversed ? 'transform rotate-180' : ''
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100">
                      <div className="text-center p-2">
                        <Eye className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                        <div className="text-xs font-medium text-purple-800">
                          {card.card.name}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reversed Indicator */}
                  {card.card.is_reversed && (
                    <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded">
                      Rev
                    </div>
                  )}

                  {/* Opening Animation Overlay */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-gold-400/20 to-purple-400/20"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Status Icon */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          {isOpened ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : isActive ? (
            <Hand className="w-4 h-4 text-gold-400" />
          ) : isPending ? (
            <Clock className="w-4 h-4 text-gray-400" />
          ) : null}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="manual-card-opening-interface min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-3xl font-bold text-white mb-2">
            Your Tarot Reading
          </h2>
          <p className="text-purple-300 text-lg">
            {spread?.name || 'Custom Spread'}
          </p>
          {question && (
            <div className="mt-4 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30 max-w-2xl mx-auto">
              <p className="text-purple-200 text-sm font-medium mb-1">Your Question:</p>
              <p className="text-white italic">"{question}"</p>
            </div>
          )}
        </motion.div>

        {/* Progress Indicator */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-300">Progress</span>
            <span className="text-sm text-purple-300">
              {openedCards.length} / {spread?.positions?.length || 0}
            </span>
          </div>
          <div className="w-full bg-purple-900/50 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-gold-400 to-purple-400 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `${(openedCards.length / (spread?.positions?.length || 1)) * 100}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg"
        >
          <p className="text-red-300 text-sm text-center">{error}</p>
        </motion.div>
      )}

      {/* Card Spread Layout */}
      <div className="relative w-full max-w-6xl mx-auto">
        <div className="relative min-h-96 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-xl border border-purple-500/30 overflow-hidden">
          {/* Cosmic Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-pulse" />
            <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-gold-400 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
          </div>

          {/* Cards */}
          {cardData.map((card, index) => (
            <CardPosition
              key={card.id}
              card={card}
              index={index}
              canOpen={index === currentCardIndex && !isOpening && !sessionComplete}
              onClick={openCard}
            />
          ))}

          {/* Loading Overlay */}
          {isOpening && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center z-20"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mb-4"
                >
                  <Zap className="w-12 h-12 text-gold-400 mx-auto" />
                </motion.div>
                <p className="text-white text-lg">Revealing your card...</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Instructions */}
      {!sessionComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-8"
        >
          <div className="max-w-md mx-auto p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <div className="flex items-center justify-center mb-2">
              <Hand className="w-5 h-5 text-gold-400 mr-2" />
              <span className="text-purple-300 font-medium">How to Open Cards</span>
            </div>
            <p className="text-purple-200 text-sm">
              Tap the glowing card to reveal it. Cards must be opened in order, one at a time.
            </p>
          </div>
        </motion.div>
      )}

      {/* Session Complete */}
      {sessionComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
        >
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-8 rounded-xl border-2 border-gold-400 max-w-md mx-4 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-6"
            >
              <Sparkles className="w-16 h-16 text-gold-400 mx-auto" />
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-4">
              Reading Complete!
            </h3>
            <p className="text-purple-200 mb-6">
              All cards have been revealed. Your reader will now provide the interpretation.
            </p>
            <motion.div
              className="flex items-center justify-center text-gold-300"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Clock className="w-5 h-5 mr-2" />
              <span>Waiting for reader...</span>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Audio Toggle */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`p-3 rounded-full border-2 transition-all ${
            audioEnabled 
              ? 'bg-purple-600 border-purple-400 text-white' 
              : 'bg-gray-600 border-gray-400 text-gray-300'
          }`}
        >
          {audioEnabled ? '🔊' : '🔇'}
        </button>
      </div>
    </div>
  );
};

export default ManualCardOpeningInterface; 