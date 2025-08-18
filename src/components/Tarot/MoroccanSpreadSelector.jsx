import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Star, 
  Heart, 
  Briefcase, 
  Sparkles, 
  Zap, 
  Home,
  Users,
  Clock,
  Eye,
  Filter,
  Grid,
  BookOpen,
  Wand2,
  Crown,
  Moon,
  Sun,
  Compass
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import bilingualCategoryService from '../../services/bilingualCategoryService';

const MoroccanSpreadSelector = ({ onSpreadSelect, selectedSpread, showCustom = true }) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { language, showError } = useUI();
  
  const [spreads, setSpreads] = useState([]);
  const [systemSpreads, setSystemSpreads] = useState([]);
  const [customSpreads, setCustomSpreads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [showSystemOnly, setShowSystemOnly] = useState(false);

  const difficulties = [
    { id: 'all', name: 'All Levels', name_ar: 'جميع المستويات', icon: Grid },
    { id: 'beginner', name: 'Beginner', name_ar: 'مبتدئ', icon: Sun, color: 'green' },
    { id: 'intermediate', name: 'Intermediate', name_ar: 'متوسط', icon: Moon, color: 'yellow' },
    { id: 'advanced', name: 'Advanced', name_ar: 'متقدم', icon: Crown, color: 'red' }
  ];

  useEffect(() => {
    loadCategories();
    loadSpreads();
  }, []);

  const loadCategories = async () => {
    try {
      // Wait for category service to be ready
      if (!bilingualCategoryService.isReady()) {
        await bilingualCategoryService.initialize();
      }
      
      const categoryData = bilingualCategoryService.getCategories(language, 'moroccan');
      setCategories(categoryData);
      
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback categories if service fails
      setCategories([
        { id: 'all', name: 'All Categories', name_ar: 'جميع الفئات', icon: Grid, color: 'purple' },
        { id: 'general', name: 'General', name_ar: 'عام', icon: Star, color: 'purple' },
        { id: 'love', name: 'Love & Relationships', name_ar: 'الحب والعلاقات', icon: Heart, color: 'pink' },
        { id: 'career', name: 'Career & Money', name_ar: 'المهنة والمال', icon: Briefcase, color: 'blue' },
        { id: 'spiritual', name: 'Spiritual Journey', name_ar: 'الرحلة الروحية', icon: Sparkles, color: 'purple' },
        { id: 'health', name: 'Health & Wellness', name_ar: 'الصحة والعافية', icon: Zap, color: 'green' },
        { id: 'flexible', name: 'Flexible', name_ar: 'مرن', icon: Wand2, color: 'orange' }
      ]);
    }
  };

  const loadSpreads = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/moroccan-tarot/spreads');
      const result = await response.json();
      
      if (result.success) {
        setSystemSpreads(result.data.system_spreads || []);
        setCustomSpreads(result.data.custom_spreads || []);
        setSpreads([...result.data.system_spreads, ...result.data.custom_spreads]);
      } else {
        showError(result.error || 'Failed to load spreads');
      }
    } catch (error) {
      console.error('Error loading spreads:', error);
      showError('Error loading spreads');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (category && category.icon) {
      return category.icon;
    }
    
    // Fallback to service or default icon
    const iconName = bilingualCategoryService.getCategoryIcon(categoryId);
    const iconMap = {
      Grid, Star, Heart, Briefcase, Sparkles, Zap, Wand2, Home
    };
    return iconMap[iconName] || Star;
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (category && category.color) {
      return category.color;
    }
    
    // Fallback to service or default color
    return bilingualCategoryService.getCategoryColor(categoryId);
  };

  const getDifficultyIcon = (difficultyId) => {
    const difficulty = difficulties.find(d => d.id === difficultyId);
    return difficulty ? difficulty.icon : Sun;
  };

  const getDifficultyColor = (difficultyId) => {
    const colorMap = {
      beginner: 'emerald',
      intermediate: 'amber',
      advanced: 'red'
    };
    return colorMap[difficultyId] || 'gray';
  };

  const getEstimatedTime = (cardCount) => {
    if (cardCount <= 3) return language === 'ar' ? '5-10 دقائق' : '5-10 minutes';
    if (cardCount <= 5) return language === 'ar' ? '10-15 دقيقة' : '10-15 minutes';
    if (cardCount <= 8) return language === 'ar' ? '15-25 دقيقة' : '15-25 minutes';
    return language === 'ar' ? '25-40 دقيقة' : '25-40 minutes';
  };

  const filteredSpreads = spreads.filter(spread => {
    const categoryMatch = selectedCategory === 'all' || spread.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || spread.difficulty_level === selectedDifficulty;
    const typeMatch = showSystemOnly ? !spread.is_custom : true;
    return categoryMatch && difficultyMatch && typeMatch;
  });

  const renderSpreadCard = (spread) => {
    const CategoryIcon = getCategoryIcon(spread.category);
    const DifficultyIcon = getDifficultyIcon(spread.difficulty_level);
    const isSelected = selectedSpread?.id === spread.id;
    const isTraditional = !spread.is_custom;

    return (
      <motion.div
        key={spread.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        className={`relative bg-dark-800/50 backdrop-blur-sm border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'border-gold-400 shadow-lg shadow-gold-400/25' 
            : 'border-white/10 hover:border-gold-400/50'
        }`}
        onClick={() => onSpreadSelect(spread)}
      >
        {/* Traditional Badge */}
        {isTraditional && (
          <div className="absolute top-4 right-4">
            <div className="bg-gradient-to-r from-gold-500 to-gold-600 text-dark-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {language === 'ar' ? 'تقليدي' : 'Traditional'}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 bg-gradient-to-br from-${getCategoryColor(spread.category)}-500 to-${getCategoryColor(spread.category)}-600 rounded-xl flex items-center justify-center shadow-lg`}>
            <CategoryIcon className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">
              {language === 'ar' && spread.name_ar ? spread.name_ar : spread.name}
            </h3>
            <p className="text-gray-400 text-sm line-clamp-2">
              {language === 'ar' && spread.description_ar ? spread.description_ar : spread.description}
            </p>
          </div>
        </div>

        {/* Spread Preview */}
        <div className="relative h-32 bg-gradient-to-br from-dark-900/50 to-dark-700/50 rounded-xl mb-4 overflow-hidden border border-white/10">
          <div className="absolute inset-0 p-3">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="w-full h-full bg-gradient-to-br from-gold-400 to-purple-600"></div>
            </div>
            
            {/* Card positions */}
            {spread.positions?.slice(0, Math.min(8, spread.card_count)).map((position, index) => (
              <motion.div
                key={position.position}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="absolute w-4 h-5 bg-gradient-to-br from-gold-400 to-gold-600 rounded border border-gold-300 shadow-md flex items-center justify-center"
                style={{
                  left: `${position.x * 0.8 + 10}%`,
                  top: `${position.y * 0.6 + 20}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: spread.card_count - index
                }}
                title={language === 'ar' && position.name_ar ? position.name_ar : position.name}
              >
                <span className="text-dark-900 text-xs font-bold">{position.position}</span>
              </motion.div>
            ))}
            
            {spread.card_count > 8 && (
              <div className="absolute bottom-2 right-2 text-gold-300 text-xs bg-dark-800/80 px-2 py-1 rounded border border-gold-400/30">
                +{spread.card_count - 8} {language === 'ar' ? 'أوراق' : 'more'}
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="w-4 h-4 text-gold-400" />
              <span className="text-xs text-gray-400">
                {language === 'ar' ? 'أوراق' : 'Cards'}
              </span>
            </div>
            <span className="text-white font-bold">{spread.card_count}</span>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">
                {language === 'ar' ? 'وقت' : 'Time'}
              </span>
            </div>
            <span className="text-white font-bold text-xs">{getEstimatedTime(spread.card_count)}</span>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DifficultyIcon className={`w-4 h-4 text-${getDifficultyColor(spread.difficulty_level)}-400`} />
              <span className="text-xs text-gray-400">
                {language === 'ar' ? 'مستوى' : 'Level'}
              </span>
            </div>
            <span className={`text-${getDifficultyColor(spread.difficulty_level)}-400 font-bold text-xs capitalize`}>
              {spread.difficulty_level}
            </span>
          </div>
        </div>

        {/* Category Badge */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-${getCategoryColor(spread.category)}-500/20 text-${getCategoryColor(spread.category)}-300 border border-${getCategoryColor(spread.category)}-500/30`}>
            <CategoryIcon className="w-3 h-3 mr-1" />
            {categories.find(c => c.id === spread.category)?.[language === 'ar' ? 'name_ar' : 'name'] || spread.category}
          </span>
          
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 bg-gold-400 rounded-full flex items-center justify-center"
            >
              <Eye className="w-4 h-4 text-dark-900" />
            </motion.div>
          )}
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gold-400/10 rounded-2xl pointer-events-none"
          />
        )}
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 mx-auto mb-4"></div>
          <p className="text-gray-400">
            {language === 'ar' ? 'جاري تحميل الانتشارات المغربية...' : 'Loading Moroccan spreads...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">
              {language === 'ar' ? 'الكارطة المغربية' : 'Moroccan Tarot Spreads'}
            </h2>
            <p className="text-gray-400">
              {language === 'ar' ? '48 ورقة - تقاليد عريقة' : '48 Cards - Ancient Traditions'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'الفئة' : 'Category'}
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-dark-700/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold-500/50"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {language === 'ar' ? category.name_ar : category.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Difficulty Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {language === 'ar' ? 'المستوى' : 'Difficulty'}
          </label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-dark-700/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold-500/50"
          >
            {difficulties.map(difficulty => (
              <option key={difficulty.id} value={difficulty.id}>
                {language === 'ar' ? difficulty.name_ar : difficulty.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        {showCustom && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'النوع' : 'Type'}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSystemOnly(false)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  !showSystemOnly 
                    ? 'bg-gold-600 text-white' 
                    : 'bg-dark-700/50 text-gray-400 hover:text-white'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'All'}
              </button>
              <button
                onClick={() => setShowSystemOnly(true)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  showSystemOnly 
                    ? 'bg-gold-600 text-white' 
                    : 'bg-dark-700/50 text-gray-400 hover:text-white'
                }`}
              >
                {language === 'ar' ? 'تقليدي فقط' : 'Traditional Only'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-800/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gold-400">{systemSpreads.length}</div>
          <div className="text-sm text-gray-400">
            {language === 'ar' ? 'انتشارات تقليدية' : 'Traditional Spreads'}
          </div>
        </div>
        <div className="bg-dark-800/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{customSpreads.length}</div>
          <div className="text-sm text-gray-400">
            {language === 'ar' ? 'انتشارات مخصصة' : 'Custom Spreads'}
          </div>
        </div>
        <div className="bg-dark-800/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">48</div>
          <div className="text-sm text-gray-400">
            {language === 'ar' ? 'ورقة مغربية' : 'Moroccan Cards'}
          </div>
        </div>
        <div className="bg-dark-800/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{filteredSpreads.length}</div>
          <div className="text-sm text-gray-400">
            {language === 'ar' ? 'انتشارات متاحة' : 'Available Spreads'}
          </div>
        </div>
      </div>

      {/* Spreads Grid */}
      {filteredSpreads.length === 0 ? (
        <div className="text-center py-12">
          <Wand2 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            {language === 'ar' ? 'لا توجد انتشارات' : 'No spreads found'}
          </h3>
          <p className="text-gray-500">
            {language === 'ar' 
              ? 'جرب تغيير المرشحات للعثور على انتشارات أخرى'
              : 'Try changing the filters to find other spreads'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpreads.map(renderSpreadCard)}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 p-6 bg-dark-800/30 rounded-xl border border-white/10">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">
              {language === 'ar' ? 'عن الكارطة المغربية' : 'About Moroccan Tarot'}
            </h4>
            <p className="text-gray-300 text-sm leading-relaxed">
              {language === 'ar' 
                ? 'الكارطة المغربية تتكون من 48 ورقة مقسمة إلى أربع مجموعات: السيوف، الكؤوس، النقود، والعصي. كل مجموعة تحتوي على 12 ورقة تمثل جوانب مختلفة من الحياة والتجربة الإنسانية.'
                : 'The Moroccan Tarot consists of 48 cards divided into four suits: Swords, Cups, Coins, and Clubs. Each suit contains 12 cards representing different aspects of life and human experience.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoroccanSpreadSelector; 