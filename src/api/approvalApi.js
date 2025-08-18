// ===================================
// SAMIA TAROT - APPROVAL API
// ===================================

import { supabase } from './lib/supabase.js';

export const ApprovalAPI = {
  // Submit a new approval request (for readers)
  async submitRequest(requestData) {
    try {
      const { 
        action_type, 
        target, 
        target_id = null, 
        old_value = null, 
        new_value, 
        metadata = {} 
      } = requestData;

      // Add client metadata
      const enrichedMetadata = {
        ...metadata,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href
      };

      const { data, error } = await supabase.rpc('submit_approval_request', {
        p_action_type: action_type,
        p_target: target,
        p_target_id: target_id,
        p_old_value: old_value,
        p_new_value: new_value,
        p_metadata: enrichedMetadata
      });

      if (error) throw error;

      return {
        success: true,
        data: data, // Returns the request ID
        message: 'Request submitted successfully'
      };
    } catch (error) {
      console.error('Error submitting approval request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get approval requests for readers (their own)
  async getMyRequests(filters = {}) {
    try {
      let query = supabase
        .from('my_approval_requests')
        .select('*');

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.target) {
        query = query.eq('target', filters.target);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching my requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get pending approval requests for admins
  async getPendingRequests(filters = {}) {
    try {
      let query = supabase
        .from('pending_approval_requests')
        .select('*');

      // Apply filters
      if (filters.target) {
        query = query.eq('target', filters.target);
      }

      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get all approval requests for admins (with pagination)
  async getAllRequests(page = 1, limit = 20, filters = {}) {
    try {
      let query = supabase
        .from('approval_requests')
        .select(`
          *,
          requester:profiles!approval_requests_user_id_fkey(
            first_name,
            last_name,
            email,
            avatar_url
          ),
          reviewer:profiles!approval_requests_admin_id_fkey(
            first_name,
            last_name,
            email
          )
        `);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.target) {
        query = query.eq('target', filters.target);
      }

      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      // Count total for pagination
      const { count } = await supabase
        .from('approval_requests')
        .select('*', { count: 'exact', head: true });

      // Get paginated data
      const offset = (page - 1) * limit;
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching all requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Approve or reject a request (for admins)
  async reviewRequest(requestId, action, reason = null) {
    try {
      const { data, error } = await supabase.rpc('review_approval_request', {
        p_request_id: requestId,
        p_action: action,
        p_reason: reason
      });

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: `Request ${action} successfully`
      };
    } catch (error) {
      console.error('Error reviewing request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Cancel a pending request (for readers)
  async cancelRequest(requestId) {
    try {
      const { data, error } = await supabase.rpc('cancel_approval_request', {
        p_request_id: requestId
      });

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Request cancelled successfully'
      };
    } catch (error) {
      console.error('Error cancelling request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get request details with audit log
  async getRequestDetails(requestId) {
    try {
      // Get request details
      const { data: request, error: requestError } = await supabase
        .from('approval_requests')
        .select(`
          *,
          requester:profiles!approval_requests_user_id_fkey(
            first_name,
            last_name,
            email,
            avatar_url
          ),
          reviewer:profiles!approval_requests_admin_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Get audit log
      const { data: auditLog, error: auditError } = await supabase
        .from('approval_audit_log')
        .select(`
          *,
          performer:profiles!approval_audit_log_performed_by_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('approval_request_id', requestId)
        .order('performed_at', { ascending: true });

      if (auditError) throw auditError;

      return {
        success: true,
        data: {
          request,
          auditLog: auditLog || []
        }
      };
    } catch (error) {
      console.error('Error fetching request details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get approval statistics for dashboards
  async getApprovalStats() {
    try {
      const [
        { count: pendingCount },
        { count: approvedCount },
        { count: rejectedCount },
        { count: totalCount }
      ] = await Promise.all([
        supabase.from('approval_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('approval_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('approval_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('approval_requests').select('*', { count: 'exact', head: true })
      ]);

      // Get requests by target type
      const { data: targetStats, error: targetError } = await supabase
        .from('approval_requests')
        .select('target, status')
        .eq('status', 'pending');

      if (targetError) throw targetError;

      const targetCounts = targetStats.reduce((acc, item) => {
        acc[item.target] = (acc[item.target] || 0) + 1;
        return acc;
      }, {});

      return {
        success: true,
        data: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          total: totalCount,
          targetCounts
        }
      };
    } catch (error) {
      console.error('Error fetching approval stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Subscribe to real-time approval request changes
  subscribeToApprovalChanges(callback, userId = null) {
    let channel;

    if (userId) {
      // Subscribe to user's own requests only
      channel = supabase
        .channel('approval_requests_user')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'approval_requests',
            filter: `user_id=eq.${userId}`
          },
          callback
        );
    } else {
      // Subscribe to all requests (for admins)
      channel = supabase
        .channel('approval_requests_all')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'approval_requests'
          },
          callback
        );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Helper functions for common approval request patterns
  
  // Profile change request
  async submitProfileChangeRequest(oldData, newData) {
    return this.submitRequest({
      action_type: 'edit',
      target: 'profile',
      old_value: oldData,
      new_value: newData
    });
  },

  // Service change request
  async submitServiceChangeRequest(actionType, serviceId, oldData, newData) {
    return this.submitRequest({
      action_type: actionType,
      target: 'service',
      target_id: serviceId,
      old_value: oldData,
      new_value: newData
    });
  },

  // Schedule change request
  async submitScheduleChangeRequest(actionType, scheduleId, oldData, newData) {
    return this.submitRequest({
      action_type: actionType,
      target: 'schedule',
      target_id: scheduleId,
      old_value: oldData,
      new_value: newData
    });
  },

  // Batch approve multiple requests
  async batchReviewRequests(requestIds, action, reason = null) {
    try {
      const results = await Promise.all(
        requestIds.map(id => this.reviewRequest(id, action, reason))
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        success: failed === 0,
        data: {
          successful,
          failed,
          results
        },
        message: `${successful} requests ${action}, ${failed} failed`
      };
    } catch (error) {
      console.error('Error in batch review:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}; 