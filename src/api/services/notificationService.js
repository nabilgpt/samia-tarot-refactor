import { supabase } from '../lib/supabase.js';


class NotificationService {
    constructor(io) {
        this.io = io;
    }

    /**
     * Send a notification to a specific user
     */
    async sendNotification({
        recipientId,
        senderId = null,
        type,
        title,
        message,
        data = {},
        priority = 'medium',
        channels = ['socket']
    }) {
        try {
            // Insert notification into database
            const { data: notification, error } = await supabase
                .from('notifications')
                .insert({
                    recipient_id: recipientId,
                    sender_id: senderId,
                    type,
                    title,
                    message,
                    data,
                    priority,
                    channels,
                    is_system: !senderId
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating notification:', error);
                throw error;
            }

            // Send real-time notification via Socket.IO if enabled
            if (channels.includes('socket') && this.io) {
                this.io.to(`user_${recipientId}`).emit('notification', {
                    id: notification.id,
                    type,
                    title,
                    message,
                    data,
                    priority,
                    created_at: notification.created_at
                });
            }

            return notification;
        } catch (error) {
            console.error('NotificationService.sendNotification error:', error);
            throw error;
        }
    }

    /**
     * Send notification to multiple users
     */
    async sendBulkNotification({
        recipientIds,
        senderId = null,
        type,
        title,
        message,
        data = {},
        priority = 'medium',
        channels = ['socket']
    }) {
        try {
            const notifications = recipientIds.map(recipientId => ({
                recipient_id: recipientId,
                sender_id: senderId,
                type,
                title,
                message,
                data,
                priority,
                channels,
                is_system: !senderId
            }));

            const { data: createdNotifications, error } = await supabase
                .from('notifications')
                .insert(notifications)
                .select();

            if (error) {
                console.error('Error creating bulk notifications:', error);
                throw error;
            }

            // Send real-time notifications via Socket.IO
            if (channels.includes('socket') && this.io) {
                recipientIds.forEach(recipientId => {
                    this.io.to(`user_${recipientId}`).emit('notification', {
                        type,
                        title,
                        message,
                        data,
                        priority,
                        created_at: new Date().toISOString()
                    });
                });
            }

            return createdNotifications;
        } catch (error) {
            console.error('NotificationService.sendBulkNotification error:', error);
            throw error;
        }
    }

    /**
     * Send notification to users with specific roles
     */
    async sendRoleBasedNotification({
        roles,
        senderId = null,
        type,
        title,
        message,
        data = {},
        priority = 'medium',
        channels = ['socket']
    }) {
        try {
            // Get users with specified roles
            const { data: users, error: usersError } = await supabase
                .from('profiles')
                .select('id')
                .in('role', roles)
                .eq('is_active', true);

            if (usersError) {
                throw usersError;
            }

            if (!users || users.length === 0) {
                return [];
            }

            const recipientIds = users.map(user => user.id);
            return await this.sendBulkNotification({
                recipientIds,
                senderId,
                type,
                title,
                message,
                data,
                priority,
                channels
            });
        } catch (error) {
            console.error('NotificationService.sendRoleBasedNotification error:', error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .update({ 
                    read_at: new Date().toISOString()
                })
                .eq('id', notificationId)
                .eq('recipient_id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('NotificationService.markAsRead error:', error);
            throw error;
        }
    }

    /**
     * Get user notifications with pagination
     */
    async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
        try {
            let query = supabase
                .from('notifications')
                .select(`
                    id,
                    type,
                    title,
                    message,
                    data,
                    priority,
                    read_at,
                    created_at,
                    sender:sender_id(
                        id,
                        first_name,
                        last_name
                    )
                `)
                .eq('recipient_id', userId)
                .order('created_at', { ascending: false });

            if (unreadOnly) {
                query = query.is('read_at', null);
            }

            const offset = (page - 1) * limit;
            query = query.range(offset, offset + limit - 1);

            const { data: notifications, error } = await query;

            if (error) {
                throw error;
            }

            // Get total count
            let countQuery = supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('recipient_id', userId);

            if (unreadOnly) {
                countQuery = countQuery.is('read_at', null);
            }

            const { count, error: countError } = await countQuery;

            if (countError) {
                throw countError;
            }

            return {
                notifications,
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('NotificationService.getUserNotifications error:', error);
            throw error;
        }
    }

    /**
     * Delete old notifications (cleanup)
     */
    async cleanup(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const { data, error } = await supabase
                .from('notifications')
                .delete()
                .lt('created_at', cutoffDate.toISOString())
                .neq('priority', 'urgent'); // Keep urgent notifications longer

            if (error) {
                throw error;
            }

            console.log(`Cleaned up ${data?.length || 0} old notifications`);
            return data;
        } catch (error) {
            console.error('NotificationService.cleanup error:', error);
            throw error;
        }
    }

    /**
     * Send emergency alert (highest priority)
     */
    async sendEmergencyAlert({
        recipientIds = null,
        roles = ['admin', 'monitor'],
        senderId = null,
        title,
        message,
        data = {},
        emergencyType = 'general'
    }) {
        try {
            const alertData = {
                ...data,
                emergency_type: emergencyType,
                alert_level: 'critical'
            };

            if (recipientIds) {
                return await this.sendBulkNotification({
                    recipientIds,
                    senderId,
                    type: 'emergency_alert',
                    title,
                    message,
                    data: alertData,
                    priority: 'urgent',
                    channels: ['socket', 'email', 'push']
                });
            } else {
                return await this.sendRoleBasedNotification({
                    roles,
                    senderId,
                    type: 'emergency_alert',
                    title,
                    message,
                    data: alertData,
                    priority: 'urgent',
                    channels: ['socket', 'email', 'push']
                });
            }
        } catch (error) {
            console.error('NotificationService.sendEmergencyAlert error:', error);
            throw error;
        }
    }
}

// Export a singleton instance that can be initialized with io
let notificationServiceInstance = null;

const initializeNotificationService = (io) => {
    if (!notificationServiceInstance) {
        notificationServiceInstance = new NotificationService(io);
    }
    return notificationServiceInstance;
};

const getNotificationService = () => {
    if (!notificationServiceInstance) {
        // Return a service without Socket.IO capabilities
        notificationServiceInstance = new NotificationService(null);
    }
    return notificationServiceInstance;
};

module.exports = {
    NotificationService,
    initializeNotificationService,
    getNotificationService
}; 