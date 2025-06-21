/**
 * 📞 CALLS API - Call Sessions Management
 * Handles video/voice call sessions, recording, and WebRTC functionality
 */

import api from './api';
const { supabase } = require('./lib/supabase');

// Mock data for development
const mockCallSessions = [
  {
    id: '1',
    session_id: 'call_session_1',
    client_id: 'client_1',
    reader_id: 'reader_1',
    status: 'active',
    session_type: 'video',
    started_at: new Date().toISOString(),
    duration_seconds: 1200,
    connection_quality: 'good'
  },
  {
    id: '2',
    session_id: 'call_session_2',
    client_id: 'client_2',
    reader_id: 'reader_2',
    status: 'completed',
    session_type: 'voice',
    started_at: new Date(Date.now() - 3600000).toISOString(),
    ended_at: new Date().toISOString(),
    duration_seconds: 2400,
    connection_quality: 'excellent'
  }
];

const mockCallRecordings = [
  {
    id: '1',
    call_session_id: 'call_session_2',
    recording_type: 'audio',
    file_url: '/recordings/call_session_2_audio.mp3',
    duration: 2400,
    file_size: 15728640,
    is_processed: true
  }
];

// Check if we're in development mode
const isDevelopmentMode = import.meta.env.DEV || import.meta.env.MODE === 'development';

class CallsAPI {
  constructor() {
    this.namespace = 'calls';
  }

  // ===================================================================
  // CALL SESSIONS MANAGEMENT
  // ===================================================================

  /**
   * Get all call sessions with filtering
   * GET /api/calls/sessions
   */
  getAllSessions: async (filters = {}) => {
    if (isDevelopmentMode) {
      return {
        data: mockCallSessions.filter(session => {
          if (filters.status && session.status !== filters.status) return false;
          if (filters.session_type && session.session_type !== filters.session_type) return false;
          if (filters.client_id && session.client_id !== filters.client_id) return false;
          if (filters.reader_id && session.reader_id !== filters.reader_id) return false;
          return true;
        }),
        total: mockCallSessions.length,
        success: true
      };
    }

    const queryParams = new URLSearchParams(filters).toString();
    return api.get(`/calls/sessions${queryParams ? `?${queryParams}` : ''}`);
  },

  /**
   * Get specific call session by ID
   * GET /api/calls/sessions/:id
   */
  getSessionById: async (sessionId) => {
    if (isDevelopmentMode) {
      const session = mockCallSessions.find(s => s.id === sessionId);
      return {
        data: session,
        success: !!session
      };
    }

    return api.get(`/calls/sessions/${sessionId}`);
  },

