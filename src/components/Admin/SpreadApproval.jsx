import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  User,
  Calendar,
  Sparkles,
  Star,
  Heart,
  Briefcase,
  Home,
  Zap,
  MessageSquare,
  Filter,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { SpreadAPI } from '../../api/spreadApi';

const SpreadApproval = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { language, showSuccess, showError } = useUI();
  const [pendingSpreads, setPendingSpreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpread, setSelectedSpread] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const categories = [
    { id: 'all', name: 'All Categories', name_ar: 'جميع الفئات', icon: Star },
    { id: 'general', name: 'General', name_ar: 'عام', icon: Star },
    { id: 'love', name: 'Love', name_ar: 'حب', icon: Heart },
    { id: 'career', name: 'Career', name_ar: 'مهنة', icon: Briefcase },
    { id: 'spiritual', name: 'Spiritual', name_ar: 'روحي', icon: Sparkles },
    { id: 'health', name: 'Health', name_ar: 'صحة', icon: Zap },
    { id: 'finance', name: 'Finance', name_ar: 'مالية', icon: Home }
  ];

  const rejectionReasons = [
    {
      id: 'inappropriate_content',
      text: 'Inappropriate content or language',
      text_ar: 'محتوى أو لغة غير مناسبة'
    },
    {
      id: 'unclear_positions',
      text: 'Card positions are unclear or poorly defined',
      text_ar: 'مواضع الأوراق غير واضحة أو محددة بشكل سيء'
    },
    {
      id: 'duplicate_spread',
      text: 'Similar spread already exists',
      text_ar: 'انتشار مشابه موجود بالفعل'
    },
    {
      id: 'too_complex',
      text: 'Spread is too complex for intended difficulty level',
      text_ar: 'الانتشار معقد جداً بالنسبة لمستوى الصعوبة المقصود'
    },
    {
      id: 'insufficient_description',
      text: 'Description is insufficient or unclear',
      text_ar: 'الوصف غير كافي أو غير واضح'
    },
    {
      id: 'other',
      text: 'Other (please specify)',
      text_ar: 'أخرى (يرجى التحديد)'
    }
  ];

  useEffect(() => {
    loadPendingSpreads();
    
    // Subscribe to real-time notifications
    const subscription = SpreadAPI.subscribeToSpreadApprovals(profile?.id, () => {
      loadPendingSpreads();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [profile?.id]);

  const loadPendingSpreads = async () => {
    setLoading(true);
    try {
      const result = await SpreadAPI.getPendingSpreads();
      if (result.success) {
        setPendingSpreads(result.data);
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to load pending spreads');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSpread) return;

    try {
      const result = await SpreadAPI.approveSpread(selectedSpread.id, profile?.id, approvalNotes);
      if (result.success) {
        showSuccess(
          language === 'ar' 
            ? 'تم الموافقة على الانتشار بنجاح'
            : 'Spread approved successfully'
        );
        setShowApprovalModal(false);
        setSelectedSpread(null);
        setApprovalNotes('');
        loadPendingSpreads();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to approve spread');
    }
  };

  const handleReject = async () => {
    if (!selectedSpread || !rejectionReason) return;

    try {
      const result = await SpreadAPI.rejectSpread(selectedSpread.id, profile?.id, rejectionReason);
      if (result.success) {
        showSuccess(
          language === 'ar' 
            ? 'تم رفض الانتشار'
            : 'Spread rejected'
        );
        setShowRejectionModal(false);
        setSelectedSpread(null);
        setRejectionReason('');
        loadPendingSpreads();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to reject spread');
    }
  };

  const getCategoryIcon = (category) => {
    const categoryConfig = categories.find(c => c.id === category);
    return categoryConfig ? categoryConfig.icon : Star;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'intermediate': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'advanced': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredAndSortedSpreads = pendingSpreads
    .filter(spread => {
      const matchesSearch = spread.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spread.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spread.creator?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spread.creator?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || spread.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'creator':
          aValue = `${a.creator?.first_name || ''} ${a.creator?.last_name || ''}`;
          bValue = `${b.creator?.first_name || ''} ${b.creator?.last_name || ''}`;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'card_count':
          aValue = a.card_count;
          bValue = b.card_count;
          break;
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const renderSpreadCard = (spread) => {
    const CategoryIcon = getCategoryIcon(spread.category);

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
                <User className="w-4 h-4" />
                <span>{spread.creator?.first_name} {spread.creator?.last_name}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Clock className="w-3 h-3 inline mr-1" />
              {language === 'ar' ? 'في الانتظار' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
          {language === 'ar' && spread.description_ar ? spread.description_ar : spread.description}
        </p>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-xs text-gray-400 block">{language === 'ar' ? 'عدد الأوراق' : 'Cards'}</span>
            <span className="text-white font-semibold">{spread.card_count}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">{language === 'ar' ? 'الصعوبة' : 'Difficulty'}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(spread.difficulty_level)}`}>
              {spread.difficulty_level}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">{language === 'ar' ? 'الفئة' : 'Category'}</span>
            <span className="text-white font-semibold capitalize">{spread.category}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</span>
            <span className="text-white font-semibold">{formatDate(spread.created_at)}</span>
          </div>
        </div>

        {/* Deck info */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Sparkles className="w-4 h-4" />
          <span>{language === 'ar' && spread.deck?.name_ar ? spread.deck.name_ar : spread.deck?.name}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedSpread(spread);
              setShowApprovalModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">{language === 'ar' ? 'موافقة' : 'Approve'}</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedSpread(spread);
              setShowRejectionModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-xl transition-colors"
          >
            <XCircle className="w-4 h-4" />
            <span className="text-sm">{language === 'ar' ? 'رفض' : 'Reject'}</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              // This would open a detailed view modal
              console.log('View details for:', spread.id);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm">{language === 'ar' ? 'عرض' : 'View'}</span>
          </motion.button>
        </div>
      </motion.div>
    );
  };

  const renderApprovalModal = () => (
    <AnimatePresence>
      {showApprovalModal && selectedSpread && (
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
            className="bg-dark-800/95 backdrop-blur-xl border border-gold-400/20 rounded-3xl p-8 w-full max-w-2xl"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                {language === 'ar' ? 'الموافقة على الانتشار' : 'Approve Spread'}
              </h2>
              
              <p className="text-gray-400">
                {language === 'ar' && selectedSpread.name_ar ? selectedSpread.name_ar : selectedSpread.name}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {language === 'ar' ? 'ملاحظات الموافقة (اختيارية)' : 'Approval Notes (Optional)'}
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors resize-none"
                placeholder={
                  language === 'ar' 
                    ? 'أضف أي ملاحظات أو تعليقات للقارئ...'
                    : 'Add any notes or feedback for the reader...'
                }
              />
            </div>

            <div className="flex items-center justify-end gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedSpread(null);
                  setApprovalNotes('');
                }}
                className="px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleApprove}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl transition-all duration-300"
              >
                {language === 'ar' ? 'تأكيد الموافقة' : 'Confirm Approval'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderRejectionModal = () => (
    <AnimatePresence>
      {showRejectionModal && selectedSpread && (
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
            className="bg-dark-800/95 backdrop-blur-xl border border-gold-400/20 rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                {language === 'ar' ? 'رفض الانتشار' : 'Reject Spread'}
              </h2>
              
              <p className="text-gray-400">
                {language === 'ar' && selectedSpread.name_ar ? selectedSpread.name_ar : selectedSpread.name}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                {language === 'ar' ? 'سبب الرفض' : 'Rejection Reason'}
              </label>
              <div className="space-y-2">
                {rejectionReasons.map((reason) => (
                  <label key={reason.id} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="rejectionReason"
                      value={reason.id === 'other' ? rejectionReason : reason.text}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-1 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-gray-300 text-sm">
                      {language === 'ar' ? reason.text_ar : reason.text}
                    </span>
                  </label>
                ))}
              </div>
              
              {rejectionReason.includes('Other') && (
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full mt-3 px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-red-400/50 focus:ring-1 focus:ring-red-400/50 transition-colors resize-none"
                  placeholder={
                    language === 'ar' 
                      ? 'يرجى تحديد سبب الرفض...'
                      : 'Please specify the rejection reason...'
                  }
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedSpread(null);
                  setRejectionReason('');
                }}
                className="px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReject}
                disabled={!rejectionReason}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {language === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
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
            {language === 'ar' ? 'جاري تحميل الانتشارات...' : 'Loading pending spreads...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {language === 'ar' ? 'الموافقة على الانتشارات' : 'Spread Approvals'}
            </h1>
            <p className="text-gray-400">
              {language === 'ar' 
                ? 'راجع ووافق على انتشارات التاروت المخصصة المُنشأة من قبل القراء'
                : 'Review and approve custom tarot spreads created by readers'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
              <span className="text-amber-300 font-semibold">
                {filteredAndSortedSpreads.length} {language === 'ar' ? 'في الانتظار' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ar' ? 'البحث...' : 'Search...'}
              className="w-full pl-10 pr-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
            />
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {language === 'ar' ? category.name_ar : category.name}
              </option>
            ))}
          </select>

          {/* Sort by */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
          >
            <option value="created_at">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created Date'}</option>
            <option value="name">{language === 'ar' ? 'الاسم' : 'Name'}</option>
            <option value="creator">{language === 'ar' ? 'المُنشئ' : 'Creator'}</option>
            <option value="category">{language === 'ar' ? 'الفئة' : 'Category'}</option>
            <option value="card_count">{language === 'ar' ? 'عدد الأوراق' : 'Card Count'}</option>
          </select>

          {/* Sort order */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-dark-700/50 border border-gray-600/50 rounded-xl text-white hover:border-gold-400/50 transition-colors"
          >
            <ArrowUpDown className="w-5 h-5" />
            <span>{sortOrder === 'asc' ? (language === 'ar' ? 'تصاعدي' : 'Asc') : (language === 'ar' ? 'تنازلي' : 'Desc')}</span>
          </motion.button>
        </div>
      </div>

      {/* Spreads Grid */}
      <div className="max-w-7xl mx-auto">
        {filteredAndSortedSpreads.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-dark-900" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {language === 'ar' ? 'لا توجد انتشارات في الانتظار' : 'No Pending Spreads'}
            </h3>
            <p className="text-gray-400">
              {language === 'ar' 
                ? 'جميع الانتشارات تمت الموافقة عليها أو رفضها'
                : 'All spreads have been approved or rejected'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAndSortedSpreads.map(renderSpreadCard)}
          </div>
        )}
      </div>

      {/* Modals */}
      {renderApprovalModal()}
      {renderRejectionModal()}
    </div>
  );
};

export default SpreadApproval; 