import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../context/UIContext';
import notificationScheduler from '../../services/notificationSchedulerService';
import { 
  X, 
  Save, 
  Calendar, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Timer,
  Edit
} from 'lucide-react';
import Button from '../Button';
import Loader from '../Loader';

const NotificationEditModal = ({ 
  isOpen, 
  onClose, 
  notification, 
  onSuccess 
}) => {
  const { t } = useTranslation();
  const { language, showSuccess, showError } = useUI();
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal',
    scheduled_at: null,
    scheduledDate: '',
    scheduledTime: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canEdit, setCanEdit] = useState(true);

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

  useEffect(() => {
    if (notification && isOpen) {
      setCanEdit(notification.can_edit !== false);
      
      // Parse scheduled date/time if available
      let scheduledDate = '';
      let scheduledTime = '';
      
      if (notification.scheduled_at) {
        const scheduledDateTime = new Date(notification.scheduled_at);
        scheduledDate = scheduledDateTime.toISOString().split('T')[0];
        scheduledTime = scheduledDateTime.toTimeString().split(' ')[0].slice(0, 5);
      }

      setFormData({
        title: notification.title || '',
        message: notification.message || '',
        priority: notification.priority || 'normal',
        scheduled_at: notification.scheduled_at,
        scheduledDate,
        scheduledTime
      });

      setError('');
    }
  }, [notification, isOpen]);

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      setError(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields');
      return;
    }

    // Validate scheduled date/time if provided
    let scheduledAt = null;
    if (formData.scheduledDate && formData.scheduledTime) {
      scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      if (scheduledAt <= new Date()) {
        setError(language === 'ar' ? 'يجب أن يكون الوقت المجدول في المستقبل' : 'Scheduled time must be in the future');
        return;
      }
    }

    try {
      setLoading(true);
      setError('');

      const updates = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        scheduled_at: scheduledAt?.toISOString() || null
      };

      const result = await notificationScheduler.updateNotification(notification.id, updates);

      if (result.success) {
        showSuccess(language === 'ar' ? 'تم تحديث الإشعار بنجاح' : 'Notification updated successfully');
        onSuccess?.();
        onClose();
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(language === 'ar' ? 'فشل في تحديث الإشعار' : 'Failed to update notification');
    } finally {
      setLoading(false);
    }
  };

  const getTimeLeft = () => {
    if (!notification?.scheduled_at) return null;
    
    const scheduledTime = new Date(notification.scheduled_at);
    const now = new Date();
    const timeDiff = scheduledTime - now;
    
    if (timeDiff <= 0) return null;
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const getEditDeadline = () => {
    if (!notification?.last_edit_allowed_until) return null;
    
    const deadline = new Date(notification.last_edit_allowed_until);
    const now = new Date();
    const timeDiff = deadline - now;
    
    if (timeDiff <= 0) return language === 'ar' ? 'انتهت مهلة التعديل' : 'Edit deadline passed';
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return language === 'ar' 
      ? `${hours} ساعة ${minutes} دقيقة متبقية للتعديل`
      : `${hours}h ${minutes}m left to edit`;
  };

  if (!isOpen || !notification) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-dark-800/95 backdrop-blur-xl border border-gold-400/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-cosmic-500/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Edit className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {language === 'ar' ? 'تعديل الإشعار' : 'Edit Notification'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {language === 'ar' ? 'تعديل تفاصيل الإشعار المجدول' : 'Modify scheduled notification details'}
                </p>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Edit Status Warning */}
          {!canEdit && (
            <div className="bg-red-900/30 border border-red-400/30 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-300">
                  {language === 'ar' 
                    ? 'لا يمكن تعديل هذا الإشعار. إما أنه تم إرساله أو انتهت مهلة التعديل.'
                    : 'This notification cannot be edited. It has either been sent or the edit deadline has passed.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Time Info */}
          {notification.scheduled_at && (
            <div className="bg-blue-900/30 border border-blue-400/30 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400">{language === 'ar' ? 'وقت الإرسال:' : 'Send time:'}</span>
                  <span className="text-white">
                    {new Date(notification.scheduled_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                </div>
                {getTimeLeft() && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Timer className="w-4 h-4 text-green-400" />
                    <span className="text-gray-400">{language === 'ar' ? 'الوقت المتبقي:' : 'Time left:'}</span>
                    <span className="text-green-400">{getTimeLeft()}</span>
                  </div>
                )}
              </div>
              {getEditDeadline() && (
                <div className="mt-2 text-sm">
                  <span className="text-yellow-400">{getEditDeadline()}</span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-400/30 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {language === 'ar' ? 'عنوان الإشعار' : 'Notification Title'}
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                disabled={!canEdit}
                placeholder={language === 'ar' ? 'أدخل عنوان الإشعار...' : 'Enter notification title...'}
                className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {language === 'ar' ? 'الأولوية' : 'Priority'}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                disabled={!canEdit}
                className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {priorities.map((p) => (
                  <option key={p.id} value={p.id} className="bg-dark-700">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Scheduled Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'التاريخ المجدول' : 'Scheduled Date'}
                </label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  disabled={!canEdit}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {language === 'ar' ? 'الوقت المجدول' : 'Scheduled Time'}
                </label>
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  disabled={!canEdit}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {language === 'ar' ? 'نص الرسالة' : 'Message Text'}
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                disabled={!canEdit}
                rows={6}
                placeholder={language === 'ar' ? 'أدخل نص الرسالة...' : 'Enter message text...'}
                className="w-full px-4 py-3 bg-dark-700/50 border border-gold-400/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-8">
            <Button
              onClick={onClose}
              variant="ghost"
              className="px-6 py-3"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            
            {canEdit && (
              <Button
                onClick={handleSave}
                disabled={loading || !formData.title.trim() || !formData.message.trim()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold px-8 py-3 shadow-lg shadow-blue-500/30 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Loader size="sm" variant="spinner" />
                    <span>{language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Save className="w-5 h-5" />
                    <span>{language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationEditModal; 