  /**
   * Create a new call session
   */
  async createCallSession(sessionData) {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .insert({
          client_id: sessionData.client_id,
          reader_id: sessionData.reader_id,
          session_type: sessionData.session_type || 'video',
          status: 'initiating',
          booking_id: sessionData.booking_id,
          metadata: {
            webrtc_config: sessionData.webrtc_config || {},
            call_quality_settings: sessionData.quality_settings || {}
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Create call participants
      await this.addCallParticipants(data.id, sessionData.participants || []);

      return {
        success: true,
        data: data,
        message: 'Call session created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create call session'
      };
    }
  },

  /**
   * Update call session
   * PUT /api/calls/sessions/:id
   */
  updateSession: async (sessionId, updateData) => {
    if (isDevelopmentMode) {
      const index = mockCallSessions.findIndex(s => s.id === sessionId);
      if (index !== -1) {
        mockCallSessions[index] = { ...mockCallSessions[index], ...updateData };
        return {
          data: mockCallSessions[index],
          success: true
        };
      }
      return { success: false, error: 'Session not found' };
    }

    return api.put(`/calls/sessions/${sessionId}`, updateData);
  },

  /**
   * Start a call session
   */
  async startCall(sessionId, startData) {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
          webrtc_room_id: startData.room_id,
          metadata: {
            ...startData.metadata,
            webrtc_config: startData.webrtc_config
          }
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      // Log call start in analytics
      await this.logCallEvent(sessionId, 'call_started', {
        duration: 0,
        participants: startData.participants || []
      });

      return {
        success: true,
        data: data,
        message: 'Call started successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to start call'
      };
    }
  },

  /**
   * End a call session
   */
  async endCall(sessionId, endData) {
    try {
      const callDuration = endData.duration || 0;
      
      const { data, error } = await supabase
        .from('call_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_seconds: callDuration,
          end_reason: endData.reason || 'normal',
          call_quality_rating: endData.quality_rating,
          metadata: {
            ...endData.metadata,
            final_stats: endData.call_stats || {}
          }
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      // Log call completion
      await this.logCallEvent(sessionId, 'call_ended', {
        duration: callDuration,
        reason: endData.reason,
        quality_rating: endData.quality_rating
      });

      return {
        success: true,
        data: data,
        message: 'Call ended successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to end call'
      };
    }
  },

  /**
   * Join an ongoing call
   */
  async joinCall(sessionId, participantData) {
    try {
      // Add participant to call
      const { data: participant, error: participantError } = await supabase
        .from('call_participants')
        .insert({
          call_session_id: sessionId,
          user_id: participantData.user_id,
          participant_type: participantData.type || 'participant',
          joined_at: new Date().toISOString(),
          status: 'connected'
        })
        .select()
        .single();

      if (participantError) throw participantError;

      // Update call session with new participant count
      const { data: sessionData, error: sessionError } = await supabase
        .from('call_sessions')
        .select('*, call_participants(*)')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Log join event
      await this.logCallEvent(sessionId, 'participant_joined', {
        participant_id: participant.id,
        user_id: participantData.user_id,
        participant_count: sessionData.call_participants.length
      });

      return {
        success: true,
        data: {
          participant: participant,
          session: sessionData
        },
        message: 'Successfully joined call'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to join call'
      };
    }
  },

  /**
   * Leave a call
   */
  async leaveCall(sessionId, userId, leaveData) {
    try {
      // Update participant status
      const { data, error } = await supabase
        .from('call_participants')
        .update({
          status: 'disconnected',
          left_at: new Date().toISOString(),
          leave_reason: leaveData.reason || 'normal'
        })
        .eq('call_session_id', sessionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Log leave event
      await this.logCallEvent(sessionId, 'participant_left', {
        participant_id: data.id,
        user_id: userId,
        reason: leaveData.reason
      });

      return {
        success: true,
        data: data,
        message: 'Successfully left call'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to leave call'
      };
    }
  },

  // ===================================================================
  // CALL RECORDINGS MANAGEMENT
  // ===================================================================

  /**
   * Get recordings for a call session
   * GET /api/calls/sessions/:id/recordings
   */
  getSessionRecordings: async (sessionId) => {
    if (isDevelopmentMode) {
      const recordings = mockCallRecordings.filter(r => r.call_session_id === sessionId);
      return {
        data: recordings,
        total: recordings.length,
        success: true
      };
    }

    return api.get(`/calls/sessions/${sessionId}/recordings`);
  },

  /**
   * Start recording a call session
   */
  async startRecording(sessionId, recordingData) {
    try {
      const { data, error } = await supabase
        .from('call_recordings')
        .insert({
          call_session_id: sessionId,
          recording_type: recordingData.type || 'video',
          status: 'recording',
          file_path: recordingData.file_path,
          started_at: new Date().toISOString(),
          metadata: recordingData.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      // Update call session to indicate recording
      await supabase
        .from('call_sessions')
        .update({
          is_recording: true,
          recording_started_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      return {
        success: true,
        data: data,
        message: 'Recording started successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to start recording'
      };
    }
  },

  /**
   * Stop recording a call session
   */
  async stopRecording(recordingId, stopData) {
    try {
      const { data, error } = await supabase
        .from('call_recordings')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_seconds: stopData.duration || 0,
          file_size_bytes: stopData.file_size || 0,
          final_file_path: stopData.final_file_path || null
        })
        .eq('id', recordingId)
        .select()
        .single();

      if (error) throw error;

      // Update call session
      if (data.call_session_id) {
        await supabase
          .from('call_sessions')
          .update({
            is_recording: false,
            recording_ended_at: new Date().toISOString()
          })
          .eq('id', data.call_session_id);
      }

      return {
        success: true,
        data: data,
        message: 'Recording stopped successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to stop recording'
      };
    }
  },

  // ===================================================================
  // EMERGENCY CALLS
  // ===================================================================

  /**
   * Create emergency call session
   */
  async createEmergencyCall(emergencyData) {
    try {
      // Create emergency call log
      const { data: emergencyLog, error: emergencyError } = await supabase
        .from('emergency_call_logs')
        .insert({
          client_id: emergencyData.client_id,
          reader_id: emergencyData.reader_id,
          booking_id: emergencyData.booking_id,
          emergency_type: emergencyData.emergency_type || 'urgent_help',
          priority_level: emergencyData.priority || 'high',
          description: emergencyData.description,
          status: 'open',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (emergencyError) throw emergencyError;

      // Create call session for emergency
      const callSession = await this.createCallSession({
        client_id: emergencyData.client_id,
        reader_id: emergencyData.reader_id,
        session_type: 'emergency_call',
        booking_id: emergencyData.booking_id,
        emergency_log_id: emergencyLog.id
      });

      if (!callSession.success) {
        throw new Error('Failed to create emergency call session');
      }

      // Create escalation if needed
      await this.createEmergencyEscalation(emergencyLog.id, emergencyData);

      return {
        success: true,
        data: {
          emergency_log: emergencyLog,
          call_session: callSession.data
        },
        message: 'Emergency call created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create emergency call'
      };
    }
  },

  /**
   * Get active emergency calls
   * GET /api/calls/emergency/active
   */
  getActiveEmergencyCalls: async () => {
    if (isDevelopmentMode) {
      const emergencyCalls = mockCallSessions.filter(s => 
        s.session_type === 'emergency' && 
        (s.status === 'active' || s.status === 'pending')
      );
      return {
        data: emergencyCalls,
        total: emergencyCalls.length,
        success: true
      };
    }

    return api.get('/calls/emergency/active');
  },

  // ===================================================================
  // WEBRTC CONFIGURATION
  // ===================================================================

  /**
   * Get WebRTC configuration
   */
  async getWebRTCConfig() {
    try {
      // Return WebRTC configuration with STUN/TURN servers
      const config = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // Add TURN servers if available
          // {
          //   urls: 'turn:your-turn-server.com:3478',
          //   username: 'username',
          //   credential: 'password'
          // }
        ],
        iceCandidatePoolSize: 10
      };

      return {
        success: true,
        data: config,
        message: 'WebRTC configuration retrieved'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get WebRTC configuration'
      };
    }
  },

  /**
   * Test WebRTC connectivity
   */
  async testWebRTCConnectivity() {
    try {
      // Basic connectivity test
      const testResults = {
        stun_servers: [],
        turn_servers: [],
        connectivity_score: 0
      };

      // Test STUN servers
      const stunServers = [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302'
      ];

      for (const stunServer of stunServers) {
        try {
          // This would be implemented with actual WebRTC testing
          testResults.stun_servers.push({
            server: stunServer,
            status: 'reachable',
            response_time: Math.random() * 100 + 50 // Mock response time
          });
        } catch (err) {
          testResults.stun_servers.push({
            server: stunServer,
            status: 'unreachable',
            error: err.message
          });
        }
      }

      // Calculate connectivity score
      const reachableStun = testResults.stun_servers.filter(s => s.status === 'reachable').length;
      testResults.connectivity_score = (reachableStun / stunServers.length) * 100;

      return {
        success: true,
        data: testResults,
        message: 'WebRTC connectivity test completed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'WebRTC connectivity test failed'
      };
    }
  },

  // ===================================================================
  // CALL ANALYTICS
  // ===================================================================

  /**
   * Get call session analytics
   */
  async getCallAnalytics(filters = {}) {
    try {
      let query = supabase
        .from('call_sessions')
        .select(`
          id,
          session_type,
          status,
          duration_seconds,
          call_quality_rating,
          started_at,
          ended_at,
          is_recording
        `);

      // Apply filters
      if (filters.date_from) {
        query = query.gte('started_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('started_at', filters.date_to);
      }
      if (filters.session_type) {
        query = query.eq('session_type', filters.session_type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('started_at', { ascending: false });

      if (error) throw error;

      // Calculate analytics
      const analytics = {
        total_calls: data.length,
        completed_calls: data.filter(c => c.status === 'completed').length,
        average_duration: data.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / (data.length || 1),
        total_duration: data.reduce((sum, c) => sum + (c.duration_seconds || 0), 0),
        recording_percentage: (data.filter(c => c.is_recording).length / (data.length || 1)) * 100,
        average_quality_rating: data.reduce((sum, c) => sum + (c.call_quality_rating || 0), 0) / (data.filter(c => c.call_quality_rating).length || 1),
        calls_by_type: {},
        calls_by_status: {}
      };

      // Group by type and status
      data.forEach(call => {
        analytics.calls_by_type[call.session_type] = (analytics.calls_by_type[call.session_type] || 0) + 1;
        analytics.calls_by_status[call.status] = (analytics.calls_by_status[call.status] || 0) + 1;
      });

      return {
        success: true,
        data: {
          analytics,
          calls: data
        },
        message: 'Call analytics retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve call analytics'
      };
    }
  },

  /**
   * Helper: Add call participants
   */
  async addCallParticipants(sessionId, participants) {
    if (!participants.length) return;

    const participantRecords = participants.map(p => ({
      call_session_id: sessionId,
      user_id: p.user_id,
      participant_type: p.type || 'participant',
      status: 'pending'
    }));

    const { error } = await supabase
      .from('call_participants')
      .insert(participantRecords);

    if (error) throw error;
  },

  /**
   * Helper: Log call events for analytics
   */
  async logCallEvent(sessionId, eventType, eventData) {
    try {
      await supabase
        .from('user_activity_logs')
        .insert({
          user_id: eventData.user_id || null,
          activity_type: 'call_event',
          activity_data: {
            session_id: sessionId,
            event_type: eventType,
            ...eventData
          },
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to log call event:', error.message);
    }
  },

  /**
   * Helper: Create emergency escalation
   */
  async createEmergencyEscalation(emergencyLogId, emergencyData) {
    try {
      await supabase
        .from('emergency_escalations')
        .insert({
          emergency_log_id: emergencyLogId,
          client_id: emergencyData.client_id,
          reader_id: emergencyData.reader_id,
          escalation_type: 'emergency_call',
          priority_level: emergencyData.priority || 'high',
          status: 'open',
          description: emergencyData.description,
          escalated_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to create emergency escalation:', error.message);
    }
  },

  /**
   * Get call session details
   */
  async getCallSession(sessionId) {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .select(`
          *,
          call_participants(*),
          call_recordings(*),
          emergency_call_logs(*)
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Call session retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve call session'
      };
    }
  }
}

export default new CallsAPI(); 