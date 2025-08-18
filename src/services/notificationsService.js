// ============================================================================
// SAMIA TAROT - NOTIFICATIONS SERVICE
// Frontend notification management service
// ============================================================================

import api from './frontendApi.js';

export class NotificationsService {
  constructor() {
    this.baseUrl = '/notifications';
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute
  }

  /**
   * Get notifications for the current user
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.category - Filter by category
   * @param {boolean} options.is_read - Filter by read status
   * @param {string} options.priority - Filter by priority
   * @param {string} options.type - Filter by type
   * @returns {Promise<Object>} API response
   */
  async getNotifications(options = {}) {
    try {
      console.log('🔔 [NOTIFICATIONS SERVICE] Getting notifications with options:', options);
      
      const params = new URLSearchParams();
      
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.category) params.append('category', options.category);
      if (options.is_read !== undefined) params.append('is_read', options.is_read);
      if (options.priority) params.append('priority', options.priority);
      if (options.type) params.append('type', options.type);
      
      const url = `${this.baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await api.get(url);
      
      if (response.success) {
        console.log('✅ [NOTIFICATIONS SERVICE] Successfully fetched notifications');
        console.log('🔔 [NOTIFICATIONS SERVICE] API Response data:', {
          totalCount: response.data?.length || 0,
          firstNotification: response.data?.[0] ? {
            id: response.data[0].id,
            keys: Object.keys(response.data[0]),
            title: response.data[0].title,
            title_ar: response.data[0].title_ar,
            title_en: response.data[0].title_en,
            message: response.data[0].message,
            message_ar: response.data[0].message_ar,
            message_en: response.data[0].message_en
          } : 'No notifications'
        });
        return {
          success: true,
          data: response.data,
          pagination: response.pagination
        };
      } else {
        throw new Error(response.error || 'Failed to fetch notifications');
      }
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS SERVICE] Error fetching notifications:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch notifications',
        data: []
      };
    }
  }

  /**
   * Get unread notifications count
   * @returns {Promise<Object>} API response with unread count
   */
  async getUnreadCount() {
    try {
      const cacheKey = 'unread_count';
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          // Only log in development mode to reduce console noise
          if (process.env.NODE_ENV === 'development') {
            console.log('🔔 [NOTIFICATIONS SERVICE] Using cached unread count');
          }
          return cached.data;
        }
      }
      
      console.log('🔔 [NOTIFICATIONS SERVICE] Getting unread notifications count');
      
      const response = await api.get(`${this.baseUrl}/unread-count`);
      
      if (response.success) {
        const count = response.data.count || 0;
        const result = {
          success: true,
          data: count
        };
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        console.log('✅ [NOTIFICATIONS SERVICE] Successfully fetched unread count:', count);
        return result;
      } else {
        throw new Error(response.error || 'Failed to get unread count');
      }
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS SERVICE] Error getting unread count:', error);
      return {
        success: false,
        error: error.message || 'Failed to get unread count',
        data: 0
      };
    }
  }

  /**
   * Get a specific notification by ID
   * @param {string} id - Notification ID
   * @returns {Promise<Object>} API response
   */
  async getNotification(id) {
    try {
      console.log('🔔 [NOTIFICATIONS SERVICE] Getting notification:', id);
      
      const response = await api.get(`${this.baseUrl}/${id}`);
      
      if (response.success) {
        console.log('✅ [NOTIFICATIONS SERVICE] Successfully fetched notification');
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to fetch notification');
      }
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS SERVICE] Error fetching notification:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch notification',
        data: null
      };
    }
  }

  /**
   * Mark a notification as read
   * @param {string} id - Notification ID
   * @returns {Promise<Object>} API response
   */
  async markAsRead(id) {
    try {
      console.log('🔔 [NOTIFICATIONS SERVICE] Marking notification as read:', id);
      
      const response = await api.patch(`${this.baseUrl}/${id}/read`);
      
      if (response.success) {
        // Clear unread count cache
        this.cache.delete('unread_count');
        
        console.log('✅ [NOTIFICATIONS SERVICE] Successfully marked notification as read');
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to mark notification as read');
      }
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS SERVICE] Error marking notification as read:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark notification as read'
      };
    }
  }

  /**
   * Mark a notification as unread
   * @param {string} id - Notification ID
   * @returns {Promise<Object>} API response
   */
  async markAsUnread(id) {
    try {
      console.log('🔔 [NOTIFICATIONS SERVICE] Marking notification as unread:', id);
      
      const response = await api.patch(`${this.baseUrl}/${id}/unread`);
      
      if (response.success) {
        // Clear unread count cache
        this.cache.delete('unread_count');
        
        console.log('✅ [NOTIFICATIONS SERVICE] Successfully marked notification as unread');
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to mark notification as unread');
      }
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS SERVICE] Error marking notification as unread:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark notification as unread'
      };
    }
  }

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} API response
   */
  async markAllAsRead() {
    try {
      console.log('🔔 [NOTIFICATIONS SERVICE] Marking all notifications as read');
      
      const response = await api.post(`${this.baseUrl}/mark-all-read`);
      
      if (response.success) {
        // Clear unread count cache
        this.cache.delete('unread_count');
        
        console.log('✅ [NOTIFICATIONS SERVICE] Successfully marked all notifications as read');
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to mark all notifications as read');
      }
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS SERVICE] Error marking all notifications as read:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark all notifications as read'
      };
    }
  }

  /**
   * Create a new notification (Admin only)
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} API response
   */
  async createNotification(notificationData) {
    try {
      console.log('🔔 [NOTIFICATIONS SERVICE] Creating notification:', notificationData);
      
      const response = await api.post(this.baseUrl, notificationData);
      
      if (response.success) {
        console.log('✅ [NOTIFICATIONS SERVICE] Successfully created notification');
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to create notification');
      }
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS SERVICE] Error creating notification:', error);
      return {
        success: false,
        error: error.message || 'Failed to create notification'
      };
    }
  }

  /**
   * Create a notification from template (Admin only)
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} API response
   */
  async createFromTemplate(templateData) {
    try {
      console.log('🔔 [NOTIFICATIONS SERVICE] Creating notification from template:', templateData);
      
      const response = await api.post(`${this.baseUrl}/from-template`, templateData);
      
      if (response.success) {
        console.log('✅ [NOTIFICATIONS SERVICE] Successfully created notification from template');
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to create notification from template');
      }
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS SERVICE] Error creating notification from template:', error);
      return {
        success: false,
        error: error.message || 'Failed to create notification from template'
      };
    }
  }

  /**
   * Delete a notification
   * @param {string} id - Notification ID
   * @returns {Promise<Object>} API response
   */
  async deleteNotification(id) {
    try {
      console.log('🔔 [NOTIFICATIONS SERVICE] Deleting notification:', id);
      
      const response = await api.delete(`${this.baseUrl}/${id}`);
      
      if (response.success) {
        // Clear unread count cache
        this.cache.delete('unread_count');
        
        console.log('✅ [NOTIFICATIONS SERVICE] Successfully deleted notification');
        return {
          success: true
        };
      } else {
        throw new Error(response.error || 'Failed to delete notification');
      }
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS SERVICE] Error deleting notification:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete notification'
      };
    }
  }

  /**
   * Get notification templates (Admin only)
   * @returns {Promise<Object>} API response
   */
  async getTemplates() {
    try {
      console.log('🔔 [NOTIFICATIONS SERVICE] Getting notification templates');
      
      const response = await api.get(`${this.baseUrl}/templates`);
      
      if (response.success) {
        console.log('✅ [NOTIFICATIONS SERVICE] Successfully fetched templates');
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to fetch templates');
      }
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS SERVICE] Error fetching templates:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch templates',
        data: []
      };
    }
  }

  /**
   * Clean up expired notifications (Admin only)
   * @returns {Promise<Object>} API response
   */
  async cleanupExpired() {
    try {
      console.log('🔔 [NOTIFICATIONS SERVICE] Cleaning up expired notifications');
      
      const response = await api.post(`${this.baseUrl}/cleanup`);
      
      if (response.success) {
        console.log('✅ [NOTIFICATIONS SERVICE] Successfully cleaned up expired notifications');
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to cleanup expired notifications');
      }
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS SERVICE] Error cleaning up expired notifications:', error);
      return {
        success: false,
        error: error.message || 'Failed to cleanup expired notifications'
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();
export default notificationsService; 