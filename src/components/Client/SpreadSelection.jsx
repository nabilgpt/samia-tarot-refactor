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
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { SpreadAPI } from '../../api/spreadApi';

const SpreadSelection = ({ 
  bookingId, 
  serviceId, 
  readerId,
  onSpreadSelected,
  onBack 
}) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [spreads, setSpreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpread, setSelectedSpread] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [difficulty, setDifficulty] = useState('all');

  const categories = [
    { id: 'general', name: 'General', name_ar: 'عام', icon: Star, color: 'cosmic-purple' },
    { id: 'love', name: 'Love', name_ar: 'حب', icon: Heart, color: 'cosmic-pink' },
    { id: 'career', name: 'Career', name_ar: 'مهنة', icon: Briefcase, color: 'cosmic-blue' },
    { id: 'spiritual', name: 'Spiritual', name_ar: 'روحي', icon: Sparkles, color: 'cosmic-purple' },
    { id: 'health', name: 'Health', name_ar: 'صحة', icon: Zap, color: 'cosmic-green' },
    { id: 'finance', name: 'Finance', name_ar: 'مالية', icon: Home, color: 'cosmic-gold' }
  ];

  const difficultyLevels = [
    { id: 'all', name: 'All Levels', name_ar: 'جميع المستويات' },
    { id: 'beginner', name: 'Beginner', name_ar: 'مبتدئ', color: 'emerald' },
    { id: 'intermediate', name: 'Intermediate', name_ar: 'متوسط', color: 'amber' },
    { id: 'advanced', name: 'Advanced', name_ar: 'متقدم', color: 'red' }
  ];

  useEffect(() => {
    loadAvailableSpreads();
  }, [serviceId, readerId]);

  const loadAvailableSpreads = async () => {
    setLoading(true);
    try {
      const result = await SpreadAPI.getAvailableSpreadsForBooking(serviceId, readerId);
      if (result.success) {
        setSpreads(result.data);
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to load spreads');
    } finally {
      setLoading(false);
    }
  };

  const handleSpreadSelect = async (spread) => {
    try {
      const result = await SpreadAPI.selectSpreadForBooking(bookingId, profile?.id, spread.spread_id);
      if (result.success) {
        showSuccess(
          language === 'ar' 
            ? 'تم اختيار الانتشار بنجاح'
            : 'Spread selected successfully'
        );
        onSpreadSelected(result.data);
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to select spread');
    }
  };

  const getCategoryIcon = (category) => {
    const categoryConfig = categories.find(c => c.id === category);
    return categoryConfig ? categoryConfig.icon : Star;
  };

  const getDifficultyColor = (difficultyLevel) => {
    switch (difficultyLevel) {
      case 'beginner': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'intermediate': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'advanced': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getEstimatedTime = (cardCount) => {
    if (cardCount <= 3) return language === 'ar' ? '5-10 دقائق' : '5-10 min';
    if (cardCount <= 7) return language === 'ar' ? '15-20 دقيقة' : '15-20 min';
    return language === 'ar' ? '30-45 دقيقة' : '30-45 min';
  };

  const filteredSpreads = spreads.filter(spread => 
    difficulty === 'all' || spread.difficulty_level === difficulty
  );

  const renderSpreadCard = (spread) => {
    const CategoryIcon = getCategoryIcon(spread.category);

    return (
      <motion.div
        key={spread.spread_id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        className="group relative bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl overflow-hidden hover:border-gold-400/40 transition-all duration-300 cursor-pointer"
        onClick={() => handleSpreadSelect(spread)}
      >
        {/* Cosmic background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-pink-600/5" />
        
        {/* Gift indicator */}
        {spread.is_gift && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-1 px-2 py-1 bg-gold-600/80 backdrop-blur-sm text-dark-900 text-xs font-bold rounded-lg">
              <Gift className="w-3 h-3" />
              {language === 'ar' ? 'هدية' : 'Gift'}
            </div>
          </div>
        )}

        {/* Spread visualization */}
        <div className="relative h-32 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
          {/* Create a simple spread preview based on card count */}
          <div className="absolute inset-4 flex items-center justify-center">
            {Array.from({ length: Math.min(5, spread.card_count) }).map((_, index) => (
              <div
                key={index}
                className="w-6 h-8 bg-white/20 rounded border border-white/30 mx-1 transform rotate-3 group-hover:rotate-0 transition-transform duration-300"
                style={{
                  zIndex: index + 1,
                  marginLeft: index > 0 ? '-12px' : '0'
                }}
              />
            ))}
            {spread.card_count > 5 && (
              <div className="absolute bottom-2 right-2 text-white text-xs bg-white/20 px-2 py-1 rounded">
                +{spread.card_count - 5}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center">
                <CategoryIcon className="w-5 h-5 text-dark-900" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-gold-300 transition-colors">
                  {language === 'ar' && spread.spread_name_ar ? spread.spread_name_ar : spread.spread_name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{spread.card_count} {language === 'ar' ? 'ورقة' : 'cards'}</span>
                  <span className="text-gray-600">•</span>
                  <Clock className="w-4 h-4" />
                  <span>{getEstimatedTime(spread.card_count)}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-gray-300 text-sm mb-4 line-clamp-2">
            {language === 'ar' && spread.description_ar ? spread.description_ar : spread.description}
          </p>

          {/* Deck info */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Sparkles className="w-4 h-4" />
            <span>{language === 'ar' && spread.deck_name_ar ? spread.deck_name_ar : spread.deck_name}</span>
          </div>

          {/* Difficulty and action */}
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getDifficultyColor(spread.difficulty_level)}`}>
              {difficultyLevels.find(d => d.id === spread.difficulty_level)?.[language === 'ar' ? 'name_ar' : 'name']}
            </span>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSpread(spread);
                  setShowPreview(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm">{language === 'ar' ? 'معاينة' : 'Preview'}</span>
              </motion.button>

              <div className="flex items-center gap-1 text-gold-300">
                <PlayCircle className="w-4 h-4" />
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gold-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </motion.div>
    );
  };

  const renderPreviewModal = () => (
    <AnimatePresence>
      {showPreview && selectedSpread && (
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
            className="bg-dark-800/95 backdrop-blur-xl border border-gold-400/20 rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">
                {language === 'ar' && selectedSpread.spread_name_ar ? selectedSpread.spread_name_ar : selectedSpread.spread_name}
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="w-10 h-10 bg-gray-700/50 hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Spread visualization */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  {language === 'ar' ? 'تخطيط الانتشار' : 'Spread Layout'}
                </h3>
                <div className="w-full aspect-square bg-dark-700/30 border border-gray-600/50 rounded-xl relative overflow-hidden">
                  {/* This would show the actual spread positions */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-400">
                      {language === 'ar' ? 'معاينة التخطيط' : 'Layout Preview'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الوصف' : 'Description'}
                  </h4>
                  <p className="text-gray-300">
                    {language === 'ar' && selectedSpread.description_ar ? selectedSpread.description_ar : selectedSpread.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'عدد الأوراق' : 'Cards'}
                    </h4>
                    <p className="text-white font-semibold">{selectedSpread.card_count}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'المدة المقدرة' : 'Estimated Time'}
                    </h4>
                    <p className="text-white font-semibold">{getEstimatedTime(selectedSpread.card_count)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'مجموعة الأوراق' : 'Tarot Deck'}
                  </h4>
                  <p className="text-white font-semibold">
                    {language === 'ar' && selectedSpread.deck_name_ar ? selectedSpread.deck_name_ar : selectedSpread.deck_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowPreview(false)}
                className="px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowPreview(false);
                  handleSpreadSelect(selectedSpread);
                }}
                className="px-6 py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-dark-900 font-bold rounded-xl transition-all duration-300 shadow-lg shadow-gold-500/25"
              >
                {language === 'ar' ? 'اختيار هذا الانتشار' : 'Choose This Spread'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gold-400"></div>
            <div className="absolute inset-0 rounded-full border-2 border-gold-400/20"></div>
          </div>
          <p className="text-gray-300 text-lg">
            {language === 'ar' ? 'جاري تحميل الانتشارات...' : 'Loading spreads...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
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
              {language === 'ar' ? 'اختيار انتشار التاروت' : 'Choose Your Tarot Spread'}
            </h1>
            <p className="text-gray-400">
              {language === 'ar' 
                ? 'اختر الانتشار الذي يناسب سؤالك وحالتك' 
                : 'Select the spread that resonates with your question and situation'
              }
            </p>
          </div>
        </div>

        {/* Difficulty filter */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm font-medium text-gray-300 mr-4">
            {language === 'ar' ? 'مستوى الصعوبة:' : 'Difficulty:'}
          </span>
          <div className="flex gap-2">
            {difficultyLevels.map((level) => (
              <motion.button
                key={level.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDifficulty(level.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  difficulty === level.id
                    ? 'bg-gold-600/20 text-gold-300 border border-gold-500/30'
                    : 'bg-dark-700/50 text-gray-400 border border-gray-600/50 hover:border-gray-500/50'
                }`}
              >
                {language === 'ar' ? level.name_ar : level.name}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Spreads Grid */}
      <div className="max-w-6xl mx-auto">
        {filteredSpreads.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-dark-900" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {language === 'ar' ? 'لا توجد انتشارات متاحة' : 'No Spreads Available'}
            </h3>
            <p className="text-gray-400">
              {language === 'ar' 
                ? 'لا توجد انتشارات متاحة لهذه الخدمة في الوقت الحالي'
                : 'No spreads are available for this service at the moment'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpreads.map(renderSpreadCard)}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {renderPreviewModal()}
    </div>
  );
};

export default SpreadSelection; 