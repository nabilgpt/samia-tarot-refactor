// ===============================================
// CALL & VIDEO SYSTEM API ROUTES
// ===============================================

const express = require('express');
const Joi = require('joi');
const { supabase } = require('../lib/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { socketAuth } = require('../lib/socket-auth');
const router = express.Router();

// ===============================================
// VALIDATION SCHEMAS
// ===============================================

const callSessionSchema = Joi.object({
  reader_id: Joi.string().uuid().required(),
  booking_id: Joi.string().uuid().optional(),
  call_type: Joi.string().valid('voice', 'video').required(),
  is_emergency: Joi.boolean().default(false),
  scheduled_duration: Joi.number().integer().min(1).max(180).optional()
});

const emergencyCallSchema = Joi.object({
  emergency_type: Joi.string().default('general'),
  priority_level: Joi.number().integer().min(1).max(5).default(3),
  notes: Joi.string().max(1000).optional()
});

const participantSchema = Joi.object({
  participant_id: Joi.string().uuid().required(),
  role: Joi.string().valid('client', 'reader', 'admin', 'monitor').required(),
  is_silent: Joi.boolean().default(false),
  audio_enabled: Joi.boolean().default(true),
  video_enabled: Joi.boolean().default(false),
  screen_sharing: Joi.boolean().default(false)
});

const availabilitySchema = Joi.object({
  is_available: Joi.boolean().default(true),
  emergency_available: Joi.boolean().default(true),
  status_message: Joi.string().max(200).optional(),
  auto_accept_emergency: Joi.boolean().default(false),
  max_concurrent_calls: Joi.number().integer().min(1).max(5).default(1)
});

const qualityMetricSchema = Joi.object({
  audio_quality: Joi.number().integer().min(1).max(5).optional(),
  video_quality: Joi.number().integer().min(1).max(5).optional(),
  connection_strength: Joi.number().integer().min(1).max(5).optional(),
  latency: Joi.number().integer().min(0).optional(),
  packet_loss: Joi.number().min(0).max(100).optional(),
  bandwidth_usage: Joi.number().integer().min(0).optional(),
  device_info: Joi.object().optional(),
  network_info: Joi.object().optional()
});

// ===============================================
// CALL SESSION ROUTES
// ===============================================

// Create new call session
router.post('/sessions', 
  authenticateToken,
  validateRequest(callSessionSchema),
  async (req, res) => {
    try {
      const { reader_id, booking_id, call_type, is_emergency, scheduled_duration } = req.body;
      const client_id = req.user.id;

      // Generate unique room ID
      const room_id = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Check reader availability
      const { data: availability } = await supabase
        .from('reader_availability')
        .select('*')
        .eq('reader_id', reader_id)
        .single();

      if (!availability?.is_available && !is_emergency) {
        return res.status(400).json({
          error: 'Reader is not available',
          code: 'READER_UNAVAILABLE'
        });
      }

      if (is_emergency && !availability?.emergency_available) {
        return res.status(400).json({
          error: 'Reader is not available for emergency calls',
          code: 'EMERGENCY_UNAVAILABLE'
        });
      }

      // Create call session
      const { data: session, error } = await supabase
        .from('call_sessions')
        .insert({
          client_id,
          reader_id,
          booking_id,
          room_id,
          call_type,
          is_emergency,
          scheduled_duration,
          status: 'pending'
        })
        .select('*')
        .single();

      if (error) throw error;

      // Add participants
      const participants = [
        { call_session_id: session.id, participant_id: client_id, role: 'client' },
        { call_session_id: session.id, participant_id: reader_id, role: 'reader' }
      ];

      await supabase.from('call_participants').insert(participants);

      // Create notification for reader
      await supabase.from('call_notifications').insert({
        call_session_id: session.id,
        recipient_id: reader_id,
        notification_type: is_emergency ? 'emergency_call' : 'incoming_call',
        title: is_emergency ? 'Emergency Call Incoming' : 'New Call Request',
        message: `${is_emergency ? 'Emergency call' : 'Call'} from client`,
        is_emergency,
        is_siren: is_emergency
      });

      // Socket notification
      if (socketAuth.isConnected(reader_id)) {
        socketAuth.emit(reader_id, 'incoming_call', {
          session,
          is_emergency,
          client_name: req.user.first_name || 'Client'
        });
      }

      res.status(201).json({
        success: true,
        data: session,
        message: 'Call session created successfully'
      });

    } catch (error) {
      console.error('Create call session error:', error);
      res.status(500).json({
        error: 'Failed to create call session',
        details: error.message
      });
    }
  }
);

// Get call sessions (with filters)
router.get('/sessions',
  authenticateToken,
  async (req, res) => {
    try {
      const { 
        status, 
        call_type, 
        is_emergency, 
        page = 1, 
        limit = 20,
        start_date,
        end_date
      } = req.query;

      let query = supabase
        .from('call_sessions')
        .select(`
          *,
          client:profiles!call_sessions_client_id_fkey(id, first_name, last_name, avatar_url),
          reader:profiles!call_sessions_reader_id_fkey(id, first_name, last_name, avatar_url),
          booking:bookings(id, service_id, services(name)),
          recordings:call_recordings(id, recording_type, duration, file_size)
        `);

      // Apply user-based filters
      if (req.user.role === 'client') {
        query = query.eq('client_id', req.user.id);
      } else if (req.user.role === 'reader') {
        query = query.eq('reader_id', req.user.id);
      }

      // Apply additional filters
      if (status) query = query.eq('status', status);
      if (call_type) query = query.eq('call_type', call_type);
      if (is_emergency !== undefined) query = query.eq('is_emergency', is_emergency);
      if (start_date) query = query.gte('created_at', start_date);
      if (end_date) query = query.lte('created_at', end_date);

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data: sessions, error } = await query;
      if (error) throw error;

      // Get total count for pagination
      let countQuery = supabase
        .from('call_sessions')
        .select('*', { count: 'exact', head: true });

      if (req.user.role === 'client') {
        countQuery = countQuery.eq('client_id', req.user.id);
      } else if (req.user.role === 'reader') {
        countQuery = countQuery.eq('reader_id', req.user.id);
      }

      const { count } = await countQuery;

      res.json({
        success: true,
        data: sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get call sessions error:', error);
      res.status(500).json({
        error: 'Failed to retrieve call sessions',
        details: error.message
      });
    }
  }
);

// Get specific call session
router.get('/sessions/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      let query = supabase
        .from('call_sessions')
        .select(`
          *,
          client:profiles!call_sessions_client_id_fkey(id, first_name, last_name, avatar_url),
          reader:profiles!call_sessions_reader_id_fkey(id, first_name, last_name, avatar_url),
          booking:bookings(id, service_id, services(name, type)),
          participants:call_participants(
            *,
            profile:profiles(id, first_name, last_name, avatar_url, role)
          ),
          recordings:call_recordings(*),
          notifications:call_notifications(*),
          escalations:call_escalations(*)
        `)
        .eq('id', id)
        .single();

      const { data: session, error } = await query;
      if (error) throw error;

      if (!session) {
        return res.status(404).json({
          error: 'Call session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      // Check access permissions
      const hasAccess = 
        session.client_id === req.user.id ||
        session.reader_id === req.user.id ||
        ['admin', 'monitor'].includes(req.user.role);

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      res.json({
        success: true,
        data: session
      });

    } catch (error) {
      console.error('Get call session error:', error);
      res.status(500).json({
        error: 'Failed to retrieve call session',
        details: error.message
      });
    }
  }
);

// Update call session status
router.patch('/sessions/:id/status',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, start_time, end_time } = req.body;

      const validStatuses = ['pending', 'ringing', 'active', 'ended', 'failed', 'escalated'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status',
          code: 'INVALID_STATUS'
        });
      }

      // Get current session
      const { data: session, error: sessionError } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({
          error: 'Call session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      // Check permissions
      const hasAccess = 
        session.client_id === req.user.id ||
        session.reader_id === req.user.id ||
        ['admin', 'monitor'].includes(req.user.role);

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Update session
      const updateData = { status };
      if (start_time) updateData.start_time = start_time;
      if (end_time) updateData.end_time = end_time;

      const { data: updatedSession, error } = await supabase
        .from('call_sessions')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      // Notify participants
      const participants = [session.client_id, session.reader_id];
      participants.forEach(participantId => {
        if (socketAuth.isConnected(participantId)) {
          socketAuth.emit(participantId, 'call_status_updated', {
            session_id: id,
            status,
            start_time,
            end_time
          });
        }
      });

      res.json({
        success: true,
        data: updatedSession,
        message: 'Call session status updated'
      });

    } catch (error) {
      console.error('Update call session error:', error);
      res.status(500).json({
        error: 'Failed to update call session',
        details: error.message
      });
    }
  }
);

