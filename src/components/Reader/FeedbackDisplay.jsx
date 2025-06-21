import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Star, 
  MessageSquare, 
  TrendingUp,
  Calendar,
  Filter,
  Search,
  User,
  Award,
  Heart,
  ThumbsUp
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { serviceFeedbackAPI } from '../../api/serviceFeedbackApi';

const FeedbackDisplay = () => {
  const { t } = useTranslation();
  const { language, showError } = useUI();

  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    service_type: 'all',
    rating_min: '',
    page: 1,
    limit: 12
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFeedbackAndStats();
  }, [filters]);

  const loadFeedbackAndStats = async () => {
    setLoading(true);
    try {
      // Load feedback and stats in parallel
      const [feedbackResponse, statsResponse] = await Promise.all([
        serviceFeedbackAPI.getReaderFeedback(filters),
        serviceFeedbackAPI.getReaderStats()
      ]);

      if (feedbackResponse.success) {
        setFeedback(feedbackResponse.data);
        setPagination(feedbackResponse.pagination);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
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

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-400';
    if (rating >= 4) return 'text-blue-400';
    if (rating >= 3.5) return 'text-yellow-400';
    if (rating >= 3) return 'text-orange-400';
    return 'text-red-400';
  };

  const formatServiceType = (serviceType) => {
    const types = {
      tarot_reading: language === 'ar' ? 'قراءة التاروت' : 'Tarot Reading',
      call_session: language === 'ar' ? 'جلسة مكالمة' : 'Call Session',
      chat_session: language === 'ar' ? 'جلسة محادثة' : 'Chat Session',
      astrology: language === 'ar' ? 'علم التنجيم' : 'Astrology',
      palm_reading: language === 'ar' ? 'قراءة الكف' : 'Palm Reading',
      spiritual_guidance: language === 'ar' ? 'إرشاد روحي' : 'Spiritual Guidance'
    };
    return types[serviceType] || serviceType;
  };

  const filteredFeedback = feedback.filter(item => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      item.client?.first_name?.toLowerCase().includes(searchLower) ||
      item.client?.last_name?.toLowerCase().includes(searchLower) ||
      item.moderated_comment?.toLowerCase().includes(searchLower) ||
      item.service_type?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {language === 'ar' ? 'تقييمات العملاء' : 'Client Feedback'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' 
              ? 'مراجعات وتقييمات العملاء المعتمدة'
              : 'Approved client reviews and ratings'
            }
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' ? 'المتوسط العام' : 'Overall Rating'}
                </p>
                <p className={`text-2xl font-bold ${getRatingColor(stats.average_rating)}`}>
                  {stats.average_rating?.toFixed(1) || '0.0'}
                </p>
              </div>
              <Award className="w-8 h-8 text-purple-400" />
            </div>
            <div className="mt-3">
              {renderStars(Math.round(stats.average_rating || 0))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' ? 'إجمالي التقييمات' : 'Total Reviews'}
                </p>
                <p className="text-2xl font-bold text-blue-400">
                  {stats.total_feedback || 0}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' ? 'تقييمات إيجابية' : 'Positive Reviews'}
                </p>
                <p className="text-2xl font-bold text-green-400">
                  {stats.positive_feedback_count || 0}
                </p>
              </div>
              <ThumbsUp className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.total_feedback > 0 
                ? `${((stats.positive_feedback_count / stats.total_feedback) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' ? 'هذا الشهر' : 'This Month'}
                </p>
                <p className="text-2xl font-bold text-yellow-400">
                  {stats.monthly_feedback_count || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-400" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
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

        {/* Service Type Filter */}
        <select
          value={filters.service_type}
          onChange={(e) => setFilters({...filters, service_type: e.target.value, page: 1})}
          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">{language === 'ar' ? 'جميع الخدمات' : 'All Services'}</option>
          <option value="tarot_reading">{language === 'ar' ? 'قراءة التاروت' : 'Tarot Reading'}</option>
          <option value="call_session">{language === 'ar' ? 'جلسة مكالمة' : 'Call Session'}</option>
          <option value="chat_session">{language === 'ar' ? 'جلسة محادثة' : 'Chat Session'}</option>
          <option value="astrology">{language === 'ar' ? 'علم التنجيم' : 'Astrology'}</option>
          <option value="palm_reading">{language === 'ar' ? 'قراءة الكف' : 'Palm Reading'}</option>
          <option value="spiritual_guidance">{language === 'ar' ? 'إرشاد روحي' : 'Spiritual Guidance'}</option>
        </select>

        {/* Rating Filter */}
        <select
          value={filters.rating_min}
          onChange={(e) => setFilters({...filters, rating_min: e.target.value, page: 1})}
          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">{language === 'ar' ? 'جميع التقييمات' : 'All Ratings'}</option>
          <option value="5">5 ⭐ {language === 'ar' ? 'فقط' : 'Only'}</option>
          <option value="4">4+ ⭐</option>
          <option value="3">3+ ⭐</option>
          <option value="2">2+ ⭐</option>
          <option value="1">1+ ⭐</option>
        </select>
      </div>

      {/* Feedback Grid */}
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
            <p className="text-gray-500 text-sm mt-2">
              {language === 'ar' 
                ? 'ستظهر تقييمات العملاء المعتمدة هنا'
                : 'Approved client feedback will appear here'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFeedback.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {item.is_anonymous 
                          ? (language === 'ar' ? 'عميل مجهول' : 'Anonymous Client')
                          : `${item.client?.first_name || ''} ${item.client?.last_name || ''}`.trim()
                        }
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatServiceType(item.service_type)}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center space-x-3 mb-4">
                  {renderStars(item.moderated_rating || item.original_rating)}
                  <span className="text-yellow-400 font-semibold">
                    {item.moderated_rating || item.original_rating}/5
                  </span>
                </div>

                {/* Comment */}
                {(item.moderated_comment || item.original_comment) && (
                  <div className="mb-4">
                    <p className="text-gray-300 leading-relaxed">
                      "{item.moderated_comment || item.original_comment}"
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(item.service_date || item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {item.moderated_rating !== item.original_rating && (
                    <div className="text-xs text-blue-400">
                      {language === 'ar' ? 'معدل' : 'Moderated'}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
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
    </div>
  );
};

export default FeedbackDisplay;