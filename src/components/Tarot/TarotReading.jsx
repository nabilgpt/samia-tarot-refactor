import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TarotAPI } from '../../api/tarotApi.js';
import { aiReadingService } from '../../services/aiReadingService.js';
import { useAuth } from '../../hooks/useAuth.js';
import TarotCard from './TarotCard.jsx';
import SpreadSelector from './SpreadSelector.jsx';
import ReadingResults from './ReadingResults.jsx';
import { 
  Sparkles, 
  Shuffle, 
  Eye, 
  BookOpen, 
  Clock,
  Star,
  Heart,
  Briefcase,
  Home,
  Zap
} from 'lucide-react';

const TarotReading = ({ bookingId, readerId, onReadingComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState('question'); // question, spread, cards, reading
  const [question, setQuestion] = useState('');
  const [questionCategory, setQuestionCategory] = useState('general');
  const [selectedSpread, setSelectedSpread] = useState(null);
  const [drawnCards, setDrawnCards] = useState([]);
  const [reading, setReading] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { id: 'general', name: 'General Guidance', icon: Star, color: 'purple' },
    { id: 'love', name: 'Love & Relationships', icon: Heart, color: 'pink' },
    { id: 'career', name: 'Career & Finance', icon: Briefcase, color: 'blue' },
    { id: 'spiritual', name: 'Spiritual Growth', icon: Sparkles, color: 'indigo' },
    { id: 'health', name: 'Health & Wellness', icon: Zap, color: 'green' },
    { id: 'finance', name: 'Money & Prosperity', icon: Home, color: 'yellow' }
  ];

  const handleQuestionSubmit = () => {
    if (!question.trim()) {
      setError('Please enter your question');
      return;
    }
    setError('');
    setCurrentStep('spread');
  };

  const handleSpreadSelect = (spread) => {
    setSelectedSpread(spread);
    setCurrentStep('cards');
  };

  const handleDrawCards = async () => {
    if (!selectedSpread) return;

    setIsDrawing(true);
    setError('');

    try {
      // Perform the reading
      const result = await TarotAPI.performReading(
        bookingId,
        user.id,
        readerId,
        selectedSpread.id,
        question,
        questionCategory
      );

      if (result.success) {
        setReading(result.data);
        setDrawnCards(result.data.cards_drawn);
        setCurrentStep('reading');
        
        // If it's an AI reading, generate the interpretation
        if (!readerId) {
          await generateAIReading(result.data);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to draw cards. Please try again.');
    } finally {
      setIsDrawing(false);
    }
  };

  const generateAIReading = async (readingData) => {
    setIsGenerating(true);
    
    try {
      const aiResult = await aiReadingService.generateReading({
        ...readingData,
        spread: selectedSpread
      });

      if (aiResult.success) {
        // Update the reading with AI interpretation
        const updateResult = await TarotAPI.updateReading(readingData.id, {
          overall_interpretation: aiResult.data.overall_message,
          ai_insights: aiResult.data,
          confidence_score: aiResult.data.confidence_score,
          status: 'completed'
        });

        if (updateResult.success) {
          setReading(updateResult.data);
        }
      } else {
        console.error('AI reading generation failed:', aiResult.error);
      }
    } catch (err) {
      console.error('Error generating AI reading:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetReading = () => {
    setCurrentStep('question');
    setQuestion('');
    setQuestionCategory('general');
    setSelectedSpread(null);
    setDrawnCards([]);
    setReading(null);
    setError('');
  };

  const renderQuestionStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Ask Your Question</h2>
        <p className="text-gray-600">Focus your mind and ask what you truly wish to know</p>
      </div>

      {/* Category Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Choose a category for your reading
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setQuestionCategory(category.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  questionCategory === category.id
                    ? `border-${category.color}-500 bg-${category.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                  questionCategory === category.id 
                    ? `text-${category.color}-600` 
                    : 'text-gray-400'
                }`} />
                <span className={`text-sm font-medium ${
                  questionCategory === category.id 
                    ? `text-${category.color}-700` 
                    : 'text-gray-600'
                }`}>
                  {category.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Question
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What guidance do you seek? Be specific and focus on what you truly want to know..."
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          rows={4}
          maxLength={500}
        />
        <div className="text-right text-sm text-gray-500 mt-1">
          {question.length}/500
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleQuestionSubmit}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
      >
        Continue to Spread Selection
      </button>
    </motion.div>
  );

  const renderCardsStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto text-center"
    >
      <div className="mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shuffle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Draw Your Cards</h2>
        <p className="text-gray-600 mb-4">
          Focus on your question: &ldquo;{question}&rdquo;
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">{selectedSpread?.name}</h3>
          <p className="text-sm text-gray-600">{selectedSpread?.description}</p>
          <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
            <span>{selectedSpread?.card_count} cards</span>
            <span className="mx-2">•</span>
            <span className="capitalize">{selectedSpread?.difficulty_level}</span>
          </div>
        </div>
      </div>

      {/* Spread Visualization */}
      {selectedSpread && (
        <div className="mb-8">
          <div className="relative w-full h-64 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-lg overflow-hidden">
            {selectedSpread.positions.map((position, index) => (
              <div
                key={position.position}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`
                }}
              >
                <div className="w-12 h-16 bg-white/20 rounded border-2 border-white/30 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">{position.position}</span>
                </div>
                <div className="text-white text-xs mt-1 text-center max-w-20">
                  {position.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setCurrentStep('spread')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Change Spread
        </button>
        <button
          onClick={handleDrawCards}
          disabled={isDrawing}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isDrawing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Drawing Cards...
            </>
          ) : (
            <>
              <Shuffle className="w-4 h-4" />
              Draw Cards
            </>
          )}
        </button>
      </div>
    </motion.div>
  );

  const renderReadingStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Eye className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Reading</h2>
        <p className="text-gray-600">
          Question: &ldquo;{question}&rdquo;
        </p>
        {isGenerating && (
          <div className="flex items-center justify-center gap-2 mt-4 text-purple-600">
            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Generating AI interpretation...</span>
          </div>
        )}
      </div>

      {/* Cards Display */}
      <div className="mb-8">
        <div className="relative w-full min-h-96 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-lg p-8">
          {drawnCards.map((cardData, index) => {
            const position = selectedSpread?.positions.find(p => p.position === cardData.position);
            return (
              <motion.div
                key={cardData.position}
                initial={{ opacity: 0, scale: 0.8, rotateY: 180 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ delay: index * 0.2 }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${position?.x}%`,
                  top: `${position?.y}%`
                }}
              >
                <TarotCard
                  card={cardData.card}
                  isReversed={cardData.is_reversed}
                  position={cardData.position_name}
                  showDetails={true}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Reading Results */}
      {reading && (
        <ReadingResults
          reading={reading}
          spread={selectedSpread}
          onComplete={onReadingComplete}
        />
      )}

      <div className="flex gap-4 justify-center mt-8">
        <button
          onClick={resetReading}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          New Reading
        </button>
        {reading && (
          <button
            onClick={() => onReadingComplete?.(reading)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            Complete Reading
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-8 px-4">
      <div className="container mx-auto">
        {/* Progress Indicator */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex items-center justify-between">
            {['question', 'spread', 'cards', 'reading'].map((step, index) => {
              const isActive = currentStep === step;
              const isCompleted = ['question', 'spread', 'cards', 'reading'].indexOf(currentStep) > index;
              
              return (
                <React.Fragment key={step}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive 
                      ? 'bg-purple-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === 'question' && renderQuestionStep()}
          {currentStep === 'spread' && (
            <SpreadSelector
              category={questionCategory}
              onSpreadSelect={handleSpreadSelect}
              onBack={() => setCurrentStep('question')}
            />
          )}
          {currentStep === 'cards' && renderCardsStep()}
          {currentStep === 'reading' && renderReadingStep()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TarotReading; 