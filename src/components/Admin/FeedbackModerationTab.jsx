import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Star, 
  MessageSquare, 
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Check,
  X,
  Filter,
  Search,
  ChevronDown,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import api from '../../services/frontendApi.js';

const FeedbackModerationTab = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();

  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [moderationAction, setModerationAction] = useState('');
  const [moderationData, setModerationData] = useState({
    moderated_rating: '',
    moderated_comment: '',
    is_visible_to_reader: false,
    is_visible_to_public: false,
    moderation_reason: '',
    admin_notes: ''
  });

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    service_type: 'all',
    rating_min: '',
    rating_max: '',
    page: 1,
    limit: 20
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, [filters]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const response = await api.getAllFeedbackForAdmin(filters);
      
      if (response.success) {
        setFeedback(response.data);
        setPagination(response.pagination);
      } else {
        showError(
          language === 'ar' 
            ? 'فشل في تحميل التقييمات'
            : 'Failed to load feedback'
        );
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
      showError(
        language === 'ar' 
          ? 'حدث خطأ أثناء تحميل التقييمات'
          : 'Error loading feedback'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleModerateFeedback = async () => {
    if (!selectedFeedback || !moderationAction) return;

    try {
      const response = await api.moderateFeedback(
        selectedFeedback.id, 
        {
          moderation_status: moderationAction,
          ...moderationData
        }
      );

      if (response.success) {
        showSuccess(
          language === 'ar' 
            ? `تم ${getActionText(moderationAction)} التقييم بنجاح`
            : `Feedback ${moderationAction} successfully`
        );
        
        setShowModerationModal(false);
        setSelectedFeedback(null);
        setModerationAction('');
        setModerationData({
          moderated_rating: '',
          moderated_comment: '',
          is_visible_to_reader: false,
          is_visible_to_public: false,
          moderation_reason: '',
          admin_notes: ''
        });
        
        loadFeedback();
      } else {
        showError(response.error);
      }
    } catch (error) {
      console.error('Error moderating feedback:', error);
      showError(
        language === 'ar' 
          ? 'حدث خطأ أثناء المراجعة'
          : 'Error during moderation'
      );
    }
  };

  const openModerationModal = (feedbackItem, action) => {
    setSelectedFeedback(feedbackItem);
    setModerationAction(action);
    
    // Pre-fill data based on action
    if (action === 'approved') {
      setModerationData({
        moderated_rating: feedbackItem.original_rating,
        moderated_comment: feedbackItem.original_comment,
        is_visible_to_reader: true,
        is_visible_to_public: false,
        moderation_reason: '',
        admin_notes: ''
      });
    } else if (action === 'edited') {
      setModerationData({
        moderated_rating: feedbackItem.original_rating,
        moderated_comment: feedbackItem.original_comment,
        is_visible_to_reader: true,
        is_visible_to_public: false,
        moderation_reason: '',
        admin_notes: ''
      });
    } else {
      setModerationData({
        moderated_rating: '',
        moderated_comment: '',
        is_visible_to_reader: false,
        is_visible_to_public: false,
        moderation_reason: '',
        admin_notes: ''
      });
    }
    
    setShowModerationModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      edited: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      deleted: 'bg-red-500/20 text-red-400 border-red-500/30',
      rejected: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      edited: Edit,
      deleted: Trash2,
      rejected: X
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const getActionText = (action) => {
    const texts = {
      approved: language === 'ar' ? 'الموافقة على' : 'approve',
      edited: language === 'ar' ? 'تعديل' : 'edit',
      deleted: language === 'ar' ? 'حذف' : 'delete',
      rejected: language === 'ar' ? 'رفض' : 'reject'
    };
    return texts[action] || action;
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const filteredFeedback = feedback.filter(item => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      item.client?.first_name?.toLowerCase().includes(searchLower) ||
      item.client?.last_name?.toLowerCase().includes(searchLower) ||
      item.reader?.first_name?.toLowerCase().includes(searchLower) ||
      item.reader?.last_name?.toLowerCase().includes(searchLower) ||
      item.original_comment?.toLowerCase().includes(searchLower) ||
      item.service_type?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {language === 'ar' ? 'مراجعة التقييمات' : 'Feedback Moderation'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' 
              ? 'راجع واعتمد تقييمات العملاء'
              : 'Review and moderate client feedback'
            }
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-colors flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>{language === 'ar' ? 'فلاتر' : 'Filters'}</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              language === 'ar' 
                ? 'البحث في التقييمات...'
                : 'Search feedback...'
            }
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
                    <option value="pending">{language === 'ar' ? 'قيد المراجعة' : 'Pending'}</option>
                    <option value="approved">{language === 'ar' ? 'معتمد' : 'Approved'}</option>
                    <option value="edited">{language === 'ar' ? 'معدل' : 'Edited'}</option>
                    <option value="deleted">{language === 'ar' ? 'محذوف' : 'Deleted'}</option>
                    <option value="rejected">{language === 'ar' ? 'مرفوض' : 'Rejected'}</option>
                  </select>
                </div>

                {/* Service Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'نوع الخدمة' : 'Service Type'}
                  </label>
                  <select
                    value={filters.service_type}
                    onChange={(e) => setFilters({...filters, service_type: e.target.value, page: 1})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
                    <option value="tarot_reading">{language === 'ar' ? 'قراءة التاروت' : 'Tarot Reading'}</option>
                    <option value="call_session">{language === 'ar' ? 'جلسة مكالمة' : 'Call Session'}</option>
                    <option value="chat_session">{language === 'ar' ? 'جلسة محادثة' : 'Chat Session'}</option>
                    <option value="astrology">{language === 'ar' ? 'علم التنجيم' : 'Astrology'}</option>
                    <option value="palm_reading">{language === 'ar' ? 'قراءة الكف' : 'Palm Reading'}</option>
                    <option value="spiritual_guidance">{language === 'ar' ? 'إرشاد روحي' : 'Spiritual Guidance'}</option>
                  </select>
                </div>

                {/* Rating Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'أقل تقييم' : 'Min Rating'}
                  </label>
                  <select
                    value={filters.rating_min}
                    onChange={(e) => setFilters({...filters, rating_min: e.target.value, page: 1})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">{language === 'ar' ? 'أي تقييم' : 'Any'}</option>
                    <option value="1">1 ⭐</option>
                    <option value="2">2 ⭐</option>
                    <option value="3">3 ⭐</option>
                    <option value="4">4 ⭐</option>
                    <option value="5">5 ⭐</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'أعلى تقييم' : 'Max Rating'}
                  </label>
                  <select
                    value={filters.rating_max}
                    onChange={(e) => setFilters({...filters, rating_max: e.target.value, page: 1})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">{language === 'ar' ? 'أي تقييم' : 'Any'}</option>
                    <option value="1">1 ⭐</option>
                    <option value="2">2 ⭐</option>
                    <option value="3">3 ⭐</option>
                    <option value="4">4 ⭐</option>
                    <option value="5">5 ⭐</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              {language === 'ar' ? 'لا توجد تقييمات' : 'No feedback found'}
            </p>
          </div>
        ) : (
          filteredFeedback.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-5 h-5 text-purple-400" />
                        <span className="text-white font-medium">
                          {item.client?.first_name} {item.client?.last_name}
                        </span>
                      </div>
                      
                      <div className="text-gray-400">→</div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-cyan-400 font-medium">
                          {item.reader?.first_name} {item.reader?.last_name}
                        </span>
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(item.moderation_status)}`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(item.moderation_status)}
                        <span>{item.moderation_status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>{item.service_type}</span>
                    <span>•</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Rating & Comment */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-300 font-medium">
                        {language === 'ar' ? 'التقييم الأصلي:' : 'Original Rating:'}
                      </span>
                      {renderStars(item.original_rating)}
                      <span className="text-yellow-400 font-semibold">
                        {item.original_rating}/5
                      </span>
                    </div>

                    {item.original_comment && (
                      <div>
                        <p className="text-gray-300 font-medium mb-2">
                          {language === 'ar' ? 'التعليق الأصلي:' : 'Original Comment:'}
                        </p>
                        <p className="text-gray-400 bg-white/5 rounded-lg p-3 border border-white/10">
                          {item.original_comment}
                        </p>
                      </div>
                    )}

                    {/* Moderated Content (if exists) */}
                    {item.moderation_status !== 'pending' && item.moderated_comment !== item.original_comment && (
                      <div>
                        <p className="text-gray-300 font-medium mb-2">
                          {language === 'ar' ? 'المحتوى المعدل:' : 'Moderated Content:'}
                        </p>
                        <div className="space-y-2">
                          {item.moderated_rating !== item.original_rating && (
                            <div className="flex items-center space-x-3">
                              <span className="text-gray-400">
                                {language === 'ar' ? 'التقييم المعدل:' : 'Moderated Rating:'}
                              </span>
                              {renderStars(item.moderated_rating)}
                              <span className="text-yellow-400 font-semibold">
                                {item.moderated_rating}/5
                              </span>
                            </div>
                          )}
                          
                          {item.moderated_comment && (
                            <p className="text-gray-400 bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                              {item.moderated_comment}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Visibility Status */}
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        {item.is_visible_to_reader ? (
                          <Eye className="w-4 h-4 text-green-400" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-red-400" />
                        )}
                        <span className={item.is_visible_to_reader ? 'text-green-400' : 'text-red-400'}>
                          {language === 'ar' ? 'مرئي للقارئ' : 'Visible to Reader'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {item.is_visible_to_public ? (
                          <Eye className="w-4 h-4 text-green-400" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-red-400" />
                        )}
                        <span className={item.is_visible_to_public ? 'text-green-400' : 'text-red-400'}>
                          {language === 'ar' ? 'مرئي للعامة' : 'Visible to Public'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {item.moderation_status === 'pending' && (
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => openModerationModal(item, 'approved')}
                      className="p-2 bg-green-600/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-colors"
                      title={language === 'ar' ? 'موافقة' : 'Approve'}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openModerationModal(item, 'edited')}
                      className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors"
                      title={language === 'ar' ? 'تعديل' : 'Edit'}
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openModerationModal(item, 'deleted')}
                      className="p-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-colors"
                      title={language === 'ar' ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openModerationModal(item, 'rejected')}
                      className="p-2 bg-gray-600/20 text-gray-400 border border-gray-500/30 rounded-lg hover:bg-gray-600/30 transition-colors"
                      title={language === 'ar' ? 'رفض' : 'Reject'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setFilters({...filters, page: Math.max(1, filters.page - 1)})}
            disabled={filters.page === 1}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
          >
            {language === 'ar' ? 'السابق' : 'Previous'}
          </button>

          <span className="text-gray-400">
            {language === 'ar' 
              ? `صفحة ${pagination.page} من ${pagination.pages}`
              : `Page ${pagination.page} of ${pagination.pages}`
            }
          </span>

          <button
            onClick={() => setFilters({...filters, page: Math.min(pagination.pages, filters.page + 1)})}
            disabled={filters.page === pagination.pages}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
          >
            {language === 'ar' ? 'التالي' : 'Next'}
          </button>
        </div>
      )}

      {/* Moderation Modal */}
      <AnimatePresence>
        {showModerationModal && selectedFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModerationModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl w-full max-w-2xl mx-auto overflow-hidden"
            >
              <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' 
                    ? `${getActionText(moderationAction)} التقييم`
                    : `${moderationAction.charAt(0).toUpperCase() + moderationAction.slice(1)} Feedback`
                  }
                </h3>
                <p className="text-gray-400 mt-1">
                  {language === 'ar' 
                    ? 'راجع واتخذ إجراء على هذا التقييم'
                    : 'Review and take action on this feedback'
                  }
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Original Content */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="text-white font-medium mb-3">
                    {language === 'ar' ? 'المحتوى الأصلي' : 'Original Content'}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      {renderStars(selectedFeedback.original_rating)}
                      <span className="text-yellow-400 font-semibold">
                        {selectedFeedback.original_rating}/5
                      </span>
                    </div>
                    {selectedFeedback.original_comment && (
                      <p className="text-gray-300">
                        {selectedFeedback.original_comment}
                      </p>
                    )}
                  </div>
                </div>

                {/* Moderation Fields */}
                {(moderationAction === 'approved' || moderationAction === 'edited') && (
                  <div className="space-y-4">
                    <h4 className="text-white font-medium">
                      {language === 'ar' ? 'المحتوى المعدل' : 'Moderated Content'}
                    </h4>

                    {/* Rating */}
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        {language === 'ar' ? 'التقييم' : 'Rating'}
                      </label>
                      <select
                        value={moderationData.moderated_rating}
                        onChange={(e) => setModerationData({
                          ...moderationData,
                          moderated_rating: parseInt(e.target.value)
                        })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value={1}>1 ⭐</option>
                        <option value={2}>2 ⭐</option>
                        <option value={3}>3 ⭐</option>
                        <option value={4}>4 ⭐</option>
                        <option value={5}>5 ⭐</option>
                      </select>
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        {language === 'ar' ? 'التعليق' : 'Comment'}
                      </label>
                      <textarea
                        value={moderationData.moderated_comment}
                        onChange={(e) => setModerationData({
                          ...moderationData,
                          moderated_comment: e.target.value
                        })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        rows={4}
                        maxLength={2000}
                      />
                    </div>

                    {/* Visibility Options */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="visible_to_reader"
                          checked={moderationData.is_visible_to_reader}
                          onChange={(e) => setModerationData({
                            ...moderationData,
                            is_visible_to_reader: e.target.checked
                          })}
                          className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="visible_to_reader" className="text-gray-300">
                          {language === 'ar' ? 'مرئي للقارئ' : 'Visible to Reader'}
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="visible_to_public"
                          checked={moderationData.is_visible_to_public}
                          onChange={(e) => setModerationData({
                            ...moderationData,
                            is_visible_to_public: e.target.checked
                          })}
                          className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="visible_to_public" className="text-gray-300">
                          {language === 'ar' ? 'مرئي للعامة' : 'Visible to Public'}
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Moderation Reason */}
                <div>
                  <label className="block text-gray-300 font-medium mb-2">
                    {language === 'ar' ? 'سبب الإجراء' : 'Moderation Reason'}
                  </label>
                  <textarea
                    value={moderationData.moderation_reason}
                    onChange={(e) => setModerationData({
                      ...moderationData,
                      moderation_reason: e.target.value
                    })}
                    placeholder={
                      language === 'ar' 
                        ? 'اشرح سبب اتخاذ هذا الإجراء...'
                        : 'Explain why you are taking this action...'
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-gray-300 font-medium mb-2">
                    {language === 'ar' ? 'ملاحظات إدارية' : 'Admin Notes'}
                  </label>
                  <textarea
                    value={moderationData.admin_notes}
                    onChange={(e) => setModerationData({
                      ...moderationData,
                      admin_notes: e.target.value
                    })}
                    placeholder={
                      language === 'ar' 
                        ? 'ملاحظات داخلية للفريق الإداري...'
                        : 'Internal notes for admin team...'
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={3}
                    maxLength={1000}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowModerationModal(false)}
                    className="px-6 py-3 bg-gray-600/20 text-gray-400 border border-gray-500/30 rounded-xl hover:bg-gray-600/30 transition-colors"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    onClick={handleModerateFeedback}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-200"
                  >
                    {language === 'ar' 
                      ? `${getActionText(moderationAction)} التقييم`
                      : `${moderationAction.charAt(0).toUpperCase() + moderationAction.slice(1)} Feedback`
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeedbackModerationTab;
</rewritten_file>