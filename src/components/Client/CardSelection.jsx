import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  Sparkles,
  Eye,
  Hand,
  Timer,
  Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import api from '../../services/frontendApi.js';

const CardSelection = ({ 
  spreadSelection,
  onCardsSelected,
  onBack 
}) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [selectedCards, setSelectedCards] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [shuffleAnimation, setShuffleAnimation] = useState(false);

  const spread = spreadSelection?.spread;
  const positions = spread?.positions || [];
  const totalCards = spread?.card_count || 0;

  // Generate virtual deck of 78 cards
  const generateDeck = () => {
    const deck = [];
    // Major Arcana (22 cards)
    const majorArcana = [
      'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
      'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
      'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
      'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
      'Judgement', 'The World'
    ];

    // Minor Arcana (56 cards)
    const suits = ['Cups', 'Wands', 'Swords', 'Pentacles'];
    const ranks = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Page', 'Knight', 'Queen', 'King'];

    // Add Major Arcana
    majorArcana.forEach((name, index) => {
      deck.push({
        id: `major_${index}`,
        name,
        type: 'major',
        arcana: 'major',
        number: index
      });
    });

    // Add Minor Arcana
    suits.forEach(suit => {
      ranks.forEach((rank, index) => {
        deck.push({
          id: `${suit.toLowerCase()}_${rank.toLowerCase()}`,
          name: `${rank} of ${suit}`,
          type: 'minor',
          suit: suit.toLowerCase(),
          rank: rank.toLowerCase(),
          number: index + 1
        });
      });
    });

    return deck.sort(() => Math.random() - 0.5); // Shuffle
  };

  const [deck] = useState(() => generateDeck());

  useEffect(() => {
    // Initialize with empty selected cards array
    setSelectedCards(new Array(totalCards).fill(null));
  }, [totalCards]);

  const handleCardSelect = (cardIndex) => {
    if (isDrawing || selectedCards[currentPosition] !== null) return;

    setIsDrawing(true);
    
    // Simulate card drawing animation
    setTimeout(() => {
      const selectedCard = deck[cardIndex];
      const newSelectedCards = [...selectedCards];
      newSelectedCards[currentPosition] = {
        ...selectedCard,
        position: currentPosition + 1,
        isReversed: Math.random() > 0.7 // 30% chance of reversed
      };

      setSelectedCards(newSelectedCards);
      
      if (currentPosition < totalCards - 1) {
        setCurrentPosition(currentPosition + 1);
      }
      
      setIsDrawing(false);
    }, 800);
  };

  const handleShuffle = () => {
    setShuffleAnimation(true);
    setTimeout(() => {
      setShuffleAnimation(false);
    }, 1000);
  };

  const handleReset = () => {
    setSelectedCards(new Array(totalCards).fill(null));
    setCurrentPosition(0);
  };

  const handleComplete = async () => {
    if (selectedCards.some(card => card === null)) {
      showError(
        language === 'ar' 
          ? 'يرجى اختيار جميع الأوراق المطلوبة'
          : 'Please select all required cards'
      );
      return;
    }

    try {
      const result = await api.updateSpreadSelection(spreadSelection.id, {
        cards_drawn: selectedCards,
        is_completed: true,
        session_data: {
          completed_at: new Date().toISOString(),
          total_time: Date.now() - spreadSelection.selected_at
        }
      });

      if (result.success) {
        showSuccess(
          language === 'ar' 
            ? 'تم اختيار الأوراق بنجاح'
            : 'Cards selected successfully'
        );
        onCardsSelected(result.data);
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to save card selection');
    }
  };

  const getCurrentPositionName = () => {
    if (currentPosition >= positions.length) return '';
    const position = positions[currentPosition];
    return language === 'ar' && position.name_ar ? position.name_ar : position.name;
  };

  const getCurrentPositionMeaning = () => {
    if (currentPosition >= positions.length) return '';
    const position = positions[currentPosition];
    return language === 'ar' && position.meaning_ar ? position.meaning_ar : position.meaning;
  };

  const renderInstructionsModal = () => (
    <AnimatePresence>
      {showInstructions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-dark-800/95 backdrop-blur-xl border border-gold-400/20 rounded-3xl p-8 w-full max-w-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Hand className="w-8 h-8 text-dark-900" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4">
                {language === 'ar' ? 'كيفية اختيار الأوراق' : 'How to Select Cards'}
              </h2>
              
              <div className="text-left space-y-4 text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gold-600/20 text-gold-300 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</div>
                  <p>
                    {language === 'ar' 
                      ? 'ركز على سؤالك أو نيتك للقراءة'
                      : 'Focus on your question or intention for the reading'
                    }
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gold-600/20 text-gold-300 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</div>
                  <p>
                    {language === 'ar' 
                      ? 'انقر على أي ورقة مقلوبة عندما تشعر بالانجذاب إليها'
                      : 'Click on any face-down card when you feel drawn to it'
                    }
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gold-600/20 text-gold-300 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</div>
                  <p>
                    {language === 'ar' 
                      ? 'ستظهر الورقة المختارة في موضعها الصحيح في الانتشار'
                      : 'The selected card will appear in its correct position in the spread'
                    }
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gold-600/20 text-gold-300 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">4</div>
                  <p>
                    {language === 'ar' 
                      ? 'كرر العملية حتى تختار جميع الأوراق المطلوبة'
                      : 'Repeat until you have selected all required cards'
                    }
                  </p>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowInstructions(false)}
                className="mt-8 px-8 py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-dark-900 font-bold rounded-xl transition-all duration-300"
              >
                {language === 'ar' ? 'ابدأ الاختيار' : 'Start Selecting'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderSpreadLayout = () => (
    <div className="relative w-full h-96 bg-dark-800/30 border border-gold-400/20 rounded-2xl overflow-hidden">
      {/* Background cosmic effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-pink-600/10" />
      
      {positions.map((position, index) => {
        const card = selectedCards[index];
        const isCurrentPosition = index === currentPosition;
        
        return (
          <motion.div
            key={position.position}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className={`relative ${isCurrentPosition ? 'z-10' : 'z-0'}`}>
              {/* Position indicator */}
              <div className={`w-16 h-24 rounded-lg border-2 transition-all duration-300 ${
                card 
                  ? 'border-gold-400/50 bg-dark-700/80'
                  : isCurrentPosition 
                    ? 'border-gold-400 bg-gold-400/10 animate-pulse'
                    : 'border-gray-600/50 bg-dark-700/30'
              }`}>
                {card ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                    <div className="text-xs font-bold text-gold-300 mb-1">
                      {card.name.length > 10 ? card.name.substring(0, 10) + '...' : card.name}
                    </div>
                    {card.isReversed && (
                      <div className="text-xs text-red-300">↻</div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-400">{position.position}</span>
                  </div>
                )}
              </div>
              
              {/* Position name */}
              <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-xs text-center text-gray-300 min-w-max">
                {language === 'ar' && position.name_ar ? position.name_ar : position.name}
              </div>
              
              {/* Current position highlight */}
              {isCurrentPosition && !card && (
                <motion.div
                  className="absolute inset-0 border-2 border-gold-400 rounded-lg"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  const renderDeck = () => (
    <div className="relative">
      <h3 className="text-lg font-semibold text-white mb-4 text-center">
        {language === 'ar' ? 'اختر ورقة' : 'Choose a Card'}
      </h3>
      
      {/* Current position info */}
      {currentPosition < totalCards && (
        <div className="text-center mb-6 p-4 bg-dark-700/30 rounded-xl border border-gold-400/20">
          <h4 className="text-gold-300 font-semibold mb-2">
            {getCurrentPositionName()}
          </h4>
          <p className="text-gray-300 text-sm">
            {getCurrentPositionMeaning()}
          </p>
          <div className="text-xs text-gray-400 mt-2">
            {language === 'ar' 
              ? `الورقة ${currentPosition + 1} من ${totalCards}`
              : `Card ${currentPosition + 1} of ${totalCards}`
            }
          </div>
        </div>
      )}
      
      {/* Deck grid */}
      <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {deck.slice(0, 40).map((card, index) => (
          <motion.div
            key={card.id}
            className={`relative w-12 h-16 cursor-pointer ${
              isDrawing ? 'pointer-events-none' : ''
            }`}
            whileHover={{ scale: 1.1, z: 10 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              rotateY: shuffleAnimation ? [0, 180, 0] : 0,
              x: shuffleAnimation ? Math.random() * 20 - 10 : 0,
              y: shuffleAnimation ? Math.random() * 20 - 10 : 0
            }}
            transition={{ duration: 0.6, delay: shuffleAnimation ? index * 0.02 : 0 }}
            onClick={() => handleCardSelect(index)}
          >
            {/* Card back */}
            <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 rounded border border-gold-400/30 flex items-center justify-center hover:border-gold-400/60 transition-colors">
              <Sparkles className="w-6 h-6 text-gold-400/60" />
            </div>
            
            {/* Cosmic glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded opacity-0 hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShuffle}
          disabled={isDrawing}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm">{language === 'ar' ? 'خلط الأوراق' : 'Shuffle'}</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleReset}
          disabled={isDrawing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 rounded-xl transition-colors disabled:opacity-50"
        >
          <Timer className="w-4 h-4" />
          <span className="text-sm">{language === 'ar' ? 'إعادة تعيين' : 'Reset'}</span>
        </motion.button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="w-12 h-12 bg-dark-700/50 hover:bg-dark-700 rounded-xl flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gold-400" />
          </motion.button>
          
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {language === 'ar' ? 'اختيار أوراق التاروت' : 'Select Your Tarot Cards'}
            </h1>
            <p className="text-gray-400">
              {language === 'ar' && spread?.name_ar ? spread.name_ar : spread?.name}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-dark-700/30 rounded-full h-2 mb-6">
          <motion.div
            className="bg-gradient-to-r from-gold-600 to-gold-400 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(selectedCards.filter(c => c !== null).length / totalCards) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Spread layout */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">
            {language === 'ar' ? 'تخطيط الانتشار' : 'Spread Layout'}
          </h2>
          {renderSpreadLayout()}
        </div>

        {/* Card selection */}
        <div>
          {currentPosition < totalCards ? (
            renderDeck()
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-dark-900" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">
                {language === 'ar' ? 'تم اختيار جميع الأوراق!' : 'All Cards Selected!'}
              </h3>
              <p className="text-gray-400 mb-8">
                {language === 'ar' 
                  ? 'تم اختيار جميع الأوراق المطلوبة. يمكنك الآن المتابعة للقراءة.'
                  : 'All required cards have been selected. You can now proceed to the reading.'
                }
              </p>
              
              <div className="flex items-center justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 rounded-xl transition-colors"
                >
                  {language === 'ar' ? 'إعادة الاختيار' : 'Reselect Cards'}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleComplete}
                  className="px-8 py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-dark-900 font-bold rounded-xl transition-all duration-300 shadow-lg shadow-gold-500/25"
                >
                  {language === 'ar' ? 'متابعة للقراءة' : 'Proceed to Reading'}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions modal */}
      {renderInstructionsModal()}
    </div>
  );
};

export default CardSelection; 