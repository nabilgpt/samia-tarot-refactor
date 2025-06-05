import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Star, 
  Heart, 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  Brain,
  Share2,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import TarotCard from './TarotCard.jsx';

const ReadingResults = ({ reading, spread, onComplete }) => {
  const [activeTab, setActiveTab] = useState('interpretation');
  const [showCardDetails, setShowCardDetails] = useState(false);

  const tabs = [
    { id: 'interpretation', label: 'Interpretation', icon: BookOpen },
    { id: 'insights', label: 'AI Insights', icon: Brain },
    { id: 'cards', label: 'Card Details', icon: Star }
  ];

  const renderInterpretation = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Overall Reading */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-600" />
          Overall Reading
        </h3>
        
        {reading.overall_interpretation ? (
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {reading.overall_interpretation}
            </p>
            {reading.overall_interpretation_ar && (
              <p className="text-gray-600 mt-4 italic border-t pt-4">
                {reading.overall_interpretation_ar}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Reading interpretation is being prepared...</p>
          </div>
        )}
      </div>

      {/* Energy Reading */}
      {reading.energy_reading && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <Star className="w-5 h-5" />
            Energy Reading
          </h3>
          <p className="text-purple-800">{reading.energy_reading}</p>
        </div>
      )}

      {/* Advice */}
      {reading.advice && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Guidance & Advice
          </h3>
          <p className="text-green-800">{reading.advice}</p>
          {reading.advice_ar && (
            <p className="text-green-700 mt-3 italic border-t border-green-200 pt-3">
              {reading.advice_ar}
            </p>
          )}
        </div>
      )}

      {/* Reading Metadata */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-gray-500">Reading Type</div>
            <div className="font-medium capitalize">{reading.reading_type}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Spread</div>
            <div className="font-medium">{spread?.name}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Cards Drawn</div>
            <div className="font-medium">{reading.cards_drawn?.length || 0}</div>
          </div>
          {reading.confidence_score && (
            <div className="text-center">
              <div className="text-gray-500">AI Confidence</div>
              <div className="font-medium">{Math.round(reading.confidence_score * 100)}%</div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderAIInsights = () => {
    const insights = reading.ai_insights;
    
    if (!insights) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>AI insights are not available for this reading</p>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Overall Energy */}
        {insights.overall_energy && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              Overall Energy
            </h3>
            <p className="text-gray-700">{insights.overall_energy}</p>
          </div>
        )}

        {/* Key Themes */}
        {insights.key_themes && insights.key_themes.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-600" />
              Key Themes
            </h3>
            <div className="flex flex-wrap gap-2">
              {insights.key_themes.map((theme, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Card Relationships */}
        {insights.card_relationships && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Card Relationships
            </h3>
            <p className="text-gray-700">{insights.card_relationships}</p>
          </div>
        )}

        {/* Timeline Insights */}
        {insights.timeline_insights && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Timeline Insights
            </h3>
            <p className="text-gray-700">{insights.timeline_insights}</p>
          </div>
        )}

        {/* Opportunities & Warnings */}
        <div className="grid md:grid-cols-2 gap-6">
          {insights.opportunities && (
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Opportunities
              </h3>
              <p className="text-green-800">{insights.opportunities}</p>
            </div>
          )}

          {insights.warnings && (
            <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Cautions
              </h3>
              <p className="text-yellow-800">{insights.warnings}</p>
            </div>
          )}
        </div>

        {/* Spiritual Guidance */}
        {insights.spiritual_guidance && (
          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Spiritual Guidance
            </h3>
            <p className="text-purple-800">{insights.spiritual_guidance}</p>
          </div>
        )}

        {/* Outcome Probability */}
        {insights.outcome_probability && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">Outcome Probability:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                insights.outcome_probability === 'high' 
                  ? 'bg-green-100 text-green-700'
                  : insights.outcome_probability === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}>
                {insights.outcome_probability.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderCardDetails = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Card Details</h3>
        <button
          onClick={() => setShowCardDetails(!showCardDetails)}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
        >
          {showCardDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showCardDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      <div className="grid gap-6">
        {reading.cards_drawn?.map((cardData, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <TarotCard
                  card={cardData.card}
                  isReversed={cardData.is_reversed}
                  size="small"
                  showDetails={showCardDetails}
                />
              </div>
              
              <div className="flex-1">
                <div className="mb-3">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {cardData.position_name}
                  </h4>
                  <p className="text-sm text-gray-600">{cardData.position_meaning}</p>
                </div>

                <div className="mb-3">
                  <h5 className="font-medium text-gray-900 mb-1">
                    {cardData.card.name}
                    {cardData.is_reversed && (
                      <span className="text-red-600 text-sm ml-2">(Reversed)</span>
                    )}
                  </h5>
                  <p className="text-sm text-gray-600">
                    {cardData.is_reversed 
                      ? cardData.card.reversed_meaning 
                      : cardData.card.upright_meaning
                    }
                  </p>
                </div>

                {cardData.interpretation && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <h6 className="font-medium text-purple-900 mb-1">Interpretation</h6>
                    <p className="text-sm text-purple-800">{cardData.interpretation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Your Reading Results</h2>
            <p className="text-purple-100">
              {spread?.name} • {reading.cards_drawn?.length} cards
            </p>
          </div>
          
          <div className="flex gap-2">
            <button className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'interpretation' && renderInterpretation()}
        {activeTab === 'insights' && renderAIInsights()}
        {activeTab === 'cards' && renderCardDetails()}
      </div>
    </div>
  );
};

export default ReadingResults; 