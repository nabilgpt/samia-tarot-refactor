import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  Save, 
  X, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  XCircle,
  Star,
  Heart,
  Briefcase,
  Home,
  Zap,
  Users,
  ChevronDown,
  Settings,
  Gift,
  Layout,
  Copy,
  BookOpen,
  AlertCircle,
  Grid
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { SpreadAPI } from '../../api/spreadApi';
import SpreadPositionEditor from './SpreadPositionEditor';

const SpreadManager = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [spreads, setSpreads] = useState([]);
  const [systemSpreads, setSystemSpreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSpread, setEditingSpread] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [notifications, setNotifications] = useState([]);

  const categories = [
    { value: 'all', label: 'All Categories', label_ar: 'جميع الفئات' },
    { value: 'general', label: 'General', label_ar: 'عام' },
    { value: 'love', label: 'Love & Relationships', label_ar: 'الحب والعلاقات' },
    { value: 'career', label: 'Career & Money', label_ar: 'المهنة والمال' },
    { value: 'spiritual', label: 'Spiritual', label_ar: 'روحي' },
    { value: 'health', label: 'Health', label_ar: 'صحة' },
    { value: 'finance', label: 'Finance', label_ar: 'مالية' }
  ];

  const difficulties = [
    { value: 'all', label: 'All Levels', label_ar: 'جميع المستويات' },
    { value: 'beginner', label: 'Beginner', label_ar: 'مبتدئ' },
    { value: 'intermediate', label: 'Intermediate', label_ar: 'متوسط' },
    { value: 'advanced', label: 'Advanced', label_ar: 'متقدم' }
  ];

  useEffect(() => {
    loadSpreads();
    loadNotifications();
  }, []);

  const loadSpreads = async () => {
    setIsLoading(true);
    try {
      // Load reader's custom spreads
      const readerResult = await SpreadAPI.getReaderSpreads(profile.id, false);
      if (readerResult.success) {
        setSpreads(readerResult.data);
      }

      // Load system spreads
      const systemResult = await SpreadAPI.getSystemSpreads();
      if (systemResult.success) {
        setSystemSpreads(systemResult.data);
      }
    } catch (error) {
      showError('Failed to load spreads');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const result = await SpreadAPI.getSpreadNotifications(profile?.id, false);
      if (result.success) {
        setNotifications(result.data.filter(n => !n.is_read));
      }
    } catch (error) {
      console.error('Failed to load notifications');
    }
  };

  const handleCreateSpread = () => {
    setEditingSpread(null);
    setShowCreateModal(true);
  };

  const handleEditSpread = (spread) => {
    setEditingSpread(spread);
    setShowCreateModal(true);
  };

  const handleDeleteSpread = async (spreadId) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الانتشار؟' : 'Are you sure you want to delete this spread?')) {
      return;
    }

    try {
      const result = await SpreadAPI.deleteSpread(spreadId);
      if (result.success) {
        setSpreads(spreads.filter(s => s.id !== spreadId));
        showSuccess(language === 'ar' ? 'تم حذف الانتشار بنجاح' : 'Spread deleted successfully');
      } else {
        showError(result.error || 'Failed to delete spread');
      }
    } catch (error) {
      showError('Error deleting spread');
    }
  };

  const handleDuplicateSpread = async (spread) => {
    try {
      const duplicateData = {
        ...spread,
        name: `${spread.name} (Copy)`,
        name_ar: `${spread.name_ar} (نسخة)`,
        is_custom: true,
        approval_status: 'pending'
      };
      delete duplicateData.id;
      delete duplicateData.created_at;
      delete duplicateData.updated_at;

      const result = await SpreadAPI.createSpread(duplicateData);
      if (result.success) {
        setSpreads([...spreads, result.data]);
        showSuccess(language === 'ar' ? 'تم نسخ الانتشار بنجاح' : 'Spread duplicated successfully');
      } else {
        showError(result.error || 'Failed to duplicate spread');
      }
    } catch (error) {
      showError('Error duplicating spread');
    }
  };

  const filteredSpreads = spreads.filter(spread => {
    const categoryMatch = selectedCategory === 'all' || spread.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || spread.difficulty_level === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const filteredSystemSpreads = systemSpreads.filter(spread => {
    const categoryMatch = selectedCategory === 'all' || spread.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || spread.difficulty_level === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'rejected':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return language === 'ar' ? 'معتمد' : 'Approved';
      case 'pending':
        return language === 'ar' ? 'في الانتظار' : 'Pending';
      case 'rejected':
        return language === 'ar' ? 'مرفوض' : 'Rejected';
      default:
        return language === 'ar' ? 'غير معروف' : 'Unknown';
    }
  };

  const renderSpreadCard = (spread, isSystem = false) => (
    <motion.div
      key={spread.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-gold-500/30 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">
            {language === 'ar' && spread.name_ar ? spread.name_ar : spread.name}
          </h3>
          <p className="text-gray-400 text-sm line-clamp-2">
            {language === 'ar' && spread.description_ar ? spread.description_ar : spread.description}
          </p>
        </div>
        
        {!isSystem && (
          <div className="flex items-center gap-1 ml-4">
            {getStatusIcon(spread.approval_status)}
            <span className="text-xs text-gray-400">
              {getStatusText(spread.approval_status)}
            </span>
          </div>
        )}
      </div>

      {/* Spread Preview */}
      <div className="relative h-32 bg-gradient-to-br from-dark-900/50 to-dark-700/50 rounded-xl mb-4 overflow-hidden">
        <div className="absolute inset-0 p-4">
          {spread.positions?.slice(0, Math.min(8, spread.card_count)).map((position, index) => (
            <div
              key={position.position}
              className="absolute w-3 h-4 bg-gold-400/60 rounded border border-gold-300 shadow-sm"
              style={{
                left: `${position.x * 0.8 + 10}%`,
                top: `${position.y * 0.6 + 20}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: spread.card_count - index
              }}
            />
          ))}
          
          {spread.card_count > 8 && (
            <div className="absolute bottom-2 right-2 text-gold-300 text-xs bg-dark-800/80 px-2 py-1 rounded">
              +{spread.card_count - 8} {language === 'ar' ? 'أوراق' : 'more'}
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-xs text-gray-400 block">
            {language === 'ar' ? 'عدد الأوراق' : 'Cards'}
          </span>
          <span className="text-white font-semibold">{spread.card_count}</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 block">
            {language === 'ar' ? 'المستوى' : 'Level'}
          </span>
          <span className="text-white font-semibold capitalize">
            {spread.difficulty_level}
          </span>
        </div>
      </div>

      {/* Category Badge */}
      <div className="mb-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gold-500/20 text-gold-300 border border-gold-500/30">
          <Sparkles className="w-3 h-3 mr-1" />
          {categories.find(c => c.value === spread.category)?.[language === 'ar' ? 'label_ar' : 'label'] || spread.category}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-gold-600 hover:bg-gold-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
        >
          <Eye className="w-4 h-4 mr-2 inline" />
          {language === 'ar' ? 'عرض' : 'View'}
        </motion.button>
        
        {!isSystem && (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleEditSpread(spread)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDeleteSpread(spread.id)}
              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </>
        )}
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleDuplicateSpread(spread)}
          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-xl transition-colors"
        >
          <Copy className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 mx-auto mb-4"></div>
          <p className="text-gray-400">
            {language === 'ar' ? 'جاري تحميل الانتشارات...' : 'Loading spreads...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {language === 'ar' ? 'إدارة الانتشارات' : 'Spread Manager'}
              </h1>
              <p className="text-gray-400 text-lg">
                {language === 'ar' 
                  ? 'إنشاء وإدارة انتشارات التاروت المخصصة - الكارطة المغربية (48 ورقة)'
                  : 'Create and manage custom tarot spreads - Moroccan Deck (48 cards)'
                }
              </p>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateSpread}
              className="bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-700 hover:to-gold-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {language === 'ar' ? 'انتشار جديد' : 'New Spread'}
            </motion.button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
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
                  <option key={category.value} value={category.value}>
                    {language === 'ar' ? category.label_ar : category.label}
                  </option>
                ))}
              </select>
            </div>
            
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
                  <option key={difficulty.value} value={difficulty.value}>
                    {language === 'ar' ? difficulty.label_ar : difficulty.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* System Spreads Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-6 h-6 text-gold-400" />
            <h2 className="text-2xl font-bold text-white">
              {language === 'ar' ? 'الانتشارات التقليدية المغربية' : 'Traditional Moroccan Spreads'}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSystemSpreads.map(spread => renderSpreadCard(spread, true))}
          </div>
        </div>

        {/* Custom Spreads Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-gold-400" />
            <h2 className="text-2xl font-bold text-white">
              {language === 'ar' ? 'انتشاراتي المخصصة' : 'My Custom Spreads'}
            </h2>
            <span className="bg-gold-500/20 text-gold-300 px-3 py-1 rounded-full text-sm font-medium">
              {filteredSpreads.length}
            </span>
          </div>
          
          {filteredSpreads.length === 0 ? (
            <div className="text-center py-12">
              <Grid className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                {language === 'ar' ? 'لا توجد انتشارات مخصصة' : 'No custom spreads yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {language === 'ar' 
                  ? 'ابدأ بإنشاء انتشار مخصص لعملائك'
                  : 'Start by creating a custom spread for your clients'
                }
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateSpread}
                className="bg-gold-600 hover:bg-gold-700 text-white px-6 py-3 rounded-xl font-semibold"
              >
                {language === 'ar' ? 'إنشاء انتشار' : 'Create Spread'}
              </motion.button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpreads.map(spread => renderSpreadCard(spread, false))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <SpreadCreatorModal
            spread={editingSpread}
            onClose={() => {
              setShowCreateModal(false);
              setEditingSpread(null);
            }}
            onSave={(newSpread) => {
              if (editingSpread) {
                setSpreads(spreads.map(s => s.id === newSpread.id ? newSpread : s));
              } else {
                setSpreads([...spreads, newSpread]);
              }
              setShowCreateModal(false);
              setEditingSpread(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Spread Creator Modal Component
const SpreadCreatorModal = ({ spread, onClose, onSave }) => {
  const { language, showSuccess, showError } = useUI();
  const { profile } = useAuth();
  
  const [formData, setFormData] = useState({
    name: spread?.name || '',
    name_ar: spread?.name_ar || '',
    description: spread?.description || '',
    description_ar: spread?.description_ar || '',
    card_count: spread?.card_count || 3,
    positions: spread?.positions || [],
    difficulty_level: spread?.difficulty_level || 'beginner',
    category: spread?.category || 'general'
  });
  
  const [isCreatingPositions, setIsCreatingPositions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const categories = [
    { value: 'general', label: 'General', label_ar: 'عام' },
    { value: 'love', label: 'Love & Relationships', label_ar: 'الحب والعلاقات' },
    { value: 'career', label: 'Career & Money', label_ar: 'المهنة والمال' },
    { value: 'spiritual', label: 'Spiritual', label_ar: 'روحي' },
    { value: 'health', label: 'Health', label_ar: 'صحة' },
    { value: 'finance', label: 'Finance', label_ar: 'مالية' }
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner', label_ar: 'مبتدئ' },
    { value: 'intermediate', label: 'Intermediate', label_ar: 'متوسط' },
    { value: 'advanced', label: 'Advanced', label_ar: 'متقدم' }
  ];

  const generatePositions = () => {
    const positions = [];
    const cardCount = parseInt(formData.card_count);
    
    // Generate positions based on card count
    if (cardCount === 1) {
      positions.push({
        position: 1,
        name: 'Card',
        name_ar: 'الورقة',
        meaning: 'Your guidance',
        meaning_ar: 'إرشادك',
        x: 50,
        y: 50
      });
    } else if (cardCount === 3) {
      positions.push(
        { position: 1, name: 'Past', name_ar: 'الماضي', meaning: 'Past influences', meaning_ar: 'تأثيرات الماضي', x: 20, y: 50 },
        { position: 2, name: 'Present', name_ar: 'الحاضر', meaning: 'Current situation', meaning_ar: 'الوضع الحالي', x: 50, y: 50 },
        { position: 3, name: 'Future', name_ar: 'المستقبل', meaning: 'Future outcome', meaning_ar: 'النتيجة المستقبلية', x: 80, y: 50 }
      );
    } else if (cardCount === 5) {
      positions.push(
        { position: 1, name: 'Situation', name_ar: 'الوضع', meaning: 'Current situation', meaning_ar: 'الوضع الحالي', x: 50, y: 60 },
        { position: 2, name: 'Challenge', name_ar: 'التحدي', meaning: 'What challenges you', meaning_ar: 'ما يتحداك', x: 25, y: 30 },
        { position: 3, name: 'Action', name_ar: 'العمل', meaning: 'What to do', meaning_ar: 'ما يجب فعله', x: 75, y: 30 },
        { position: 4, name: 'Hidden', name_ar: 'المخفي', meaning: 'Hidden influences', meaning_ar: 'التأثيرات المخفية', x: 25, y: 80 },
        { position: 5, name: 'Outcome', name_ar: 'النتيجة', meaning: 'Final outcome', meaning_ar: 'النتيجة النهائية', x: 75, y: 80 }
      );
    } else {
      // Generate a circle pattern for other counts
      for (let i = 0; i < cardCount; i++) {
        const angle = (i * 2 * Math.PI) / cardCount - Math.PI / 2;
        const radius = 30;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        
        positions.push({
          position: i + 1,
          name: `Position ${i + 1}`,
          name_ar: `الموضع ${i + 1}`,
          meaning: `Card ${i + 1} meaning`,
          meaning_ar: `معنى الورقة ${i + 1}`,
          x: Math.max(5, Math.min(95, x)),
          y: Math.max(5, Math.min(95, y))
        });
      }
    }
    
    setFormData({ ...formData, positions });
    setIsCreatingPositions(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      showError(language === 'ar' ? 'يرجى ملء جميع الحقون المطلوبة' : 'Please fill in all required fields');
      return;
    }

    if (formData.positions.length !== parseInt(formData.card_count)) {
      showError(language === 'ar' ? 'عدد المواضع لا يطابق عدد الأوراق' : 'Number of positions does not match card count');
      return;
    }

    setIsSaving(true);
    try {
      const spreadData = {
        ...formData,
        deck_id: null, // Will use default Moroccan deck
        is_custom: true,
        created_by: profile.id,
        approval_status: 'pending'
      };

      let result;
      if (spread) {
        result = await SpreadAPI.updateSpread(spread.id, spreadData);
      } else {
        result = await SpreadAPI.createSpread(spreadData);
      }

      if (result.success) {
        showSuccess(language === 'ar' ? 'تم حفظ الانتشار بنجاح' : 'Spread saved successfully');
        onSave(result.data);
      } else {
        showError(result.error || 'Failed to save spread');
      }
    } catch (error) {
      showError('Error saving spread');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-dark-800 rounded-2xl border border-white/10 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {spread 
              ? (language === 'ar' ? 'تعديل الانتشار' : 'Edit Spread')
              : (language === 'ar' ? 'إنشاء انتشار جديد' : 'Create New Spread')
            }
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {language === 'ar' ? 'اسم الانتشار' : 'Spread Name'} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-dark-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-gold-500/50"
                placeholder={language === 'ar' ? 'أدخل اسم الانتشار' : 'Enter spread name'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}
              </label>
              <input
                type="text"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                className="w-full bg-dark-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-gold-500/50"
                placeholder={language === 'ar' ? 'أدخل الاسم بالعربية' : 'Enter Arabic name'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {language === 'ar' ? 'الوصف' : 'Description'} *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full bg-dark-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-gold-500/50"
                placeholder={language === 'ar' ? 'أدخل وصف الانتشار' : 'Enter spread description'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {language === 'ar' ? 'الوصف بالعربية' : 'Arabic Description'}
              </label>
              <textarea
                value={formData.description_ar}
                onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                rows={3}
                className="w-full bg-dark-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-gold-500/50"
                placeholder={language === 'ar' ? 'أدخل الوصف بالعربية' : 'Enter Arabic description'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'عدد الأوراق' : 'Card Count'} *
                </label>
                <select
                  value={formData.card_count}
                  onChange={(e) => setFormData({ ...formData, card_count: parseInt(e.target.value), positions: [] })}
                  className="w-full bg-dark-700/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'المستوى' : 'Difficulty'}
                </label>
                <select
                  value={formData.difficulty_level}
                  onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                  className="w-full bg-dark-700/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                >
                  {difficulties.map(difficulty => (
                    <option key={difficulty.value} value={difficulty.value}>
                      {language === 'ar' ? difficulty.label_ar : difficulty.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {language === 'ar' ? 'الفئة' : 'Category'}
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-dark-700/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {language === 'ar' ? category.label_ar : category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Position Configuration */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {language === 'ar' ? 'مواضع الأوراق' : 'Card Positions'}
              </h3>
              <button
                onClick={generatePositions}
                className="bg-gold-600 hover:bg-gold-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {language === 'ar' ? 'إنشاء تلقائي' : 'Auto Generate'}
              </button>
            </div>

            {/* Position Preview */}
            <div className="relative h-64 bg-dark-900/50 rounded-xl mb-4 overflow-hidden">
              <div className="absolute inset-0 p-4">
                {formData.positions.map((position, index) => (
                  <div
                    key={position.position}
                    className="absolute w-8 h-10 bg-gold-400/80 rounded border border-gold-300 shadow-lg flex items-center justify-center text-xs font-bold text-dark-900 cursor-pointer hover:scale-110 transition-transform"
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    title={language === 'ar' && position.name_ar ? position.name_ar : position.name}
                  >
                    {position.position}
                  </div>
                ))}
              </div>
            </div>

            {/* Position List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {formData.positions.map((position, index) => (
                <div key={position.position} className="bg-dark-700/30 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 bg-gold-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {position.position}
                    </span>
                    <input
                      type="text"
                      value={position.name}
                      onChange={(e) => {
                        const newPositions = [...formData.positions];
                        newPositions[index].name = e.target.value;
                        setFormData({ ...formData, positions: newPositions });
                      }}
                      className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none"
                      placeholder="Position name"
                    />
                  </div>
                  <input
                    type="text"
                    value={position.meaning}
                    onChange={(e) => {
                      const newPositions = [...formData.positions];
                      newPositions[index].meaning = e.target.value;
                      setFormData({ ...formData, positions: newPositions });
                    }}
                    className="w-full bg-transparent border-none text-gray-400 text-xs focus:outline-none"
                    placeholder="Position meaning"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gold-600 hover:bg-gold-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {language === 'ar' ? 'حفظ الانتشار' : 'Save Spread'}
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SpreadManager; 