// ===============================================
// EMERGENCY CALL ROUTES
// ===============================================

// Create emergency call
router.post('/emergency',
  authenticateToken,
  validateRequest(emergencyCallSchema),
  async (req, res) => {
    try {
      const { emergency_type, priority_level, notes } = req.body;
      const client_id = req.user.id;

      // Get available emergency readers
      const { data: availableReaders, error: readerError } = await supabase
        .rpc('get_available_emergency_readers');

      if (readerError) throw readerError;

      if (!availableReaders || availableReaders.length === 0) {
        return res.status(503).json({
          error: 'No emergency readers available',
          code: 'NO_EMERGENCY_READERS'
        });
      }

      // Select reader (could implement priority logic here)
      const selectedReader = availableReaders[0];

      // Create emergency log
      const { data: emergencyLog, error: logError } = await supabase
        .from('emergency_call_logs')
        .insert({
          client_id,
          reader_id: selectedReader.id,
          emergency_type,
          priority_level,
          notes,
          status: 'pending'
        })
        .select('*')
        .single();

      if (logError) throw logError;

      // Create call session
      const room_id = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data: session, error: sessionError } = await supabase
        .from('call_sessions')
        .insert({
          client_id,
          reader_id: selectedReader.id,
          room_id,
          call_type: 'voice', // Emergency calls default to voice
          is_emergency: true,
          status: 'pending'
        })
        .select('*')
        .single();

      if (sessionError) throw sessionError;

      // Link emergency log to call session
      await supabase
        .from('emergency_call_logs')
        .update({ call_session_id: session.id })
        .eq('id', emergencyLog.id);

      // Create urgent notifications
      await supabase.from('call_notifications').insert({
        call_session_id: session.id,
        recipient_id: selectedReader.id,
        notification_type: 'emergency_call',
        title: 'EMERGENCY CALL',
        message: `Priority ${priority_level} emergency call from client`,
        is_emergency: true,
        is_siren: true
      });

      // Socket notification with siren
      if (socketAuth.isConnected(selectedReader.id)) {
        socketAuth.emit(selectedReader.id, 'emergency_call', {
          session,
          emergency_log: emergencyLog,
          priority_level,
          client_name: req.user.first_name || 'Client',
          siren: true
        });
      }

      res.status(201).json({
        success: true,
        data: {
          session,
          emergency_log: emergencyLog,
          reader: selectedReader
        },
        message: 'Emergency call created successfully'
      });

    } catch (error) {
      console.error('Create emergency call error:', error);
      res.status(500).json({
        error: 'Failed to create emergency call',
        details: error.message
      });
    }
  }
);

