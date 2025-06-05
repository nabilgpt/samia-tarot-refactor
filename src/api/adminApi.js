import { supabase } from '../lib/supabase';

/**
 * Admin API for managing all aspects of the Samia Tarot platform
 * Role-based security: Admin access only (not super admin functions)
 */

// ===================
// DASHBOARD STATS
// ===================

export const AdminAPI = {
  // Get dashboard overview statistics
  async getAdminStats() {
    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || {
          totalUsers: 0,
          totalReaders: 0,
          totalBookings: 0,
          totalRevenue: 0,
          activeUsers: 0,
          pendingApprovals: 0,
          emergencyAlerts: 0,
          systemHealth: 98
        }
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ===================
  // USER MANAGEMENT
  // ===================

  // Get all users with filters and pagination
  async getAllUsers(filters = {}) {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          auth.users!inner(
            id,
            email,
            created_at,
            last_sign_in_at
          )
        `);

      // Apply filters
      if (filters.role && filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }
      
      if (filters.status && filters.status !== 'all') {
        query = query.eq('is_active', filters.status === 'active');
      }
      
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      // Add pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Update user status (activate/deactivate)
  async updateUserStatus(userId, isActive) {
    try {
      // Prevent admins from modifying super admin accounts
      const { data: user } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (user?.role === 'super_admin') {
        throw new Error('Cannot modify super admin accounts');
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Log admin action
      await this.logAdminAction('user_status_update', {
        target_user_id: userId,
        action: isActive ? 'activate' : 'deactivate'
      });
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating user status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Update user profile information
  async updateUserProfile(userId, updates) {
    try {
      // Prevent admins from modifying super admin accounts
      const { data: user } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (user?.role === 'super_admin') {
        throw new Error('Cannot modify super admin accounts');
      }

      // Remove sensitive fields that admins shouldn't be able to change
      const allowedFields = [
        'first_name', 'last_name', 'phone', 'country', 'city',
        'bio', 'specialties', 'hourly_rate', 'availability',
        'languages', 'experience_years'
      ];
      
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      filteredUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('profiles')
        .update(filteredUpdates)
        .eq('id', userId);
      
      if (error) throw error;
      
      // Log admin action
      await this.logAdminAction('user_profile_update', {
        target_user_id: userId,
        changes: filteredUpdates
      });
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Bulk update user status
  async bulkUpdateStatus(userIds, isActive) {
    try {
      // Prevent modification of super admin accounts
      const { data: superAdmins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'super_admin')
        .in('id', userIds);
        
      if (superAdmins && superAdmins.length > 0) {
        throw new Error('Cannot modify super admin accounts');
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .in('id', userIds);
      
      if (error) throw error;
      
      // Log admin action
      await this.logAdminAction('bulk_user_status_update', {
        target_user_ids: userIds,
        action: isActive ? 'activate' : 'deactivate',
        count: userIds.length
      });
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error bulk updating user status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ===================
  // SERVICES MANAGEMENT
  // ===================

  // Get all services
  async getAllServices() {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching services:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Create new service
  async createService(serviceData) {
    try {
      const { data, error } = await supabase
        .from('services')
        .insert([{
          ...serviceData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      // Log admin action
      await this.logAdminAction('service_create', {
        service_id: data[0].id,
        service_data: serviceData
      });
      
      return {
        success: true,
        data: data[0]
      };
    } catch (error) {
      console.error('Error creating service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Update service
  async updateService(serviceId, updates) {
    try {
      const { data, error } = await supabase
        .from('services')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .select();
      
      if (error) throw error;
      
      // Log admin action
      await this.logAdminAction('service_update', {
        service_id: serviceId,
        changes: updates
      });
      
      return {
        success: true,
        data: data[0]
      };
    } catch (error) {
      console.error('Error updating service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Delete service
  async deleteService(serviceId) {
    try {
      const { data, error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);
      
      if (error) throw error;
      
      // Log admin action
      await this.logAdminAction('service_delete', {
        service_id: serviceId
      });
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error deleting service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ===================
  // BOOKINGS MANAGEMENT
  // ===================

  // Get all bookings with filters
  async getAllBookings(filters = {}) {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(first_name, last_name, email),
          reader:profiles!bookings_reader_id_fkey(first_name, last_name, email),
          service:services(name_en, name_ar, price)
        `);

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters.reader_id) {
        query = query.eq('reader_id', filters.reader_id);
      }
      
      if (filters.date_from) {
        query = query.gte('scheduled_at', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.lte('scheduled_at', filters.date_to);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Update booking status
  async updateBookingStatus(bookingId, status, reason = '') {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status,
          admin_notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select();
      
      if (error) throw error;
      
      // Log admin action
      await this.logAdminAction('booking_status_update', {
        booking_id: bookingId,
        new_status: status,
        reason
      });
      
      return {
        success: true,
        data: data[0]
      };
    } catch (error) {
      console.error('Error updating booking status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ===================
  // APPROVAL QUEUE
  // ===================

  // Get pending approval requests
  async getApprovalRequests(filters = {}) {
    try {
      let query = supabase
        .from('approval_requests')
        .select(`
          *,
          user:profiles(first_name, last_name, email, phone, country)
        `);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching approval requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Approve/Reject request
  async processApprovalRequest(requestId, action, reason = '') {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .update({
          status: action, // 'approved' or 'rejected'
          admin_notes: reason,
          processed_at: new Date().toISOString(),
          processed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', requestId)
        .select();
      
      if (error) throw error;
      
      // If approved, apply the changes
      if (action === 'approved' && data[0]) {
        await this.applyApprovedChanges(data[0]);
      }
      
      // Log admin action
      await this.logAdminAction('approval_request_processed', {
        request_id: requestId,
        action,
        reason
      });
      
      return {
        success: true,
        data: data[0]
      };
    } catch (error) {
      console.error('Error processing approval request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Apply approved changes
  async applyApprovedChanges(request) {
    try {
      const { type, user_id, data: requestData } = request;

      switch (type) {
        case 'reader_registration':
          // Update user role to reader and apply profile data
          await supabase
            .from('profiles')
            .update({
              role: 'reader',
              ...requestData,
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', user_id);
          break;

        case 'profile_update':
          // Apply profile changes
          if (requestData.changes) {
            const updates = {};
            Object.keys(requestData.changes).forEach(key => {
              updates[key] = requestData.changes[key].new;
            });
            updates.updated_at = new Date().toISOString();
            
            await supabase
              .from('profiles')
              .update(updates)
              .eq('id', user_id);
          }
          break;

        case 'service_addition':
          // Create new service for the reader
          await supabase
            .from('services')
            .insert([{
              ...requestData,
              reader_id: user_id,
              is_active: true,
              created_at: new Date().toISOString()
            }]);
          break;

        case 'account_reactivation':
          // Reactivate user account
          await supabase
            .from('profiles')
            .update({
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', user_id);
          break;

        default:
          console.warn('Unknown approval request type:', type);
      }
    } catch (error) {
      console.error('Error applying approved changes:', error);
      throw error;
    }
  },

  // ===================
  // PAYMENTS & WALLETS
  // ===================

  // Get payment transactions
  async getPaymentTransactions(filters = {}) {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          user:profiles(first_name, last_name, email),
          booking:bookings(id, service_id, scheduled_at)
        `);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching payment transactions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Process refund
  async processRefund(transactionId, amount, reason) {
    try {
      // Create refund transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          type: 'refund',
          amount: -Math.abs(amount),
          status: 'completed',
          description: `Refund: ${reason}`,
          reference_transaction_id: transactionId,
          processed_by_admin: true,
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      // Log admin action
      await this.logAdminAction('refund_processed', {
        transaction_id: transactionId,
        refund_amount: amount,
        reason
      });
      
      return {
        success: true,
        data: data[0]
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Adjust wallet balance
  async adjustWalletBalance(userId, amount, reason) {
    try {
      const { data, error } = await supabase
        .from('wallet_adjustments')
        .insert([{
          user_id: userId,
          amount,
          reason,
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      // Update wallet balance
      await supabase.rpc('adjust_wallet_balance', {
        user_id: userId,
        adjustment: amount
      });
      
      // Log admin action
      await this.logAdminAction('wallet_adjustment', {
        target_user_id: userId,
        amount,
        reason
      });
      
      return {
        success: true,
        data: data[0]
      };
    } catch (error) {
      console.error('Error adjusting wallet balance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ===================
  // NOTIFICATIONS
  // ===================

  // Send bulk notification
  async sendBulkNotification(notification) {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .insert([{
          ...notification,
          sent_by: (await supabase.auth.getUser()).data.user?.id,
          created_at: new Date().toISOString(),
          status: notification.scheduled_at ? 'scheduled' : 'sent'
        }])
        .select();
      
      if (error) throw error;
      
      // If not scheduled, send immediately
      if (!notification.scheduled_at) {
        await supabase.rpc('send_bulk_notification', {
          notification_id: data[0].id
        });
      }
      
      // Log admin action
      await this.logAdminAction('bulk_notification_sent', {
        notification_id: data[0].id,
        target_audience: notification.target_audience,
        type: notification.type
      });
      
      return {
        success: true,
        data: data[0]
      };
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get notification history
  async getNotificationHistory() {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select(`
          *,
          sender:profiles(first_name, last_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ===================
  // MONITORING & REPORTS
  // ===================

  // Get active sessions
  async getActiveSessions() {
    try {
      const { data, error } = await supabase
        .from('active_sessions')
        .select(`
          *,
          client:profiles!active_sessions_client_id_fkey(first_name, last_name),
          reader:profiles!active_sessions_reader_id_fkey(first_name, last_name),
          booking:bookings(service_id, scheduled_at)
        `)
        .eq('status', 'active');
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get system logs
  async getSystemLogs(filters = {}) {
    try {
      let query = supabase
        .from('system_logs')
        .select('*');

      if (filters.level && filters.level !== 'all') {
        query = query.eq('level', filters.level);
      }
      
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 100);
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching system logs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ===================
  // ADMIN AUDIT LOG
  // ===================

  // Log admin actions for audit trail
  async logAdminAction(action, details = {}) {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) return;

      const { error } = await supabase
        .from('admin_audit_log')
        .insert([{
          admin_id: user.user.id,
          action,
          details,
          timestamp: new Date().toISOString(),
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent
        }]);
      
      if (error) {
        console.error('Error logging admin action:', error);
      }
    } catch (error) {
      console.error('Error in logAdminAction:', error);
    }
  },

  // Get client IP address
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  },

  // Get admin audit log
  async getAdminAuditLog(filters = {}) {
    try {
      let query = supabase
        .from('admin_audit_log')
        .select(`
          *,
          admin:profiles(first_name, last_name, email)
        `);

      if (filters.admin_id) {
        query = query.eq('admin_id', filters.admin_id);
      }
      
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      
      if (filters.date_from) {
        query = query.gte('timestamp', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.lte('timestamp', filters.date_to);
      }

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(filters.limit || 100);
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching admin audit log:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ===================
  // ANALYTICS & REPORTS
  // ===================

  // Get analytics data
  async getAnalyticsData(period = '7d') {
    try {
      const { data, error } = await supabase.rpc('get_admin_analytics', {
        period_days: period === '7d' ? 7 : period === '30d' ? 30 : 90
      });
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || {}
      };
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Export data to CSV
  async exportData(type, filters = {}) {
    try {
      let data;
      
      switch (type) {
        case 'users':
          data = await this.getAllUsers(filters);
          break;
        case 'bookings':
          data = await this.getAllBookings(filters);
          break;
        case 'transactions':
          data = await this.getPaymentTransactions(filters);
          break;
        case 'audit_log':
          data = await this.getAdminAuditLog(filters);
          break;
        default:
          throw new Error('Invalid export type');
      }
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      // Log admin action
      await this.logAdminAction('data_export', {
        export_type: type,
        filters,
        record_count: data.data.length
      });
      
      return {
        success: true,
        data: data.data
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default AdminAPI; 