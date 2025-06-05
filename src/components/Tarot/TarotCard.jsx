import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Info, Star, Moon, Sun } from 'lucide-react';

const TarotCard = ({ 
  card, 
  isReversed = false, 
  position = '', 
  showDetails = false,
  onClick,
  className = '',
  size = 'medium' // small, medium, large
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    small: 'w-16 h-24',
    medium: 'w-20 h-32',
    large: 'w-24 h-36'
  };

  const getSuitColor = (suit) => {
    switch (suit) {
      case 'cups': return 'text-blue-600';
      case 'wands': return 'text-red-600';
      case 'swords': return 'text-gray-600';
      case 'pentacles': return 'text-yellow-600';
      case 'major_arcana': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getElementIcon = (element) => {
    switch (element) {
      case 'water': return '💧';
      case 'fire': return '🔥';
      case 'air': return '💨';
      case 'earth': return '🌍';
      default: return '✨';
    }
  };

  const cardContent = (
    <motion.div
      className={`relative ${sizeClasses[size]} cursor-pointer ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        transform: isReversed ? 'rotate(180deg)' : 'rotate(0deg)',
        transformOrigin: 'center'
      }}
    >
      {/* Card Background */}
      <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-lg border-2 border-gold-400 shadow-lg overflow-hidden">
        {/* Card Image */}
        {card.image_url && !imageError ? (
          <img
            src={isReversed && card.image_reversed_url ? card.image_reversed_url : card.image_url}
            alt={card.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          /* Fallback Card Design */
          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-white">
            <div className="text-center">
              {/* Suit/Arcana Indicator */}
              <div className="mb-1">
                {card.arcana_type === 'major' ? (
                  <Star className="w-4 h-4 mx-auto text-gold-400" />
                ) : (
                  <span className="text-xs">{getElementIcon(card.element)}</span>
                )}
              </div>
              
              {/* Card Number */}
              {card.number !== null && (
                <div className="text-lg font-bold mb-1">{card.number}</div>
              )}
              
              {/* Card Name */}
              <div className="text-xs font-medium text-center leading-tight">
                {card.name}
              </div>
              
              {/* Suit */}
              <div className={`text-xs mt-1 ${getSuitColor(card.suit)}`}>
                {card.suit?.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </div>
        )}

        {/* Reversed Indicator */}
        {isReversed && (
          <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
            <RotateCcw className="w-3 h-3" />
          </div>
        )}

        {/* Info Button */}
        {showDetails && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(!showInfo);
            }}
            className="absolute bottom-1 right-1 bg-white/20 hover:bg-white/30 text-white rounded-full p-1 transition-colors"
          >
            <Info className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Position Label */}
      {position && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white font-medium text-center">
          {position}
        </div>
      )}
    </motion.div>
  );

  if (!showDetails) {
    return cardContent;
  }

  return (
    <div className="relative">
      {cardContent}
      
      {/* Card Details Popup */}
      {showInfo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute z-50 top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4"
        >
          {/* Close Button */}
          <button
            onClick={() => setShowInfo(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>

          {/* Card Header */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {card.name}
              {card.name_ar && (
                <span className="text-sm text-gray-500 block">{card.name_ar}</span>
              )}
            </h3>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className={getSuitColor(card.suit)}>
                {card.suit?.replace('_', ' ')}
              </span>
              {card.element && (
                <>
                  <span>•</span>
                  <span>{getElementIcon(card.element)} {card.element}</span>
                </>
              )}
              {card.astrological_sign && (
                <>
                  <span>•</span>
                  <span>{card.astrological_sign}</span>
                </>
              )}
            </div>
          </div>

          {/* Keywords */}
          {card.keywords && card.keywords.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Keywords</h4>
              <div className="flex flex-wrap gap-1">
                {card.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meaning */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {isReversed ? 'Reversed Meaning' : 'Upright Meaning'}
            </h4>
            <p className="text-sm text-gray-600">
              {isReversed ? card.reversed_meaning : card.upright_meaning}
            </p>
            {((isReversed && card.reversed_meaning_ar) || (!isReversed && card.upright_meaning_ar)) && (
              <p className="text-sm text-gray-500 mt-2 italic">
                {isReversed ? card.reversed_meaning_ar : card.upright_meaning_ar}
              </p>
            )}
          </div>

          {/* Numerology */}
          {card.numerology_value !== null && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Numerology</h4>
              <p className="text-sm text-gray-600">
                Number {card.numerology_value} - Represents cycles and spiritual lessons
              </p>
            </div>
          )}

          {/* Reversed Status */}
          {isReversed && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700">
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm font-medium">Reversed Card</span>
              </div>
              <p className="text-xs text-red-600 mt-1">
                This card appeared reversed, indicating blocked energy, internal reflection, or the need for a different approach.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default TarotCard; 