// Get emergency call logs
router.get('/emergency',
  authenticateToken,
  requireRole(['admin', 'monitor']),
  async (req, res) => {
    try {
      const { 
        status, 
        priority_level, 
        page = 1, 
        limit = 20,
        start_date,
        end_date
      } = req.query;

      let query = supabase
        .from('emergency_call_logs')
        .select(`
          *,
          client:profiles!emergency_call_logs_client_id_fkey(id, first_name, last_name, phone),
          reader:profiles!emergency_call_logs_reader_id_fkey(id, first_name, last_name),
          escalated_to_profile:profiles!emergency_call_logs_escalated_to_fkey(id, first_name, last_name),
          call_session:call_sessions(id, status, actual_duration)
        `);

      // Apply filters
      if (status) query = query.eq('status', status);
      if (priority_level) query = query.eq('priority_level', priority_level);
      if (start_date) query = query.gte('timestamp', start_date);
      if (end_date) query = query.lte('timestamp', end_date);

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1).order('timestamp', { ascending: false });

      const { data: logs, error } = await query;
      if (error) throw error;

      // Get total count
      const { count } = await supabase
        .from('emergency_call_logs')
        .select('*', { count: 'exact', head: true });

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Get emergency logs error:', error);
      res.status(500).json({
        error: 'Failed to retrieve emergency logs',
        details: error.message
      });
    }
  }
);

// ===============================================
// READER AVAILABILITY ROUTES
// ===============================================

