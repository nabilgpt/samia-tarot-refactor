import React from 'react';
import { motion } from 'framer-motion';
import { useUI } from '../../../context/UIContext';
import { ThumbsUp, MessageSquare, Star } from 'lucide-react';

const ReviewsManagement = () => {
  const { language } = useUI();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      className="space-y-6"
    >
      {/* Title and Description */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
          {language === 'ar' ? 'إدارة التقييمات' : 'Reviews Management'}
        </h2>
        <p className="text-gray-400 mt-1">
          {language === 'ar' ? 'إدارة والرد على تقييمات المستخدمين وتعليقاتهم' : 'Manage and respond to user reviews and feedback'}
        </p>
      </div>

      {/* Coming Soon Content */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-12 text-center">
        <div className="flex justify-center space-x-4 mb-6">
          <ThumbsUp className="w-12 h-12 text-green-400" />
          <MessageSquare className="w-12 h-12 text-blue-400" />
          <Star className="w-12 h-12 text-yellow-400" />
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-4">
          {language === 'ar' ? 'نظام إدارة التقييمات' : 'Reviews Management System'}
        </h3>
        
        <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
          {language === 'ar' 
            ? 'نظام شامل لإدارة تقييمات المستخدمين، الردود، والتحليلات. قريباً...'
            : 'Comprehensive system for managing user reviews, responses, and analytics. Coming soon...'
          }
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <ThumbsUp className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <h4 className="text-white font-semibold mb-2">
              {language === 'ar' ? 'تقييمات المستخدمين' : 'User Reviews'}
            </h4>
            <p className="text-gray-400 text-sm">
              {language === 'ar' 
                ? 'عرض وإدارة جميع تقييمات المستخدمين'
                : 'View and manage all user reviews'
              }
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <MessageSquare className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h4 className="text-white font-semibold mb-2">
              {language === 'ar' ? 'الردود والتعليقات' : 'Responses & Comments'}
            </h4>
            <p className="text-gray-400 text-sm">
              {language === 'ar' 
                ? 'الرد على التقييمات وإدارة التعليقات'
                : 'Respond to reviews and manage comments'
              }
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <Star className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
            <h4 className="text-white font-semibold mb-2">
              {language === 'ar' ? 'تحليلات التقييمات' : 'Review Analytics'}
            </h4>
            <p className="text-gray-400 text-sm">
              {language === 'ar' 
                ? 'تحليل معدلات التقييم والإحصائيات'
                : 'Analyze rating trends and statistics'
              }
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ReviewsManagement; 