import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import notificationScheduler from '../../services/notificationSchedulerService';
import NotificationEditModal from './NotificationEditModal';
import { 
  Send, 
  Users, 
  Eye, 
  BookOpen, 
  AlertCircle, 
  CheckCircle,
  MessageSquare,
  Sparkles,
  Calendar,
  Clock,
  Edit,
  Trash2,
  X,
  Plus,
  RefreshCw,
  Bell,
  Archive,
  Timer,
  Target,
  BarChart3
} from 'lucide-react';
import Button from '../Button';
import Loader from '../Loader';

const BroadcastNotifications = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const { user } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState('compose');
  
  // Compose form state
  const [selectedAudience, setSelectedAudience] = useState('clients');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  
  // List state
  const [notifications, setNotifications] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [stats, setStats] = useState(null);
  
  // Status messages
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'scheduled' || activeTab === 'logs') {
      loadNotifications();
    }
    if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab]);

  // Clear status messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const audiences = [
    {
      id: 'clients',
      name: language === 'ar' ? 'جميع العملاء' : 'All Clients',
      icon: Users,
      color: 'from-cosmic-500 to-cosmic-600',
      description: language === 'ar' ? 'إرسال إلى جميع العملاء المسجلين' : 'Send to all registered clients'
    },
    {
      id: 'readers',
      name: language === 'ar' ? 'جميع القراء' : 'All Readers',
      icon: BookOpen,
      color: 'from-gold-500 to-gold-600',
      description: language === 'ar' ? 'إرسال إلى جميع القراء النشطين' : 'Send to all active readers'
    },
    {
      id: 'monitors',
      name: language === 'ar' ? 'جميع المراقبين' : 'All Monitors',
      icon: Eye,
      color: 'from-purple-500 to-purple-600',
      description: language === 'ar' ? 'إرسال إلى جميع المراقبين' : 'Send to all monitors'
    },
    {
      id: 'all',
      name: language === 'ar' ? 'جميع المستخدمين' : 'All Users',
      icon: Target,
      color: 'from-emerald-500 to-emerald-600',
      description: language === 'ar' ? 'إرسال إلى جميع المستخدمين' : 'Send to all users'
    }
  ];

  const priorities = [
    {
      id: 'low',
      name: language === 'ar' ? 'منخفضة' : 'Low',
      color: 'text-green-400'
    },
    {
      id: 'normal',
      name: language === 'ar' ? 'عادية' : 'Normal',
      color: 'text-blue-400'
    },
    {
      id: 'high',
      name: language === 'ar' ? 'عالية' : 'High',
      color: 'text-yellow-400'
    },
    {
      id: 'urgent',
      name: language === 'ar' ? 'عاجلة' : 'Urgent',
      color: 'text-red-400'
    }
  ];

  const tabs = [
    {
      id: 'compose',
      name: language === 'ar' ? 'إنشاء إشعار' : 'Compose',
      icon: Plus,
      description: language === 'ar' ? 'إنشاء إشعار جديد' : 'Create new notification'
    },
    {
      id: 'scheduled',
      name: language === 'ar' ? 'المجدولة' : 'Scheduled',
      icon: Calendar,
      description: language === 'ar' ? 'الإشعارات المجدولة' : 'Scheduled notifications'
    },
    {
      id: 'logs',
      name: language === 'ar' ? 'السجلات' : 'Logs',
      icon: Archive,
      description: language === 'ar' ? 'سجل جميع الإشعارات' : 'All notification logs'
    },
    {
      id: 'stats',
      name: language === 'ar' ? 'الإحصائيات' : 'Statistics',
      icon: BarChart3,
      description: language === 'ar' ? 'إحصائيات الإشعارات' : 'Notification statistics'
    }
  ];

  const loadNotifications = async () => {
    setListLoading(true);
    try {
      const result = await notificationScheduler.getScheduledNotifications(user.id);
      if (result.success) {
        setNotifications(result.data);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(language === 'ar' ? 'فشل في تحميل الإشعارات' : 'Failed to load notifications');
    } finally {
      setListLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await notificationScheduler.getNotificationStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCreateNotification = async () => {
    if (!title.trim() || !message.trim()) {
      setError(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields');
      return;
    }

    // Validate scheduled date/time
    let scheduledAt = null;
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        setError(language === 'ar' ? 'يرجى تحديد التاريخ والوقت للإشعار المجدول' : 'Please set date and time for scheduled notification');
        return;
      }

      scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledAt <= new Date()) {
        setError(language === 'ar' ? 'يجب أن يكون الوقت المجدول في المستقبل' : 'Scheduled time must be in the future');
        return;
      }
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const result = await notificationScheduler.createNotification({
        title: title.trim(),
        message: message.trim(),
        targetAudience: selectedAudience,
        priority,
        scheduledAt: scheduledAt?.toISOString(),
        createdBy: user.id
      });

      if (result.success) {
        setSuccess(
          isScheduled
            ? (language === 'ar' ? 'تم جدولة الإشعار بنجاح' : 'Notification scheduled successfully')
            : (language === 'ar' ? 'تم إرسال الإشعار بنجاح' : 'Notification sent successfully')
        );

        // Reset form
        setTitle('');
        setMessage('');
        setPriority('normal');
        setIsScheduled(false);
        setScheduledDate('');
        setScheduledTime('');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(language === 'ar' ? 'فشل في إنشاء الإشعار' : 'Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  const handleEditNotification = async (notification) => {
    try {
      const result = await notificationScheduler.getNotificationById(notification.id);
      if (result.success) {
        setSelectedNotification(result.data);
        setEditModalOpen(true);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(language === 'ar' ? 'فشل في تحميل الإشعار' : 'Failed to load notification');
    }
  };

  const handleCancelNotification = async (notificationId) => {
    try {
      const result = await notificationScheduler.cancelNotification(notificationId);
      if (result.success) {
        setSuccess(language === 'ar' ? 'تم إلغاء الإشعار بنجاح' : 'Notification cancelled successfully');
        loadNotifications();
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(language === 'ar' ? 'فشل في إلغاء الإشعار' : 'Failed to cancel notification');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الإشعار؟' : 'Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      const result = await notificationScheduler.deleteNotification(notificationId);
      if (result.success) {
        setSuccess(language === 'ar' ? 'تم حذف الإشعار بنجاح' : 'Notification deleted successfully');
        loadNotifications();
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(language === 'ar' ? 'فشل في حذف الإشعار' : 'Failed to delete notification');
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'text-green-400';
      case 'scheduled': return 'text-blue-400';
      case 'failed': return 'text-red-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'sent': return language === 'ar' ? 'تم الإرسال' : 'Sent';
      case 'scheduled': return language === 'ar' ? 'مجدول' : 'Scheduled';
      case 'failed': return language === 'ar' ? 'فشل' : 'Failed';
      case 'cancelled': return language === 'ar' ? 'ملغي' : 'Cancelled';
      case 'draft': return language === 'ar' ? 'مسودة' : 'Draft';
      default: return status;
    }
  };

  const renderComposeTab = () => (
    <div className="space-y-6">
      {/* Audience Selection */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <h3 className="text-lg font-bold text-white mb-4">
          {language === 'ar' ? 'اختر الجمهور المستهدف' : 'Select Target Audience'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {audiences.map((audience) => {
            const IconComponent = audience.icon;
            return (
              <motion.button
                key={audience.id}
                onClick={() => setSelectedAudience(audience.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  p-4 rounded-xl border-2 transition-all duration-200
                  ${selectedAudience === audience.id
                    ? 'border-gold-400 bg-gold-400/10 shadow-lg shadow-gold-500/20'
                    : 'border-gold-400/20 bg-dark-700/30 hover:border-gold-400/40'
                  }
                `}
              >
                <div className="text-center">
                  <div className={`w-12 h-12 bg-gradient-to-r ${audience.color} rounded-lg flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-white mb-1">{audience.name}</h4>
                  <p className="text-gray-400 text-sm">{audience.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Scheduling Toggle */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Timer className="w-6 h-6 text-gold-400" />
            <div>
              <h3 className="text-lg font-bold text-white">
                {language === 'ar' ? 'جدولة الإشعار' : 'Schedule Notification'}
              </h3>
              <p className="text-gray-400 text-sm">
                {language === 'ar' ? 'اختر إرسال فوري أو مجدول' : 'Choose immediate or scheduled delivery'}
              </p>
            </div>
          </div>
          <motion.button
            onClick={() => setIsScheduled(!isScheduled)}
            className={`
              relative w-16 h-8 rounded-full transition-colors duration-200
              ${isScheduled ? 'bg-gold-500' : 'bg-gray-600'}
            `}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
              animate={{ x: isScheduled ? 36 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>

        <AnimatePresence>
          {isScheduled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'التاريخ' : 'Date'}
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'الوقت' : 'Time'}
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Message Form */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <h3 className="text-lg font-bold text-white mb-4">
          {language === 'ar' ? 'تفاصيل الرسالة' : 'Message Details'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'عنوان الإشعار' : 'Notification Title'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل عنوان الإشعار...' : 'Enter notification title...'}
              className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'الأولوية' : 'Priority'}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200"
            >
              {priorities.map((p) => (
                <option key={p.id} value={p.id} className="bg-dark-700">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {language === 'ar' ? 'نص الرسالة' : 'Message Text'}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder={language === 'ar' ? 'أدخل نص الرسالة...' : 'Enter message text...'}
              className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleCreateNotification}
            disabled={loading || !title.trim() || !message.trim()}
            className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-bold px-8 py-3 shadow-lg shadow-gold-500/30 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Loader size="sm" variant="spinner" />
                <span>{language === 'ar' ? 'جاري الإنشاء...' : 'Creating...'}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                {isScheduled ? <Calendar className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                <span>
                  {isScheduled 
                    ? (language === 'ar' ? 'جدولة الإشعار' : 'Schedule Notification')
                    : (language === 'ar' ? 'إرسال فوري' : 'Send Now')
                  }
                </span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderNotificationsList = (filterStatus = null) => {
    const filteredNotifications = filterStatus 
      ? notifications.filter(n => n.schedule_status === filterStatus)
      : notifications;

    if (listLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader variant="cosmic" size="lg" text={language === 'ar' ? 'جاري التحميل...' : 'Loading...'} />
        </div>
      );
    }

    if (filteredNotifications.length === 0) {
      return (
        <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-8 text-center shadow-2xl shadow-cosmic-500/10">
          <Bell className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {language === 'ar' ? 'لا توجد إشعارات' : 'No Notifications'}
          </h3>
          <p className="text-gray-400">
            {language === 'ar' ? 'لم يتم العثور على إشعارات' : 'No notifications found'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                  <h4 className="text-lg font-semibold text-white">{notification.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(notification.schedule_status)} bg-current/10`}>
                    {getStatusText(notification.schedule_status)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorities.find(p => p.id === notification.priority)?.color} bg-current/10`}>
                    {priorities.find(p => p.id === notification.priority)?.name}
                  </span>
                </div>
                
                <p className="text-gray-300 mb-4 line-clamp-2">{notification.message}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">{language === 'ar' ? 'الجمهور:' : 'Audience:'}</span>
                    <span className="text-white ml-1">
                      {audiences.find(a => a.id === notification.target_audience)?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">{language === 'ar' ? 'تم الإنشاء:' : 'Created:'}</span>
                    <span className="text-white ml-1">{formatDateTime(notification.created_at)}</span>
                  </div>
                  {notification.scheduled_at && (
                    <div>
                      <span className="text-gray-400">{language === 'ar' ? 'مجدول لـ:' : 'Scheduled for:'}</span>
                      <span className="text-white ml-1">{formatDateTime(notification.scheduled_at)}</span>
                    </div>
                  )}
                  {notification.sent_at && (
                    <div>
                      <span className="text-gray-400">{language === 'ar' ? 'تم الإرسال:' : 'Sent:'}</span>
                      <span className="text-white ml-1">{formatDateTime(notification.sent_at)}</span>
                    </div>
                  )}
                </div>

                {notification.sent_count > 0 && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-400">{language === 'ar' ? 'تم إرساله إلى:' : 'Sent to:'}</span>
                    <span className="text-green-400 ml-1">{notification.sent_count} {language === 'ar' ? 'مستخدم' : 'users'}</span>
                    {notification.failed_count > 0 && (
                      <>
                        <span className="text-gray-400 ml-2">{language === 'ar' ? 'فشل:' : 'Failed:'}</span>
                        <span className="text-red-400 ml-1">{notification.failed_count} {language === 'ar' ? 'مستخدم' : 'users'}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse ml-4">
                {notification.schedule_status === 'scheduled' && (
                  <>
                    <motion.button
                      onClick={() => handleEditNotification(notification)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors duration-200"
                      title={language === 'ar' ? 'تعديل' : 'Edit'}
                    >
                      <Edit className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleCancelNotification(notification.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors duration-200"
                      title={language === 'ar' ? 'إلغاء' : 'Cancel'}
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </>
                )}
                
                {['draft', 'cancelled', 'failed'].includes(notification.schedule_status) && (
                  <motion.button
                    onClick={() => handleDeleteNotification(notification.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors duration-200"
                    title={language === 'ar' ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderStatsTab = () => {
    if (!stats) {
      return (
        <div className="flex justify-center py-12">
          <Loader variant="cosmic" size="lg" text={language === 'ar' ? 'جاري التحميل...' : 'Loading...'} />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm font-medium">
                  {language === 'ar' ? 'إجمالي الإشعارات' : 'Total Notifications'}
                </p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm font-medium">
                  {language === 'ar' ? 'تم الإرسال' : 'Sent'}
                </p>
                <p className="text-2xl font-bold text-white">{stats.sent}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-300 text-sm font-medium">
                  {language === 'ar' ? 'مجدولة' : 'Scheduled'}
                </p>
                <p className="text-2xl font-bold text-white">{stats.scheduled}</p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-400/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-300 text-sm font-medium">
                  {language === 'ar' ? 'فشل' : 'Failed'}
                </p>
                <p className="text-2xl font-bold text-white">{stats.failed}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Audience Breakdown */}
        <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
          <h3 className="text-lg font-bold text-white mb-4">
            {language === 'ar' ? 'توزيع الجمهور' : 'Audience Breakdown'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(stats.audienceBreakdown).map(([audience, count]) => {
              const audienceData = audiences.find(a => a.id === audience);
              if (!audienceData) return null;
              
              const IconComponent = audienceData.icon;
              return (
                <div key={audience} className="bg-dark-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className={`w-10 h-10 bg-gradient-to-r ${audienceData.color} rounded-lg flex items-center justify-center`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{audienceData.name}</p>
                      <p className="text-gray-400 text-sm">{count} {language === 'ar' ? 'إشعار' : 'notifications'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/30">
            <MessageSquare className="w-6 h-6 text-dark-900" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {language === 'ar' ? 'نظام الإشعارات الجماعية' : 'Bulk Notification System'}
            </h2>
            <p className="text-gray-400">
              {language === 'ar' 
                ? 'إنشاء وجدولة وإدارة الإشعارات الجماعية'
                : 'Create, schedule, and manage bulk notifications'
              }
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end">
          <motion.button
            onClick={() => {
              if (activeTab === 'scheduled' || activeTab === 'logs') {
                loadNotifications();
              }
              if (activeTab === 'stats') {
                loadStats();
              }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-cosmic-500/20 text-cosmic-400 rounded-lg hover:bg-cosmic-500/30 transition-colors duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </motion.button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-dark-800/50 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 shadow-2xl shadow-cosmic-500/10">
        <div className="flex space-x-1 rtl:space-x-reverse overflow-x-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-dark-900 shadow-lg shadow-gold-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gold-400/10'
                  }
                `}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-900/30 border border-red-400/30 rounded-lg p-4 backdrop-blur-xl"
          >
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-900/30 border border-green-400/30 rounded-lg p-4 backdrop-blur-xl"
          >
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-green-300">{success}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'compose' && renderComposeTab()}
          {activeTab === 'scheduled' && renderNotificationsList('scheduled')}
          {activeTab === 'logs' && renderNotificationsList()}
          {activeTab === 'stats' && renderStatsTab()}
        </motion.div>
      </AnimatePresence>

      {/* Edit Modal */}
      {editModalOpen && (
        <NotificationEditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          notification={selectedNotification}
          onSave={(updatedNotification) => {
            setSelectedNotification(updatedNotification);
            setEditModalOpen(false);
            loadNotifications();
          }}
        />
      )}
    </div>
  );
};

export default BroadcastNotifications; 