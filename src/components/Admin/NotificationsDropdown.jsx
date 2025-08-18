/**
 * NOTIFICATIONS DROPDOWN - SAMIA TAROT
 * Dropdown component showing list of notifications with mark as read functionality
 * Portal-based rendering for proper layering
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckIcon, 
  XMarkIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BellIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../context/LanguageContext';
import notificationsService from '../../services/notificationsService';
import '../../styles/notifications-scroll-fix.css';

const NotificationsDropdown = ({ 
  isOpen, 
  onClose, 
  triggerRef,
  onNotificationRead,
  onNavigate // Add navigation callback prop
}) => {
  const { currentLanguage } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const dropdownRef = useRef(null);

  // Map notification types to their corresponding tab IDs
  const getTabIdFromNotificationType = (type) => {
    const typeMapping = {
      'approval_pending': 'approvals',
      'approval_required': 'approvals',
      'review_new': 'reviews',
      'review_pending': 'reviews',
      'reader_new': 'readers',
      'reader_pending': 'readers',
      'deck_created': 'tarot',
      'deck_updated': 'tarot',
      'spread_created': 'tarot',
      'spread_updated': 'tarot',
      'user_registered': 'users',
      'user_updated': 'users',
      'booking_new': 'bookings',
      'booking_cancelled': 'bookings',
      'payment_received': 'payments',
      'payment_failed': 'payments',
      'system_announcement': 'overview',
      'security_alert': 'monitoring',
      'test': 'overview'
    };
    
    return typeMapping[type] || 'overview';
  };

  // Get localized notification content based on current language
  const getLocalizedNotification = (notification) => {
    const lang = currentLanguage === 'ar' ? 'ar' : 'en';
    
    // Bilingual notifications working correctly
    
    // Primary method: check for direct language fields on notification
    const title = notification[`title_${lang}`] || notification.title_en || notification.title;
    const message = notification[`message_${lang}`] || notification.message_en || notification.message;
    
    // Fallback method: check data field for bilingual content (backward compatibility)
    const data = notification.data || {};
    const fallbackTitle = lang === 'ar' 
      ? (data.title_ar || data.title_en || notification.title)
      : (data.title_en || data.title_ar || notification.title);
      
    const fallbackMessage = lang === 'ar'
      ? (data.message_ar || data.message_en || notification.message)
      : (data.message_en || data.message_ar || notification.message);
    
    const finalTitle = title || fallbackTitle;
    const finalMessage = message || fallbackMessage;
    
    // Successfully displaying bilingual content
    
    return { 
      title: finalTitle,
      message: finalMessage
    };
  };

  // Handle notification click - navigate to appropriate tab
  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read if not already read
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      
      // Navigate to appropriate tab if callback provided
      if (onNavigate) {
        const tabId = getTabIdFromNotificationType(notification.type);
        onNavigate(tabId);
      }
      
      // Close dropdown
      onClose();
    } catch (err) {
      console.error('Error handling notification click:', err);
    }
  };

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  // Load notifications from API
  const loadNotifications = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await notificationsService.getNotifications({
        page: pageNum,
        limit: 10,
        // Load unread first
        is_read: false
      });
      
      if (result.success) {
        if (pageNum === 1) {
          setNotifications(result.data);
        } else {
          setNotifications(prev => [...prev, ...result.data]);
        }
        
        setHasMore(result.pagination && result.pagination.current_page < result.pagination.total_pages);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const result = await notificationsService.markAsRead(notificationId);
      
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true, read_at: new Date().toISOString() }
              : notification
          )
        );
        
        // Notify parent component
        if (onNotificationRead) {
          onNotificationRead(notificationId);
        }
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const result = await notificationsService.markAllAsRead();
      
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({ 
            ...notification, 
            is_read: true, 
            read_at: new Date().toISOString() 
          }))
        );
        
        // Notify parent component
        if (onNotificationRead) {
          onNotificationRead('all');
        }
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type, priority) => {
    const iconProps = { className: 'w-5 h-5' };
    
    switch (type) {
      case 'approval_pending':
        return <ExclamationTriangleIcon {...iconProps} className="w-5 h-5 text-yellow-400" />;
      case 'security_alert':
        return <ExclamationTriangleIcon {...iconProps} className="w-5 h-5 text-red-400" />;
      case 'system_announcement':
        return <InformationCircleIcon {...iconProps} className="w-5 h-5 text-blue-400" />;
      default:
        return <BellIcon {...iconProps} className="w-5 h-5 text-gray-400" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-500/5';
      case 'high':
        return 'border-l-orange-500 bg-orange-500/5';
      case 'normal':
        return 'border-l-blue-500 bg-blue-500/5';
      case 'low':
        return 'border-l-gray-500 bg-gray-500/5';
      default:
        return 'border-l-gray-500 bg-gray-500/5';
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) {
      return currentLanguage === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
    } else if (hours > 0) {
      return currentLanguage === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
    } else if (minutes > 0) {
      return currentLanguage === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
    } else {
      return currentLanguage === 'ar' ? 'الآن' : 'now';
    }
  };

  // Calculate dropdown position
  const getDropdownPosition = () => {
    if (!triggerRef.current) return { top: 0, left: 0 };
    
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 400;
    const dropdownHeight = 500;
    
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 8;
    
    // Adjust for right edge
    if (left + dropdownWidth > window.innerWidth) {
      left = window.innerWidth - dropdownWidth - 16;
    }
    
    // Adjust for bottom edge
    if (top + dropdownHeight > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - dropdownHeight - 8;
    }
    
    return { top, left };
  };

  if (!isOpen) return null;

  const position = getDropdownPosition();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return createPortal(
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2 }}
      className="fixed z-[9999] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl"
      style={{
        top: position.top,
        left: position.left,
        width: '400px',
        maxHeight: '500px'
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BellIcon className="w-5 h-5" />
          {currentLanguage === 'ar' ? 'الإشعارات' : 'Notifications'}
        </h3>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {currentLanguage === 'ar' ? 'قراءة الكل' : 'Mark all read'}
            </button>
          )}
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto notifications-scrollbar-hidden notifications-dropdown-content">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-400">
            <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">
              {currentLanguage === 'ar' ? 'خطأ في تحميل الإشعارات' : 'Error loading notifications'}
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <BellIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              {currentLanguage === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {notifications.map((notification) => {
              const { title, message } = getLocalizedNotification(notification);
              
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`
                    p-4 border-l-4 transition-all duration-200 hover:bg-gray-800/50 cursor-pointer
                    ${getPriorityColor(notification.priority)}
                    ${notification.is_read ? 'opacity-60' : ''}
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type, notification.priority)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className={`text-sm font-medium ${notification.is_read ? 'text-gray-300' : 'text-white'}`}>
                            {title}
                          </h4>
                          <p className={`text-xs mt-1 ${notification.is_read ? 'text-gray-400' : 'text-gray-300'}`}>
                            {message}
                          </p>
                          
                          {/* Timestamp */}
                          <div className="flex items-center gap-2 mt-2">
                            <ClockIcon className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-500">
                              {formatRelativeTime(notification.created_at)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                              title={currentLanguage === 'ar' ? 'قراءة' : 'Mark as read'}
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationClick(notification);
                            }}
                            className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            title={currentLanguage === 'ar' ? 'عرض' : 'View'}
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {currentLanguage === 'ar' 
                ? `${notifications.length} إشعار` 
                : `${notifications.length} notifications`}
            </span>
            
            {hasMore && (
              <button
                onClick={() => loadNotifications(page + 1)}
                disabled={loading}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                {loading 
                  ? (currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...')
                  : (currentLanguage === 'ar' ? 'تحميل المزيد' : 'Load more')}
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>,
    document.body
  );
};

export default NotificationsDropdown; 