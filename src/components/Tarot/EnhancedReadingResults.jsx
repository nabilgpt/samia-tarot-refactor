import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Star,
  Heart,
  Briefcase,
  Home,
  Zap,
  Sparkles,
  Users,
  Clock,
  Download,
  Share2,
  RotateCcw,
  BookOpen,
  Eye,
  EyeOff,
  Lightbulb,
  Target,
  TrendingUp,
  AlertTriangle,
  Gift,
  Calendar,
  CheckCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { TarotAPI } from '../../api/tarotApi';

const EnhancedReadingResults = ({ 
  spread,
  cards,
  question,
  questionCategory,
  reading,
  onNewReading,
  onBack,
  onComplete,
  readerId 
}) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { language, showSuccess, showError } = useUI();
  
  const [activeCard, setActiveCard] = useState(null);
  const [showInterpretation, setShowInterpretation] = useState(true);
  const [aiInsights, setAiInsights] = useState(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [savedToProfile, setSavedToProfile] = useState(false);

  const categories = {
    general: { name: 'General Guidance', name_ar: 'إرشاد عام', icon: Star, color: 'cosmic-purple' },
    love: { name: 'Love & Relationships', name_ar: 'الحب والعلاقات', icon: Heart, color: 'cosmic-pink' },
    career: { name: 'Career & Finance', name_ar: 'المهنة والمال', icon: Briefcase, color: 'cosmic-blue' },
    spiritual: { name: 'Spiritual Growth', name_ar: 'النمو الروحي', icon: Sparkles, color: 'cosmic-purple' },
    health: { name: 'Health & Wellness', name_ar: 'الصحة والعافية', icon: Zap, color: 'cosmic-green' },
    finance: { name: 'Money & Prosperity', name_ar: 'المال والازدهار', icon: Home, color: 'cosmic-gold' }
  };

  const categoryInfo = categories[questionCategory] || categories.general;
  const CategoryIcon = categoryInfo.icon;

  useEffect(() => {
    // If AI reading and no reader, generate AI insights
    if (!readerId && reading && !reading.ai_insights) {
      generateAIInsights();
    }
  }, [reading, readerId]);

  const generateAIInsights = async () => {
    setIsGeneratingAI(true);
    try {
      const result = await TarotAPI.generateAIInterpretation(reading.id, {
        spread,
        cards,
        question,
        category: questionCategory
      });

      if (result.success) {
        setAiInsights(result.data);
      }
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveReading = async () => {
    try {
      const result = await TarotAPI.saveReadingToProfile(reading.id);
      if (result.success) {
        setSavedToProfile(true);
        showSuccess(
          language === 'ar' 
            ? 'تم حفظ القراءة في ملفك الشخصي'
            : 'Reading saved to your profile'
        );
      }
    } catch (error) {
      showError('Failed to save reading');
    }
  };

  const getCardMeaning = (card, position) => {
    // This would typically come from a comprehensive tarot database
    const basicMeanings = {
      // Major Arcana basic meanings
      'The Fool': {
        upright: 'New beginnings, innocence, spontaneity, free spirit',
        reversed: 'Recklessness, taken advantage of, inconsideration'
      },
      'The Magician': {
        upright: 'Manifestation, resourcefulness, power, inspired action',
        reversed: 'Manipulation, poor planning, untapped talents'
      },
      'The High Priestess': {
        upright: 'Intuition, sacred knowledge, divine feminine, subconscious mind',
        reversed: 'Secrets, disconnected from intuition, withdrawal'
      }
      // Add more cards as needed
    };

    const cardMeaning = basicMeanings[card.name] || {
      upright: 'Positive energy, growth, opportunity',
      reversed: 'Blocked energy, delays, internal challenges'
    };

    return card.isReversed ? cardMeaning.reversed : cardMeaning.upright;
  };

  const renderSpreadLayout = () => {
    if (!spread?.positions || !cards) return null;

    const maxX = Math.max(...spread.positions.map(p => p.x));
    const maxY = Math.max(...spread.positions.map(p => p.y));

    return (
      <div className="relative bg-dark-800/30 backdrop-blur-sm border border-white/10 rounded-3xl p-8 mb-8">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gold-300 mb-2">
            {language === 'ar' && spread.name_ar ? spread.name_ar : spread.name}
          </h3>
          <p className="text-gray-300">
            {language === 'ar' && spread.description_ar ? spread.description_ar : spread.description}
          </p>
        </div>

        <div 
          className="relative mx-auto"
          style={{ 
            width: '600px', 
            height: '400px',
            minHeight: '400px'
          }}
        >
          {spread.positions.map((position, index) => {
            const card = cards[index];
            if (!card) return null;

            const x = (position.x / 100) * 600;
            const y = (position.y / 100) * 400;

            return (
              <motion.div
                key={position.position}
                initial={{ opacity: 0, scale: 0, rotateY: 180 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  rotateY: card.isReversed ? 180 : 0,
                  x: x - 40,
                  y: y - 60
                }}
                transition={{ 
                  delay: index * 0.2,
                  type: "spring",
                  stiffness: 100,
                  damping: 15
                }}
                className="absolute cursor-pointer"
                onClick={() => setActiveCard(activeCard === index ? null : index)}
              >
                {/* Card */}
                <div className={`relative w-20 h-32 rounded-lg border-2 transition-all duration-300 ${
                  activeCard === index 
                    ? 'border-gold-400 shadow-lg shadow-gold-400/25 scale-110' 
                    : 'border-white/30 hover:border-white/50'
                }`}>
                  {/* Card background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-lg" />
                  
                  {/* Card pattern */}
                  <div className="absolute inset-2 bg-gradient-to-br from-gold-400/20 to-gold-600/20 rounded border border-gold-400/30" />
                  
                  {/* Card name (abbreviated) */}
                  <div className="absolute inset-0 flex items-center justify-center p-1">
                    <span className="text-white text-xs font-bold text-center leading-tight">
                      {card.name.split(' ').map(word => word.substring(0, 3)).join(' ')}
                    </span>
                  </div>

                  {/* Reversed indicator */}
                  {card.isReversed && (
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">R</span>
                    </div>
                  )}
                </div>

                {/* Position label */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="text-xs text-gold-300 font-semibold whitespace-nowrap">
                    {language === 'ar' && position.name_ar ? position.name_ar : position.name}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Active card details */}
        <AnimatePresence>
          {activeCard !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-8 p-6 bg-dark-700/50 backdrop-blur-sm border border-gold-400/20 rounded-2xl"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-24 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-lg border border-gold-400/30 flex items-center justify-center">
                  <span className="text-white text-xs font-bold text-center leading-tight">
                    {cards[activeCard]?.name}
                  </span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-bold text-gold-300">
                      {cards[activeCard]?.name}
                    </h4>
                    {cards[activeCard]?.isReversed && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30">
                        {language === 'ar' ? 'مقلوبة' : 'Reversed'}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-3">
                    <strong>{language === 'ar' ? 'الموضع:' : 'Position:'}</strong>{' '}
                    {language === 'ar' && spread.positions[activeCard]?.name_ar 
                      ? spread.positions[activeCard].name_ar 
                      : spread.positions[activeCard]?.name}
                  </p>
                  
                  <p className="text-sm text-gray-300 mb-3">
                    <strong>{language === 'ar' ? 'المعنى:' : 'Meaning:'}</strong>{' '}
                    {language === 'ar' && spread.positions[activeCard]?.meaning_ar 
                      ? spread.positions[activeCard].meaning_ar 
                      : spread.positions[activeCard]?.meaning}
                  </p>
                  
                  <p className="text-sm text-gray-200">
                    <strong>{language === 'ar' ? 'تفسير الورقة:' : 'Card Interpretation:'}</strong>{' '}
                    {getCardMeaning(cards[activeCard], spread.positions[activeCard])}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderOverallInterpretation = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-800/30 backdrop-blur-sm border border-white/10 rounded-3xl p-8 mb-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Lightbulb className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-white">
          {language === 'ar' ? 'التفسير الشامل' : 'Overall Interpretation'}
        </h3>
      </div>

      {/* Question reminder */}
      <div className="mb-6 p-4 bg-dark-700/30 rounded-xl border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <CategoryIcon className="w-5 h-5 text-gold-400" />
          <span className="text-gold-300 font-semibold">
            {language === 'ar' ? categoryInfo.name_ar : categoryInfo.name}
          </span>
        </div>
                 <p className="text-gray-300 italic">&ldquo;{question}&rdquo;</p>
      </div>

      {/* Reader interpretation */}
      {readerId && reading?.overall_interpretation && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            {language === 'ar' ? 'تفسير القارئ' : 'Reader Interpretation'}
          </h4>
          <div className="p-4 bg-dark-700/30 rounded-xl text-gray-300 leading-relaxed">
            {reading.overall_interpretation}
          </div>
        </div>
      )}

      {/* AI insights */}
      {aiInsights && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {language === 'ar' ? 'رؤى ذكية' : 'AI Insights'}
          </h4>
          
          {aiInsights.overall_message && (
            <div className="p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/20 rounded-xl">
              <h5 className="font-semibold text-purple-300 mb-2">
                {language === 'ar' ? 'الرسالة الأساسية' : 'Core Message'}
              </h5>
              <p className="text-gray-300">{aiInsights.overall_message}</p>
            </div>
          )}

          {aiInsights.key_themes && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiInsights.key_themes.map((theme, index) => (
                <div key={index} className="p-4 bg-dark-700/30 rounded-xl border border-white/10">
                  <h6 className="font-semibold text-gold-300 mb-2">{theme.title}</h6>
                  <p className="text-gray-300 text-sm">{theme.description}</p>
                </div>
              ))}
            </div>
          )}

          {aiInsights.guidance && (
            <div className="p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/20 rounded-xl">
              <h5 className="font-semibold text-green-300 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                {language === 'ar' ? 'التوجيه المقترح' : 'Recommended Guidance'}
              </h5>
              <p className="text-gray-300">{aiInsights.guidance}</p>
            </div>
          )}

          {aiInsights.confidence_score && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <CheckCircle className="w-4 h-4" />
              {language === 'ar' ? 'درجة الثقة:' : 'Confidence Score:'} {(aiInsights.confidence_score * 100).toFixed(0)}%
            </div>
          )}
        </div>
      )}

      {/* Generate AI button if no AI yet and no reader */}
      {!readerId && !aiInsights && !isGeneratingAI && (
        <motion.button
          onClick={generateAIInsights}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
        >
          <Sparkles className="w-5 h-5" />
          {language === 'ar' ? 'إنشاء رؤى ذكية' : 'Generate AI Insights'}
        </motion.button>
      )}

      {/* Loading AI */}
      {isGeneratingAI && (
        <div className="flex items-center gap-3 text-purple-300">
          <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
          {language === 'ar' ? 'جاري إنشاء الرؤى الذكية...' : 'Generating AI insights...'}
        </div>
      )}
    </motion.div>
  );

  const renderActions = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-center gap-4"
    >
      {/* Save reading */}
      {!savedToProfile && (
        <motion.button
          onClick={handleSaveReading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-6 py-3 bg-dark-700/50 border border-white/20 text-white rounded-xl hover:bg-dark-600/50 transition-all duration-300"
        >
          <BookOpen className="w-5 h-5" />
          {language === 'ar' ? 'حفظ القراءة' : 'Save Reading'}
        </motion.button>
      )}

      {/* Share reading */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-6 py-3 bg-dark-700/50 border border-white/20 text-white rounded-xl hover:bg-dark-600/50 transition-all duration-300"
      >
        <Share2 className="w-5 h-5" />
        {language === 'ar' ? 'مشاركة' : 'Share'}
      </motion.button>

      {/* Download PDF */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-6 py-3 bg-dark-700/50 border border-white/20 text-white rounded-xl hover:bg-dark-600/50 transition-all duration-300"
      >
        <Download className="w-5 h-5" />
        {language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
      </motion.button>

      {/* New reading */}
      <motion.button
        onClick={onNewReading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-gold-400 to-gold-600 text-dark-900 font-bold rounded-xl hover:shadow-lg hover:shadow-gold-400/25 transition-all duration-300"
      >
        <RotateCcw className="w-5 h-5" />
        {language === 'ar' ? 'قراءة جديدة' : 'New Reading'}
      </motion.button>
    </motion.div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-white mb-4">
          {language === 'ar' ? 'نتائج القراءة' : 'Your Reading Results'}
        </h1>
        <p className="text-gray-300 text-lg">
          {language === 'ar' 
            ? 'اكتشف ما تكشفه لك الأوراق'
            : 'Discover what the cards reveal to you'
          }
        </p>
      </motion.div>

      {/* Spread layout */}
      {renderSpreadLayout()}

      {/* Overall interpretation */}
      {renderOverallInterpretation()}

      {/* Actions */}
      {renderActions()}
    </div>
  );
};

export default EnhancedReadingResults; 