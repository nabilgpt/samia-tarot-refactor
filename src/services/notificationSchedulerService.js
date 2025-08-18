import { supabaseAdmin } from '../lib/supabase.js';

/**
 * Notification Scheduler Service
 * Handles scheduled notifications, editing, cancellation, and delivery management
 */
class NotificationSchedulerService {
  constructor() {
    this.schedulerInterval = null;
    this.isRunning = false;
  }

  /**
   * Create a new notification (immediate or scheduled)
   */
  async createNotification({
    title,
    message,
    targetAudience,
    priority = 'normal',
    scheduledAt = null,
    createdBy
  }) {
    try {
      const notificationData = {
        title: title.trim(),
        message: message.trim(),
        target_audience: targetAudience,
        priority,
        created_by: createdBy,
        scheduled_at: scheduledAt,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('notification_logs')
        .insert(notificationData)
        .select()
        .single();

      if (error) throw error;

      // If it's an immediate notification, send it right away
      if (!scheduledAt) {
        await this.sendNotificationNow(data.id);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all scheduled notifications with their status
   */
  async getScheduledNotifications(adminId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_logs')
        .select(`
          *,
          created_by_profile:profiles!notification_logs_created_by_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching scheduled notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get notification by ID with edit permission check
   */
  async getNotificationById(notificationId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_logs')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (error) throw error;

      // Check if it can be edited
      const { data: canEdit } = await supabaseAdmin
        .rpc('can_edit_notification', { notification_id: notificationId });

      return { 
        success: true, 
        data: { 
          ...data, 
          can_edit: canEdit === true 
        } 
      };
    } catch (error) {
      console.error('Error fetching notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update/reschedule a notification
   */
  async updateNotification(notificationId, updates) {
    try {
      // First check if it can be edited
      const { data: canEdit } = await supabaseAdmin
        .rpc('can_edit_notification', { notification_id: notificationId });

      if (!canEdit) {
        return { 
          success: false, 
          error: 'Notification cannot be edited. Either it has been sent or the edit deadline has passed.' 
        };
      }

      const { data, error } = await supabaseAdmin
        .from('notification_logs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error updating notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_logs')
        .update({
          schedule_status: 'cancelled',
          delivery_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('schedule_status', 'scheduled') // Only cancel if it's scheduled
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error cancelling notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a notification (only if not sent)
   */
  async deleteNotification(notificationId) {
    try {
      // First check if it can be deleted (not sent)
      const { data: notification } = await supabaseAdmin
        .from('notification_logs')
        .select('schedule_status, delivery_status')
        .eq('id', notificationId)
        .single();

      if (notification?.schedule_status === 'sent' || notification?.delivery_status === 'sent') {
        return { 
          success: false, 
          error: 'Cannot delete a notification that has already been sent.' 
        };
      }

      const { error } = await supabaseAdmin
        .from('notification_logs')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a notification immediately
   */
  async sendNotificationNow(notificationId) {
    try {
      // Get notification details
      const { data: notification, error: fetchError } = await supabaseAdmin
        .from('notification_logs')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (fetchError) throw fetchError;

      // Get target users based on audience
      let roleFilter;
      switch (notification.target_audience) {
        case 'clients':
          roleFilter = 'client';
          break;
        case 'readers':
          roleFilter = 'reader';
          break;
        case 'monitors':
          roleFilter = 'monitor';
          break;
        case 'all':
          roleFilter = null; // Will fetch all roles
          break;
        default:
          throw new Error(`Invalid target audience: ${notification.target_audience}`);
      }

      let query = supabaseAdmin
        .from('profiles')
        .select('id, email, first_name, last_name, role')
        .eq('is_active', true);

      if (roleFilter) {
        query = query.eq('role', roleFilter);
      }

      const { data: targetUsers, error: usersError } = await query;

      if (usersError) throw usersError;

      if (!targetUsers || targetUsers.length === 0) {
        // Mark as failed - no recipients
        await supabaseAdmin
          .from('notification_logs')
          .update({
            delivery_status: 'failed',
            schedule_status: 'failed',
            failed_count: 0,
            sent_count: 0,
            sent_at: new Date().toISOString()
          })
          .eq('id', notificationId);

        return { success: false, error: 'No recipients found for the target audience' };
      }

      // Create individual notification records for each user
      const individualNotifications = targetUsers.map(user => ({
        user_id: user.id,
        title: notification.title,
        message: notification.message,
        type: 'broadcast',
        priority: notification.priority,
        is_read: false,
        created_at: new Date().toISOString(),
        metadata: {
          notification_log_id: notificationId,
          target_audience: notification.target_audience,
          sender_id: notification.created_by
        }
      }));

      // Insert individual notifications
      const { data: insertedNotifications, error: insertError } = await supabaseAdmin
        .from('notifications')
        .insert(individualNotifications)
        .select();

      if (insertError) throw insertError;

      // Create delivery records
      const deliveryRecords = targetUsers.map(user => ({
        notification_log_id: notificationId,
        user_id: user.id,
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString()
      }));

      const { error: deliveryError } = await supabaseAdmin
        .from('notification_deliveries')
        .insert(deliveryRecords);

      if (deliveryError) throw deliveryError;

      // Update notification log as sent
      const { error: updateError } = await supabaseAdmin
        .from('notification_logs')
        .update({
          delivery_status: 'sent',
          schedule_status: 'sent',
          sent_count: targetUsers.length,
          failed_count: 0,
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (updateError) throw updateError;

      return { 
        success: true, 
        data: { 
          sentCount: targetUsers.length,
          recipients: targetUsers 
        } 
      };

    } catch (error) {
      console.error('Error sending notification:', error);
      
      // Mark notification as failed
      await supabaseAdmin
        .from('notification_logs')
        .update({
          delivery_status: 'failed',
          schedule_status: 'failed',
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      return { success: false, error: error.message };
    }
  }

  /**
   * Start the notification scheduler (checks for pending scheduled notifications)
   */
  startScheduler() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🚀 Notification scheduler started');

    // Check every minute for pending notifications
    this.schedulerInterval = setInterval(async () => {
      try {
        const { data: pendingNotifications } = await supabaseAdmin
          .rpc('get_pending_scheduled_notifications');

        if (pendingNotifications && pendingNotifications.length > 0) {
          console.log(`📬 Processing ${pendingNotifications.length} pending notifications`);

          for (const notification of pendingNotifications) {
            await this.sendNotificationNow(notification.id);
            console.log(`✅ Sent scheduled notification: ${notification.title}`);
          }
        }
      } catch (error) {
        console.error('Scheduler error:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop the notification scheduler
   */
  stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      this.isRunning = false;
      console.log('⏹️ Notification scheduler stopped');
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats() {
    try {
      const { data: stats } = await supabaseAdmin
        .from('notification_logs')
        .select('delivery_status, schedule_status, target_audience')
        .order('created_at', { ascending: false });

      const totalNotifications = stats?.length || 0;
      const sentNotifications = stats?.filter(n => n.delivery_status === 'sent').length || 0;
      const scheduledNotifications = stats?.filter(n => n.schedule_status === 'scheduled').length || 0;
      const failedNotifications = stats?.filter(n => n.delivery_status === 'failed').length || 0;

      const audienceBreakdown = stats?.reduce((acc, notification) => {
        acc[notification.target_audience] = (acc[notification.target_audience] || 0) + 1;
        return acc;
      }, {}) || {};

      return {
        success: true,
        data: {
          total: totalNotifications,
          sent: sentNotifications,
          scheduled: scheduledNotifications,
          failed: failedNotifications,
          audienceBreakdown
        }
      };
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const notificationScheduler = new NotificationSchedulerService();

// Auto-start scheduler in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  notificationScheduler.startScheduler();
}

export default notificationScheduler; 
