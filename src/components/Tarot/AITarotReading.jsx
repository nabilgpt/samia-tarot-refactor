// ===============================================
// AI-POWERED TAROT READING COMPONENT
// ===============================================

import React, { useState } from 'react';
import { Sparkles, Clock, Star, MessageCircle } from 'lucide-react';
import openaiService from '../../services/openaiService';

const AITarotReading = ({ onReadingComplete }) => {
  const [question, setQuestion] = useState('');
  const [readingType, setReadingType] = useState('quick_guidance');
  const [selectedCards, setSelectedCards] = useState([]);
  const [spreadType, setSpreadType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reading, setReading] = useState(null);
  const [error, setError] = useState(null);

  // Sample tarot cards for demonstration
  const tarotCards = [
    'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
    'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
    'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
    'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'
  ];

  const spreadTypes = [
    'Three Card Spread', 'Celtic Cross', 'Past Present Future', 
    'Love Spread', 'Career Spread', 'Single Card Draw'
  ];

  const handleCardSelection = (cardName) => {
    if (selectedCards.length < 3 && !selectedCards.find(card => card.name === cardName)) {
      const position = selectedCards.length === 0 ? 'Past' : 
                     selectedCards.length === 1 ? 'Present' : 'Future';
      
      setSelectedCards([...selectedCards, { 
        name: cardName, 
        position, 
        reversed: Math.random() > 0.5 
      }]);
    }
  };

  const removeCard = (cardName) => {
    setSelectedCards(selectedCards.filter(card => card.name !== cardName));
  };

  const generateReading = async () => {
    if (!question.trim()) {
      setError('Please enter a question for your reading');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let result;
      
      switch (readingType) {
        case 'card_interpretation':
          if (selectedCards.length === 0) {
            setError('Please select at least one card for interpretation');
            return;
          }
          result = await openaiService.generateCardInterpretation(
            selectedCards[0].name, 
            selectedCards[0].position, 
            question
          );
          break;
          
        case 'full_reading':
          if (selectedCards.length === 0) {
            setError('Please select cards for a full reading');
            return;
          }
          result = await openaiService.generateFullReading(
            selectedCards, 
            spreadType || 'Custom Spread', 
            question
          );
          break;
          
        case 'quick_guidance':
        default:
          result = await openaiService.generateQuickGuidance(question);
          break;
      }

      setReading(result.data);
      onReadingComplete?.(result.data);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetReading = () => {
    setReading(null);
    setQuestion('');
    setSelectedCards([]);
    setError(null);
  };

  if (reading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Sparkles className="h-6 w-6 text-purple-600 mr-2" />
            Your AI Tarot Reading
          </h2>
          <button
            onClick={resetReading}
            className="px-4 py-2 text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
          >
            New Reading
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Your Question:</h3>
            <p className="text-gray-700">{question}</p>
          </div>

          {selectedCards.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Selected Cards:</h3>
              <div className="flex flex-wrap gap-2">
                {selectedCards.map((card, index) => (
                  <div key={index} className="bg-white px-3 py-2 rounded-lg border">
                    <span className="font-medium">{card.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({card.position})</span>
                    {card.reversed && (
                      <span className="text-xs text-red-500 ml-1">(Reversed)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Star className="h-5 w-5 text-purple-600 mr-2" />
              AI Reading Interpretation
            </h3>
            <div className="prose prose-purple max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {reading.reading}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Generated: {new Date(reading.timestamp).toLocaleString()}
            </div>
            <div className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-1" />
              Tokens used: {reading.tokens_used}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-purple-600 mr-2" />
          AI-Powered Tarot Reading
        </h2>
        <p className="text-gray-600">Get insights powered by artificial intelligence</p>
      </div>

      <div className="space-y-6">
        {/* Question Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What would you like guidance on?
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question or area of focus..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={3}
            maxLength={500}
          />
          <div className="text-sm text-gray-500 mt-1">
            {question.length}/500 characters
          </div>
        </div>

        {/* Reading Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reading Type
          </label>
          <select
            value={readingType}
            onChange={(e) => setReadingType(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="quick_guidance">Quick Guidance</option>
            <option value="card_interpretation">Card Interpretation</option>
            <option value="full_reading">Full Reading</option>
          </select>
        </div>

        {/* Card Selection (for card_interpretation and full_reading) */}
        {(readingType === 'card_interpretation' || readingType === 'full_reading') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Cards (up to 3)
            </label>
            
            {selectedCards.length > 0 && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Selected Cards:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCards.map((card, index) => (
                    <div key={index} className="bg-white px-3 py-2 rounded-lg border flex items-center">
                      <span className="font-medium">{card.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({card.position})</span>
                      <button
                        onClick={() => removeCard(card.name)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {tarotCards.map((cardName) => (
                <button
                  key={cardName}
                  onClick={() => handleCardSelection(cardName)}
                  disabled={selectedCards.length >= 3 || selectedCards.find(card => card.name === cardName)}
                  className="p-2 text-xs border border-gray-300 rounded hover:bg-purple-50 hover:border-purple-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {cardName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Spread Type (for full_reading) */}
        {readingType === 'full_reading' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spread Type (Optional)
            </label>
            <select
              value={spreadType}
              onChange={(e) => setSpreadType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Custom Spread</option>
              {spreadTypes.map((spread) => (
                <option key={spread} value={spread}>{spread}</option>
              ))}
            </select>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-400">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Generate Reading Button */}
        <button
          onClick={generateReading}
          disabled={isLoading || !question.trim()}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Generating Reading...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Generate AI Reading
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AITarotReading; 