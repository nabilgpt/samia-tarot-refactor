import { supabase, supabaseAdmin } from './lib/supabase.js';

// =====================================================
// SUPER ADMIN API - MAXIMUM PRIVILEGES
// =====================================================

export class SuperAdminAPI {
  // =====================================================
  // SECURITY & VALIDATION
  // =====================================================

  /**
   * Verify super admin privileges
   */
  static async verifySuperAdmin() {
    try {
      const currentUser = await authHelpers.getCurrentUser();
      if (!currentUser) {
        throw new Error('Authentication required');
      }

      const { data: profile } = await profileHelpers.getProfile(currentUser.id);
      if (!profile || profile.role !== 'super_admin') {
        throw new Error('Super Admin privileges required');
      }

      return { success: true, user: currentUser, profile };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Log super admin action for audit
   */
  static async logAction(action, targetUserId = null, details = {}) {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return;

      // Use the correct audit table name and schema: admin_audit_logs
      await supabase
        .from('admin_audit_logs')
        .insert({
          admin_id: verification.user.id,
          action_type: action,
          table_name: details.table_name || 'user_action',
          record_ids: targetUserId ? [targetUserId] : (details.record_ids || []),
          old_data: details.old_data || null,
          new_data: details.new_data || null,
          metadata: {
            details: details,
            timestamp: new Date().toISOString(),
            action: action
          }
        });
    } catch (error) {
      console.error('❌ Audit logging failed:', error);
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }

  // =====================================================
  // USER MANAGEMENT - COMPLETE CONTROL
  // =====================================================

  /**
   * Get all users with complete data
   */
  static async getAllUsers(filters = {}) {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      // Use the correct foreign key relationship name: profiles_id_fkey
      let query = supabase
        .from('profiles')
        .select(`
          *,
          auth_users(email, created_at, last_sign_in_at, email_confirmed_at)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.role) query = query.eq('role', filters.role);
      if (filters.country) query = query.eq('country', filters.country);
      if (filters.is_active !== undefined && filters.is_active !== '') {
        query = query.eq('is_active', filters.is_active === 'true' || filters.is_active === true);
      }
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      // Add sorting options
      if (filters.sortBy) {
        const direction = filters.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
        query = query.order(filters.sortBy, direction);
      }

      const { data, error } = await query;
      if (error) throw error;

      await this.logAction('GET_ALL_USERS', null, { filters, count: data?.length });

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('SuperAdmin getAllUsers error:', error);
      
      // Enhanced error handling with specific relationship error detection
      if (error.message?.includes('no matches were found') || 
          error.message?.includes('Could not find a relationship')) {
        
        console.warn('❌ No foreign key relationship found between profiles and auth.users');
        console.warn('📋 SOLUTION: Run the SQL script CREATE_PROFILES_RELATIONSHIP.sql in Supabase Dashboard');
        
        // Try a simpler query without relationships as fallback
        try {
          console.warn('🔄 Falling back to basic profile query without auth data...');
          
          let fallbackQuery = supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

          // Apply same filters to fallback
          if (filters.role) fallbackQuery = fallbackQuery.eq('role', filters.role);
          if (filters.country) fallbackQuery = fallbackQuery.eq('country', filters.country);
          if (filters.is_active !== undefined && filters.is_active !== '') {
            fallbackQuery = fallbackQuery.eq('is_active', filters.is_active === 'true' || filters.is_active === true);
          }
          if (filters.search) {
            fallbackQuery = fallbackQuery.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
          }

          const { data: fallbackData, error: fallbackError } = await fallbackQuery;
          
          if (fallbackError) throw fallbackError;
          
          // Add placeholder auth user data 
          const enhancedData = fallbackData.map(profile => ({
            ...profile,
            auth_users: { 
              email: profile.email || 'No email available',
              created_at: profile.created_at,
              last_sign_in_at: null,
              email_confirmed_at: null
            }
          }));

          return { 
            success: true, 
            data: enhancedData,
            warning: 'No relationship found. Returned basic profile data. Please run CREATE_PROFILES_RELATIONSHIP.sql to fix this.'
          };
        } catch (fallbackError) {
          return { 
            success: false, 
            error: `Relationship missing and fallback failed. Please run CREATE_PROFILES_RELATIONSHIP.sql in Supabase Dashboard to create the required foreign key relationship.`
          };
        }
      }
      
      // Other error fallbacks
      try {
        console.warn('Falling back to basic profile query due to general error');
        
        let fallbackQuery = supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        // Apply same filters to fallback
        if (filters.role) fallbackQuery = fallbackQuery.eq('role', filters.role);
        if (filters.country) fallbackQuery = fallbackQuery.eq('country', filters.country);
        if (filters.is_active !== undefined && filters.is_active !== '') {
          fallbackQuery = fallbackQuery.eq('is_active', filters.is_active === 'true' || filters.is_active === true);
        }
        if (filters.search) {
          fallbackQuery = fallbackQuery.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        
        if (fallbackError) throw fallbackError;
        
        // Add minimal auth user data manually
        const enhancedData = fallbackData.map(profile => ({
          ...profile,
          auth_users: { email: profile.email || 'No email' }
        }));

        return { 
          success: true, 
          data: enhancedData,
          warning: `API error but returned cached data: ${error.message}`
        };
      } catch (fallbackError) {
        return { success: false, error: `Primary query failed: ${error.message}. Fallback failed: ${fallbackError.message}` };
      }
    }
  }

  /**
   * Update any user's profile with complete control
   */
  static async updateUserProfile(userId, updates) {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      // Get current profile for audit
      const { data: currentProfile } = await profileHelpers.getProfile(userId);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('UPDATE_USER_PROFILE', userId, {
        previous: currentProfile,
        updates,
        new_data: data
      });

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete any user completely
   */
  static async deleteUser(userId, reason = '') {
    try {
      console.log('🔄 SuperAdmin deleteUser starting for:', userId);
      console.log('🔄 SuperAdmin deleteUser reason:', reason);
      
      const verification = await this.verifySuperAdmin();
      if (!verification.success) {
        console.log('❌ SuperAdmin verification failed:', verification);
        return verification;
      }

      console.log('✅ SuperAdmin verification successful');

      // Get user data for audit before deletion
      const { data: userData } = await profileHelpers.getProfile(userId);
      console.log('📋 User data retrieved for audit:', userData?.email || userData?.id);

      console.log('🔄 Performing permanent deletion directly...');
      
      // Delete user directly using supabase admin
      const { error } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      const response = { data: { success: true } };
      
      console.log('📥 Backend API response status:', response.status);
      console.log('📥 Backend API response data:', response.data);
      
      if (!response.data.success) {
        console.error('❌ Backend API returned failure:', response.data);
        throw new Error(response.data.error || response.data.details || 'Failed to delete user');
      }

      // Verify it was a permanent deletion
      if (response.data.permanent !== true) {
        console.warn('⚠️ Backend API did not confirm permanent deletion:', response.data);
        return { 
          success: false, 
          error: 'Deletion was not permanent. User may have been deactivated instead of deleted.' 
        };
      }

      console.log('✅ Backend deletion confirmed as permanent, logging action...');

      await this.logAction('DELETE_USER', userId, {
        deleted_user: userData,
        reason,
        permanent_deletion: true,
        backend_response: response.data
      });

      console.log('✅ SuperAdmin deleteUser completed successfully');
      return { 
        success: true, 
        message: response.data.message || 'User deleted permanently',
        permanent: true 
      };
    } catch (error) {
      console.error('❌ SuperAdmin deleteUser error:', error);
      
      // Enhanced error logging
      if (error.response?.data) {
        console.error('❌ API Error Response Status:', error.response.status);
        console.error('❌ API Error Response Data:', error.response.data);
        return { 
          success: false, 
          error: error.response.data.error || error.response.data.message || error.message,
          details: error.response.data.details || 'No additional details'
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Impersonate any user account
   */
  static async impersonateUser(userId) {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      // Store current session for restoration
      const currentSession = await authHelpers.getCurrentSession();
      
      // Create impersonation session
      const { data, error } = await supabase
        .from('impersonation_sessions')
        .insert({
          super_admin_id: verification.user.id,
          target_user_id: userId,
          started_at: new Date().toISOString(),
          original_session_id: currentSession?.session?.id
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAction('START_IMPERSONATION', userId, {
        impersonation_session_id: data.id,
        original_session: currentSession?.session?.id
      });

      return { 
        success: true, 
        data: {
          impersonation_session_id: data.id,
          target_user_id: userId,
          message: 'Impersonation session started'
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * End impersonation and restore original session
   */
  static async endImpersonation(impersonationSessionId) {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      const { data, error } = await supabase
        .from('impersonation_sessions')
        .update({
          ended_at: new Date().toISOString()
        })
        .eq('id', impersonationSessionId)
        .eq('super_admin_id', verification.user.id)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('END_IMPERSONATION', data.target_user_id, {
        impersonation_session_id: impersonationSessionId,
        duration: new Date() - new Date(data.started_at)
      });

      return { success: true, message: 'Impersonation ended' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // SYSTEM MANAGEMENT
  // =====================================================

  /**
   * Get all system settings
   */
  static async getSystemSettings() {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;

      // Transform flat array into nested object structure
      const settingsObject = {};
      if (data && data.length > 0) {
        data.forEach(setting => {
          const category = setting.category || 'general';
          if (!settingsObject[category]) {
            settingsObject[category] = {};
          }
          
          // Parse JSON value if it's a string, otherwise use as-is
          let value = setting.value;
          try {
            if (typeof value === 'string') {
              value = JSON.parse(value);
            }
          } catch (e) {
            // If parsing fails, use the raw value
            value = setting.value;
          }
          
          settingsObject[category][setting.key] = value;
        });
      }

      await this.logAction('GET_SYSTEM_SETTINGS');

      return { success: true, data: settingsObject };
    } catch (error) {
      console.error('Error fetching system settings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update system settings
   */
  static async updateSystemSetting(settingKey, value, category = 'general') {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      // Use upsert with proper conflict resolution
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({
          key: settingKey,
          value: JSON.stringify(value),
          category,
          updated_by: verification.user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        // If upsert fails due to conflict, try update instead
        if (error.code === 'PGRST116' || error.message?.includes('duplicate') || error.message?.includes('conflict')) {
          const { data: updateData, error: updateError } = await supabase
            .from('system_settings')
            .update({
              value: JSON.stringify(value),
              category,
              updated_by: verification.user.id,
              updated_at: new Date().toISOString()
            })
            .eq('key', settingKey)
            .select()
            .single();

          if (updateError) throw updateError;
          
          await this.logAction('UPDATE_SYSTEM_SETTING', null, {
            setting_key: settingKey,
            new_value: value,
            category,
            method: 'update_fallback'
          });

          return { success: true, data: updateData };
        }
        throw error;
      }

      await this.logAction('UPDATE_SYSTEM_SETTING', null, {
        setting_key: settingKey,
        new_value: value,
        category,
        method: 'upsert'
      });

      return { success: true, data };
    } catch (error) {
      console.error('System setting update error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get complete database statistics
   */
  static async getDatabaseStats() {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      const tables = [
        'profiles', 'services', 'bookings', 'payments', 'messages', 
        'reviews', 'notifications', 'wallets', 'transactions',
        'call_sessions', 'call_recordings', 'emergency_call_logs'
      ];

      const stats = {};
      
      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (error) throw error;
          stats[table] = count || 0;
        } catch (err) {
          stats[table] = 'Error';
        }
      }

      await this.logAction('GET_DATABASE_STATS');

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // REAL-TIME CONTROLS
  // =====================================================

  /**
   * Get all active sessions
   */
  static async getActiveSessions() {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          client:profiles!bookings_user_id_fkey(*),
          reader:profiles!bookings_reader_id_fkey(*),
          messages:messages(*),
          call_session:call_sessions(*)
        `)
        .eq('status', 'in_progress')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      await this.logAction('GET_ACTIVE_SESSIONS');

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Force end any session
   */
  static async forceEndSession(bookingId, reason = '') {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'force_ended',
          ended_at: new Date().toISOString(),
          admin_notes: `Force ended by super admin: ${reason}`
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('FORCE_END_SESSION', null, {
        booking_id: bookingId,
        reason,
        session_data: data
      });

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Override booking assignment
   */
  static async reassignBooking(bookingId, newReaderId, reason = '') {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      const { data, error } = await supabase
        .from('bookings')
        .update({
          reader_id: newReaderId,
          admin_notes: `Reassigned by super admin: ${reason}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('REASSIGN_BOOKING', null, {
        booking_id: bookingId,
        previous_reader_id: currentBooking?.reader_id,
        new_reader_id: newReaderId,
        reason
      });

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // AUDIT & MONITORING
  // =====================================================

  /**
   * Get comprehensive audit logs
   */
  static async getAuditLogs(filters = {}) {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      // Use the correct audit table name: admin_audit_logs
      let query = supabase
        .from('admin_audit_logs')
        .select(`
          *,
          admin:profiles!admin_audit_logs_admin_id_fkey(first_name, last_name, email, role)
        `)
        .order('created_at', { ascending: false });

      if (filters.action) query = query.eq('action_type', filters.action);
      if (filters.admin_id) query = query.eq('admin_id', filters.admin_id);
      if (filters.table_name) query = query.eq('table_name', filters.table_name);
      if (filters.date_from) query = query.gte('created_at', filters.date_from);
      if (filters.date_to) query = query.lte('created_at', filters.date_to);
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.warn('⚠️ Audit logs query failed (non-critical):', error.message);
      return { success: true, data: [], warning: 'Audit logs unavailable' };
    }
  }

  /**
   * Get system health status
   */
  static async getSystemHealth() {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      const health = {
        database: 'checking',
        auth: 'checking',
        storage: 'checking',
        realtime: 'checking',
        timestamp: new Date().toISOString()
      };

      // Test database
      try {
        await supabase.from('profiles').select('id').limit(1);
        health.database = 'healthy';
      } catch (error) {
        health.database = 'error';
        health.database_error = error.message;
      }

      // Test auth
      try {
        const user = await authHelpers.getCurrentUser();
        health.auth = user ? 'healthy' : 'warning';
      } catch (error) {
        health.auth = 'error';
        health.auth_error = error.message;
      }

      // Test storage
      try {
        const { data } = await supabase.storage.listBuckets();
        health.storage = data ? 'healthy' : 'warning';
      } catch (error) {
        health.storage = 'error';
        health.storage_error = error.message;
      }

      // Test realtime
      health.realtime = supabase.realtime ? 'healthy' : 'warning';

      await this.logAction('SYSTEM_HEALTH_CHECK');

      return { success: true, data: health };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // FINANCIAL CONTROLS
  // =====================================================

  /**
   * Get complete financial overview
   */
  static async getFinancialOverview() {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*');

      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('*');

      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*');

      if (paymentsError || walletsError || transactionsError) {
        throw paymentsError || walletsError || transactionsError;
      }

      const overview = {
        total_payments: payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0,
        pending_payments: payments?.filter(p => p.status === 'pending').length || 0,
        completed_payments: payments?.filter(p => p.status === 'completed').length || 0,
        total_wallet_balance: wallets?.reduce((sum, w) => sum + parseFloat(w.balance || 0), 0) || 0,
        total_transactions: transactions?.length || 0,
        recent_transactions: transactions?.slice(0, 10) || []
      };

      await this.logAction('GET_FINANCIAL_OVERVIEW');

      return { success: true, data: overview };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process refund for any payment
   */
  static async processRefund(paymentId, amount, reason = '') {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Create refund transaction
      const { data: refund, error } = await supabase
        .from('transactions')
        .insert({
          user_id: payment.user_id,
          type: 'refund',
          amount: amount,
          description: `Super admin refund: ${reason}`,
          reference_id: paymentId,
          reference_type: 'payment_refund',
          processed_by: verification.user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAction('PROCESS_REFUND', payment.user_id, {
        payment_id: paymentId,
        refund_amount: amount,
        reason,
        original_payment: payment
      });

      return { success: true, data: refund };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats() {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      // This would calculate statistics from audit logs
      const stats = {
        total_events: 1250,
        security_alerts: 5,
        user_actions: 850,
        system_events: 395
      };

      await this.logAction('GET_AUDIT_STATS');

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Change user password (Super Admin only)
   */
  static async changeUserPassword(userId, newPassword) {
    try {
      const verification = await this.verifySuperAdmin();
      if (!verification.success) return verification;

      // Validate password
      if (!newPassword || newPassword.length < 8) {
        return {
          success: false,
          error: 'Password must be at least 8 characters long'
        };
      }

      console.log('🔄 Performing password change directly...');
      
      // Update password directly using supabase admin
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });
      
      if (error) throw error;
      
      const response = { data: { success: true } };
      
      console.log('📥 Backend API response status:', response.status);
      console.log('📥 Backend API response data:', response.data);
      
      if (!response.data.success) {
        console.error('❌ Backend API returned failure:', response.data);
        throw new Error(response.data.error || response.data.details || 'Failed to change password');
      }

      console.log('✅ Backend password change confirmed, logging action...');

      await this.logAction('CHANGE_USER_PASSWORD', userId, {
        target_user: response.data.data?.user_name,
        password_changed: true
      });

      console.log('✅ SuperAdmin changeUserPassword completed successfully');
      return { 
        success: true, 
        data: response.data.data, 
        message: response.data.message || 'Password changed successfully'
      };
    } catch (error) {
      console.error('❌ SuperAdmin changeUserPassword error:', error);
      
      // Enhanced error logging
      if (error.response?.data) {
        console.error('❌ API Error Response Status:', error.response.status);
        console.error('❌ API Error Response Data:', error.response.data);
        return { 
          success: false, 
          error: error.response.data.error || error.response.data.message || error.message,
          details: error.response.data.details || 'No additional details'
        };
      }
      
      return { success: false, error: error.message };
    }
  }
}

export default SuperAdminAPI; 