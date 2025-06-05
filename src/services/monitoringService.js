import { supabase } from '../lib/supabase';

export class MonitoringService {
  static activeWatchingSessions = new Map();
  static monitorSubscriptions = new Map();

  /**
   * Start watching a live call
   * @param {Object} watchData - Watch session data
   * @param {string} watchData.monitorId - Monitor user ID
   * @param {string} watchData.bookingId - Booking ID being watched
   * @param {string} watchData.recordingId - Recording ID
   * @returns {Promise<Object>} Result
   */
  static async startWatchingCall(watchData) {
    try {
      const { monitorId, bookingId, recordingId } = watchData;

      // Verify monitor permissions
      const { data: monitor, error: monitorError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', monitorId)
        .single();

      if (monitorError || !['monitor', 'admin'].includes(monitor.role)) {
        throw new Error('Insufficient permissions to watch calls');
      }

      // Get call details
      const { data: recording, error: recordingError } = await supabase
        .from('call_recordings')
        .select(`
          *,
          booking:bookings(
            client_id,
            reader_id,
            service_type,
            status
          )
        `)
        .eq('id', recordingId)
        .single();

      if (recordingError) throw recordingError;

      // Create watching session
      const watchingSession = {
        monitorId,
        bookingId,
        recordingId,
        startTime: new Date(),
        isActive: true,
        notes: []
      };

      this.activeWatchingSessions.set(`${monitorId}-${recordingId}`, watchingSession);

      // Log monitor activity
      await supabase
        .from('monitor_activity_logs')
        .insert([{
          monitor_id: monitorId,
          activity_type: 'call_watched',
          target_booking_id: bookingId,
          call_recording_id: recordingId,
          action_details: {
            action: 'started_watching',
            call_type: recording.call_type,
            client_id: recording.booking.client_id,
            reader_id: recording.booking.reader_id
          }
        }]);

      console.log('Monitor started watching call:', recordingId);

      return {
        success: true,
        data: {
          sessionId: `${monitorId}-${recordingId}`,
          recording,
          watchingSession
        },
        message: 'Started watching call successfully'
      };
    } catch (error) {
      console.error('Error starting call watch:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to start watching call'
      };
    }
  }

  /**
   * Stop watching a call
   * @param {string} monitorId - Monitor user ID
   * @param {string} recordingId - Recording ID
   * @param {string} notes - Optional notes about the session
   * @returns {Promise<Object>} Result
   */
  static async stopWatchingCall(monitorId, recordingId, notes = '') {
    try {
      const sessionId = `${monitorId}-${recordingId}`;
      const session = this.activeWatchingSessions.get(sessionId);

      if (!session) {
        return {
          success: false,
          message: 'No active watching session found'
        };
      }

      // Calculate watch duration
      const duration = Math.floor((new Date() - session.startTime) / 1000);

      // Update session
      session.isActive = false;
      session.endTime = new Date();
      session.duration = duration;
      if (notes) session.notes.push(notes);

      // Log monitor activity
      await supabase
        .from('monitor_activity_logs')
        .insert([{
          monitor_id: monitorId,
          activity_type: 'call_watched',
          call_recording_id: recordingId,
          action_details: {
            action: 'stopped_watching',
            duration_seconds: duration
          },
          notes: notes
        }]);

      // Remove from active sessions
      this.activeWatchingSessions.delete(sessionId);

      return {
        success: true,
        data: { duration, notes },
        message: 'Stopped watching call successfully'
      };
    } catch (error) {
      console.error('Error stopping call watch:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to stop watching call'
      };
    }
  }

  /**
   * Manually stop a call (emergency intervention)
   * @param {string} monitorId - Monitor user ID
   * @param {string} bookingId - Booking ID to stop
   * @param {string} reason - Reason for stopping the call
   * @returns {Promise<Object>} Result
   */
  static async stopCall(monitorId, bookingId, reason) {
    try {
      // Verify monitor permissions
      const { data: monitor, error: monitorError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', monitorId)
        .single();

      if (monitorError || !['monitor', 'admin'].includes(monitor.role)) {
        throw new Error('Insufficient permissions to stop calls');
      }

      // Update booking status
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: `Monitor intervention: ${reason}`,
          cancelled_at: new Date().toISOString(),
          cancelled_by: monitorId
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Log monitor activity
      await supabase
        .from('monitor_activity_logs')
        .insert([{
          monitor_id: monitorId,
          activity_type: 'call_stopped',
          target_booking_id: bookingId,
          action_details: {
            action: 'emergency_stop',
            reason: reason
          },
          notes: `Call stopped by monitor: ${reason}`
        }]);

      // End any active recordings
      await supabase
        .from('call_recordings')
        .update({
          call_end_time: new Date().toISOString(),
          monitor_flagged: true,
          monitor_notes: `Call stopped by monitor: ${reason}`,
          flagged_by: monitorId,
          flagged_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId)
        .is('call_end_time', null);

      console.log('Monitor stopped call:', bookingId);

      return {
        success: true,
        data: booking,
        message: 'Call stopped successfully'
      };
    } catch (error) {
      console.error('Error stopping call:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to stop call'
      };
    }
  }

  /**
   * Ban a user
   * @param {string} monitorId - Monitor user ID
   * @param {string} targetUserId - User ID to ban
   * @param {string} reason - Reason for ban
   * @param {number} durationDays - Ban duration in days (0 = permanent)
   * @returns {Promise<Object>} Result
   */
  static async banUser(monitorId, targetUserId, reason, durationDays = 0) {
    try {
      // Verify monitor permissions
      const { data: monitor, error: monitorError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', monitorId)
        .single();

      if (monitorError || !['monitor', 'admin'].includes(monitor.role)) {
        throw new Error('Insufficient permissions to ban users');
      }

      // Calculate ban expiry
      const banExpiry = durationDays > 0 
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Update user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update({
          is_banned: true,
          ban_reason: reason,
          banned_by: monitorId,
          banned_at: new Date().toISOString(),
          ban_expires_at: banExpiry
        })
        .eq('id', targetUserId)
        .select()
        .single();

      if (profileError) throw profileError;

      // Cancel all active bookings for the banned user
      await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: `User banned: ${reason}`,
          cancelled_at: new Date().toISOString(),
          cancelled_by: monitorId
        })
        .eq('client_id', targetUserId)
        .in('status', ['pending', 'confirmed', 'in_progress']);

      // Log monitor activity
      await supabase
        .from('monitor_activity_logs')
        .insert([{
          monitor_id: monitorId,
          activity_type: 'user_banned',
          target_user_id: targetUserId,
          action_details: {
            action: 'ban_user',
            reason: reason,
            duration_days: durationDays,
            ban_expiry: banExpiry
          },
          notes: `User banned: ${reason}`
        }]);

      console.log('Monitor banned user:', targetUserId);

      return {
        success: true,
        data: profile,
        message: 'User banned successfully'
      };
    } catch (error) {
      console.error('Error banning user:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to ban user'
      };
    }
  }

  /**
   * Flag content for review
   * @param {string} monitorId - Monitor user ID
   * @param {Object} flagData - Flag data
   * @returns {Promise<Object>} Result
   */
  static async flagContent(monitorId, flagData) {
    try {
      const { type, targetId, reason, severity, notes } = flagData;

      // Verify monitor permissions
      const { data: monitor, error: monitorError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', monitorId)
        .single();

      if (monitorError || !['monitor', 'admin'].includes(monitor.role)) {
        throw new Error('Insufficient permissions to flag content');
      }

      let updateResult;

      // Flag based on content type
      if (type === 'call_recording') {
        updateResult = await supabase
          .from('call_recordings')
          .update({
            monitor_flagged: true,
            monitor_notes: notes,
            flagged_by: monitorId,
            flagged_at: new Date().toISOString()
          })
          .eq('id', targetId)
          .select()
          .single();
      } else if (type === 'chat_message') {
        updateResult = await supabase
          .from('chat_monitoring')
          .update({
            monitor_reviewed: true,
            monitor_flagged: true,
            monitor_notes: notes,
            reviewed_by: monitorId,
            reviewed_at: new Date().toISOString()
          })
          .eq('message_id', targetId)
          .select()
          .single();
      }

      if (updateResult?.error) throw updateResult.error;

      // Log monitor activity
      await supabase
        .from('monitor_activity_logs')
        .insert([{
          monitor_id: monitorId,
          activity_type: 'content_flagged',
          [type === 'call_recording' ? 'call_recording_id' : 'chat_monitoring_id']: targetId,
          action_details: {
            action: 'flag_content',
            content_type: type,
            reason: reason,
            severity: severity
          },
          notes: notes
        }]);

      return {
        success: true,
        data: updateResult?.data,
        message: 'Content flagged successfully'
      };
    } catch (error) {
      console.error('Error flagging content:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to flag content'
      };
    }
  }

  /**
   * Review AI alert
   * @param {string} monitorId - Monitor user ID
   * @param {string} alertId - AI alert ID
   * @param {Object} reviewData - Review data
   * @returns {Promise<Object>} Result
   */
  static async reviewAIAlert(monitorId, alertId, reviewData) {
    try {
      const { action, notes, resolved } = reviewData;

      // Update AI alert
      const { data: alert, error: alertError } = await supabase
        .from('ai_monitoring_alerts')
        .update({
          human_reviewed: true,
          human_action_taken: action,
          reviewed_by: monitorId,
          reviewed_at: new Date().toISOString(),
          resolved: resolved || false,
          resolved_by: resolved ? monitorId : null,
          resolved_at: resolved ? new Date().toISOString() : null
        })
        .eq('id', alertId)
        .select()
        .single();

      if (alertError) throw alertError;

      // Log monitor activity
      await supabase
        .from('monitor_activity_logs')
        .insert([{
          monitor_id: monitorId,
          activity_type: 'alert_reviewed',
          ai_alert_id: alertId,
          action_details: {
            action: 'review_ai_alert',
            human_action: action,
            resolved: resolved
          },
          notes: notes
        }]);

      return {
        success: true,
        data: alert,
        message: 'AI alert reviewed successfully'
      };
    } catch (error) {
      console.error('Error reviewing AI alert:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to review AI alert'
      };
    }
  }

  /**
   * Get active calls for monitoring
   * @param {string} monitorId - Monitor user ID
   * @returns {Promise<Object>} Active calls list
   */
  static async getActiveCalls(monitorId) {
    try {
      // Verify monitor permissions
      const { data: monitor, error: monitorError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', monitorId)
        .single();

      if (monitorError || !['monitor', 'admin'].includes(monitor.role)) {
        throw new Error('Insufficient permissions to view active calls');
      }

      // Get active call recordings
      const { data: recordings, error: recordingsError } = await supabase
        .from('call_recordings')
        .select(`
          *,
          client:profiles!call_recordings_client_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          reader:profiles!call_recordings_reader_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          booking:bookings(
            service_type,
            status,
            scheduled_at
          )
        `)
        .is('call_end_time', null)
        .order('call_start_time', { ascending: false });

      if (recordingsError) throw recordingsError;

      return {
        success: true,
        data: recordings || [],
        message: 'Active calls retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching active calls:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch active calls'
      };
    }
  }

  /**
   * Get monitor activity logs
   * @param {string} monitorId - Monitor user ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Activity logs
   */
  static async getMonitorActivity(monitorId, filters = {}) {
    try {
      let query = supabase
        .from('monitor_activity_logs')
        .select(`
          *,
          target_user:profiles!monitor_activity_logs_target_user_id_fkey(
            first_name,
            last_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by monitor if not admin
      const { data: monitor, error: monitorError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', monitorId)
        .single();

      if (monitorError) throw monitorError;

      if (monitor.role !== 'admin') {
        query = query.eq('monitor_id', monitorId);
      }

      // Apply additional filters
      if (filters.activityType) {
        query = query.eq('activity_type', filters.activityType);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Monitor activity retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching monitor activity:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch monitor activity'
      };
    }
  }

  /**
   * Get monitoring statistics
   * @param {string} monitorId - Monitor user ID
   * @returns {Promise<Object>} Statistics
   */
  static async getMonitoringStats(monitorId) {
    try {
      // Verify monitor permissions
      const { data: monitor, error: monitorError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', monitorId)
        .single();

      if (monitorError || !['monitor', 'admin'].includes(monitor.role)) {
        throw new Error('Insufficient permissions to view monitoring stats');
      }

      // Get activity stats
      let activityQuery = supabase
        .from('monitor_activity_logs')
        .select('activity_type, created_at');

      if (monitor.role !== 'admin') {
        activityQuery = activityQuery.eq('monitor_id', monitorId);
      }

      const { data: activities, error: activitiesError } = await activityQuery;

      if (activitiesError) throw activitiesError;

      // Calculate stats
      const stats = {
        totalActivities: activities.length,
        activitiesByType: {
          call_watched: activities.filter(a => a.activity_type === 'call_watched').length,
          call_stopped: activities.filter(a => a.activity_type === 'call_stopped').length,
          user_banned: activities.filter(a => a.activity_type === 'user_banned').length,
          content_flagged: activities.filter(a => a.activity_type === 'content_flagged').length,
          alert_reviewed: activities.filter(a => a.activity_type === 'alert_reviewed').length
        },
        activeWatchingSessions: this.activeWatchingSessions.size,
        todayActivities: activities.filter(a => {
          const today = new Date().toDateString();
          return new Date(a.created_at).toDateString() === today;
        }).length
      };

      return {
        success: true,
        data: stats,
        message: 'Monitoring statistics retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching monitoring stats:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch monitoring statistics'
      };
    }
  }

  /**
   * Subscribe to real-time monitoring updates
   * @param {string} monitorId - Monitor user ID
   * @param {Function} callback - Callback function
   * @returns {Object} Subscription result
   */
  static subscribeToMonitoringUpdates(monitorId, callback) {
    try {
      const subscription = supabase
        .channel(`monitoring_${monitorId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ai_monitoring_alerts'
          },
          (payload) => {
            console.log('Monitoring update:', payload);
            if (callback && typeof callback === 'function') {
              callback(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'call_recordings'
          },
          (payload) => {
            console.log('New call recording:', payload);
            if (callback && typeof callback === 'function') {
              callback(payload);
            }
          }
        )
        .subscribe();

      this.monitorSubscriptions.set(monitorId, subscription);

      return {
        success: true,
        subscription: subscription,
        message: 'Subscribed to monitoring updates'
      };
    } catch (error) {
      console.error('Error subscribing to monitoring updates:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to subscribe to monitoring updates'
      };
    }
  }

  /**
   * Unsubscribe from monitoring updates
   * @param {string} monitorId - Monitor user ID
   */
  static unsubscribeFromMonitoringUpdates(monitorId) {
    try {
      const subscription = this.monitorSubscriptions.get(monitorId);
      if (subscription) {
        subscription.unsubscribe();
        this.monitorSubscriptions.delete(monitorId);
        console.log('Unsubscribed from monitoring updates:', monitorId);
      }
    } catch (error) {
      console.error('Error unsubscribing from monitoring updates:', error);
    }
  }
}

export default MonitoringService; 