import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, EyeOff, Clock, CheckCircle, AlertTriangle, Star,
  Lock, Unlock, Sparkles, Heart, Book, Calendar
} from 'lucide-react';
import { getRTLClasses, getMobileRowClasses } from '../../utils/rtlUtils';
import { useResponsive } from '../../hooks/useResponsive';

const TarotV2Reading = ({ readingId, onClose }) => {
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [revealedCards, setRevealedCards] = useState(new Set());
  const [showInterpretations, setShowInterpretations] = useState(false);
  const { isMobile } = useResponsive();

  useEffect(() => {
    if (readingId) {
      fetchReading();
    }
  }, [readingId]);

  const fetchReading = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tarot-v2/client/readings/${readingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch reading');
      }

      const data = await response.json();
      setReading(data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching reading:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCardReveal = (cardIndex) => {
    const newRevealed = new Set(revealedCards);
    newRevealed.add(cardIndex);
    setRevealedCards(newRevealed);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'ready_for_reveal': { 
        icon: Eye, 
        color: 'text-cosmic-accent bg-cosmic-accent/10 border-cosmic-accent/30',
        text: 'Ready to Reveal' 
      },
      'revealed_to_client': { 
        icon: CheckCircle, 
        color: 'text-green-400 bg-green-500/10 border-green-500/30',
        text: 'Revealed' 
      },
      'completed': { 
        icon: Star, 
        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        text: 'Completed' 
      }
    };

    const config = statusConfig[status] || { 
      icon: Clock, 
      color: 'text-cosmic-text/60 bg-cosmic-panel/10 border-cosmic-accent/20',
      text: 'Processing' 
    };
    
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  const getCardOrientation = (orientation) => {
    return orientation === 'reversed' ? '↺ Reversed' : '↑ Upright';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-2 border-cosmic-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-cosmic-text/70">Loading your reading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400/50 mx-auto mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchReading}
          className="px-4 py-2 bg-cosmic-accent hover:bg-cosmic-accent/80 rounded-lg text-white transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="text-center py-12">
        <Book className="w-12 h-12 text-cosmic-text/30 mx-auto mb-4" />
        <p className="text-cosmic-text/60">Reading not found or not yet available</p>
      </div>
    );
  }

  const canViewContent = reading.status === 'revealed_to_client' || reading.status === 'completed';
  const hasInterpretations = reading.interpretations && reading.interpretations.length > 0;

  return (
    <div className={`space-y-6 ${getRTLClasses()}`}>
      {/* Header */}
      <div className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-cosmic-text mb-2">
              {reading.tarot_spreads?.name || 'Tarot Reading'}
            </h2>
            <p className="text-cosmic-text/70 text-sm">
              {reading.tarot_decks?.name || 'Tarot Deck'} • {reading.total_cards} cards
            </p>
          </div>
          
          {getStatusBadge(reading.status)}
        </div>

        {/* Reading Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-cosmic-text/60 block">Created</span>
            <span className="text-cosmic-text font-medium">
              {new Date(reading.created_at).toLocaleDateString()}
            </span>
          </div>
          
          {reading.client_revealed_at && (
            <div>
              <span className="text-cosmic-text/60 block">Revealed</span>
              <span className="text-cosmic-text font-medium">
                {new Date(reading.client_revealed_at).toLocaleDateString()}
              </span>
            </div>
          )}
          
          <div>
            <span className="text-cosmic-text/60 block">Duration</span>
            <span className="text-cosmic-text font-medium">
              {reading.session_duration_minutes ? `${reading.session_duration_minutes} min` : 'N/A'}
            </span>
          </div>
          
          <div>
            <span className="text-cosmic-text/60 block">Price</span>
            <span className="text-cosmic-text font-medium">
              ${reading.total_price_usd}
            </span>
          </div>
        </div>
      </div>

      {/* Content Access Notice */}
      {!canViewContent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6"
        >
          <div className="flex items-start gap-3">
            <Lock className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-400 font-semibold mb-2">
                Reading in Progress
              </h3>
              <p className="text-yellow-400/80 text-sm mb-3">
                Your reading is being prepared by our expert reader. You'll be notified when it's ready for viewing.
              </p>
              <div className="flex items-center gap-2 text-xs text-yellow-400/60">
                <Clock className="w-3 h-3" />
                <span>Estimated completion: 15-30 minutes</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Card Layout */}
      {canViewContent && hasInterpretations && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-cosmic-text">Your Cards</h3>
            
            <button
              onClick={() => setShowInterpretations(!showInterpretations)}
              className="flex items-center gap-2 px-4 py-2 bg-cosmic-accent/20 hover:bg-cosmic-accent/30 border border-cosmic-accent rounded-lg text-cosmic-accent transition-colors"
            >
              {showInterpretations ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showInterpretations ? 'Hide' : 'Show'} Interpretations
            </button>
          </div>

          {/* Cards Grid */}
          <div className={`grid gap-6 ${
            reading.total_cards <= 3 ? 'grid-cols-1 md:grid-cols-3' :
            reading.total_cards <= 6 ? 'grid-cols-2 md:grid-cols-3' :
            'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }`}>
            {reading.interpretations.map((interpretation, index) => (
              <motion.div
                key={interpretation.id}
                initial={{ opacity: 0, rotateY: 180 }}
                animate={{ 
                  opacity: 1, 
                  rotateY: revealedCards.has(index) ? 0 : 180 
                }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                <div className="bg-cosmic-dark/30 rounded-xl p-4 border border-cosmic-accent/20 hover:border-cosmic-accent/40 transition-colors">
                  {/* Position Name */}
                  <div className="text-center mb-4">
                    <h4 className="font-semibold text-cosmic-accent text-sm mb-1">
                      {interpretation.position_name}
                    </h4>
                    {interpretation.position_meaning && (
                      <p className="text-cosmic-text/60 text-xs">
                        {interpretation.position_meaning}
                      </p>
                    )}
                  </div>

                  {/* Card Image */}
                  <div className="relative mb-4">
                    {!revealedCards.has(index) ? (
                      <div 
                        onClick={() => handleCardReveal(index)}
                        className="aspect-[2/3] bg-gradient-to-br from-cosmic-accent/20 to-cosmic-dark rounded-lg border border-cosmic-accent/30 flex items-center justify-center cursor-pointer hover:from-cosmic-accent/30 transition-colors group"
                      >
                        <div className="text-center">
                          <Sparkles className="w-8 h-8 text-cosmic-accent mx-auto mb-2 group-hover:scale-110 transition-transform" />
                          <p className="text-cosmic-accent text-sm font-medium">
                            Tap to Reveal
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[2/3] rounded-lg overflow-hidden border border-cosmic-accent/30">
                        <img
                          src={interpretation.tarot_cards?.image_url || '/images/cards/card-back.jpg'}
                          alt={interpretation.tarot_cards?.name || 'Tarot Card'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = '/images/cards/card-back.jpg';
                          }}
                        />
                        
                        {/* Card Orientation Indicator */}
                        <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-xs">
                          {getCardOrientation(interpretation.card_orientation)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Details */}
                  {revealedCards.has(index) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h5 className="font-semibold text-cosmic-text text-center mb-2">
                        {interpretation.tarot_cards?.name}
                      </h5>
                      
                      {interpretation.reader_keywords && (
                        <div className="flex flex-wrap gap-1 justify-center mb-3">
                          {interpretation.reader_keywords.slice(0, 3).map((keyword, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-cosmic-accent/10 border border-cosmic-accent/30 rounded text-cosmic-accent text-xs"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Interpretation Text */}
                      {showInterpretations && interpretation.reader_interpretation_final && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 p-3 bg-cosmic-panel/10 rounded-lg border border-cosmic-accent/20"
                        >
                          <p className="text-cosmic-text text-sm leading-relaxed">
                            {interpretation.reader_interpretation_final}
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Reading Summary */}
      {canViewContent && showInterpretations && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-cosmic-panel/20 backdrop-blur-sm border border-cosmic-accent/30 rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-6 h-6 text-cosmic-accent" />
            <h3 className="text-xl font-bold text-cosmic-text">Reading Summary</h3>
          </div>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-cosmic-text/80 leading-relaxed">
              This reading was prepared specifically for you using the {reading.tarot_spreads?.name} spread 
              with the {reading.tarot_decks?.name} deck. Each card position has been carefully interpreted 
              to provide you with guidance and insight into your current situation.
            </p>
            
            {reading.client_revealed_at && (
              <p className="text-cosmic-text/60 text-sm mt-4">
                Reading completed and revealed on{' '}
                {new Date(reading.client_revealed_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={fetchReading}
          className="flex-1 px-4 py-3 bg-cosmic-panel/20 hover:bg-cosmic-panel/30 border border-cosmic-accent/30 rounded-lg text-cosmic-text transition-colors"
        >
          Refresh
        </button>
        
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-cosmic-accent hover:bg-cosmic-accent/80 rounded-lg text-white font-medium transition-colors"
          >
            Close Reading
          </button>
        )}
      </div>

      {/* AI Draft Notice (Hidden from Clients) */}
      {/* This section would never be visible to clients due to backend RLS, but included for completeness */}
      <div className="hidden">
        <p className="text-xs text-cosmic-text/40">
          Note: AI draft content is never visible to clients until approved by a reader.
          This ensures quality and personalized interpretations.
        </p>
      </div>
    </div>
  );
};

export default TarotV2Reading;