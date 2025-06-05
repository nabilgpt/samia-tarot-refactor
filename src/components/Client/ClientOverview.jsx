import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Wallet, 
  Calendar, 
  Bell, 
  Star,
  TrendingUp,
  Clock,
  CreditCard,
  MessageSquare,
  Plus,
  ArrowRight,
  Activity,
  Heart,
  Gift,
  Sparkles,
  Eye,
  BookOpen,
  Users,
  Globe
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { ClientAPI } from '../../api/clientApi';

const ClientOverview = () => {
  const { t } = useTranslation();
  const { language } = useUI();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    wallet_balance: 0,
    active_bookings: 0,
    completed_bookings: 0,
    total_bookings: 0,
    unread_notifications: 0,
    latest_review: null
  });
  const [recentActivity, setRecentActivity] = useState([]);

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

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const response = await ClientAPI.getDashboardStats();
      if (response.success) {
        setStats(response.data);
      } else {
        // Mock data for demonstration
        setStats({
          wallet_balance: 245.50,
          active_bookings: 2,
          completed_bookings: 12,
          total_bookings: 14,
          unread_notifications: 3,
          latest_review: {
            rating: 5,
            created_at: '2024-01-20T10:30:00Z'
          }
        });
      }

      // Mock recent activity
      setRecentActivity([
        {
          id: '1',
          type: 'booking_confirmed',
          title: language === 'ar' ? 'تم تأكيد حجزك' : 'Booking Confirmed',
          description: language === 'ar' ? 'جلسة تاروت مع مدام سامية' : 'Tarot session with Madame Samia',
          time: '2024-01-20T15:30:00Z',
          icon: Calendar,
          color: 'from-green-500 to-emerald-500'
        },
        {
          id: '2',
          type: 'payment_success',
          title: language === 'ar' ? 'تم الدفع بنجاح' : 'Payment Successful',
          description: language === 'ar' ? 'تم إضافة 100 ريال للمحفظة' : '100 SAR added to wallet',
          time: '2024-01-20T14:15:00Z',
          icon: CreditCard,
          color: 'from-blue-500 to-cyan-500'
        },
        {
          id: '3',
          type: 'review_submitted',
          title: language === 'ar' ? 'تم إرسال التقييم' : 'Review Submitted',
          description: language === 'ar' ? 'شكراً لتقييمك الجلسة' : 'Thank you for rating the session',
          time: '2024-01-20T12:00:00Z',
          icon: Star,
          color: 'from-yellow-500 to-orange-500'
        }
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      id: 'book_session',
      title: language === 'ar' ? 'احجز جلسة جديدة' : 'Book New Session',
      description: language === 'ar' ? 'اختر خدمة وقارئ مناسب' : 'Choose service and reader',
      icon: Plus,
      gradient: 'from-purple-500 via-pink-500 to-red-500',
      action: () => window.location.href = '/services'
    },
    {
      id: 'add_funds',
      title: language === 'ar' ? 'شحن المحفظة' : 'Top Up Wallet',
      description: language === 'ar' ? 'أضف رصيد لحسابك' : 'Add funds to your account',
      icon: CreditCard,
      gradient: 'from-green-500 via-teal-500 to-cyan-500',
      action: () => console.log('Navigate to wallet')
    },
    {
      id: 'view_bookings',
      title: language === 'ar' ? 'عرض الحجوزات' : 'View Bookings',
      description: language === 'ar' ? 'إدارة جلساتك المحجوزة' : 'Manage your booked sessions',
      icon: Calendar,
      gradient: 'from-blue-500 via-indigo-500 to-purple-500',
      action: () => console.log('Navigate to bookings')
    },
    {
      id: 'browse_readers',
      title: language === 'ar' ? 'تصفح القراء' : 'Browse Readers',
      description: language === 'ar' ? 'اكتشف قراء جدد' : 'Discover new readers',
      icon: Users,
      gradient: 'from-orange-500 via-red-500 to-pink-500',
      action: () => window.location.href = '/readers'
    }
  ];

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return language === 'ar' ? `منذ ${diffInMinutes} دقيقة` : `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return language === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return language === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-gold-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Welcome Message */}
      <motion.div
        variants={itemVariants}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block mb-4"
        >
          <Sparkles className="w-8 h-8 text-gold-400" />
        </motion.div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gold-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          {language === 'ar' ? 'مرحباً بك في رحلتك الروحانية' : 'Welcome to Your Spiritual Journey'}
        </h1>
        <p className="text-gray-400 text-lg">
          {language === 'ar' ? 'تابع جلساتك واكتشف إرشاد جديد' : 'Track your sessions and discover new guidance'}
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[
          {
            title: language === 'ar' ? 'رصيد المحفظة' : 'Wallet Balance',
            value: `${stats.wallet_balance.toFixed(2)} ${language === 'ar' ? 'ريال' : 'SAR'}`,
            icon: Wallet,
            color: 'from-green-500 to-emerald-500',
            change: '+12.5%',
            trend: 'up'
          },
          {
            title: language === 'ar' ? 'الحجوزات النشطة' : 'Active Bookings',
            value: stats.active_bookings,
            icon: Calendar,
            color: 'from-blue-500 to-cyan-500',
            change: `${stats.total_bookings} ${language === 'ar' ? 'إجمالي' : 'total'}`,
            trend: 'neutral'
          },
          {
            title: language === 'ar' ? 'الإشعارات الجديدة' : 'New Notifications',
            value: stats.unread_notifications,
            icon: Bell,
            color: 'from-purple-500 to-pink-500',
            change: language === 'ar' ? 'غير مقروءة' : 'unread',
            trend: 'notification'
          },
          {
            title: language === 'ar' ? 'آخر تقييم' : 'Latest Review',
            value: stats.latest_review ? `${stats.latest_review.rating}/5` : '—',
            icon: Star,
            color: 'from-yellow-500 to-orange-500',
            change: stats.latest_review ? getTimeAgo(stats.latest_review.created_at) : '—',
            trend: 'star'
          }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05, 
                y: -10,
                transition: { duration: 0.3 }
              }}
              className="relative group"
            >
              <div className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300 overflow-hidden">
                {/* Background glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`}></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {stat.trend === 'up' && (
                      <motion.div
                        variants={pulseVariants}
                        animate="animate"
                        className="flex items-center text-green-400 text-sm"
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>{stat.change}</span>
                      </motion.div>
                    )}
                    {stat.trend === 'notification' && stats.unread_notifications > 0 && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-3 h-3 bg-red-500 rounded-full"
                      />
                    )}
                  </div>
                  
                  <div>
                    <p className="text-2xl font-bold text-white mb-1">
                      {stat.value}
                    </p>
                    <p className="text-gray-400 text-sm font-medium">
                      {stat.title}
                    </p>
                    {stat.trend !== 'up' && stat.change && (
                      <p className="text-gray-500 text-xs mt-1">
                        {stat.change}
                      </p>
                    )}
                  </div>
                </div>

                {/* Shine effect */}
                <div className="absolute inset-0 -left-full group-hover:left-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-all duration-1000 transform skew-x-12"></div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}
          </span>
        </h2>
        
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.id}
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
                whileTap={{ scale: 0.95 }}
                onClick={action.action}
                className="group relative cursor-pointer"
              >
                <div className="relative p-6 rounded-2xl glassmorphism border border-white/10 hover:border-gold-400/50 transition-all duration-500 overflow-hidden h-full">
                  {/* Glow effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-2xl`}></div>
                  
                  {/* Icon */}
                  <div className="relative z-10 mb-4">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-xl`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 space-y-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-gold-300 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {action.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-5 h-5 text-gold-400" />
                  </div>

                  {/* Shine effect */}
                  <div className="absolute inset-0 -left-full group-hover:left-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-1000 transform skew-x-12"></div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
          </span>
        </h2>

        <div className="glassmorphism rounded-2xl p-6 border border-white/10">
          <div className="space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <motion.div
                  key={activity.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 10 }}
                  className="flex items-start space-x-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer group"
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${activity.color} rounded-full flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white group-hover:text-gold-300 transition-colors">
                      {activity.title}
                    </h4>
                    <p className="text-gray-400 text-sm mt-1">
                      {activity.description}
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                      {getTimeAgo(activity.time)}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {recentActivity.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {language === 'ar' ? 'لا توجد أنشطة حديثة' : 'No recent activity'}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Inspirational Quote */}
      <motion.div
        variants={itemVariants}
        className="text-center"
      >
        <div className="glassmorphism rounded-2xl p-8 border border-white/10 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4">
              <Heart className="w-6 h-6 text-pink-400" />
            </div>
            <div className="absolute top-4 right-4">
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="absolute bottom-4 left-4">
              <Globe className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="absolute bottom-4 right-4">
              <BookOpen className="w-6 h-6 text-purple-400" />
            </div>
          </div>

          <div className="relative z-10">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="inline-block mb-4"
            >
              <Sparkles className="w-8 h-8 text-gold-400" />
            </motion.div>
            
            <blockquote className="text-xl font-medium text-white mb-4 italic">
              &ldquo;This platform has been a journey of self-discovery. The guidance I received helped me navigate through difficult times.&rdquo;
            </blockquote>
            
            <p className="text-gray-400">
              {language === 'ar' ? '— حكمة روحانية' : '— Spiritual Wisdom'}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ClientOverview; 