// Update reader availability
router.put('/availability',
  authenticateToken,
  requireRole(['reader']),
  validateRequest(availabilitySchema),
  async (req, res) => {
    try {
      const reader_id = req.user.id;
      const availabilityData = req.body;

      const { data: availability, error } = await supabase
        .from('reader_availability')
        .upsert({
          reader_id,
          ...availabilityData,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (error) throw error;

      // Broadcast availability update
      socketAuth.broadcast('reader_availability_updated', {
        reader_id,
        availability
      });

      res.json({
        success: true,
        data: availability,
        message: 'Availability updated successfully'
      });

    } catch (error) {
      console.error('Update availability error:', error);
      res.status(500).json({
        error: 'Failed to update availability',
        details: error.message
      });
    }
  }
);

// Get all reader availability
router.get('/availability',
  authenticateToken,
  async (req, res) => {
    try {
      const { data: availability, error } = await supabase
        .from('reader_availability')
        .select(`
          *,
          reader:profiles(id, first_name, last_name, avatar_url, specialties)
        `)
        .order('last_seen', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        data: availability
      });

    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({
        error: 'Failed to retrieve availability',
        details: error.message
      });
    }
  }
);

// ===============================================
// CALL QUALITY & METRICS ROUTES
// ===============================================

// Submit call quality metrics
router.post('/sessions/:id/metrics',
  authenticateToken,
  validateRequest(qualityMetricSchema),
  async (req, res) => {
    try {
      const { id: call_session_id } = req.params;
      const participant_id = req.user.id;
      const metrics = req.body;

      // Verify session access
      const { data: session, error: sessionError } = await supabase
        .from('call_sessions')
        .select('client_id, reader_id')
        .eq('id', call_session_id)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({
          error: 'Call session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      const hasAccess = 
        session.client_id === participant_id ||
        session.reader_id === participant_id;

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Insert metrics
      const { data: metric, error } = await supabase
        .from('call_quality_metrics')
        .insert({
          call_session_id,
          participant_id,
          ...metrics
        })
        .select('*')
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: metric,
        message: 'Quality metrics recorded'
      });

    } catch (error) {
      console.error('Submit metrics error:', error);
      res.status(500).json({
        error: 'Failed to submit metrics',
        details: error.message
      });
    }
  }
);

// ===============================================
// CALL RECORDINGS ROUTES
// ===============================================

// Get call recordings
router.get('/sessions/:id/recordings',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify session access
      const { data: session, error: sessionError } = await supabase
        .from('call_sessions')
        .select('client_id, reader_id')
        .eq('id', id)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({
          error: 'Call session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      const hasAccess = 
        session.client_id === req.user.id ||
        session.reader_id === req.user.id ||
        ['admin', 'monitor'].includes(req.user.role);

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      const { data: recordings, error } = await supabase
        .from('call_recordings')
        .select(`
          *,
          created_by_profile:profiles(id, first_name, last_name)
        `)
        .eq('call_session_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        data: recordings
      });

    } catch (error) {
      console.error('Get recordings error:', error);
      res.status(500).json({
        error: 'Failed to retrieve recordings',
        details: error.message
      });
    }
  }
);

// ===============================================
// STATISTICS & ANALYTICS ROUTES
// ===============================================

// Get call statistics
router.get('/statistics',
  authenticateToken,
  requireRole(['admin', 'monitor']),
  async (req, res) => {
    try {
      const { start_date, end_date, reader_id } = req.query;

      // Build base query conditions
      let conditions = '';
      if (start_date) conditions += ` AND created_at >= '${start_date}'`;
      if (end_date) conditions += ` AND created_at <= '${end_date}'`;
      if (reader_id) conditions += ` AND reader_id = '${reader_id}'`;

      // Get comprehensive statistics
      const [
        totalCalls,
        emergencyCalls,
        avgDuration,
        successRate,
        readerStats
      ] = await Promise.all([
        // Total calls
        supabase.rpc('count_calls', { conditions }),
        
        // Emergency calls
        supabase.rpc('count_emergency_calls', { conditions }),
        
        // Average duration
        supabase.rpc('avg_call_duration', { conditions }),
        
        // Success rate
        supabase.rpc('call_success_rate', { conditions }),
        
        // Reader performance
        supabase.rpc('reader_call_stats', { conditions })
      ]);

      const statistics = {
        overview: {
          total_calls: totalCalls.data || 0,
          emergency_calls: emergencyCalls.data || 0,
          average_duration: avgDuration.data || 0,
          success_rate: successRate.data || 0
        },
        reader_performance: readerStats.data || []
      };

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve statistics',
        details: error.message
      });
    }
  }
);

module.exports = router; 