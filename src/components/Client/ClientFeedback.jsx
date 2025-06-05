import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Star, 
  Edit,
  Search,
  Filter,
  MoreHorizontal,
  User,
  Calendar,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Award,
  Clock,
  X,
  Send
} from 'lucide-react';
import { useUI } from '../../context/UIContext';

const ClientFeedback = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    anonymous: false
  });

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  useEffect(() => {
    filterFeedbacks();
  }, [feedbacks, searchTerm, ratingFilter]);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockFeedbacks = [
        {
          id: '1',
          booking_id: 'booking_1',
          reader: {
            name: 'Samia Al-Mystique',
            name_ar: 'سامية الغامضة',
            avatar_url: null
          },
          service: {
            name: 'Tarot Reading',
            name_ar: 'قراءة التاروت'
          },
          rating: 5,
          comment: 'Amazing session! Samia provided very accurate insights about my career. I felt really connected to the reading.',
          comment_ar: 'جلسة مذهلة! قدمت سامية رؤى دقيقة جداً حول مسيرتي المهنية. شعرت بارتباط حقيقي بالقراءة.',
          created_at: '2024-01-25T15:30:00Z',
          session_date: '2024-01-25T14:00:00Z',
          anonymous: false,
          reader_response: {
            message: 'Thank you so much for your kind words! It was a pleasure helping you.',
            message_ar: 'شكراً جزيلاً لكلماتك الطيبة! كان من دواعي سروري مساعدتك.',
            created_at: '2024-01-25T16:00:00Z'
          }
        },
        {
          id: '2',
          booking_id: 'booking_2',
          reader: {
            name: 'Omar Al-Kindi',
            name_ar: 'عمر الكندي',
            avatar_url: null
          },
          service: {
            name: 'Astrology Consultation',
            name_ar: 'استشارة فلكية'
          },
          rating: 4,
          comment: 'Great reading! Omar was very knowledgeable about astrology. Some predictions were spot on.',
          comment_ar: 'قراءة رائعة! كان عمر على دراية كبيرة بعلم التنجيم. بعض التوقعات كانت في محلها.',
          created_at: '2024-01-24T10:00:00Z',
          session_date: '2024-01-24T09:00:00Z',
          anonymous: false,
          reader_response: null
        },
        {
          id: '3',
          booking_id: 'booking_3',
          reader: {
            name: 'Layla Al-Fares',
            name_ar: 'ليلى الفارس',
            avatar_url: null
          },
          service: {
            name: 'Palm Reading',
            name_ar: 'قراءة الكف'
          },
          rating: 5,
          comment: 'Incredible experience! The palm reading revealed so much about my personality and future.',
          comment_ar: 'تجربة لا تصدق! كشفت قراءة الكف الكثير عن شخصيتي ومستقبلي.',
          created_at: '2024-01-23T16:30:00Z',
          session_date: '2024-01-23T15:00:00Z',
          anonymous: true,
          reader_response: {
            message: 'I\'m so happy the reading resonated with you! Wishing you all the best.',
            message_ar: 'أنا سعيدة جداً أن القراءة أثرت فيك! أتمنى لك كل التوفيق.',
            created_at: '2024-01-23T17:00:00Z'
          }
        }
      ];
      setFeedbacks(mockFeedbacks);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
      showError(language === 'ar' ? 'فشل في تحميل التقييمات' : 'Failed to load feedbacks');
    } finally {
      setLoading(false);
    }
  };

  const filterFeedbacks = () => {
    let filtered = feedbacks;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(feedback => {
        const readerName = language === 'ar' ? feedback.reader.name_ar : feedback.reader.name;
        const serviceName = language === 'ar' ? feedback.service.name_ar : feedback.service.name;
        const comment = language === 'ar' ? feedback.comment_ar : feedback.comment;
        
        return readerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               comment.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by rating
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(feedback => feedback.rating === parseInt(ratingFilter));
    }

    setFilteredFeedbacks(filtered);
  };

  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      showError(language === 'ar' ? 'يرجى كتابة تعليق' : 'Please write a comment');
      return;
    }

    try {
      // Simulate API call
      const review = {
        id: Date.now().toString(),
        booking_id: selectedBooking.id,
        reader: selectedBooking.reader,
        service: selectedBooking.service,
        rating: newReview.rating,
        comment: newReview.comment,
        comment_ar: newReview.comment,
        created_at: new Date().toISOString(),
        session_date: selectedBooking.scheduled_at,
        anonymous: newReview.anonymous,
        reader_response: null
      };

      setFeedbacks(prev => [review, ...prev]);
      setShowReviewModal(false);
      setNewReview({ rating: 5, comment: '', anonymous: false });
      setSelectedBooking(null);
      showSuccess(language === 'ar' ? 'تم إرسال التقييم بنجاح' : 'Review submitted successfully');
    } catch (error) {
      showError(language === 'ar' ? 'فشل في إرسال التقييم' : 'Failed to submit review');
    }
  };

  const renderStars = (rating, size = 'w-5 h-5') => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderInteractiveStars = (rating, onChange) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 hover:text-yellow-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const averageRating = feedbacks.length > 0 
    ? (feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) / feedbacks.length).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري تحميل التقييمات...' : 'Loading feedbacks...'}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'التقييمات والمراجعات' : 'Reviews & Feedback'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'شارك تجربتك وتصفح مراجعاتك السابقة' : 'Share your experience and browse your past reviews'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-500/20 rounded-lg">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">
              {averageRating} {language === 'ar' ? 'متوسط' : 'Average'}
            </span>
          </div>
          
          <button
            onClick={() => setShowReviewModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>{language === 'ar' ? 'كتابة مراجعة' : 'Write Review'}</span>
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-6 border border-white/10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'البحث في التقييمات...' : 'Search reviews...'}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 transition-colors"
              />
            </div>
          </div>
          
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'كل التقييمات' : 'All Ratings'}</option>
            <option value="5">5 {language === 'ar' ? 'نجوم' : 'Stars'}</option>
            <option value="4">4 {language === 'ar' ? 'نجوم' : 'Stars'}</option>
            <option value="3">3 {language === 'ar' ? 'نجوم' : 'Stars'}</option>
            <option value="2">2 {language === 'ar' ? 'نجوم' : 'Stars'}</option>
            <option value="1">1 {language === 'ar' ? 'نجمة' : 'Star'}</option>
          </select>
        </div>
      </motion.div>

      {/* Reviews List */}
      <motion.div
        variants={containerVariants}
        className="space-y-4"
      >
        {filteredFeedbacks.map((feedback) => {
          const readerName = language === 'ar' ? feedback.reader.name_ar : feedback.reader.name;
          const serviceName = language === 'ar' ? feedback.service.name_ar : feedback.service.name;
          const comment = language === 'ar' ? feedback.comment_ar : feedback.comment;
          const readerResponse = feedback.reader_response ? 
            (language === 'ar' ? feedback.reader_response.message_ar : feedback.reader_response.message) : null;
          
          return (
            <motion.div
              key={feedback.id}
              variants={itemVariants}
              whileHover={{ scale: 1.01, y: -2 }}
              className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-purple-400/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    {feedback.reader.avatar_url ? (
                      <img 
                        src={feedback.reader.avatar_url} 
                        alt="Reader" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-white">{readerName}</h3>
                    <p className="text-sm text-gray-400">{serviceName}</p>
                    <div className="flex items-center space-x-3 mt-2">
                      {renderStars(feedback.rating)}
                      <span className="text-sm text-gray-400">
                        {formatDate(feedback.session_date)}
                      </span>
                      {feedback.anonymous && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                          {language === 'ar' ? 'مجهول' : 'Anonymous'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <button className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-300 leading-relaxed">{comment}</p>
              </div>
              
              {readerResponse && (
                <div className="border-t border-white/10 pt-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">
                        {language === 'ar' ? 'رد القارئ:' : 'Reader Response:'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(feedback.reader_response.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{readerResponse}</p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {filteredFeedbacks.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="text-center py-12"
        >
          <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            {language === 'ar' ? 'لا توجد مراجعات' : 'No Reviews Found'}
          </h3>
          <p className="text-gray-500">
            {language === 'ar' ? 'لا توجد مراجعات تطابق المعايير المحددة' : 'No reviews match the selected criteria'}
          </p>
        </motion.div>
      )}

      {/* Write Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowReviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glassmorphism rounded-2xl p-6 border border-white/10 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'كتابة مراجعة جديدة' : 'Write New Review'}
                </h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    {language === 'ar' ? 'تقييمك' : 'Your Rating'}
                  </label>
                  <div className="flex justify-center">
                    {renderInteractiveStars(newReview.rating, (rating) => 
                      setNewReview(prev => ({ ...prev, rating }))
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'ar' ? 'تعليقك' : 'Your Comment'}
                  </label>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder={language === 'ar' ? 'شارك تجربتك مع القراءة...' : 'Share your experience with the reading...'}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 transition-colors resize-none"
                  />
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={newReview.anonymous}
                    onChange={(e) => setNewReview(prev => ({ ...prev, anonymous: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 bg-white/5 border-white/20 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="anonymous" className="text-sm text-gray-300">
                    {language === 'ar' ? 'نشر كمجهول' : 'Post anonymously'}
                  </label>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={!newReview.comment.trim()}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إرسال المراجعة' : 'Submit Review'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ClientFeedback; 