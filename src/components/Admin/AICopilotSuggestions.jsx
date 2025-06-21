import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ThumbsUp, 
  ThumbsDown,
  Star,
  DollarSign,
  Users,
  Calendar,
  MessageSquare,
  Settings,
  Zap,
  Target,
  Award
} from 'lucide-react';

const AICopilotSuggestions = ({ contextType, entityId, className = '' }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  useEffect(() => {
    loadSuggestions();
  }, [contextType, entityId]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (contextType) params.append('context_type', contextType);
      if (entityId) params.append('entity_id', entityId);

      const response = await fetch(`/api/admin/ai/suggestions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeSuggestion = async (suggestion, actionType) => {
    try {
      const response = await fetch('/api/admin/quick-actions/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: actionType,
          params: {
            suggestion_id: suggestion.id,
            context: suggestion.context
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Suggestion executed:', result);
        // Remove executed suggestion
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      }
    } catch (error) {
      console.error('Failed to execute suggestion:', error);
    }
  };

  const provideFeedback = async (suggestion, rating, notes = '') => {
    try {
      const response = await fetch(`/api/admin/ai/suggestions/${suggestion.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rating,
          notes
        })
      });

      if (response.ok) {
        // Update suggestion with feedback
        setSuggestions(prev => prev.map(s => 
          s.id === suggestion.id 
            ? { ...s, feedback_rating: rating, feedback_notes: notes }
            : s
        ));
      }
    } catch (error) {
      console.error('Failed to provide feedback:', error);
    }
  };

  const getSuggestionIcon = (type) => {
    const iconMap = {
      moderation_alert: AlertTriangle,
      revenue_opportunity: DollarSign,
      user_engagement: Users,
      performance_optimization: TrendingUp,
      content_suggestion: MessageSquare,
      scheduling_optimization: Calendar,
      quality_improvement: Star,
      automation_opportunity: Settings,
      growth_opportunity: Target,
      retention_strategy: Award
    };
    return iconMap[type] || Lightbulb;
  };

  const getSuggestionColor = (type, confidenceScore) => {
    if (confidenceScore >= 0.8) {
      return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
    } else if (confidenceScore >= 0.6) {
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300';
    } else if (confidenceScore >= 0.4) {
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300';
    } else {
      return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getConfidenceLabel = (score) => {
    if (score >= 0.8) return 'ثقة عالية';
    if (score >= 0.6) return 'ثقة متوسطة';
    if (score >= 0.4) return 'ثقة منخفضة';
    return 'تجريبي';
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-3"></div>
          <span className="text-gray-600 dark:text-gray-400">جاري تحليل البيانات...</span>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>لا توجد اقتراحات متاحة حالياً</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg mr-3">
              <Brain className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                مساعد الذكاء الاصطناعي
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {suggestions.length} اقتراح ذكي
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {isExpanded ? <X className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Suggestions List */}
      <div className={`${isExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-32 overflow-hidden'} transition-all duration-300`}>
        {suggestions.map((suggestion, index) => {
          const IconComponent = getSuggestionIcon(suggestion.type);
          const colorClasses = getSuggestionColor(suggestion.type, suggestion.confidence_score);
          
          return (
            <div
              key={suggestion.id}
              className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-start">
                <div className={`p-2 rounded-lg mr-3 ${colorClasses}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {suggestion.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${colorClasses}`}>
                        {getConfidenceLabel(suggestion.confidence_score)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(suggestion.confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {suggestion.description}
                  </p>

                  {/* Context Information */}
                  {suggestion.context && (
                    <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(suggestion.context).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {key}:
                            </span>
                            <span className="text-gray-600 dark:text-gray-400 ml-1">
                              {typeof value === 'object' ? JSON.stringify(value) : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {suggestion.suggested_actions && suggestion.suggested_actions.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        الإجراءات المقترحة:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestion.suggested_actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={() => executeSuggestion(suggestion, action)}
                            className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                          >
                            {action.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback Section */}
                  {!suggestion.feedback_rating && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        هل كان هذا الاقتراح مفيداً؟
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => provideFeedback(suggestion, 5, 'مفيد')}
                          className="p-1 text-green-600 hover:text-green-700 transition-colors"
                          title="مفيد"
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => provideFeedback(suggestion, 1, 'غير مفيد')}
                          className="p-1 text-red-600 hover:text-red-700 transition-colors"
                          title="غير مفيد"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Feedback Display */}
                  {suggestion.feedback_rating && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <CheckCircle className="w-3 h-3 inline mr-1" />
                      تم تقييم الاقتراح
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {!isExpanded && suggestions.length > 1 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700 text-center">
          <button
            onClick={() => setIsExpanded(true)}
            className="text-sm text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200"
          >
            عرض جميع الاقتراحات ({suggestions.length})
          </button>
        </div>
      )}

      {/* Detailed View Modal */}
      {selectedSuggestion && (
        <SuggestionDetailModal
          suggestion={selectedSuggestion}
          onClose={() => setSelectedSuggestion(null)}
          onExecute={executeSuggestion}
          onFeedback={provideFeedback}
        />
      )}
    </div>
  );
};

// Suggestion Detail Modal Component
const SuggestionDetailModal = ({ suggestion, onClose, onExecute, onFeedback }) => {
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);

  const handleFeedbackSubmit = () => {
    if (feedbackRating > 0) {
      onFeedback(suggestion, feedbackRating, feedbackNotes);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              تفاصيل الاقتراح
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Suggestion Content */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                {suggestion.title}
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {suggestion.description}
              </p>
            </div>

            {/* Confidence Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  مستوى الثقة
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {Math.round(suggestion.confidence_score * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${suggestion.confidence_score * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Context Details */}
            {suggestion.context && (
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                  تفاصيل السياق
                </h5>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  {Object.entries(suggestion.context).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {key}:
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {typeof value === 'object' ? JSON.stringify(value) : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {suggestion.suggested_actions && (
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                  الإجراءات المقترحة
                </h5>
                <div className="space-y-2">
                  {suggestion.suggested_actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => onExecute(suggestion, action)}
                      className="w-full p-3 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors text-left"
                    >
                      {action.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Section */}
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                تقييم الاقتراح
              </h5>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                    التقييم:
                  </span>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setFeedbackRating(rating)}
                        className={`p-1 ${
                          rating <= feedbackRating
                            ? 'text-yellow-500'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      >
                        <Star className="w-5 h-5" fill="currentColor" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    ملاحظات (اختيارية):
                  </label>
                  <textarea
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="شاركنا رأيك في هذا الاقتراح..."
                  />
                </div>

                <button
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackRating === 0}
                  className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  إرسال التقييم
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICopilotSuggestions; 