import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Bell, 
  BellOff,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  Filter,
  Search,
  X,
  Calendar,
  MessageSquare,
  Gift,
  Heart
} from 'lucide-react';
import { useUI } from '../../context/UIContext';

const ClientNotifications = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');

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
    loadNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchTerm, typeFilter, readFilter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockNotifications = [
        {
          id: '1',
          type: 'booking_confirmed',
          title: 'Booking Confirmed',
          title_ar: 'تم تأكيد الحجز',
          message: 'Your tarot reading session with Samia Al-Mystique has been confirmed for tomorrow at 3:00 PM',
          message_ar: 'تم تأكيد جلسة قراءة التاروت مع سامية الغامضة غداً في تمام الساعة 3:00 مساءً',
          read: false,
          created_at: '2024-01-25T15:30:00Z',
          priority: 'high'
        },
        {
          id: '2',
          type: 'session_reminder',
          title: 'Session Reminder',
          title_ar: 'تذكير بالجلسة',
          message: 'Your astrology consultation is starting in 1 hour. Please be ready.',
          message_ar: 'ستبدأ استشارتك الفلكية خلال ساعة واحدة. يرجى الاستعداد.',
          read: false,
          created_at: '2024-01-25T14:45:00Z',
          priority: 'medium'
        },
        {
          id: '3',
          type: 'payment_success',
          title: 'Payment Successful',
          title_ar: 'تمت الدفعة بنجاح',
          message: 'Your payment of $50 for the tarot reading session has been processed successfully.',
          message_ar: 'تمت معالجة دفعتك بقيمة 50 دولاراً لجلسة قراءة التاروت بنجاح.',
          read: true,
          created_at: '2024-01-25T13:20:00Z',
          priority: 'low'
        },
        {
          id: '4',
          type: 'promotion',
          title: 'Special Offer',
          title_ar: 'عرض خاص',
          message: 'Get 20% off your next palm reading session. Limited time offer!',
          message_ar: 'احصل على خصم 20% على جلسة قراءة الكف القادمة. عرض لفترة محدودة!',
          read: true,
          created_at: '2024-01-25T10:00:00Z',
          priority: 'low'
        }
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      showError(language === 'ar' ? 'فشل في تحميل الإشعارات' : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(notification => {
        const title = language === 'ar' ? notification.title_ar : notification.title;
        const message = language === 'ar' ? notification.message_ar : notification.message;
        return title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               message?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(notification => notification.type === typeFilter);
    }

    // Filter by read status
    if (readFilter !== 'all') {
      filtered = filtered.filter(notification => 
        readFilter === 'read' ? notification.read : !notification.read
      );
    }

    setFilteredNotifications(filtered);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking_confirmed': return Calendar;
      case 'session_reminder': return Clock;
      case 'payment_success': return CheckCircle;
      case 'promotion': return Gift;
      case 'message': return MessageSquare;
      default: return Bell;
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'high') return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
    
    switch (type) {
      case 'booking_confirmed': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'session_reminder': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'payment_success': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'promotion': return 'text-pink-400 bg-pink-500/20 border-pink-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      showSuccess(language === 'ar' ? 'تم تمييز الإشعار كمقروء' : 'Notification marked as read');
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تحديث الإشعار' : 'Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      showSuccess(language === 'ar' ? 'تم تمييز جميع الإشعارات كمقروءة' : 'All notifications marked as read');
    } catch (error) {
      showError(language === 'ar' ? 'فشل في تحديث الإشعارات' : 'Failed to update notifications');
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
        </div>
        <span className="ml-4 text-gray-300">
          {language === 'ar' ? 'جاري تحميل الإشعارات...' : 'Loading notifications...'}
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
            {language === 'ar' ? 'الإشعارات' : 'Notifications'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'تابع جميع إشعاراتك وتحديثاتك' : 'Stay updated with all your notifications'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-purple-500/20 rounded-lg">
            <Bell className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 text-sm font-medium">
              {unreadCount} {language === 'ar' ? 'غير مقروء' : 'Unread'}
            </span>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{language === 'ar' ? 'تمييز الكل كمقروء' : 'Mark All Read'}</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-6 border border-white/10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'البحث في الإشعارات...' : 'Search notifications...'}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 transition-colors"
              />
            </div>
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
            <option value="booking_confirmed">{language === 'ar' ? 'تأكيد الحجز' : 'Booking Confirmed'}</option>
            <option value="session_reminder">{language === 'ar' ? 'تذكير الجلسة' : 'Session Reminder'}</option>
            <option value="payment_success">{language === 'ar' ? 'نجح الدفع' : 'Payment Success'}</option>
            <option value="promotion">{language === 'ar' ? 'العروض' : 'Promotions'}</option>
          </select>
          
          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400/50 transition-colors"
          >
            <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
            <option value="unread">{language === 'ar' ? 'غير مقروء' : 'Unread'}</option>
            <option value="read">{language === 'ar' ? 'مقروء' : 'Read'}</option>
          </select>
        </div>
      </motion.div>

      {/* Notifications List */}
      <motion.div
        variants={containerVariants}
        className="space-y-3"
      >
        {filteredNotifications.map((notification) => {
          const NotificationIcon = getNotificationIcon(notification.type);
          const title = language === 'ar' ? notification.title_ar : notification.title;
          const message = language === 'ar' ? notification.message_ar : notification.message;
          
          return (
            <motion.div
              key={notification.id}
              variants={itemVariants}
              whileHover={{ scale: 1.01, x: 5 }}
              className={`glassmorphism rounded-xl p-4 border transition-all duration-300 ${
                !notification.read 
                  ? 'border-purple-400/50 bg-purple-500/5' 
                  : 'border-white/10 hover:border-purple-400/30'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${getNotificationColor(notification.type, notification.priority)}`}>
                  <NotificationIcon className="w-6 h-6" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className={`font-semibold ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                          {title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        )}
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getNotificationColor(notification.type, notification.priority)}`}>
                          {notification.priority}
                        </span>
                      </div>
                      
                      <p className={`text-sm mb-2 ${!notification.read ? 'text-gray-300' : 'text-gray-400'}`}>
                        {message}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDateTime(notification.created_at)}
                        </span>
                        <span className="capitalize">{notification.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.read ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="flex items-center space-x-1 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                          title={language === 'ar' ? 'تمييز كمقروء' : 'Mark as read'}
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-xs">{language === 'ar' ? 'قراءة' : 'Read'}</span>
                        </motion.button>
                      ) : (
                        <div className="flex items-center space-x-1 px-3 py-1 bg-gray-500/20 text-gray-400 rounded-lg">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">{language === 'ar' ? 'مقروء' : 'Read'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {filteredNotifications.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="text-center py-12"
        >
          <BellOff className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            {language === 'ar' ? 'لا توجد إشعارات' : 'No Notifications'}
          </h3>
          <p className="text-gray-500">
            {language === 'ar' ? 'لا توجد إشعارات تطابق المعايير المحددة' : 'No notifications match the selected criteria'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ClientNotifications; 