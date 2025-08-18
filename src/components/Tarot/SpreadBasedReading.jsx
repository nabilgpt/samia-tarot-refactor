import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft,
  Star,
  Heart,
  Briefcase,
  Home,
  Zap,
  Sparkles,
  Users,
  Clock,
  ChevronRight,
  Gift,
  Eye,
  PlayCircle,
  X,
  Shuffle,
  BookOpen,
  RotateCcw,
  Save,
  Share2,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import api from '../../services/frontendApi.js';
import api from '../../services/frontendApi.js';
import SpreadSelection from '../Client/SpreadSelection';
import CardSelection from '../Client/CardSelection';
import ReadingResults from './ReadingResults';

const SpreadBasedReading = ({ 
  bookingId, 
  serviceId,
  readerId,
  onReadingComplete,
  onBack 
}) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { language, showSuccess, showError } = useUI();
  
  const [currentStep, setCurrentStep] = useState('question'); // question, spread, cards, reading, results
  const [question, setQuestion] = useState('');
  const [questionCategory, setQuestionCategory] = useState('general');
  const [selectedSpread, setSelectedSpread] = useState(null);
  const [spreadSelection, setSpreadSelection] = useState(null);
  const [drawnCards, setDrawnCards] = useState([]);
  const [reading, setReading] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionData, setSessionData] = useState({});

  const categories = [
    { id: 'general', name: 'General Guidance', name_ar: 'إرشاد عام', icon: Star, color: 'cosmic-purple' },
    { id: 'love', name: 'Love & Relationships', name_ar: 'الحب والعلاقات', icon: Heart, color: 'cosmic-pink' },
    { id: 'career', name: 'Career & Finance', name_ar: 'المهنة والمال', icon: Briefcase, color: 'cosmic-blue' },
    { id: 'spiritual', name: 'Spiritual Growth', name_ar: 'النمو الروحي', icon: Sparkles, color: 'cosmic-purple' },
    { id: 'health', name: 'Health & Wellness', name_ar: 'الصحة والعافية', icon: Zap, color: 'cosmic-green' },
    { id: 'finance', name: 'Money & Prosperity', name_ar: 'المال والازدهار', icon: Home, color: 'cosmic-gold' }
  ];

  // Load existing session if any
  useEffect(() => {
    loadExistingSession();
  }, [bookingId]);

  const loadExistingSession = async () => {
    if (!bookingId) return;
    
    try {
      const result = await api.getClientSpreadSelection(bookingId);
      if (result.success && result.data) {
        const selection = result.data;
        setSpreadSelection(selection);
        setSelectedSpread(selection.spread);
        
        if (selection.cards_drawn && selection.cards_drawn.length > 0) {
          setDrawnCards(selection.cards_drawn);
          setCurrentStep('results');
        } else if (selection.session_data) {
          setSessionData(selection.session_data);
          setQuestion(selection.session_data.question || '');
          setQuestionCategory(selection.session_data.category || 'general');
          setCurrentStep('cards');
        }
      }
    } catch (error) {
      console.error('Failed to load existing session:', error);
    }
  };

  const handleQuestionSubmit = () => {
    if (!question.trim()) {
      showError(language === 'ar' ? 'الرجاء إدخال سؤالك' : 'Please enter your question');
      return;
    }
    setCurrentStep('spread');
  };

  const handleSpreadSelected = (selection) => {
    setSpreadSelection(selection);
    setSelectedSpread(selection.spread);
    setCurrentStep('cards');
    
    // Save session data
    const sessionUpdate = {
      question,
      category: questionCategory,
      spread_selected: true,
      step: 'cards'
    };
    
    api.updateSpreadSelection(selection.id, {
      session_data: sessionUpdate
    });
  };

  const handleCardsDrawn = async (cards) => {
    setIsProcessing(true);
    try {
      // Update the selection with drawn cards
      const result = await api.updateSpreadSelection(spreadSelection.id, {
        cards_drawn: cards,
        is_completed: true,
        session_data: {
          ...sessionData,
          cards_drawn: true,
          completed_at: new Date().toISOString()
        }
      });

      if (result.success) {
        setDrawnCards(cards);
        setCurrentStep('results');
        
        // Create the reading record
        await createReadingRecord(cards);
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to process cards');
      console.error('Card processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const createReadingRecord = async (cards) => {
    try {
      const readingData = {
        booking_id: bookingId,
        client_id: profile?.id,
        reader_id: readerId,
        spread_id: selectedSpread.id,
        question,
        question_category: questionCategory,
        cards_drawn: cards,
        status: readerId ? 'pending_interpretation' : 'ai_processing'
      };

      const result = await api.createReading(readingData);
      if (result.success) {
        setReading(result.data);
        
        // If no reader (AI reading), trigger AI interpretation
        if (!readerId) {
          // This would trigger AI interpretation
          // Implementation depends on your AI service
        }
      }
    } catch (error) {
      console.error('Failed to create reading record:', error);
    }
  };

  const handleNewReading = () => {
    setCurrentStep('question');
    setQuestion('');
    setQuestionCategory('general');
    setSelectedSpread(null);
    setSpreadSelection(null);
    setDrawnCards([]);
    setReading(null);
    setSessionData({});
  };

  const renderQuestionStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <BookOpen className="w-10 h-10 text-dark-900" />
        </motion.div>
        
        <h1 className="text-4xl font-bold text-white mb-4">
          {language === 'ar' ? 'اطرح سؤالك' : 'Ask Your Question'}
        </h1>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          {language === 'ar' 
            ? 'ركز عقلك واسأل عما تريد معرفته حقاً. دع الكون يوجهك نحو الإجابات التي تبحث عنها.'
            : 'Focus your mind and ask what you truly wish to know. Let the universe guide you toward the answers you seek.'
          }
        </p>
      </div>

      {/* Category Selection */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-6 text-center">
          {language === 'ar' ? 'اختر فئة لقراءتك' : 'Choose a category for your reading'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = questionCategory === category.id;
            
            return (
              <motion.button
                key={category.id}
                onClick={() => setQuestionCategory(category.id)}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.95 }}
                className={`relative p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                  isSelected
                    ? 'border-gold-400 bg-gradient-to-br from-gold-500/20 to-gold-600/20'
                    : 'border-white/20 bg-dark-800/50 hover:border-white/40'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-pink-600/5" />
                <div className="relative">
                  <Icon className={`w-8 h-8 mx-auto mb-4 ${
                    isSelected ? 'text-gold-400' : 'text-gray-400'
                  }`} />
                  <h4 className={`font-semibold mb-2 ${
                    isSelected ? 'text-gold-300' : 'text-white'
                  }`}>
                    {language === 'ar' ? category.name_ar : category.name}
                  </h4>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Question Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-dark-800/50 backdrop-blur-xl border border-white/20 rounded-2xl p-8"
      >
        <label className="block text-lg font-semibold text-white mb-4">
          {language === 'ar' ? 'سؤالك' : 'Your Question'}
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={language === 'ar' 
            ? 'ما الإرشاد الذي تسعى إليه؟ كن محدداً وركز على ما تريد معرفته حقاً...'
            : 'What guidance do you seek? Be specific and focus on what you truly want to know...'
          }
          className="w-full p-6 bg-dark-700/50 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-300 resize-none"
          rows={6}
          maxLength={500}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        />
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-gray-400">
            {question.length}/500
          </span>
          <motion.button
            onClick={handleQuestionSubmit}
            disabled={!question.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-gradient-to-r from-gold-400 to-gold-600 text-dark-900 font-bold rounded-xl hover:shadow-lg hover:shadow-gold-400/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {language === 'ar' ? 'متابعة' : 'Continue'}
            <ChevronRight className="w-5 h-5 ml-2 inline" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  const renderSpreadStep = () => (
    <SpreadSelection
      bookingId={bookingId}
      serviceId={serviceId}
      readerId={readerId}
      onSpreadSelected={handleSpreadSelected}
      onBack={() => setCurrentStep('question')}
    />
  );

  const renderCardsStep = () => (
    <CardSelection
      spread={selectedSpread}
      question={question}
      questionCategory={questionCategory}
      onCardsDrawn={handleCardsDrawn}
      onBack={() => setCurrentStep('spread')}
      isProcessing={isProcessing}
    />
  );

  const renderResultsStep = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto"
    >
      <ReadingResults
        spread={selectedSpread}
        cards={drawnCards}
        question={question}
        questionCategory={questionCategory}
        reading={reading}
        onNewReading={handleNewReading}
        onBack={onBack}
        onComplete={onReadingComplete}
      />
    </motion.div>
  );

  // Main render with step progression
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-purple-900/20 to-dark-900 relative overflow-hidden">
      {/* Cosmic background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold-400/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-600/5 to-pink-600/5 rounded-full blur-3xl" />
      </div>

      {/* Progress indicator */}
      <div className="relative z-10 pt-8 pb-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center space-x-4 mb-8">
            {['question', 'spread', 'cards', 'results'].map((step, index) => {
              const isActive = currentStep === step;
              const isCompleted = ['question', 'spread', 'cards', 'results'].indexOf(currentStep) > index;
              
              return (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isActive 
                      ? 'border-gold-400 bg-gold-400 text-dark-900' 
                      : isCompleted 
                        ? 'border-green-400 bg-green-400 text-dark-900' 
                        : 'border-gray-600 text-gray-400'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  {index < 3 && (
                    <div className={`w-16 h-0.5 mx-2 transition-all duration-300 ${
                      isCompleted ? 'bg-green-400' : 'bg-gray-600'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="relative z-10 px-4 pb-16">
        <AnimatePresence mode="wait">
          {currentStep === 'question' && renderQuestionStep()}
          {currentStep === 'spread' && renderSpreadStep()}
          {currentStep === 'cards' && renderCardsStep()}
          {currentStep === 'results' && renderResultsStep()}
        </AnimatePresence>
      </div>

      {/* Back button for non-first steps */}
      {currentStep !== 'question' && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => {
            if (currentStep === 'spread') setCurrentStep('question');
            else if (currentStep === 'cards') setCurrentStep('spread');
            else if (currentStep === 'results') setCurrentStep('cards');
          }}
          className="fixed top-8 left-8 z-20 flex items-center gap-2 px-4 py-2 bg-dark-800/80 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-dark-700/80 transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'ar' ? 'رجوع' : 'Back'}
        </motion.button>
      )}
    </div>
  );
};

export default SpreadBasedReading; 