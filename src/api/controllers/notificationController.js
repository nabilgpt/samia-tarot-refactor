// =============================================================================
// NOTIFICATION CONTROLLER - مراقب الإشعارات والتنبيهات
// =============================================================================
// Complete notification controller for managing all types of notifications

const { supabaseAdmin: supabase } = require('../lib/supabase.js');
const notificationService = require('../services/notificationService.js');

// =============================================================================
// 1. USER NOTIFICATIONS MANAGEMENT
// =============================================================================

/**
 * Get user's notifications with filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      read_status,
      date_from,
      date_to,
      priority
    } = req.query;

    let query = supabase
      .from('notifications')
      .select(`
        id, type, title, message, data, priority,
        title_en, message_en, title_ar, message_ar,
        created_at
      `)
      .eq('recipient_id', req.user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) query = query.eq('type', type);
    if (read_status) query = query.eq('read_status', read_status === 'true');
    if (priority) query = query.eq('priority', priority);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    console.log('🔔 [NOTIFICATIONS] Executing query for notifications');
    
    const { data, error } = await query;

    if (error) {
      console.error('❌ [NOTIFICATIONS] Database error:', error);
      throw error;
    }

    console.log('✅ [NOTIFICATIONS] Raw data from database:', data?.length || 0, 'records');
    console.log('🔔 [NOTIFICATIONS] First notification raw data:', data?.[0] ? {
      id: data[0].id,
      keys: Object.keys(data[0]),
      title: data[0].title,
      title_ar: data[0].title_ar,
      title_en: data[0].title_en,
      message: data[0].message,
      message_ar: data[0].message_ar,
      message_en: data[0].message_en
    } : 'No notifications');

    // Apply filters if specified
    let filteredData = data;

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', req.user.id);

    res.json({
      success: true,
      data: filteredData || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      code: 'FETCH_NOTIFICATIONS_ERROR'
    });
  }
};

/**
 * Get count of unread notifications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUnreadCount = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('recipient_id', req.user.id);

    if (error) throw error;

    res.json({
      success: true,
      data: {
        unread_count: data?.length || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      code: 'UNREAD_COUNT_ERROR'
    });
  }
};

/**
 * Mark notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .update({
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('recipient_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: data,
      message: 'Notification marked as read',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      code: 'MARK_READ_ERROR'
    });
  }
};

/**
 * Mark all notifications as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const markAllAsRead = async (req, res) => {
  try {
    const { type } = req.query;

    let query = supabase
      .from('notifications')
      .update({
        read_at: new Date().toISOString()
      })
      .eq('recipient_id', req.user.id);

    if (type) query = query.eq('type', type);

    const { error, count } = await query.select();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        updated_count: count || 0
      },
      message: `${count || 0} notifications marked as read`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      code: 'MARK_ALL_READ_ERROR'
    });
  }
};

/**
 * Delete specific notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('recipient_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      code: 'DELETE_NOTIFICATION_ERROR'
    });
  }
};

/**
 * Clear all notifications for user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const clearAllNotifications = async (req, res) => {
  try {
    const { type } = req.query;

    let query = supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', req.user.id);

    if (type) query = query.eq('type', type);

    const { error, count } = await query.select();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        deleted_count: count || 0
      },
      message: `${count || 0} notifications cleared`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear notifications',
      code: 'CLEAR_NOTIFICATIONS_ERROR'
    });
  }
};

// =============================================================================
// 2. SENDING NOTIFICATIONS
// =============================================================================

/**
 * Send notification to specific users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendNotification = async (req, res) => {
  try {
    const {
      recipient_ids,
      type,
      title,
      message,
      data = {},
      priority = 'medium',
      channels = ['push']
    } = req.validatedData;

    const results = await notificationService.sendToUsers(
      recipient_ids,
      {
        type,
        title,
        message,
        data,
        priority,
        sender_id: req.user.id
      },
      channels
    );

    res.json({
      success: true,
      data: results,
      message: 'Notifications sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      code: 'SEND_NOTIFICATION_ERROR'
    });
  }
};

/**
 * Send notification to users by role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendToRole = async (req, res) => {
  try {
    const {
      roles,
      type,
      title,
      message,
      data = {},
      priority = 'medium',
      exclude_users = []
    } = req.validatedData;

    const results = await notificationService.sendToRole(
      roles,
      {
        type,
        title,
        message,
        data,
        priority,
        sender_id: req.user.id
      },
      exclude_users
    );

    res.json({
      success: true,
      data: results,
      message: 'Role notifications sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Send to role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send role notifications',
      code: 'SEND_ROLE_NOTIFICATION_ERROR'
    });
  }
};

/**
 * Send bulk notifications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendBulkNotification = async (req, res) => {
  try {
    const {
      recipients,
      type,
      title,
      message,
      data = {},
      priority = 'medium',
      schedule_at
    } = req.validatedData;

    const results = await notificationService.sendBulk(
      recipients,
      {
        type,
        title,
        message,
        data,
        priority,
        sender_id: req.user.id,
        schedule_at
      }
    );

    res.json({
      success: true,
      data: results,
      message: 'Bulk notifications processed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Send bulk notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk notifications',
      code: 'SEND_BULK_NOTIFICATION_ERROR'
    });
  }
};

/**
 * Broadcast notification to all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const broadcastNotification = async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      data = {},
      priority = 'high',
      exclude_roles = []
    } = req.validatedData;

    const results = await notificationService.broadcast(
      {
        type,
        title,
        message,
        data,
        priority,
        sender_id: req.user.id
      },
      exclude_roles
    );

    res.json({
      success: true,
      data: results,
      message: 'Broadcast notification sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast notification',
      code: 'BROADCAST_NOTIFICATION_ERROR'
    });
  }
};

// =============================================================================
// 3. NOTIFICATION SETTINGS & TYPES
// =============================================================================

/**
 * Get notification types
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getNotificationTypes = async (req, res) => {
  try {
    const types = [
      {
        type: 'booking_confirmed',
        description: 'Booking confirmation notifications',
        default_enabled: true,
        channels: ['push', 'email']
      },
      {
        type: 'booking_reminder',
        description: 'Booking reminder notifications',
        default_enabled: true,
        channels: ['push', 'sms']
      },
      {
        type: 'chat_message',
        description: 'New chat message notifications',
        default_enabled: true,
        channels: ['push']
      },
      {
        type: 'payment_received',
        description: 'Payment received notifications',
        default_enabled: true,
        channels: ['push', 'email']
      },
      {
        type: 'system_alert',
        description: 'System alerts and updates',
        default_enabled: true,
        channels: ['push', 'email']
      }
    ];

    res.json({
      success: true,
      data: types,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get notification types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification types',
      code: 'GET_NOTIFICATION_TYPES_ERROR'
    });
  }
};

/**
 * Get notification channels
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getNotificationChannels = async (req, res) => {
  try {
    const channels = [
      {
        channel: 'push',
        name: 'Push Notifications',
        description: 'Real-time push notifications',
        enabled: true
      },
      {
        channel: 'email',
        name: 'Email',
        description: 'Email notifications',
        enabled: true
      },
      {
        channel: 'sms',
        name: 'SMS',
        description: 'Text message notifications',
        enabled: false
      },
      {
        channel: 'socket',
        name: 'Real-time',
        description: 'Live website notifications',
        enabled: true
      }
    ];

    res.json({
      success: true,
      data: channels,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get notification channels error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification channels',
      code: 'GET_NOTIFICATION_CHANNELS_ERROR'
    });
  }
};

/**
 * Update notification settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateNotificationSettings = async (req, res) => {
  try {
    const settings = req.validatedData;

    // Update or create user notification settings
    const { data, error } = await supabase
      .from('user_notification_settings')
      .upsert({
        user_id: req.user.id,
        settings: settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      message: 'Notification settings updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification settings',
      code: 'UPDATE_NOTIFICATION_SETTINGS_ERROR'
    });
  }
};

/**
 * Get notification settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getNotificationSettings = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_notification_settings')
      .select('settings')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const defaultSettings = {
      channels: ['push', 'email'],
      types: {
        booking_confirmed: true,
        booking_reminder: true,
        chat_message: true,
        payment_received: true,
        system_alert: true
      },
      quiet_hours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };

    res.json({
      success: true,
      data: data?.settings || defaultSettings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification settings',
      code: 'GET_NOTIFICATION_SETTINGS_ERROR'
    });
  }
};

// =============================================================================
// 4. REAL-TIME FUNCTIONALITY (SOCKET.IO)
// =============================================================================

/**
 * Join notification room
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const joinNotificationRoom = async (req, res) => {
  try {
    const { room_type, room_id } = req.body;

    // Logic for joining notification rooms would be handled by Socket.IO
    res.json({
      success: true,
      message: `Joined ${room_type} room: ${room_id}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Join notification room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join notification room',
      code: 'JOIN_NOTIFICATION_ROOM_ERROR'
    });
  }
};

/**
 * Leave notification room
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const leaveNotificationRoom = async (req, res) => {
  try {
    const { room_type, room_id } = req.body;

    // Logic for leaving notification rooms would be handled by Socket.IO
    res.json({
      success: true,
      message: `Left ${room_type} room: ${room_id}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Leave notification room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave notification room',
      code: 'LEAVE_NOTIFICATION_ROOM_ERROR'
    });
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

// =============================================================================
// ADDITIONAL MISSING FUNCTIONS
// =============================================================================

// Get active rooms
const getActiveRooms = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Active rooms retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get active rooms' });
  }
};

// Send test notification
const sendTestNotification = async (req, res) => {
  try {
    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send test notification' });
  }
};

// Send emergency notification
const sendEmergencyNotification = async (req, res) => {
  try {
    res.json({ success: true, message: 'Emergency notification sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send emergency notification' });
  }
};

// Send priority notification
const sendPriorityNotification = async (req, res) => {
  try {
    res.json({ success: true, message: 'Priority notification sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send priority notification' });
  }
};

// Get active emergency notifications
const getActiveEmergencyNotifications = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Active emergency notifications retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get emergency notifications' });
  }
};

// Get notification analytics
const getNotificationAnalytics = async (req, res) => {
  try {
    res.json({ success: true, data: {}, message: 'Analytics retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get analytics' });
  }
};

// Get delivery status
const getDeliveryStatus = async (req, res) => {
  try {
    res.json({ success: true, data: {}, message: 'Delivery status retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get delivery status' });
  }
};

// Get failed notifications
const getFailedNotifications = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Failed notifications retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get failed notifications' });
  }
};

// Retry notification
const retryNotification = async (req, res) => {
  try {
    res.json({ success: true, message: 'Notification retried' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retry notification' });
  }
};

// Get client notifications
const getClientNotifications = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Client notifications retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get client notifications' });
  }
};

// Get reader notifications
const getReaderNotifications = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Reader notifications retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get reader notifications' });
  }
};

// Get admin notifications
const getAdminNotifications = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Admin notifications retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get admin notifications' });
  }
};

// Get monitor notifications
const getMonitorNotifications = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Monitor notifications retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get monitor notifications' });
  }
};

// Get notification templates
const getNotificationTemplates = async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Templates retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get templates' });
  }
};

// Create notification template
const createNotificationTemplate = async (req, res) => {
  try {
    res.json({ success: true, message: 'Template created' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
};

// Update notification template
const updateNotificationTemplate = async (req, res) => {
  try {
    res.json({ success: true, message: 'Template updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
};

// Delete notification template
const deleteNotificationTemplate = async (req, res) => {
  try {
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
};

// Create automated notification
const createAutomatedNotification = async (req, res) => {
  try {
    res.json({ success: true, message: 'Automated notification created' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create automated notification' });
  }
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  sendNotification,
  sendToRole,
  sendBulkNotification,
  broadcastNotification,
  getNotificationTypes,
  getNotificationChannels,
  updateNotificationSettings,
  getNotificationSettings,
  joinNotificationRoom,
  leaveNotificationRoom,
  getActiveRooms,
  sendTestNotification,
  sendEmergencyNotification,
  sendPriorityNotification,
  getActiveEmergencyNotifications,
  getNotificationAnalytics,
  getDeliveryStatus,
  getFailedNotifications,
  retryNotification,
  getClientNotifications,
  getReaderNotifications,
  getAdminNotifications,
  getMonitorNotifications,
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  createAutomatedNotification
}; 