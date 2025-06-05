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
  Layout
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
  const [decks, setDecks] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpread, setSelectedSpread] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPositionEditor, setShowPositionEditor] = useState(false);
  const [showCreateSteps, setShowCreateSteps] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSpreadPreview, setShowSpreadPreview] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    card_count: 3,
    difficulty_level: 'beginner',
    category: 'general',
    deck_id: '',
    positions: []
  });

  const categories = [
    { id: 'general', name: 'General', name_ar: 'عام', icon: Star, color: 'cosmic-purple' },
    { id: 'love', name: 'Love', name_ar: 'حب', icon: Heart, color: 'cosmic-pink' },
    { id: 'career', name: 'Career', name_ar: 'مهنة', icon: Briefcase, color: 'cosmic-blue' },
    { id: 'spiritual', name: 'Spiritual', name_ar: 'روحي', icon: Sparkles, color: 'cosmic-purple' },
    { id: 'health', name: 'Health', name_ar: 'صحة', icon: Zap, color: 'cosmic-green' },
    { id: 'finance', name: 'Finance', name_ar: 'مالية', icon: Home, color: 'cosmic-gold' }
  ];

  const difficultyLevels = [
    { id: 'beginner', name: 'Beginner', name_ar: 'مبتدئ', color: 'emerald' },
    { id: 'intermediate', name: 'Intermediate', name_ar: 'متوسط', color: 'amber' },
    { id: 'advanced', name: 'Advanced', name_ar: 'متقدم', color: 'red' }
  ];

  useEffect(() => {
    loadData();
    loadNotifications();
    
    // Subscribe to real-time notifications
    const subscription = SpreadAPI.subscribeToReaderNotifications(profile?.id, () => {
      loadNotifications();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [profile?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [spreadsResult, decksResult, servicesResult] = await Promise.all([
        SpreadAPI.getReaderSpreads(profile?.id, true),
        SpreadAPI.getAllDecks(),
        // You'll need to import and use your existing services API
        { success: true, data: [] } // Placeholder for services
      ]);

      if (spreadsResult.success) setSpreads(spreadsResult.data);
      if (decksResult.success) setDecks(decksResult.data);
      if (servicesResult.success) setServices(servicesResult.data);
    } catch (error) {
      showError('Failed to load data');
    } finally {
      setLoading(false);
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
    setFormData({
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      card_count: 3,
      difficulty_level: 'beginner',
      category: 'general',
      deck_id: decks.find(d => d.is_default)?.id || '',
      positions: []
    });
    generateDefaultPositions(3);
    setShowCreateSteps(true);
    setCurrentStep(1);
  };

  const handleEditSpread = (spread) => {
    setSelectedSpread(spread);
    setFormData({
      name: spread.name,
      name_ar: spread.name_ar || '',
      description: spread.description,
      description_ar: spread.description_ar || '',
      card_count: spread.card_count,
      difficulty_level: spread.difficulty_level,
      category: spread.category,
      deck_id: spread.deck_id,
      positions: spread.positions || []
    });
    setShowEditModal(true);
  };

  const generateDefaultPositions = (count) => {
    const positions = [];
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      positions.push({
        position: i + 1,
        name: `Position ${i + 1}`,
        name_ar: `الموضع ${i + 1}`,
        meaning: `Meaning for position ${i + 1}`,
        meaning_ar: `معنى الموضع ${i + 1}`,
        x: (col / Math.max(cols - 1, 1)) * 80 + 10,
        y: (row / Math.max(rows - 1, 1)) * 80 + 10
      });
    }
    
    setFormData(prev => ({ ...prev, positions }));
  };

  const handleCardCountChange = (count) => {
    setFormData(prev => ({ ...prev, card_count: count }));
    generateDefaultPositions(count);
  };

  const handleEditPositions = () => {
    setShowPositionEditor(true);
  };

  const handlePositionsChange = (newPositions) => {
    setFormData(prev => ({ ...prev, positions: newPositions }));
  };

  const handleSavePositions = (newPositions) => {
    setFormData(prev => ({ ...prev, positions: newPositions, card_count: newPositions.length }));
    setShowPositionEditor(false);
  };

  const handleCancelPositionEdit = () => {
    setShowPositionEditor(false);
  };

  // Add step navigation and preview functions
  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePreviewSpread = () => {
    const validation = SpreadAPI.validateSpreadData(formData);
    if (!validation.isValid) {
      showError(validation.errors[0]);
      return;
    }
    setShowSpreadPreview(true);
  };

  const handleClosePreview = () => {
    setShowSpreadPreview(false);
  };

  const handleStepBasedSubmit = async () => {
    try {
      const validation = SpreadAPI.validateSpreadData(formData);
      if (!validation.isValid) {
        showError(validation.errors[0]);
        return;
      }

      const spreadData = {
        ...formData,
        created_by: profile?.id
      };

      const result = await SpreadAPI.createCustomSpread(spreadData);

      if (result.success) {
        showSuccess(language === 'ar' ? 'تم إنشاء الانتشار بنجاح وهو في انتظار الموافقة' : 'Spread created successfully and is pending approval');
        setShowCreateSteps(false);
        setShowSpreadPreview(false);
        setCurrentStep(1);
        loadData();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to save spread');
    }
  };

  const handleSubmitSpread = async () => {
    try {
      const validation = SpreadAPI.validateSpreadData(formData);
      if (!validation.isValid) {
        showError(validation.errors[0]);
        return;
      }

      const spreadData = {
        ...formData,
        created_by: profile?.id
      };

      let result;
      if (selectedSpread) {
        result = await SpreadAPI.updateSpread(selectedSpread.id, formData, profile?.id);
      } else {
        result = await SpreadAPI.createCustomSpread(spreadData);
      }

      if (result.success) {
        showSuccess(
          selectedSpread 
            ? (language === 'ar' ? 'تم تحديث الانتشار بنجاح' : 'Spread updated successfully')
            : (language === 'ar' ? 'تم إنشاء الانتشار بنجاح وهو في انتظار الموافقة' : 'Spread created successfully and is pending approval')
        );
        setShowCreateSteps(false);
        setShowEditModal(false);
        setSelectedSpread(null);
        loadData();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to save spread');
    }
  };

  const handleDeleteSpread = async (spreadId) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الانتشار؟' : 'Are you sure you want to delete this spread?')) {
      return;
    }

    try {
      const result = await SpreadAPI.deleteSpread(spreadId, profile?.id);
      if (result.success) {
        showSuccess(language === 'ar' ? 'تم حذف الانتشار بنجاح' : 'Spread deleted successfully');
        loadData();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to delete spread');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        icon: Clock, 
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        text: language === 'ar' ? 'في الانتظار' : 'Pending'
      },
      approved: { 
        icon: CheckCircle, 
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        text: language === 'ar' ? 'موافق عليه' : 'Approved'
      },
      rejected: { 
        icon: XCircle, 
        color: 'bg-red-500/20 text-red-300 border-red-500/30',
        text: language === 'ar' ? 'مرفوض' : 'Rejected'
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  const getCategoryIcon = (category) => {
    const categoryConfig = categories.find(c => c.id === category);
    return categoryConfig ? categoryConfig.icon : Star;
  };

  const renderSpreadCard = (spread) => {
    const CategoryIcon = getCategoryIcon(spread.category);
    const isCustom = spread.is_custom;
    const canEdit = isCustom && spread.created_by === profile?.id;

    return (
      <motion.div
        key={spread.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 hover:border-gold-400/40 transition-all duration-300"
      >
        {/* Cosmic background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-pink-600/5 rounded-2xl" />
        
        {/* Header */}
        <div className="relative flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center">
              <CategoryIcon className="w-5 h-5 text-dark-900" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-gold-300 transition-colors">
                {language === 'ar' && spread.name_ar ? spread.name_ar : spread.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users className="w-4 h-4" />
                <span>{spread.card_count} {language === 'ar' ? 'ورقة' : 'cards'}</span>
                <span className="text-gray-600">•</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs ${
                  spread.difficulty_level === 'beginner' ? 'bg-emerald-500/20 text-emerald-300' :
                  spread.difficulty_level === 'intermediate' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {difficultyLevels.find(d => d.id === spread.difficulty_level)?.[language === 'ar' ? 'name_ar' : 'name']}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isCustom && getStatusBadge(spread.approval_status)}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
          {language === 'ar' && spread.description_ar ? spread.description_ar : spread.description}
        </p>

        {/* Deck info */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Sparkles className="w-4 h-4" />
          <span>{language === 'ar' && spread.deck?.name_ar ? spread.deck.name_ar : spread.deck?.name}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedSpread(spread);
                setShowPreviewModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm">{language === 'ar' ? 'معاينة' : 'Preview'}</span>
            </motion.button>
            
            {canEdit && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleEditSpread(spread)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="text-sm">{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDeleteSpread(spread.id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">{language === 'ar' ? 'حذف' : 'Delete'}</span>
                </motion.button>
              </>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedSpread(spread);
              setShowAssignModal(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-gold-600/20 hover:bg-gold-600/30 text-gold-300 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">{language === 'ar' ? 'تعيين للخدمات' : 'Assign to Services'}</span>
          </motion.button>
        </div>

        {/* Custom spread indicator */}
        {isCustom && (
          <div className="absolute top-4 right-4">
            <div className="w-3 h-3 bg-gold-400 rounded-full shadow-lg shadow-gold-400/50" />
          </div>
        )}
      </motion.div>
    );
  };

  const renderCreateEditModal = () => (
    <AnimatePresence>
      {(showCreateModal || showEditModal) && (
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
                {selectedSpread 
                  ? (language === 'ar' ? 'تعديل الانتشار' : 'Edit Spread')
                  : (language === 'ar' ? 'إنشاء انتشار جديد' : 'Create New Spread')
                }
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedSpread(null);
                }}
                className="w-10 h-10 bg-gray-700/50 hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Info */}
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'اسم الانتشار' : 'Spread Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
                    placeholder={language === 'ar' ? 'أدخل اسم الانتشار' : 'Enter spread name'}
                  />
                </div>

                {/* Arabic Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
                    placeholder={language === 'ar' ? 'أدخل الاسم بالعربية' : 'Enter Arabic name'}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الوصف' : 'Description'}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors resize-none"
                    placeholder={language === 'ar' ? 'أدخل وصف الانتشار' : 'Enter spread description'}
                  />
                </div>

                {/* Arabic Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الوصف بالعربية' : 'Arabic Description'}
                  </label>
                  <textarea
                    value={formData.description_ar}
                    onChange={(e) => setFormData(prev => ({ ...prev, description_ar: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors resize-none"
                    placeholder={language === 'ar' ? 'أدخل الوصف بالعربية' : 'Enter Arabic description'}
                  />
                </div>
              </div>

              {/* Right Column - Configuration */}
              <div className="space-y-6">
                {/* Card Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'عدد الأوراق' : 'Number of Cards'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.card_count}
                    onChange={(e) => handleCardCountChange(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الفئة' : 'Category'}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {language === 'ar' ? category.name_ar : category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'مستوى الصعوبة' : 'Difficulty Level'}
                  </label>
                  <select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficulty_level: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
                  >
                    {difficultyLevels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {language === 'ar' ? level.name_ar : level.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deck Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'مجموعة الأوراق' : 'Tarot Deck'}
                  </label>
                  <select
                    value={formData.deck_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, deck_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {language === 'ar' && deck.name_ar ? deck.name_ar : deck.name}
                        {deck.is_default && ` (${language === 'ar' ? 'افتراضي' : 'Default'})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Positions Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      {language === 'ar' ? 'تخطيط الأوراق' : 'Card Layout'}
                    </label>
                    <motion.button
                      onClick={handleEditPositions}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gold-600/20 border border-gold-400/50 text-gold-300 rounded-lg hover:bg-gold-600/30 transition-colors text-sm"
                    >
                      <Layout className="w-4 h-4" />
                      {language === 'ar' ? 'تحرير المواضع' : 'Edit Positions'}
                    </motion.button>
                  </div>
                  <div className="w-full h-40 bg-dark-700/30 border border-gray-600/50 rounded-xl relative overflow-hidden">
                    {formData.positions.map((position, index) => (
                      <div
                        key={position.position}
                        className="absolute w-6 h-8 bg-gold-400/30 border border-gold-400/50 rounded transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs text-gold-300 font-bold hover:bg-gold-400/50 transition-colors"
                        style={{
                          left: `${position.x}%`,
                          top: `${position.y}%`
                        }}
                        title={language === 'ar' && position.name_ar ? position.name_ar : position.name}
                      >
                        {position.position}
                      </div>
                    ))}
                    {formData.positions.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        {language === 'ar' ? 'لا توجد مواضع' : 'No positions'}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {language === 'ar' 
                      ? `${formData.positions.length} موضع - انقر "تحرير المواضع" لتخصيص التخطيط`
                      : `${formData.positions.length} positions - Click "Edit Positions" to customize layout`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedSpread(null);
                }}
                className="px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmitSpread}
                className="px-6 py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-dark-900 font-bold rounded-xl transition-all duration-300 shadow-lg shadow-gold-500/25"
              >
                <div className="flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  {selectedSpread 
                    ? (language === 'ar' ? 'تحديث الانتشار' : 'Update Spread')
                    : (language === 'ar' ? 'إنشاء الانتشار' : 'Create Spread')
                  }
                </div>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Add stepped creation modal
  const renderSteppedCreateModal = () => (
    <AnimatePresence>
      {showCreateSteps && (
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
            className="bg-dark-800/90 backdrop-blur-xl border border-gold-400/30 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Step Progress Indicator */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center gap-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                      currentStep >= step 
                        ? 'bg-gold-400 text-dark-900 border-gold-400' 
                        : 'bg-transparent text-gray-400 border-gray-400'
                    }`}>
                      {step}
                    </div>
                    {step < 3 && (
                      <div className={`w-12 h-0.5 mx-2 ${
                        currentStep > step ? 'bg-gold-400' : 'bg-gray-600'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
                         {currentStep === 1 && (
               <div>
                 <h3 className="text-2xl font-bold text-white mb-6 text-center">
                   {language === 'ar' ? 'معلومات أساسية' : 'Basic Information'}
                 </h3>
                 <div className="space-y-6">
                   {/* Basic form fields */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <label className="block text-sm font-medium text-gray-300 mb-2">
                         {language === 'ar' ? 'الاسم' : 'Name'}
                       </label>
                       <input
                         type="text"
                         value={formData.name}
                         onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                         className="w-full px-4 py-3 bg-dark-700/50 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400"
                         placeholder={language === 'ar' ? 'اسم الانتشار' : 'Spread name'}
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
                         className="w-full px-4 py-3 bg-dark-700/50 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400"
                         placeholder={language === 'ar' ? 'الاسم بالعربية' : 'Arabic name'}
                         dir="rtl"
                       />
                     </div>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">
                       {language === 'ar' ? 'الوصف' : 'Description'}
                     </label>
                     <textarea
                       value={formData.description}
                       onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                       rows={4}
                       className="w-full px-4 py-3 bg-dark-700/50 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 resize-none"
                       placeholder={language === 'ar' ? 'وصف الانتشار' : 'Spread description'}
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">
                       {language === 'ar' ? 'الوصف بالعربية' : 'Arabic Description'}
                     </label>
                     <textarea
                       value={formData.description_ar}
                       onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                       rows={4}
                       className="w-full px-4 py-3 bg-dark-700/50 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 resize-none"
                       placeholder={language === 'ar' ? 'الوصف بالعربية' : 'Arabic description'}
                       dir="rtl"
                     />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div>
                       <label className="block text-sm font-medium text-gray-300 mb-2">
                         {language === 'ar' ? 'عدد الأوراق' : 'Card Count'}
                       </label>
                       <input
                         type="number"
                         min="1"
                         max="20"
                         value={formData.card_count}
                         onChange={(e) => handleCardCountChange(parseInt(e.target.value) || 1)}
                         className="w-full px-4 py-3 bg-dark-700/50 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-300 mb-2">
                         {language === 'ar' ? 'المستوى' : 'Difficulty'}
                       </label>
                       <select
                         value={formData.difficulty_level}
                         onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                         className="w-full px-4 py-3 bg-dark-700/50 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400"
                       >
                         {difficultyLevels.map(level => (
                           <option key={level.id} value={level.id}>
                             {language === 'ar' ? level.name_ar : level.name}
                           </option>
                         ))}
                       </select>
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-300 mb-2">
                         {language === 'ar' ? 'الفئة' : 'Category'}
                       </label>
                       <select
                         value={formData.category}
                         onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                         className="w-full px-4 py-3 bg-dark-700/50 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400"
                       >
                         {categories.map(category => (
                           <option key={category.id} value={category.id}>
                             {language === 'ar' ? category.name_ar : category.name}
                           </option>
                         ))}
                       </select>
                     </div>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">
                       {language === 'ar' ? 'مجموعة الأوراق' : 'Deck'}
                     </label>
                     <select
                       value={formData.deck_id}
                       onChange={(e) => setFormData({ ...formData, deck_id: e.target.value })}
                       className="w-full px-4 py-3 bg-dark-700/50 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400"
                     >
                       {decks.map(deck => (
                         <option key={deck.id} value={deck.id}>
                           {language === 'ar' && deck.name_ar ? deck.name_ar : deck.name}
                         </option>
                       ))}
                     </select>
                   </div>
                 </div>
               </div>
             )}

            {currentStep === 2 && (
              <div>
                <h3 className="text-2xl font-bold text-white mb-6 text-center">
                  {language === 'ar' ? 'ترتيب المواضع' : 'Position Layout'}
                </h3>
                <SpreadPositionEditor
                  cardCount={formData.card_count}
                  positions={formData.positions}
                  onPositionsChange={handlePositionsChange}
                  onSave={handleSavePositions}
                  onCancel={() => setCurrentStep(1)}
                  spreadName={formData.name}
                />
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h3 className="text-2xl font-bold text-white mb-6 text-center">
                  {language === 'ar' ? 'معاينة الانتشار' : 'Preview Spread'}
                </h3>
                <div className="space-y-6">
                  {/* Spread Information */}
                  <div className="bg-dark-700/50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gold-400 mb-4">
                      {language === 'ar' ? 'تفاصيل الانتشار' : 'Spread Details'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">{language === 'ar' ? 'الاسم:' : 'Name:'}</span>
                        <span className="text-white ml-2">{formData.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">{language === 'ar' ? 'عدد الأوراق:' : 'Card Count:'}</span>
                        <span className="text-white ml-2">{formData.card_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">{language === 'ar' ? 'الفئة:' : 'Category:'}</span>
                        <span className="text-white ml-2">{categories.find(c => c.id === formData.category)?.[language === 'ar' ? 'name_ar' : 'name']}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">{language === 'ar' ? 'المستوى:' : 'Difficulty:'}</span>
                        <span className="text-white ml-2">{difficultyLevels.find(d => d.id === formData.difficulty_level)?.[language === 'ar' ? 'name_ar' : 'name']}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-gray-400">{language === 'ar' ? 'الوصف:' : 'Description:'}</span>
                      <p className="text-white mt-1">{formData.description}</p>
                    </div>
                  </div>

                  {/* Position Preview */}
                  <div className="bg-dark-700/50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gold-400 mb-4">
                      {language === 'ar' ? 'تخطيط المواضع' : 'Position Layout'}
                    </h4>
                    <div className="relative bg-dark-600/50 rounded-xl h-64 border border-white/20">
                      {formData.positions.map((position, index) => (
                        <div
                          key={index}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2"
                          style={{
                            left: `${position.x}%`,
                            top: `${position.y}%`
                          }}
                        >
                          <div className="w-8 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded border border-gold-400/50 flex items-center justify-center text-xs text-white font-bold">
                            {position.position}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Position Details */}
                  <div className="bg-dark-700/50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gold-400 mb-4">
                      {language === 'ar' ? 'تفاصيل المواضع' : 'Position Details'}
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {formData.positions.map((position, index) => (
                        <div key={index} className="bg-dark-600/50 rounded-lg p-3">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-gold-400 font-bold">#{position.position}</span>
                            <span className="text-white font-medium">
                              {language === 'ar' && position.name_ar ? position.name_ar : position.name}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm">
                            {language === 'ar' && position.meaning_ar ? position.meaning_ar : position.meaning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8">
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => {
                    setShowCreateSteps(false);
                    setCurrentStep(1);
                  }}
                  whileHover={{ scale: 1.05 }}
                  className="px-6 py-3 bg-gray-600/20 border border-gray-400/50 text-gray-300 rounded-xl hover:bg-gray-600/30 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </motion.button>
                
                {currentStep > 1 && (
                  <motion.button
                    onClick={handlePreviousStep}
                    whileHover={{ scale: 1.05 }}
                    className="px-6 py-3 bg-blue-600/20 border border-blue-400/50 text-blue-300 rounded-xl hover:bg-blue-600/30 transition-colors"
                  >
                    {language === 'ar' ? 'السابق' : 'Previous'}
                  </motion.button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {currentStep === 3 && (
                  <motion.button
                    onClick={handlePreviewSpread}
                    whileHover={{ scale: 1.05 }}
                    className="px-6 py-3 bg-purple-600/20 border border-purple-400/50 text-purple-300 rounded-xl hover:bg-purple-600/30 transition-colors"
                  >
                    {language === 'ar' ? 'معاينة مفصلة' : 'Detailed Preview'}
                  </motion.button>
                )}
                
                {currentStep < 3 ? (
                  <motion.button
                    onClick={handleNextStep}
                    whileHover={{ scale: 1.05 }}
                    className="px-8 py-3 bg-gradient-to-r from-gold-400 to-gold-600 text-dark-900 font-bold rounded-xl hover:shadow-lg hover:shadow-gold-400/25 transition-all duration-300"
                  >
                    {language === 'ar' ? 'التالي' : 'Next'}
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleStepBasedSubmit}
                    whileHover={{ scale: 1.05 }}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-400 to-emerald-600 text-dark-900 font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-400/25 transition-all duration-300"
                  >
                    {language === 'ar' ? 'إنشاء الانتشار' : 'Create Spread'}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Add detailed preview modal
  const renderDetailedPreviewModal = () => (
    <AnimatePresence>
      {showSpreadPreview && (
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
            className="bg-dark-800/90 backdrop-blur-xl border border-gold-400/30 rounded-2xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                {language === 'ar' ? 'معاينة مفصلة للانتشار' : 'Detailed Spread Preview'}
              </h3>
              <motion.button
                onClick={handleClosePreview}
                whileHover={{ scale: 1.05 }}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Interactive Preview */}
            <div className="space-y-6">
              {/* Header with spread info */}
              <div className="text-center">
                <h4 className="text-3xl font-bold text-gold-400 mb-2">{formData.name}</h4>
                <p className="text-gray-300 mb-4">{formData.description}</p>
                <div className="flex items-center justify-center gap-6 text-sm">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-white">{formData.card_count} {language === 'ar' ? 'ورقة' : 'cards'}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-gold-400" />
                    <span className="text-white">{difficultyLevels.find(d => d.id === formData.difficulty_level)?.[language === 'ar' ? 'name_ar' : 'name']}</span>
                  </span>
                </div>
              </div>

              {/* Large Interactive Layout */}
              <div className="relative bg-gradient-to-br from-dark-600/50 to-dark-700/50 rounded-2xl border border-gold-400/20 p-8" style={{ height: '500px' }}>
                {formData.positions.map((position, index) => (
                  <div
                    key={index}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`
                    }}
                  >
                    {/* Card representation */}
                    <div className="relative w-16 h-24 rounded-lg border-2 border-gold-400/50 hover:border-gold-400 transition-all duration-200 group-hover:scale-110">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-lg" />
                      <div className="absolute inset-1 bg-gradient-to-br from-gold-400/20 to-gold-600/20 rounded border border-gold-400/30" />
                      
                      {/* Position number */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{position.position}</span>
                      </div>
                      
                      {/* Hover tooltip */}
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                        <div className="bg-dark-900/90 backdrop-blur-sm border border-gold-400/30 rounded-lg p-3 max-w-xs">
                          <div className="text-gold-400 font-bold text-sm mb-1">
                            {language === 'ar' && position.name_ar ? position.name_ar : position.name}
                          </div>
                          <div className="text-gray-300 text-xs">
                            {language === 'ar' && position.meaning_ar ? position.meaning_ar : position.meaning}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Position List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.positions.map((position, index) => (
                  <div key={index} className="bg-dark-700/50 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center text-dark-900 font-bold text-sm">
                        {position.position}
                      </div>
                      <div>
                        <h5 className="text-white font-semibold">
                          {language === 'ar' && position.name_ar ? position.name_ar : position.name}
                        </h5>
                        {position.name_ar && position.name_ar !== position.name && (
                          <p className="text-gray-400 text-sm">{position.name}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm">
                      {language === 'ar' && position.meaning_ar ? position.meaning_ar : position.meaning}
                    </p>
                    {position.meaning_ar && position.meaning_ar !== position.meaning && (
                      <p className="text-gray-400 text-xs mt-1">{position.meaning}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between mt-8">
              <motion.button
                onClick={handleClosePreview}
                whileHover={{ scale: 1.05 }}
                className="px-6 py-3 bg-gray-600/20 border border-gray-400/50 text-gray-300 rounded-xl hover:bg-gray-600/30 transition-colors"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </motion.button>

              <motion.button
                onClick={handleStepBasedSubmit}
                whileHover={{ scale: 1.05 }}
                className="px-8 py-3 bg-gradient-to-r from-emerald-400 to-emerald-600 text-dark-900 font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-400/25 transition-all duration-300"
              >
                {language === 'ar' ? 'إنشاء الانتشار' : 'Create Spread'}
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
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {language === 'ar' ? 'إدارة انتشارات التاروت' : 'Tarot Spread Management'}
            </h1>
            <p className="text-gray-400">
              {language === 'ar' 
                ? 'قم بإنشاء وإدارة انتشارات التاروت المخصصة لخدماتك' 
                : 'Create and manage custom tarot spreads for your services'
              }
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateSpread}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-dark-900 font-bold rounded-xl transition-all duration-300 shadow-lg shadow-gold-500/25"
          >
            <Plus className="w-5 h-5" />
            {language === 'ar' ? 'إنشاء انتشار جديد' : 'Create New Spread'}
          </motion.button>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="max-w-7xl mx-auto mb-8">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <h3 className="text-amber-300 font-medium mb-2">
              {language === 'ar' ? 'إشعارات' : 'Notifications'}
            </h3>
            <div className="space-y-2">
              {notifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className="text-sm text-gray-300">
                  {notification.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spreads Grid */}
      <div className="max-w-7xl mx-auto">
        {spreads.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-dark-900" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {language === 'ar' ? 'لا توجد انتشارات' : 'No Spreads Yet'}
            </h3>
            <p className="text-gray-400 mb-6">
              {language === 'ar' 
                ? 'ابدأ بإنشاء انتشار التاروت الأول الخاص بك'
                : 'Start by creating your first custom tarot spread'
              }
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateSpread}
              className="px-6 py-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-dark-900 font-bold rounded-xl transition-all duration-300"
            >
              {language === 'ar' ? 'إنشاء انتشار جديد' : 'Create New Spread'}
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spreads.map(renderSpreadCard)}
          </div>
        )}
      </div>

      {/* Modals */}
      {renderCreateEditModal()}
      
      {/* Position Editor Modal */}
      <AnimatePresence>
        {showPositionEditor && (
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
              className="bg-dark-800/95 backdrop-blur-xl border border-gold-400/20 rounded-3xl p-8 w-full max-w-6xl max-h-[95vh] overflow-y-auto"
            >
              <SpreadPositionEditor
                cardCount={formData.card_count}
                positions={formData.positions}
                onPositionsChange={handlePositionsChange}
                onSave={handleSavePositions}
                onCancel={handleCancelPositionEdit}
                spreadName={formData.name || (language === 'ar' ? 'انتشار جديد' : 'New Spread')}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stepped Creation Modal */}
      {renderSteppedCreateModal()}

      {/* Detailed Preview Modal */}
      {renderDetailedPreviewModal()}
    </div>
  );
};

export default SpreadManager; 