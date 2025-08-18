import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/frontendApi.js';
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  Users, 
  Zap,
  Heart,
  Briefcase,
  Home,
  Sparkles
} from 'lucide-react';

const SpreadSelector = ({ category, onSpreadSelect, onBack }) => {
  const [spreads, setSpreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  useEffect(() => {
    loadSpreads();
  }, [category]);

  const loadSpreads = async () => {
    setLoading(true);
    setError('');

    try {
      const result = category === 'all' 
        ? await api.getAllSpreads()
        : await api.getSpreadsByCategory(category);

      if (result.success) {
        setSpreads(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load spreads');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'love': return Heart;
      case 'career': return Briefcase;
      case 'finance': return Home;
      case 'spiritual': return Sparkles;
      case 'health': return Zap;
      default: return Star;
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredSpreads = spreads.filter(spread => 
    selectedDifficulty === 'all' || spread.difficulty_level === selectedDifficulty
  );

  const renderSpreadCard = (spread) => {
    const CategoryIcon = getCategoryIcon(spread.category);
    
    return (
      <motion.div
        key={spread.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-all"
        onClick={() => onSpreadSelect(spread)}
      >
        {/* Spread Preview */}
        <div className="relative h-32 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
          {spread.positions.slice(0, Math.min(5, spread.card_count)).map((position, index) => (
            <div
              key={position.position}
              className="absolute w-6 h-8 bg-white/20 rounded border border-white/30"
              style={{
                left: `${position.x * 0.8 + 10}%`,
                top: `${position.y * 0.6 + 20}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
          
          {spread.card_count > 5 && (
            <div className="absolute bottom-2 right-2 text-white text-xs bg-white/20 px-2 py-1 rounded">
              +{spread.card_count - 5} more
            </div>
          )}
        </div>

        {/* Spread Info */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 flex-1">
              {spread.name}
            </h3>
            <CategoryIcon className="w-5 h-5 text-purple-600 ml-2 flex-shrink-0" />
          </div>

          {spread.name_ar && (
            <p className="text-sm text-gray-500 mb-2">{spread.name_ar}</p>
          )}

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {spread.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {spread.card_count} cards
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {spread.card_count <= 3 ? '5-10' : spread.card_count <= 7 ? '15-20' : '30-45'} min
              </span>
            </div>

            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(spread.difficulty_level)}`}>
              {spread.difficulty_level}
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-gray-600">Loading spreads...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Question
        </button>

        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Spread</h2>
        <p className="text-gray-600">
          Select a tarot spread that resonates with your question
        </p>
      </div>

      {/* Difficulty Filter */}
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          {['all', 'beginner', 'intermediate', 'advanced'].map((difficulty) => (
            <button
              key={difficulty}
              onClick={() => setSelectedDifficulty(difficulty)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDifficulty === difficulty
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {difficulty === 'all' ? 'All Levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
          {error}
        </div>
      )}

      {/* Spreads Grid */}
      {filteredSpreads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpreads.map(renderSpreadCard)}
        </div>
      ) : (
        <div className="text-center py-12">
          <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No spreads found</h3>
          <p className="text-gray-600">
            {selectedDifficulty === 'all' 
              ? 'No spreads available for this category'
              : `No ${selectedDifficulty} spreads available for this category`
            }
          </p>
        </div>
      )}

      {/* Popular Spreads Section */}
      {category === 'general' && selectedDifficulty === 'all' && (
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            Popular Spreads for Beginners
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {spreads
              .filter(s => s.difficulty_level === 'beginner')
              .slice(0, 3)
              .map(renderSpreadCard)
            }
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-12 bg-purple-50 rounded-lg p-6 text-center">
        <h4 className="text-lg font-medium text-purple-900 mb-2">
          New to Tarot Spreads?
        </h4>
        <p className="text-purple-700 mb-4">
          Start with a simple 3-card spread to get familiar with the process. 
          As you gain experience, you can try more complex spreads for deeper insights.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-green-600 font-bold">1</span>
            </div>
            <h5 className="font-medium text-gray-900 mb-1">Beginner</h5>
            <p className="text-gray-600">Simple 1-3 card spreads for quick insights</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-yellow-600 font-bold">2</span>
            </div>
            <h5 className="font-medium text-gray-900 mb-1">Intermediate</h5>
            <p className="text-gray-600">4-7 card spreads for detailed guidance</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-red-600 font-bold">3</span>
            </div>
            <h5 className="font-medium text-gray-900 mb-1">Advanced</h5>
            <p className="text-gray-600">Complex spreads for deep spiritual work</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SpreadSelector; 