/**
 * NOTIFICATIONS API ROUTES - SAMIA TAROT
 * Complete notifications system endpoints with authentication and security
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get notifications for user (paginated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, priority } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    console.log('🔔 [NOTIFICATIONS] Getting notifications for user:', req.user.email);

    let query = supabase
      .from('notifications')
      .select(`
        id,
        recipient_id,
        sender_id,
        type,
        title,
        message,
        title_en,
        message_en,
        title_ar,
        message_ar,
        data,
        priority,
        channels,
        read_at,
        delivered_at,
        clicked_at,
        is_system,
        expires_at,
        created_at
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add filters
    if (type) {
      query = query.eq('type', type);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    
    // Handle is_read filter correctly
    const { is_read } = req.query;
    if (is_read !== undefined) {
      if (is_read === 'false' || is_read === false) {
        // Unread notifications: read_at IS NULL
        query = query.is('read_at', null);
      } else if (is_read === 'true' || is_read === true) {
        // Read notifications: read_at IS NOT NULL
        query = query.not('read_at', 'is', null);
      }
    }

    console.log('🔔 [NOTIFICATIONS] Executing query for notifications');
    const { data, error } = await query;

    if (error) {
      console.error('❌ [NOTIFICATIONS] Error getting notifications:', error);
      console.error('❌ [NOTIFICATIONS] Query details:', { userId, page, limit, type, priority, is_read });
      return res.status(500).json({
        success: false,
        error: 'Failed to get notifications',
        code: 'NOTIFICATIONS_GET_ERROR'
      });
    }

    console.log('✅ [NOTIFICATIONS] Raw data from database:', data?.length, 'records');
    
    // Bilingual notifications working correctly with all required columns

    // Convert data to expected format
    let notifications;
    try {
      notifications = data.map(notification => ({
        ...notification,
        user_id: notification.recipient_id, // Map for compatibility
        body: notification.message, // Map for compatibility
        is_read: notification.read_at !== null // Map for compatibility
      }));
      console.log('✅ [NOTIFICATIONS] Successfully mapped', notifications.length, 'notifications');
    } catch (mappingError) {
      console.error('❌ [NOTIFICATIONS] Error mapping notifications:', mappingError);
      console.error('❌ [NOTIFICATIONS] Sample data structure:', data?.[0]);
      return res.status(500).json({
        success: false,
        error: 'Failed to process notifications',
        code: 'NOTIFICATIONS_MAPPING_ERROR'
      });
    }

    console.log('✅ [NOTIFICATIONS] Retrieved', notifications.length, 'notifications');

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: notifications.length
      }
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
      code: 'NOTIFICATIONS_GET_ERROR'
    });
  }
});

// Get unread count for user
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔔 [NOTIFICATIONS] Getting unread count for user:', req.user.email);

    // Use the compatible function
    const { data, error } = await supabase
      .rpc('get_unread_notifications_count', { target_user_id: userId });

    if (error) {
      console.error('❌ [NOTIFICATIONS] Error getting unread count:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get unread count',
        code: 'NOTIFICATIONS_UNREAD_COUNT_ERROR'
      });
    }

    console.log('✅ [NOTIFICATIONS] Unread count:', data);

    res.json({
      success: true,
      data: { count: data || 0 }
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error:', {
      message: error.message,
      details: error.stack,
      hint: error.hint || '',
      code: error.code || ''
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      code: 'NOTIFICATIONS_UNREAD_COUNT_ERROR'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log('🔔 [NOTIFICATIONS] Marking notification as read:', id);

    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('recipient_id', userId)
      .select();

    if (error) {
      console.error('❌ [NOTIFICATIONS] Error marking as read:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to mark as read',
        code: 'NOTIFICATIONS_MARK_READ_ERROR'
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        code: 'NOTIFICATIONS_NOT_FOUND'
      });
    }

    console.log('✅ [NOTIFICATIONS] Marked as read:', id);

    res.json({
      success: true,
      data: data[0]
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark as read',
      code: 'NOTIFICATIONS_MARK_READ_ERROR'
    });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔔 [NOTIFICATIONS] Marking all notifications as read for user:', req.user.email);

    const { data, error } = await supabase
      .rpc('mark_all_notifications_read', { target_user_id: userId });

    if (error) {
      console.error('❌ [NOTIFICATIONS] Error marking all as read:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to mark all as read',
        code: 'NOTIFICATIONS_MARK_ALL_READ_ERROR'
      });
    }

    console.log('✅ [NOTIFICATIONS] Marked all as read, count:', data);

    res.json({
      success: true,
      data: { updated_count: data || 0 }
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all as read',
      code: 'NOTIFICATIONS_MARK_ALL_READ_ERROR'
    });
  }
});

// Create notification (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'NOTIFICATIONS_INSUFFICIENT_PERMISSIONS'
      });
    }

    const { recipient_id, type, title, message, priority = 'medium', data = {} } = req.body;

    console.log('🔔 [NOTIFICATIONS] Creating notification:', { recipient_id, type, title });

    const { data: insertData, error } = await supabase
      .from('notifications')
      .insert([
        {
          recipient_id,
          sender_id: req.user.id,
          type,
          title,
          message,
          priority,
          data
        }
      ])
      .select();

    if (error) {
      console.error('❌ [NOTIFICATIONS] Error creating notification:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create notification',
        code: 'NOTIFICATIONS_CREATE_ERROR'
      });
    }

    console.log('✅ [NOTIFICATIONS] Created notification:', insertData[0].id);

    res.status(201).json({
      success: true,
      data: insertData[0]
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      code: 'NOTIFICATIONS_CREATE_ERROR'
    });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log('🔔 [NOTIFICATIONS] Deleting notification:', id);

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('recipient_id', userId)
      .select();

    if (error) {
      console.error('❌ [NOTIFICATIONS] Error deleting notification:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete notification',
        code: 'NOTIFICATIONS_DELETE_ERROR'
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        code: 'NOTIFICATIONS_NOT_FOUND'
      });
    }

    console.log('✅ [NOTIFICATIONS] Deleted notification:', id);

    res.json({
      success: true,
      data: { deleted: true }
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      code: 'NOTIFICATIONS_DELETE_ERROR'
    });
  }
});

// Cleanup expired notifications (admin only)
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'NOTIFICATIONS_INSUFFICIENT_PERMISSIONS'
      });
    }

    console.log('🔔 [NOTIFICATIONS] Cleaning up expired notifications');

    const { data, error } = await supabase
      .rpc('cleanup_expired_notifications');

    if (error) {
      console.error('❌ [NOTIFICATIONS] Error cleaning up:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to cleanup notifications',
        code: 'NOTIFICATIONS_CLEANUP_ERROR'
      });
    }

    console.log('✅ [NOTIFICATIONS] Cleaned up expired notifications, count:', data);

    res.json({
      success: true,
      data: { deleted_count: data || 0 }
    });

  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup notifications',
      code: 'NOTIFICATIONS_CLEANUP_ERROR'
    });
  }
});

export default router; 