import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Bell, 
  Send, 
  Calendar, 
  Users, 
  MessageSquare, 
  Mail,
  Plus,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Globe,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { useUI } from '../../../context/UIContext';
import { AdminAPI } from '../../../api/adminApi';

const NotificationsSystem = () => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('send');
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Notification form state
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    title_ar: '',
    message: '',
    message_ar: '',
    type: 'general',
    target_audience: 'all',
    priority: 'normal',
    send_immediately: true,
    scheduled_at: '',
    include_email: false,
    include_push: true,
    include_sms: false
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
    if (activeTab === 'history') {
      loadNotificationHistory();
    }
  }, [activeTab]);

  const loadNotificationHistory = async () => {
    try {
      setLoading(true);
      const response = await AdminAPI.getNotificationHistory();
      if (response.success) {
        setNotifications(response.data);
      } else {
        // Mock data for demonstration
        setNotifications([
          {
            id: '1',
            title: language === 'ar' ? 'تحديث النظام' : 'System Update',
            message: language === 'ar' ? 'سيتم تحديث النظام غداً' : 'System will be updated tomorrow',
            type: 'system',
            target_audience: 'all',
            status: 'sent',
            sent_count: 1250,
            delivery_rate: 98.5,
            created_at: '2024-01-20T10:30:00Z',
            sent_at: '2024-01-20T10:35:00Z'
          },
          {
            id: '2',
            title: language === 'ar' ? 'ترحيب بالأعضاء الجدد' : 'Welcome New Members',
            message: language === 'ar' ? 'مرحباً بالأعضاء الجدد' : 'Welcome to our new members',
            type: 'welcome',
            target_audience: 'new_users',
            status: 'scheduled',
            scheduled_at: '2024-01-21T09:00:00Z',
            created_at: '2024-01-20T14:15:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading notification history:', error);
      showError(language === 'ar' ? 'فشل في تحميل سجل الإشعارات' : 'Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    try {
      setLoading(true);
      
      // Validate form
      if (!notificationForm.title || !notificationForm.message) {
        showError(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields');
        return;
      }

      const response = await AdminAPI.sendBulkNotification(notificationForm);
      if (response.success) {
        showSuccess(language === 'ar' ? 'تم إرسال الإشعار بنجاح' : 'Notification sent successfully');
        setShowComposeModal(false);
        resetForm();
        if (activeTab === 'history') {
          loadNotificationHistory();
        }
      } else {
        showError(response.error || (language === 'ar' ? 'فشل في إرسال الإشعار' : 'Failed to send notification'));
      }
    } catch (error) {
      showError(language === 'ar' ? 'فشل في إرسال الإشعار' : 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNotificationForm({
      title: '',
      title_ar: '',
      message: '',
      message_ar: '',
      type: 'general',
      target_audience: 'all',
      priority: 'normal',
      send_immediately: true,
      scheduled_at: '',
      include_email: false,
      include_push: true,
      include_sms: false
    });
  };

  const notificationTemplates = [
    {
      id: 'welcome',
      name: language === 'ar' ? 'ترحيب بالأعضاء الجدد' : 'New User Welcome',
      title: language === 'ar' ? 'مرحباً بك في سامية تاروت' : 'Welcome to Samia Tarot',
      message: language === 'ar' ? 'نرحب بك في منصة سامية تاروت. اكتشف عالم الروحانية معنا.' : 'Welcome to Samia Tarot platform. Discover the spiritual world with us.',
      type: 'welcome',
      target: 'new_users'
    },
    {
      id: 'maintenance',
      name: language === 'ar' ? 'صيانة النظام' : 'System Maintenance',
      title: language === 'ar' ? 'صيانة مجدولة للنظام' : 'Scheduled System Maintenance',
      message: language === 'ar' ? 'سيتم إجراء صيانة للنظام. قد تواجه انقطاع مؤقت في الخدمة.' : 'System maintenance will be performed. You may experience temporary service interruption.',
      type: 'system',
      target: 'all'
    },
    {
      id: 'promotion',
      name: language === 'ar' ? 'عرض خاص' : 'Special Offer',
      title: language === 'ar' ? 'عرض خاص لفترة محدودة' : 'Limited Time Special Offer',
      message: language === 'ar' ? 'استمتع بخصم 25% على جميع جلسات التاروت.' : 'Enjoy 25% discount on all tarot sessions.',
      type: 'promotion',
      target: 'active_users'
    }
  ];

  const tabs = [
    {
      id: 'send',
      name: language === 'ar' ? 'إرسال إشعار' : 'Send Notification',
      icon: Send,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'templates',
      name: language === 'ar' ? 'القوالب' : 'Templates',
      icon: MessageSquare,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      id: 'scheduled',
      name: language === 'ar' ? 'الإشعارات المجدولة' : 'Scheduled',
      icon: Calendar,
      gradient: 'from-orange-500 to-red-500'
    },
    {
      id: 'history',
      name: language === 'ar' ? 'السجل' : 'History',
      icon: Bell,
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'scheduled': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'failed': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'draft': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'system': return AlertCircle;
      case 'welcome': return Users;
      case 'promotion': return Bell;
      case 'announcement': return Globe;
      default: return MessageSquare;
    }
  };

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
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {language === 'ar' ? 'نظام الإشعارات' : 'Notifications System'}
          </h2>
          <p className="text-gray-400 mt-1">
            {language === 'ar' ? 'إرسال وجدولة الإشعارات الجماعية للمستخدمين' : 'Send and schedule bulk notifications to users'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowComposeModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'إشعار جديد' : 'New Notification'}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          {
            title: language === 'ar' ? 'إجمالي المرسل' : 'Total Sent',
            value: '15,230',
            icon: Send,
            color: 'from-blue-500 to-cyan-500',
            change: '+12%'
          },
          {
            title: language === 'ar' ? 'معدل التسليم' : 'Delivery Rate',
            value: '98.5%',
            icon: CheckCircle,
            color: 'from-green-500 to-emerald-500',
            change: '+2.1%'
          },
          {
            title: language === 'ar' ? 'إشعارات مجدولة' : 'Scheduled',
            value: '24',
            icon: Calendar,
            color: 'from-orange-500 to-red-500',
            change: 'Active'
          },
          {
            title: language === 'ar' ? 'معدل الفتح' : 'Open Rate',
            value: '67.8%',
            icon: Eye,
            color: 'from-purple-500 to-pink-500',
            change: '+5.3%'
          }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -5 }}
              className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs text-green-400 mt-1">
                    {stat.change}
                  </p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        variants={itemVariants}
        className="glassmorphism rounded-2xl p-6 border border-white/10"
      >
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? `bg-gradient-to-r ${tab.gradient} shadow-lg text-white`
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.name}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Send Notification Tab */}
          {activeTab === 'send' && (
            <div className="glassmorphism rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-bold text-gold-300 mb-6">
                {language === 'ar' ? 'إرسال إشعار جديد' : 'Send New Notification'}
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}
                    </label>
                    <input
                      type="text"
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                      placeholder="Enter notification title..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}
                    </label>
                    <input
                      type="text"
                      value={notificationForm.title_ar}
                      onChange={(e) => setNotificationForm({ ...notificationForm, title_ar: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                      placeholder="أدخل عنوان الإشعار..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'نوع الإشعار' : 'Notification Type'}
                    </label>
                    <select
                      value={notificationForm.type}
                      onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                    >
                      <option value="general">{language === 'ar' ? 'عام' : 'General'}</option>
                      <option value="system">{language === 'ar' ? 'نظام' : 'System'}</option>
                      <option value="promotion">{language === 'ar' ? 'عرض' : 'Promotion'}</option>
                      <option value="announcement">{language === 'ar' ? 'إعلان' : 'Announcement'}</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'الجمهور المستهدف' : 'Target Audience'}
                    </label>
                    <select
                      value={notificationForm.target_audience}
                      onChange={(e) => setNotificationForm({ ...notificationForm, target_audience: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                    >
                      <option value="all">{language === 'ar' ? 'جميع المستخدمين' : 'All Users'}</option>
                      <option value="clients">{language === 'ar' ? 'العملاء' : 'Clients'}</option>
                      <option value="readers">{language === 'ar' ? 'القراء' : 'Readers'}</option>
                      <option value="new_users">{language === 'ar' ? 'المستخدمون الجدد' : 'New Users'}</option>
                      <option value="active_users">{language === 'ar' ? 'المستخدمون النشطون' : 'Active Users'}</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'الرسالة (إنجليزي)' : 'Message (English)'}
                    </label>
                    <textarea
                      rows={4}
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors resize-none"
                      placeholder="Enter notification message..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'الرسالة (عربي)' : 'Message (Arabic)'}
                    </label>
                    <textarea
                      rows={4}
                      value={notificationForm.message_ar}
                      onChange={(e) => setNotificationForm({ ...notificationForm, message_ar: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors resize-none"
                      placeholder="أدخل نص الإشعار..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'الأولوية' : 'Priority'}
                    </label>
                    <select
                      value={notificationForm.priority}
                      onChange={(e) => setNotificationForm({ ...notificationForm, priority: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                    >
                      <option value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</option>
                      <option value="normal">{language === 'ar' ? 'عادية' : 'Normal'}</option>
                      <option value="high">{language === 'ar' ? 'عالية' : 'High'}</option>
                      <option value="urgent">{language === 'ar' ? 'عاجل' : 'Urgent'}</option>
                    </select>
                  </div>
                  
                  {/* Delivery Channels */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      {language === 'ar' ? 'قنوات التسليم' : 'Delivery Channels'}
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={notificationForm.include_push}
                          onChange={(e) => setNotificationForm({ ...notificationForm, include_push: e.target.checked })}
                          className="w-4 h-4 text-gold-400 bg-white/10 border-white/20 rounded focus:ring-gold-400/50"
                        />
                        <Smartphone className="w-4 h-4 text-blue-400" />
                        <span className="text-white">{language === 'ar' ? 'إشعارات الدفع' : 'Push Notifications'}</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={notificationForm.include_email}
                          onChange={(e) => setNotificationForm({ ...notificationForm, include_email: e.target.checked })}
                          className="w-4 h-4 text-gold-400 bg-white/10 border-white/20 rounded focus:ring-gold-400/50"
                        />
                        <Mail className="w-4 h-4 text-green-400" />
                        <span className="text-white">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={notificationForm.include_sms}
                          onChange={(e) => setNotificationForm({ ...notificationForm, include_sms: e.target.checked })}
                          className="w-4 h-4 text-gold-400 bg-white/10 border-white/20 rounded focus:ring-gold-400/50"
                        />
                        <MessageSquare className="w-4 h-4 text-purple-400" />
                        <span className="text-white">{language === 'ar' ? 'رسائل نصية' : 'SMS'}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Scheduling Options */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="timing"
                      checked={notificationForm.send_immediately}
                      onChange={() => setNotificationForm({ ...notificationForm, send_immediately: true })}
                      className="w-4 h-4 text-gold-400 bg-white/10 border-white/20 focus:ring-gold-400/50"
                    />
                    <span className="text-white">{language === 'ar' ? 'إرسال فوري' : 'Send Immediately'}</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="timing"
                      checked={!notificationForm.send_immediately}
                      onChange={() => setNotificationForm({ ...notificationForm, send_immediately: false })}
                      className="w-4 h-4 text-gold-400 bg-white/10 border-white/20 focus:ring-gold-400/50"
                    />
                    <span className="text-white">{language === 'ar' ? 'جدولة للإرسال' : 'Schedule for Later'}</span>
                  </label>
                </div>
                
                {!notificationForm.send_immediately && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {language === 'ar' ? 'موعد الإرسال' : 'Scheduled Time'}
                    </label>
                    <input
                      type="datetime-local"
                      value={notificationForm.scheduled_at}
                      onChange={(e) => setNotificationForm({ ...notificationForm, scheduled_at: e.target.value })}
                      className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                    />
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 mt-8">
                <button
                  onClick={resetForm}
                  className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  {language === 'ar' ? 'مسح' : 'Clear'}
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>
                    {notificationForm.send_immediately 
                      ? (language === 'ar' ? 'إرسال الآن' : 'Send Now')
                      : (language === 'ar' ? 'جدولة الإرسال' : 'Schedule Send')
                    }
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="glassmorphism rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-bold text-gold-300 mb-6">
                {language === 'ar' ? 'قوالب الإشعارات' : 'Notification Templates'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notificationTemplates.map((template) => (
                  <motion.div
                    key={template.id}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      setNotificationForm({
                        ...notificationForm,
                        title: template.title,
                        message: template.message,
                        type: template.type,
                        target_audience: template.target
                      });
                      setActiveTab('send');
                    }}
                  >
                    <h4 className="font-semibold text-white mb-2">{template.name}</h4>
                    <p className="text-sm text-gray-400 mb-3">{template.title}</p>
                    <p className="text-xs text-gray-500">{template.message}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                        {template.type}
                      </span>
                      <button className="text-gold-400 hover:text-gold-300 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="glassmorphism rounded-2xl p-6 border border-white/10">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={language === 'ar' ? 'البحث في الإشعارات...' : 'Search notifications...'}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-400/50 transition-colors"
                      />
                    </div>
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                  >
                    <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                    <option value="sent">{language === 'ar' ? 'مرسل' : 'Sent'}</option>
                    <option value="scheduled">{language === 'ar' ? 'مجدول' : 'Scheduled'}</option>
                    <option value="failed">{language === 'ar' ? 'فشل' : 'Failed'}</option>
                    <option value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</option>
                  </select>
                </div>
              </div>
              
              {/* Notifications List */}
              <div className="space-y-4">
                {filteredNotifications.map((notification) => {
                  const TypeIcon = getTypeIcon(notification.type);
                  return (
                    <motion.div
                      key={notification.id}
                      variants={itemVariants}
                      whileHover={{ scale: 1.01, y: -2 }}
                      className="glassmorphism rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                            <TypeIcon className="w-6 h-6 text-white" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                  {notification.title}
                                </h3>
                                <p className="text-sm text-gray-400 mb-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <span>
                                    {language === 'ar' ? 'إنشاء:' : 'Created:'} {new Date(notification.created_at).toLocaleString()}
                                  </span>
                                  {notification.sent_at && (
                                    <span>
                                      {language === 'ar' ? 'إرسال:' : 'Sent:'} {new Date(notification.sent_at).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(notification.status)}`}>
                                  {notification.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            
                            {notification.status === 'sent' && (
                              <div className="flex items-center space-x-6 pt-3 border-t border-white/10">
                                <div className="text-center">
                                  <p className="text-lg font-semibold text-white">{notification.sent_count || 0}</p>
                                  <p className="text-xs text-gray-400">{language === 'ar' ? 'مرسل' : 'Sent'}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-semibold text-green-400">{notification.delivery_rate || 0}%</p>
                                  <p className="text-xs text-gray-400">{language === 'ar' ? 'معدل التسليم' : 'Delivery Rate'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default NotificationsSystem; 