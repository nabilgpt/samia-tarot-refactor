import { supabase } from '../lib/supabase';

export class MonitorAPI {
  // ==================== AUTHENTICATION & SECURITY ====================
  
  /**
   * Verify monitor authentication and role
   */
  static async verifyMonitorAuth() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .eq('role', 'monitor')
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'Monitor profile not found' };
      }

      return { success: true, data: { user, profile } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== LIVE SESSIONS MONITORING ====================
  
  /**
   * Get all active sessions for monitoring
   */
  static async getActiveSessions() {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services (
            name,
            name_ar,
            type,
            duration
          ),
          client:profiles!bookings_client_id_fkey (
            first_name,
            last_name,
            avatar_url
          ),
          reader:profiles!bookings_reader_id_fkey (
            first_name,
            last_name,
            avatar_url
          ),
          session_data,
          flagged_reports (
            id,
            reason,
            severity,
            created_at
          )
        `)
        .in('status', ['in_progress', 'active'])
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Join session as monitor (read-only)
   */
  static async joinSessionAsMonitor(sessionId, monitorId) {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      // Log monitor joining session
      await this.logMonitorActivity('session_monitor_join', `Joined session ${sessionId} for monitoring`);

      // Update session with monitor presence
      const { data, error } = await supabase
        .from('bookings')
        .update({
          monitor_id: monitorId,
          monitor_joined_at: new Date().toISOString(),
          session_flags: { monitor_present: true }
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Flag session for violations
   */
  static async flagSession(sessionId, reason, severity = 'medium') {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('session_flags')
        .insert({
          session_id: sessionId,
          monitor_id: user.id,
          reason: reason,
          severity: severity,
          flagged_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await this.logMonitorActivity('session_flagged', `Flagged session ${sessionId}: ${reason}`);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== APPROVAL QUEUE ====================
  
  /**
   * Get pending approvals
   */
  static async getApprovalQueue() {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      // Get pending messages
      const { data: pendingMessages } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            first_name,
            last_name,
            avatar_url
          ),
          booking:bookings (
            id,
            services (name, name_ar)
          )
        `)
        .eq('requires_approval', true)
        .eq('approved', false)
        .order('created_at', { ascending: false });

      // Get pending profile changes
      const { data: pendingProfiles } = await supabase
        .from('profile_change_requests')
        .select(`
          *,
          user:profiles!profile_change_requests_user_id_fkey (
            first_name,
            last_name,
            email,
            role
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Get pending content reports
      const { data: pendingContent } = await supabase
        .from('content_moderation_queue')
        .select(`
          *,
          reported_by:profiles!content_moderation_queue_reported_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      return {
        success: true,
        data: {
          messages: pendingMessages || [],
          profiles: pendingProfiles || [],
          content: pendingContent || []
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve or reject pending item
   */
  static async processApproval(type, itemId, action, reason = '') {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;
      let tableName, statusField;

      switch (type) {
        case 'message':
          tableName = 'messages';
          statusField = 'approved';
          break;
        case 'profile':
          tableName = 'profile_change_requests';
          statusField = 'status';
          break;
        case 'content':
          tableName = 'content_moderation_queue';
          statusField = 'status';
          break;
        default:
          return { success: false, error: 'Invalid approval type' };
      }

      const updateData = {
        [statusField]: action === 'approve' ? (type === 'message' ? true : 'approved') : (type === 'message' ? false : 'rejected'),
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_reason: reason
      };

      const { data, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      await this.logMonitorActivity('approval_processed', `${action} ${type} ${itemId}: ${reason}`);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== REPORTS & VIOLATIONS ====================
  
  /**
   * Get violation reports
   */
  static async getViolationReports(filters = {}) {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      let query = supabase
        .from('violation_reports')
        .select(`
          *,
          reporter:profiles!violation_reports_reporter_id_fkey (
            first_name,
            last_name,
            avatar_url
          ),
          reported_user:profiles!violation_reports_reported_user_id_fkey (
            first_name,
            last_name,
            avatar_url,
            role
          ),
          assigned_monitor:profiles!violation_reports_assigned_monitor_fkey (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters.type) {
        query = query.eq('violation_type', filters.type);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update violation report
   */
  static async updateViolationReport(reportId, updates) {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('violation_reports')
        .update({
          ...updates,
          assigned_monitor: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;

      await this.logMonitorActivity('report_updated', `Updated violation report ${reportId}`);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add internal note to report
   */
  static async addInternalNote(reportId, note) {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('report_internal_notes')
        .insert({
          report_id: reportId,
          monitor_id: user.id,
          note: note,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await this.logMonitorActivity('note_added', `Added note to report ${reportId}`);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== ACTIVITY LOGS ====================
  
  /**
   * Get monitor activity logs
   */
  static async getActivityLogs(filters = {}) {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      let query = supabase
        .from('monitor_activity_logs')
        .select(`
          *,
          monitor:profiles!monitor_activity_logs_monitor_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('monitor_id', user.id)
        .order('created_at', { ascending: false });

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.from_date) {
        query = query.gte('created_at', filters.from_date);
      }

      if (filters.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== NOTIFICATIONS ====================
  
  /**
   * Get monitor notifications
   */
  static async getNotifications() {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['monitor_alert', 'session_flagged', 'urgent_review', 'system_alert'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationRead(notificationId) {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== SUPPORT TOOLS ====================
  
  /**
   * Create escalation report to admin
   */
  static async createEscalation(subject, description, priority = 'medium', relatedItems = []) {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      const { user } = authResult.data;

      const { data, error } = await supabase
        .from('monitor_escalations')
        .insert({
          monitor_id: user.id,
          subject: subject,
          description: description,
          priority: priority,
          related_items: relatedItems,
          status: 'open',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await this.logMonitorActivity('escalation_created', `Created escalation: ${subject}`);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get monitor dashboard statistics
   */
  static async getDashboardStats() {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return authResult;

      // Get active sessions
      const { data: activeSessions } = await supabase
        .from('bookings')
        .select('id')
        .in('status', ['in_progress', 'active']);

      // Get pending approvals
      const { data: pendingApprovals } = await supabase
        .from('messages')
        .select('id')
        .eq('requires_approval', true)
        .eq('approved', false);

      // Get unresolved violations
      const { data: unresolvedViolations } = await supabase
        .from('violation_reports')
        .select('id')
        .in('status', ['open', 'investigating']);

      // Get unread notifications
      const { data: unreadNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('read', false)
        .in('type', ['monitor_alert', 'session_flagged', 'urgent_review', 'system_alert']);

      // Get flagged sessions
      const { data: flaggedSessions } = await supabase
        .from('session_flags')
        .select('session_id')
        .eq('resolved', false);

      return {
        success: true,
        data: {
          active_sessions: activeSessions?.length || 0,
          pending_approvals: pendingApprovals?.length || 0,
          unresolved_violations: unresolvedViolations?.length || 0,
          unread_notifications: unreadNotifications?.length || 0,
          flagged_sessions: flaggedSessions?.length || 0
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Log monitor activity for audit trail
   */
  static async logMonitorActivity(action, description) {
    try {
      const authResult = await this.verifyMonitorAuth();
      if (!authResult.success) return;

      const { user } = authResult.data;

      await supabase
        .from('monitor_activity_logs')
        .insert({
          monitor_id: user.id,
          action: action,
          description: description,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging monitor activity:', error);
    }
  }

  /**
   * Get client IP address
   */
  static async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }
}

export default MonitorAPI; 