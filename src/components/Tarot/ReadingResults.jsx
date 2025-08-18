import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  EyeOff,
  Shield,
  AlertCircle,
  Users,
  Sparkles,
  Target,
  CheckCircle
} from 'lucide-react';
import TarotCard from './TarotCard.jsx';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

const ReadingResults = ({ reading, spread, onComplete }) => {
  const { profile } = useAuth();
  const { language } = useUI();
  const [activeTab, setActiveTab] = useState('interpretation');
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [savedToProfile, setSavedToProfile] = useState(false);

  // Role-based access control
  const isReader = profile?.role === 'reader';
  const isAdmin = ['admin', 'super_admin'].includes(profile?.role);
  const canAccessAIContent = isReader || isAdmin;

  // AI content protection logging
  useEffect(() => {
    if (reading?.confidence_score || reading?.ai_insights) {
      // Log AI content access attempt
      const logAIAccess = async () => {
        try {
          await fetch('/api/ai-audit/log-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              component: 'ReadingResults',
              user_role: profile?.role,
              ai_fields_present: ['confidence_score', 'ai_insights'],
              access_granted: canAccessAIContent,
              timestamp: new Date().toISOString()
            })
          });
        } catch (error) {
          console.error('Failed to log AI access:', error);
        }
      };
      logAIAccess();
    }
  }, [reading, profile?.role, canAccessAIContent]);

  const tabs = [
    { id: 'interpretation', label: 'Interpretation', icon: BookOpen },
    { id: 'insights', label: 'AI Insights', icon: Brain },
    { id: 'cards', label: 'Card Details', icon: Star }
  ];

  const renderInterpretation = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Reading Interpretation</h3>
      
      {/* Human interpretation always visible */}
      {reading.overall_interpretation && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Reader Interpretation
          </h4>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-gray-700 leading-relaxed">{reading.overall_interpretation}</p>
          </div>
        </div>
      )}

      {/* AI content - ONLY for authorized users */}
      {canAccessAIContent && reading.ai_insights && (
        <div className="mb-6">
          {/* CRITICAL: Reader warning overlay */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-800">
              <Shield className="w-5 h-5" />
              <span className="font-bold">⚠️ ASSISTANT DRAFT – NOT FOR CLIENT DELIVERY</span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              This AI-generated content is for reader reference only. Do not share with clients.
            </p>
          </div>

          <h4 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Assistant Insights
          </h4>
          
          {/* Copy-paste prevention wrapper */}
          <div 
            className="relative"
            onCopy={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            style={{ 
              userSelect: 'none', 
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
            }}
          >
            {/* Semi-transparent overlay to prevent selection */}
            <div className="absolute inset-0 bg-transparent z-10 pointer-events-none" />
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 relative">
              <p className="text-gray-700 leading-relaxed">{reading.ai_insights}</p>
              
              {/* Watermark */}
              <div className="absolute top-2 right-2 text-xs text-purple-400 font-mono opacity-50">
                AI-DRAFT
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unauthorized access warning */}
      {!canAccessAIContent && (reading.confidence_score || reading.ai_insights) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Access Restricted</span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            AI insights are only available to authorized readers. Your access attempt has been logged.
          </p>
        </div>
      )}
    </motion.div>
  );

  const renderAIInsights = () => {
    // Block AI insights for unauthorized users completely
    if (!canAccessAIContent) {
      return null;
    }

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
        {/* CRITICAL: AI Content Warning Header */}
        <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <Shield className="w-6 h-6" />
            <span className="font-bold text-lg">⚠️ CONFIDENTIAL AI DRAFT</span>
          </div>
          <p className="text-red-700 font-medium">
            The content below is AI-generated and strictly for reader reference only. 
            Sharing this content with clients is prohibited and monitored.
          </p>
        </div>

        {/* Copy-protected AI insights */}
        <div 
          onCopy={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onSelectStart={(e) => e.preventDefault()}
          style={{ 
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            WebkitTouchCallout: 'none'
          }}
        >
          {/* Overall Energy */}
          {insights.overall_energy && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 relative">
              <div className="absolute top-2 right-2 text-xs text-red-500 font-bold">AI-DRAFT</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-600" />
                Overall Energy
              </h3>
              <p className="text-gray-700">{insights.overall_energy}</p>
            </div>
          )}

          {/* Key Themes */}
          {insights.key_themes && insights.key_themes.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 relative">
              <div className="absolute top-2 right-2 text-xs text-red-500 font-bold">AI-DRAFT</div>
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
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 relative">
              <div className="absolute top-2 right-2 text-xs text-red-500 font-bold">AI-DRAFT</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Card Relationships
              </h3>
              <p className="text-gray-700">{insights.card_relationships}</p>
            </div>
          )}

          {/* Timeline Insights */}
          {insights.timeline_insights && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 relative">
              <div className="absolute top-2 right-2 text-xs text-red-500 font-bold">AI-DRAFT</div>
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
              <div className="bg-green-50 rounded-lg p-6 border border-green-200 relative">
                <div className="absolute top-2 right-2 text-xs text-red-500 font-bold">AI-DRAFT</div>
                <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Opportunities
                </h3>
                <p className="text-green-800">{insights.opportunities}</p>
              </div>
            )}

            {insights.warnings && (
              <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200 relative">
                <div className="absolute top-2 right-2 text-xs text-red-500 font-bold">AI-DRAFT</div>
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
            <div className="bg-purple-50 rounded-lg p-6 border border-purple-200 relative">
              <div className="absolute top-2 right-2 text-xs text-red-500 font-bold">AI-DRAFT</div>
              <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Star className="w-5 h-5" />
                Spiritual Guidance
              </h3>
              <p className="text-purple-800">{insights.spiritual_guidance}</p>
            </div>
          )}

          {/* Outcome Probability */}
          {insights.outcome_probability && (
            <div className="bg-gray-50 rounded-lg p-4 relative">
              <div className="absolute top-2 right-2 text-xs text-red-500 font-bold">AI-DRAFT</div>
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
        </div>
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
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h6 className="font-medium text-blue-900 mb-1">Interpretation</h6>
                    <p className="text-blue-800 text-sm">{cardData.interpretation}</p>
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