import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Star, 
  MessageSquare, 
  Send,
  X,
  Heart,
  ThumbsUp,
  User,
  Shield,
  CheckCircle
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { serviceFeedbackAPI } from '../../api/serviceFeedbackApi';

const ServiceFeedbackModal = ({ 
  isOpen, 
  onClose, 
  booking, 
  serviceType, 
  onSubmitted 
}) => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedbackPrompt, setFeedbackPrompt] = useState(null);
  const [hoveredStar, setHoveredStar] = useState(0);

  // Load feedback prompt for service type
  useEffect(() => {
    if (isOpen && serviceType) {
      loadFeedbackPrompt();
    }
  }, [isOpen, serviceType]);

  const loadFeedbackPrompt = async () => {
    try {
      const response = await serviceFeedbackAPI.getFeedbackPrompt(serviceType);
      if (response.success && response.data) {
        setFeedbackPrompt(response.data);
      }
    } catch (error) {
      console.error('Error loading feedback prompt:', error);
    }
  };

  const handleSubmit = async () => {
    if (!booking || !rating) {
      showError(language === 'ar' ? 'يرجى تحديد التقييم' : 'Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData = {
        service_type: serviceType,
        booking_id: booking.id,
        reader_id: booking.reader_id,
        rating: rating,
        comment: comment.trim(),
        is_anonymous: isAnonymous
      };

      const response = await serviceFeedbackAPI.submitFeedback(feedbackData);

      if (response.success) {
        setIsSubmitted(true);
        showSuccess(
          language === 'ar' 
            ? 'تم إرسال تقييمك بنجاح! شكراً لك على ملاحظاتك القيمة.'
            : 'Your feedback has been submitted successfully! Thank you for your valuable input.'
        );
        
        // Call parent callback
        if (onSubmitted) {
          onSubmitted(response.data);
        }

        // Auto close after 3 seconds
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        showError(
          language === 'ar' 
            ? 'فشل في إرسال التقييم. يرجى المحاولة مرة أخرى.'
            : 'Failed to submit feedback. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showError(
        language === 'ar' 
          ? 'حدث خطأ أثناء إرسال التقييم'
          : 'An error occurred while submitting feedback'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRating(5);
      setComment('');
      setIsAnonymous(false);
      setIsSubmitted(false);
      onClose();
    }
  };

  const renderStars = () => {
    return (
      <div className="flex items-center justify-center space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            className="focus:outline-none"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hoveredStar || rating)
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-400 hover:text-yellow-300'
              }`}
            />
          </motion.button>
        ))}
      </div>
    );
  };

  const getRatingText = () => {
    const texts = {
      1: language === 'ar' ? 'سيء جداً' : 'Very Poor',
      2: language === 'ar' ? 'سيء' : 'Poor', 
      3: language === 'ar' ? 'متوسط' : 'Average',
      4: language === 'ar' ? 'جيد' : 'Good',
      5: language === 'ar' ? 'ممتاز' : 'Excellent'
    };
    return texts[hoveredStar || rating];
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      transition: { duration: 0.2 }
    }
  };

  const successVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl w-full max-w-md mx-auto overflow-hidden"
        >
          {/* Header */}
          <div className="relative p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {feedbackPrompt 
                      ? (language === 'ar' ? feedbackPrompt.title_ar : feedbackPrompt.title_en)
                      : (language === 'ar' ? 'قيم الخدمة' : 'Rate Service')
                    }
                  </h3>
                  <p className="text-sm text-gray-300">
                    {language === 'ar' ? 'شاركنا تجربتك' : 'Share your experience'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {!isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Service Info */}
                {booking && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {booking.reader?.first_name} {booking.reader?.last_name}
                        </p>
                        <p className="text-sm text-gray-300">
                          {booking.service?.name || serviceType}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prompt Message */}
                {feedbackPrompt && (
                  <div className="text-center">
                    <p className="text-gray-300 leading-relaxed">
                      {language === 'ar' ? feedbackPrompt.message_ar : feedbackPrompt.message_en}
                    </p>
                  </div>
                )}

                {/* Rating Section */}
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-white font-medium mb-3">
                      {language === 'ar' ? 'كيف تقيم تجربتك؟' : 'How would you rate your experience?'}
                    </p>
                    {renderStars()}
                  </div>
                  
                  <motion.p
                    key={hoveredStar || rating}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg font-semibold text-yellow-400"
                  >
                    {getRatingText()}
                  </motion.p>
                </div>

                {/* Comment Section */}
                <div className="space-y-3">
                  <label className="block text-white font-medium">
                    {language === 'ar' ? 'تعليق (اختياري)' : 'Comment (Optional)'}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      language === 'ar' 
                        ? 'شاركنا تفاصيل تجربتك...'
                        : 'Share details about your experience...'
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={4}
                    maxLength={2000}
                  />
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{comment.length}/2000</span>
                  </div>
                </div>

                {/* Anonymous Option */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <label htmlFor="anonymous" className="text-gray-300 text-sm flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>
                      {language === 'ar' ? 'إرسال التقييم بشكل مجهول' : 'Submit feedback anonymously'}
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={isSubmitting || !rating}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>
                        {language === 'ar' ? 'إرسال التقييم' : 'Submit Feedback'}
                      </span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              /* Success State */
              <motion.div
                variants={successVariants}
                initial="hidden"
                animate="visible"
                className="text-center space-y-6 py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto"
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>

                <div className="space-y-2">
                  <h4 className="text-2xl font-bold text-white">
                    {language === 'ar' ? 'شكراً لك!' : 'Thank You!'}
                  </h4>
                  <p className="text-gray-300">
                    {language === 'ar' 
                      ? 'تم إرسال تقييمك بنجاح. ملاحظاتك تساعدنا على تحسين خدماتنا.'
                      : 'Your feedback has been submitted successfully. Your input helps us improve our services.'
                    }
                  </p>
                </div>

                <div className="flex items-center justify-center space-x-2 text-yellow-400">
                  {[...Array(rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-gray-400"
                >
                  {language === 'ar' ? 'سيتم إغلاق هذه النافذة تلقائياً...' : 'This window will close automatically...'}
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ServiceFeedbackModal;