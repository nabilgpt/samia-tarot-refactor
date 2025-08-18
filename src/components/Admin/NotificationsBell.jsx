/**
 * NOTIFICATIONS BELL ICON - SAMIA TAROT
 * Bell icon with unread indicator for admin dashboard header
 * Shows unread notifications count and handles click events
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '../../context/LanguageContext';
import notificationsService from '../../services/notificationsService';
import NotificationsDropdown from './NotificationsDropdown';

const NotificationsBell = ({ 
  className = '',
  showLabel = true,
  size = 'medium',
  onNavigate // Add navigation callback prop
}) => {
  const { currentLanguage } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const buttonRef = useRef(null);

  // Size configurations
  const sizeConfig = {
    small: {
      icon: 'w-5 h-5',
      badge: 'w-4 h-4 text-[10px]',
      button: 'p-2'
    },
    medium: {
      icon: 'w-6 h-6',
      badge: 'w-5 h-5 text-xs',
      button: 'p-0'
    },
    large: {
      icon: 'w-7 h-7',
      badge: 'w-6 h-6 text-sm',
      button: 'p-3'
    }
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  // Fetch unread count on mount and set up polling
  useEffect(() => {
    loadUnreadCount();
    
    // Poll for unread count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await notificationsService.getUnreadCount();
      
      if (result.success) {
        const count = result.data || 0;
        setUnreadCount(count);
      } else {
        setError(result.error);
        console.error('❌ [NOTIFICATIONS BELL] Error loading unread count:', result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('❌ [NOTIFICATIONS BELL] Error loading unread count:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleDropdownClose = () => {
    setShowDropdown(false);
  };

  const handleNotificationRead = (notificationId) => {
    // Refresh unread count when notification is read
    loadUnreadCount();
  };

  const hasUnread = unreadCount > 0;
  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <div className={`relative ${className}`}>
      <motion.button
        ref={buttonRef}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className={`
          relative p-1 rounded-xl transition-all duration-300
          ${hasUnread 
            ? 'text-red-300 hover:bg-gradient-to-r hover:from-red-500/10 hover:to-pink-500/10' 
            : 'text-gray-300 hover:bg-white/10'
          }
          ${loading ? 'opacity-50' : 'cursor-pointer'}
        `}
        disabled={loading}
        title={
          currentLanguage === 'ar' 
            ? (hasUnread ? `${unreadCount} إشعار غير مقروء` : 'الإشعارات')
            : (hasUnread ? `${unreadCount} unread notifications` : 'Notifications')
        }
      >
        {/* Bell Icon Container */}
        <div className="relative inline-block">
          {hasUnread ? (
            <BellSolidIcon className={`${config.icon} text-red-300`} />
          ) : (
            <BellIcon className={`${config.icon} text-gray-300`} />
          )}
          
          {/* Loading indicator */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
            </div>
          )}
        </div>

        {/* Unread Count Badge - Shows when has unread notifications */}
        {hasUnread && !loading && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-gray-900 z-[9999] text-[10px]"
            style={{
              minWidth: '20px',
              minHeight: '20px'
            }}
          >
            {displayCount}
          </motion.div>
        )}

        {/* Pulse effect for urgent notifications */}
        {hasUnread && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-400 animate-ping opacity-30 z-[9998]"></div>
        )}
      </motion.button>

      {/* Notifications Dropdown */}
      <NotificationsDropdown
        isOpen={showDropdown}
        onClose={handleDropdownClose}
        triggerRef={buttonRef}
        onNotificationRead={handleNotificationRead}
        onNavigate={onNavigate}
      />

      {/* Label */}
      {showLabel && (
        <div className="hidden lg:block absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-gray-400">
          {currentLanguage === 'ar' ? 'الإشعارات' : 'Notifications'}
        </div>
      )}

      {/* Error indicator */}
      {error && !showDropdown && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-red-400 whitespace-nowrap">
          {currentLanguage === 'ar' ? 'خطأ في التحميل' : 'Load error'}
        </div>
      )}
    </div>
  );
};

export default NotificationsBell; 