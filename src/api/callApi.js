import { supabase } from '../lib/supabase.js';
import RecordingService from '../services/recordingService';
import AIWatchdogService from '../services/aiWatchdogService';

// Safe wrapper for database operations that might fail due to missing tables
const safeDbOperation = async (operation, fallbackData = null) => {
  try {
    return await operation();
  } catch (error) {
    if (error.message?.includes('does not exist') || 
        error.message?.includes('relation') || 
        error.code === 'PGRST116' ||
        error.status === 404) {
      
      console.warn('CallAPI: Required table not found. Using fallback data.', error.message);
      return { 
        success: false, 
        error: 'Feature not available - missing database tables',
        data: fallbackData,
        requiresSetup: true
      };
    }
    throw error;
  }
};

export const CallAPI = {
  // =============================================
  // CALL SESSION MANAGEMENT
  // =============================================

  // Create a new call session
  async createCallSession(sessionData) {
    return await safeDbOperation(async () => {
      const roomId = `room_${sessionData.bookingId || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('call_sessions')
        .insert({
          ...sessionData,
          room_id: roomId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Add participants
      await this.addCallParticipant(data.id, sessionData.user_id, 'client');
      await this.addCallParticipant(data.id, sessionData.reader_id, 'reader');

      return { success: true, data };
    }, null);
  },

  // Create emergency call
  async createEmergencyCall(userId, callType = 'voice') {
    try {
      const { data, error } = await supabase.rpc('create_emergency_call', {
        p_user_id: userId,
        p_call_type: callType
      });

      if (error) throw error;

      // Get the created call session
      const { data: callSession } = await supabase
        .from('call_sessions')
        .select(`
          *,
          reader:reader_id(first_name, last_name, avatar_url),
          user:user_id(first_name, last_name, avatar_url)
        `)
        .eq('id', data)
        .single();

      return { success: true, data: callSession };
    } catch (error) {
      console.error('Error creating emergency call:', error);
      return { success: false, error: error.message };
    }
  },

  // Start call session
  async startCallSession(callSessionId) {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .update({
          status: 'active',
          start_time: new Date().toISOString()
        })
        .eq('id', callSessionId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error starting call session:', error);
      return { success: false, error: error.message };
    }
  },

  // End call session
  async endCallSession(callSessionId) {
    try {
      const { data, error } = await supabase.rpc('end_call_session', {
        p_call_session_id: callSessionId
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error ending call session:', error);
      return { success: false, error: error.message };
    }
  },

  // Get call session details
  async getCallSession(callSessionId) {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .select(`
          *,
          reader:reader_id(first_name, last_name, avatar_url, role),
          user:user_id(first_name, last_name, avatar_url, role),
          booking:booking_id(service_id, scheduled_at),
          participants:call_participants(*)
        `)
        .eq('id', callSessionId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching call session:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user's call sessions
  async getUserCallSessions(userId, filters = {}) {
    try {
      let query = supabase
        .from('call_sessions')
        .select(`
          *,
          reader:reader_id(first_name, last_name, avatar_url),
          user:user_id(first_name, last_name, avatar_url),
          booking:booking_id(service_id, scheduled_at)
        `)
        .or(`user_id.eq.${userId},reader_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.isEmergency !== undefined) {
        query = query.eq('is_emergency', filters.isEmergency);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user call sessions:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // CALL PARTICIPANTS MANAGEMENT
  // =============================================

  // Add participant to call
  async addCallParticipant(callSessionId, userId, role, isSilent = false) {
    try {
      const { data, error } = await supabase
        .from('call_participants')
        .insert({
          call_session_id: callSessionId,
          user_id: userId,
          role,
          is_silent: isSilent,
          join_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error adding call participant:', error);
      return { success: false, error: error.message };
    }
  },

  // Update participant status
  async updateParticipantStatus(participantId, updates) {
    try {
      const { data, error } = await supabase
        .from('call_participants')
        .update(updates)
        .eq('id', participantId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating participant status:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove participant from call
  async removeCallParticipant(callSessionId, userId) {
    try {
      const { data, error } = await supabase
        .from('call_participants')
        .update({ leave_time: new Date().toISOString() })
        .eq('call_session_id', callSessionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error removing call participant:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // READER AVAILABILITY MANAGEMENT
  // =============================================

  // Get reader availability
  async getReaderAvailability(readerId) {
    try {
      const { data, error } = await supabase
        .from('reader_availability')
        .select('*')
        .eq('reader_id', readerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching reader availability:', error);
      return { success: false, error: error.message };
    }
  },

  // Update reader availability
  async updateReaderAvailability(readerId, updates) {
    try {
      const { data, error } = await supabase
        .from('reader_availability')
        .upsert({
          reader_id: readerId,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating reader availability:', error);
      return { success: false, error: error.message };
    }
  },

  // Get available emergency readers
  async getAvailableEmergencyReaders() {
    try {
      const { data, error } = await supabase.rpc('get_available_emergency_readers');
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching available emergency readers:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // CALL RECORDINGS MANAGEMENT
  // =============================================

  // Create call recording
  async createCallRecording(recordingData) {
    try {
      const { data, error } = await supabase
        .from('call_recordings')
        .insert(recordingData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating call recording:', error);
      return { success: false, error: error.message };
    }
  },

  // Upload recording file
  async uploadRecording(file, callSessionId, recordingType = 'audio') {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${callSessionId}_${Date.now()}.${fileExt}`;
      const filePath = `call-recordings/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('call-recordings')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('call-recordings')
        .getPublicUrl(filePath);

      // Create recording record
      const recordingData = {
        call_session_id: callSessionId,
        recording_url: urlData.publicUrl,
        recording_type: recordingType,
        file_size: file.size,
        storage_path: filePath
      };

      const result = await this.createCallRecording(recordingData);
      return result;
    } catch (error) {
      console.error('Error uploading recording:', error);
      return { success: false, error: error.message };
    }
  },

  // Get call recordings
  async getCallRecordings(callSessionId) {
    try {
      const { data, error } = await supabase
        .from('call_recordings')
        .select('*')
        .eq('call_session_id', callSessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching call recordings:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // EMERGENCY MANAGEMENT
  // =============================================

  // Get emergency logs
  async getEmergencyLogs(filters = {}) {
    try {
      let query = supabase
        .from('emergency_call_logs')
        .select(`
          *,
          user:user_id(first_name, last_name, avatar_url),
          reader:reader_id(first_name, last_name, avatar_url),
          escalated_user:escalated_to(first_name, last_name, avatar_url),
          call_session:call_session_id(*)
        `)
        .order('timestamp', { ascending: false });

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.readerId) {
        query = query.eq('reader_id', filters.readerId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching emergency logs:', error);
      return { success: false, error: error.message };
    }
  },

  // Update emergency log
  async updateEmergencyLog(logId, updates) {
    try {
      const { data, error } = await supabase
        .from('emergency_call_logs')
        .update(updates)
        .eq('id', logId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating emergency log:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // CALL ESCALATIONS
  // =============================================

  // Create call escalation
  async createCallEscalation(escalationData) {
    try {
      const { data, error } = await supabase
        .from('call_escalations')
        .insert(escalationData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating call escalation:', error);
      return { success: false, error: error.message };
    }
  },

  // Get call escalations
  async getCallEscalations(filters = {}) {
    try {
      let query = supabase
        .from('call_escalations')
        .select(`
          *,
          call_session:call_session_id(*),
          escalated_from_user:escalated_from(first_name, last_name, avatar_url),
          escalated_to_user:escalated_to(first_name, last_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (filters.callSessionId) {
        query = query.eq('call_session_id', filters.callSessionId);
      }
      if (filters.escalatedTo) {
        query = query.eq('escalated_to', filters.escalatedTo);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching call escalations:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // CALL NOTIFICATIONS
  // =============================================

  // Create call notification
  async createCallNotification(notificationData) {
    try {
      const { data, error } = await supabase
        .from('call_notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating call notification:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user notifications
  async getUserNotifications(userId, filters = {}) {
    try {
      let query = supabase
        .from('call_notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (filters.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }
      if (filters.isEmergency !== undefined) {
        query = query.eq('is_emergency', filters.isEmergency);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return { success: false, error: error.message };
    }
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    try {
      const { data, error } = await supabase
        .from('call_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // CALL QUALITY METRICS
  // =============================================

  // Submit call quality metrics
  async submitCallQualityMetrics(metricsData) {
    try {
      const { data, error } = await supabase
        .from('call_quality_metrics')
        .insert(metricsData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error submitting call quality metrics:', error);
      return { success: false, error: error.message };
    }
  },

  // Get call quality metrics
  async getCallQualityMetrics(callSessionId) {
    try {
      const { data, error } = await supabase
        .from('call_quality_metrics')
        .select('*')
        .eq('call_session_id', callSessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching call quality metrics:', error);
      return { success: false, error: error.message };
    }
  },

  // =============================================
  // REAL-TIME SUBSCRIPTIONS
  // =============================================

  // Subscribe to call session updates
  subscribeToCallSession(callSessionId, callback) {
    return supabase
      .channel(`call_session_${callSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_sessions',
          filter: `id=eq.${callSessionId}`
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to call notifications
  subscribeToCallNotifications(userId, callback) {
    return supabase
      .channel(`call_notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_notifications',
          filter: `recipient_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to emergency calls
  subscribeToEmergencyCalls(readerId, callback) {
    return supabase
      .channel(`emergency_calls_${readerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `reader_id=eq.${readerId}`
        },
        (payload) => {
          if (payload.new.is_emergency) {
            callback(payload);
          }
        }
      )
      .subscribe();
  },

  // Subscribe to call participants
  subscribeToCallParticipants(callSessionId, callback) {
    return supabase
      .channel(`call_participants_${callSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_participants',
          filter: `call_session_id=eq.${callSessionId}`
        },
        callback
      )
      .subscribe();
  },

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  // Check if user can join call
  async canUserJoinCall(callSessionId, userId) {
    try {
      const { data: callSession } = await this.getCallSession(callSessionId);
      if (!callSession.success) return false;

      const session = callSession.data;
      
      // Check if user is participant
      const isParticipant = session.user_id === userId || session.reader_id === userId;
      
      // Check if user is admin/monitor
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      const isAdminOrMonitor = profile?.role === 'admin' || profile?.role === 'monitor';

      return isParticipant || isAdminOrMonitor;
    } catch (error) {
      console.error('Error checking user call permissions:', error);
      return false;
    }
  },

  // Generate WebRTC configuration
  getWebRTCConfig() {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers for production
        // {
        //   urls: 'turn:your-turn-server.com:3478',
        //   username: 'username',
        //   credential: 'password'
        // }
      ]
    };
  },

  // =============================================
  // NEW FUNCTIONS
  // =============================================

  // Create a new call booking
  async createCall(clientId, readerId, serviceType, callType = 'voice') {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([{
          client_id: clientId,
          reader_id: readerId,
          service_type: serviceType,
          call_type: callType,
          status: 'confirmed',
          scheduled_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Call created successfully'
      };
    } catch (error) {
      console.error('Error creating call:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create call'
      };
    }
  },

  // Start a call with automatic recording and AI monitoring
  async startCall(bookingId, callType = 'voice') {
    try {
      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Update booking status
      await supabase
        .from('bookings')
        .update({ 
          status: 'in_progress',
          call_started_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      // Get user media
      const constraints = {
        audio: true,
        video: callType === 'video'
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;

      // Start automatic recording
      const recordingResult = await RecordingService.startAutoRecording({
        bookingId: bookingId,
        clientId: booking.client_id,
        readerId: booking.reader_id,
        callType: callType
      }, stream);

      if (recordingResult.success) {
        this.recordingId = recordingResult.recordingId;
        console.log('Automatic recording started:', this.recordingId);
      }

      // Initialize AI monitoring
      await AIWatchdogService.initialize();

      this.activeCall = {
        bookingId,
        callType,
        startTime: new Date(),
        stream
      };

      return {
        success: true,
        data: {
          booking,
          stream,
          recordingId: this.recordingId
        },
        message: 'Call started successfully with automatic recording'
      };
    } catch (error) {
      console.error('Error starting call:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to start call'
      };
    }
  },

  // End the current call
  async endCall(bookingId, clientRequested = false) {
    try {
      // Update booking status
      await supabase
        .from('bookings')
        .update({ 
          status: 'completed',
          call_ended_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      // Stop recording
      if (this.recordingId) {
        await RecordingService.stopRecording(clientRequested);
        
        // Stop AI monitoring
        AIWatchdogService.stopCallMonitoring(this.recordingId);
      }

      // Stop media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Clear active call
      this.activeCall = null;
      this.recordingId = null;

      return {
        success: true,
        message: 'Call ended successfully'
      };
    } catch (error) {
      console.error('Error ending call:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to end call'
      };
    }
  },

  // Toggle recording during call (client control)
  async toggleRecording(shouldRecord) {
    try {
      if (!this.activeCall) {
        throw new Error('No active call to toggle recording');
      }

      if (shouldRecord && !this.recordingId) {
        // Start recording
        const recordingResult = await RecordingService.startAutoRecording({
          bookingId: this.activeCall.bookingId,
          clientId: this.activeCall.clientId,
          readerId: this.activeCall.readerId,
          callType: this.activeCall.callType
        }, this.activeCall.stream);

        if (recordingResult.success) {
          this.recordingId = recordingResult.recordingId;
          
          // Update database to mark client requested recording
          await supabase
            .from('call_recordings')
            .update({ client_requested_recording: true })
            .eq('id', this.recordingId);
        }

        return {
          success: true,
          message: 'Recording started'
        };
      } else if (!shouldRecord && this.recordingId) {
        // Stop recording
        await RecordingService.stopRecording(true); // Client requested stop
        this.recordingId = null;

        return {
          success: true,
          message: 'Recording stopped'
        };
      }

      return {
        success: true,
        message: 'Recording state unchanged'
      };
    } catch (error) {
      console.error('Error toggling recording:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to toggle recording'
      };
    }
  },

  // Get call history for a user
  async getCallHistory(userId, role) {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          reader:profiles!bookings_reader_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          recording:call_recordings(
            id,
            recording_url,
            duration_seconds,
            file_size
          )
        `)
        .order('created_at', { ascending: false });

      // Filter based on role
      if (role === 'client') {
        query = query.eq('client_id', userId);
      } else if (role === 'reader') {
        query = query.eq('reader_id', userId);
      }
      // Admin and monitor can see all

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Call history retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching call history:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch call history'
      };
    }
  },

  // Get active calls for monitoring
  async getActiveCalls() {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          reader:profiles!bookings_reader_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          recording:call_recordings(
            id,
            call_start_time,
            ai_alerted,
            monitor_flagged
          )
        `)
        .eq('status', 'in_progress')
        .order('call_started_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
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
  },

  // Get call statistics
  async getCallStats() {
    try {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('status, call_type, is_emergency, created_at');

      const { data: recordings, error: recordingsError } = await supabase
        .from('call_recordings')
        .select('duration_seconds, ai_alerted, monitor_flagged');

      if (bookingsError || recordingsError) {
        throw bookingsError || recordingsError;
      }

      const stats = {
        totalCalls: bookings.length,
        activeCalls: bookings.filter(b => b.status === 'in_progress').length,
        completedCalls: bookings.filter(b => b.status === 'completed').length,
        emergencyCalls: bookings.filter(b => b.is_emergency).length,
        voiceCalls: bookings.filter(b => b.call_type === 'voice').length,
        videoCalls: bookings.filter(b => b.call_type === 'video').length,
        totalRecordings: recordings.length,
        aiAlertedRecordings: recordings.filter(r => r.ai_alerted).length,
        flaggedRecordings: recordings.filter(r => r.monitor_flagged).length,
        totalDuration: recordings.reduce((sum, r) => sum + (r.duration_seconds || 0), 0)
      };

      return {
        success: true,
        data: stats,
        message: 'Call statistics retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching call stats:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch call statistics'
      };
    }
  }
}; 