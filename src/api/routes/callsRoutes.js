const express = require('express');
const { supabase } = require('../lib/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// CALL SESSION MANAGEMENT
// =====================================================

// Create new call session
router.post('/sessions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      client_id,
      reader_id,
      call_type,
      session_mode = 'video',
      max_duration_minutes = 60,
      is_emergency = false,
      scheduled_start_time
    } = req.body;

    // Validate required fields
    if (!client_id || !reader_id) {
      return res.status(400).json({ 
        error: 'Client ID and Reader ID are required' 
      });
    }

    // Ensure user is authorized to create this session
    if (userRole === 'client' && userId !== client_id) {
      return res.status(403).json({ 
        error: 'You can only create sessions for yourself' 
      });
    }

    if (userRole === 'reader' && userId !== reader_id) {
      return res.status(403).json({ 
        error: 'You can only be assigned to sessions for yourself' 
      });
    }

    // Create call session using database function
    const { data: sessionId, error } = await supabase
      .rpc('create_call_session', {
        p_client_id: client_id,
        p_reader_id: reader_id,
        p_call_type: call_type,
        p_session_mode: session_mode,
        p_max_duration_minutes: max_duration_minutes,
        p_is_emergency: is_emergency,
        p_scheduled_start_time: scheduled_start_time
      });

    if (error) throw error;

    // Fetch the created session
    const { data: session, error: fetchError } = await supabase
      .from('call_sessions')
      .select(`
        *,
        client:profiles!client_id(first_name, last_name, display_name),
        reader:profiles!reader_id(first_name, last_name, display_name)
      `)
      .eq('id', sessionId)
      .single();

    if (fetchError) throw fetchError;

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Create call session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's call sessions
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, limit = 20, include_past = false } = req.query;

    let query = supabase
      .from('call_sessions')
      .select(`
        *,
        client:profiles!client_id(first_name, last_name, display_name, email),
        reader:profiles!reader_id(first_name, last_name, display_name, email),
        call_participants(*)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    // Filter by user participation
    if (userRole === 'client') {
      query = query.eq('client_id', userId);
    } else if (userRole === 'reader') {
      query = query.eq('reader_id', userId);
    } else if (!['admin', 'super_admin'].includes(userRole)) {
      query = query.or(`client_id.eq.${userId},reader_id.eq.${userId}`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (!include_past) {
      query = query.not('status', 'in', '(completed,cancelled,failed)');
    }

    const { data: sessions, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Get call sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific call session
router.get('/sessions/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const { data: session, error } = await supabase
      .from('call_sessions')
      .select(`
        *,
        client:profiles!client_id(first_name, last_name, display_name, email),
        reader:profiles!reader_id(first_name, last_name, display_name, email),
        call_participants(*),
        call_recordings(*),
        call_emergency_extensions(*)
      `)
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return res.status(404).json({ error: 'Call session not found' });
    }

    // Check access permissions (handled by RLS, but explicit check for clarity)
    const hasAccess = session.client_id === userId || 
                     session.reader_id === userId ||
                     ['admin', 'super_admin'].includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Get call session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// CONSENT MANAGEMENT (CRITICAL FOR LEGAL COMPLIANCE)
// =====================================================

// Grant consent for call participation or recording
router.post('/sessions/:sessionId/consent', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { consent_type, consent_given = true } = req.body;

    // Validate consent type
    const validConsentTypes = ['call_participation', 'recording', 'emergency_extension'];
    if (!validConsentTypes.includes(consent_type)) {
      return res.status(400).json({ 
        error: 'Invalid consent type. Must be one of: ' + validConsentTypes.join(', ')
      });
    }

    if (!consent_given) {
      return res.status(400).json({ 
        error: 'Consent must be explicitly given' 
      });
    }

    // Grant consent using database function
    const { data: consentGranted, error } = await supabase
      .rpc('grant_call_consent', {
        p_call_session_id: sessionId,
        p_user_id: userId,
        p_consent_type: consent_type,
        p_ip_address: req.ip,
        p_user_agent: req.get('User-Agent')
      });

    if (error) throw error;

    res.json({
      success: true,
      message: `${consent_type} consent granted successfully`,
      data: { consent_granted: consentGranted }
    });
  } catch (error) {
    console.error('Grant consent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get consent status for session
router.get('/sessions/:sessionId/consent', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Get session consent status
    const { data: session, error: sessionError } = await supabase
      .from('call_sessions')
      .select(`
        client_consent_given,
        reader_consent_given,
        recording_consent_client,
        recording_consent_reader,
        client_id,
        reader_id
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Call session not found' });
    }

    // Get user's consent logs
    const { data: consentLogs, error: logsError } = await supabase
      .from('call_consent_logs')
      .select('*')
      .eq('call_session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (logsError) throw logsError;

    // Determine user's role and consent status
    const userRole = session.client_id === userId ? 'client' : 'reader';
    const consentStatus = {
      user_role: userRole,
      call_participation: userRole === 'client' ? session.client_consent_given : session.reader_consent_given,
      recording: userRole === 'client' ? session.recording_consent_client : session.recording_consent_reader,
      consent_history: consentLogs
    };

    res.json({
      success: true,
      data: consentStatus
    });
  } catch (error) {
    console.error('Get consent status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// CALL CONTROL (START/END/MANAGE)
// =====================================================

// Start call session
router.post('/sessions/:sessionId/start', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Verify all consents are given before starting
    const { data: session, error: sessionError } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Call session not found' });
    }

    // Check if user is participant
    const isParticipant = session.client_id === userId || session.reader_id === userId;
    if (!isParticipant && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify all required consents
    if (!session.client_consent_given || !session.reader_consent_given) {
      return res.status(400).json({ 
        error: 'Cannot start call: All participants must give consent first' 
      });
    }

    if (session.recording_enabled && (!session.recording_consent_client || !session.recording_consent_reader)) {
      return res.status(400).json({ 
        error: 'Cannot start call: Recording consent required from all participants' 
      });
    }

    // Update session to active
    const { data: updatedSession, error: updateError } = await supabase
      .from('call_sessions')
      .update({
        status: 'active',
        actual_start_time: new Date().toISOString(),
        recording_start_timestamp: session.recording_enabled ? new Date().toISOString() : null
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: updatedSession,
      message: 'Call session started successfully'
    });
  } catch (error) {
    console.error('Start call session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// End call session
router.post('/sessions/:sessionId/end', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const { data: session, error: sessionError } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Call session not found' });
    }

    // Check if user can end the session
    const canEnd = session.client_id === userId || 
                  session.reader_id === userId ||
                  ['admin', 'super_admin'].includes(req.user.role);

    if (!canEnd) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate duration
    const startTime = new Date(session.actual_start_time);
    const endTime = new Date();
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('call_sessions')
      .update({
        status: 'completed',
        actual_end_time: endTime.toISOString(),
        total_duration_minutes: durationMinutes,
        recording_end_timestamp: session.recording_enabled ? endTime.toISOString() : null
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: updatedSession,
      message: 'Call session ended successfully'
    });
  } catch (error) {
    console.error('End call session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// EMERGENCY EXTENSIONS
// =====================================================

// Request emergency extension
router.post('/sessions/:sessionId/emergency-extension', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { additional_minutes, emergency_reason } = req.body;

    if (!additional_minutes || additional_minutes <= 0) {
      return res.status(400).json({ 
        error: 'Additional minutes must be a positive number' 
      });
    }

    // Verify session is active and user is participant
    const { data: session, error: sessionError } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Call session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ 
        error: 'Emergency extension can only be requested for active calls' 
      });
    }

    const isParticipant = session.client_id === userId || session.reader_id === userId;
    if (!isParticipant) {
      return res.status(403).json({ error: 'Only call participants can request extensions' });
    }

    // Request extension using database function
    const { data: extensionId, error } = await supabase
      .rpc('request_emergency_extension', {
        p_call_session_id: sessionId,
        p_requested_by: userId,
        p_additional_minutes: additional_minutes,
        p_emergency_reason: emergency_reason
      });

    if (error) throw error;

    // Fetch the created extension
    const { data: extension, error: fetchError } = await supabase
      .from('call_emergency_extensions')
      .select('*')
      .eq('id', extensionId)
      .single();

    if (fetchError) throw fetchError;

    res.json({
      success: true,
      data: extension,
      message: extension.approval_status === 'auto_approved' 
        ? 'Emergency extension auto-approved and activated'
        : 'Emergency extension request submitted for approval'
    });
  } catch (error) {
    console.error('Request emergency extension error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get emergency extensions for session
router.get('/sessions/:sessionId/emergency-extensions', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: extensions, error } = await supabase
      .from('call_emergency_extensions')
      .select(`
        *,
        requested_by_profile:profiles!requested_by(first_name, last_name, display_name),
        approved_by_profile:profiles!approved_by(first_name, last_name, display_name)
      `)
      .eq('call_session_id', sessionId)
      .order('extension_number');

    if (error) throw error;

    res.json({
      success: true,
      data: extensions
    });
  } catch (error) {
    console.error('Get emergency extensions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// CALL RECORDINGS (PERMANENT STORAGE)
// =====================================================

// Get call recordings for session
router.get('/sessions/:sessionId/recordings', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: recordings, error } = await supabase
      .from('call_recordings')
      .select('*')
      .eq('call_session_id', sessionId)
      .order('recording_started_at');

    if (error) throw error;

    // Filter sensitive file paths for non-admin users
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      recordings.forEach(recording => {
        delete recording.primary_file_path;
        delete recording.backup_file_path;
        delete recording.encryption_key_id;
      });
    }

    res.json({
      success: true,
      data: recordings
    });
  } catch (error) {
    console.error('Get call recordings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create recording entry (for upload completion)
router.post('/sessions/:sessionId/recordings', authMiddleware, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      recording_type,
      primary_file_path,
      backup_file_path,
      file_size_bytes,
      duration_seconds,
      recording_started_at,
      recording_ended_at
    } = req.body;

    const { data: recording, error } = await supabase
      .from('call_recordings')
      .insert({
        call_session_id: sessionId,
        recording_type,
        primary_file_path,
        backup_file_path,
        file_size_bytes,
        duration_seconds,
        recording_started_at,
        recording_ended_at,
        is_permanently_stored: true, // CRITICAL: Always true per requirements
        processing_status: 'ready'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: recording
    });
  } catch (error) {
    console.error('Create recording error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// WEBRTC SIGNALING
// =====================================================

// Send WebRTC signaling message
router.post('/sessions/:sessionId/signal', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { message_type, payload, to_user_id } = req.body;

    const validMessageTypes = ['offer', 'answer', 'ice_candidate', 'connection_state', 'quality_update'];
    if (!validMessageTypes.includes(message_type)) {
      return res.status(400).json({ 
        error: 'Invalid message type' 
      });
    }

    const { data: message, error } = await supabase
      .from('webrtc_signaling')
      .insert({
        call_session_id: sessionId,
        from_user_id: userId,
        to_user_id,
        message_type,
        payload
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Send signaling message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pending signaling messages
router.get('/sessions/:sessionId/signals', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const { data: messages, error } = await supabase
      .from('webrtc_signaling')
      .select('*')
      .eq('call_session_id', sessionId)
      .or(`to_user_id.eq.${userId},to_user_id.is.null`)
      .eq('delivered', false)
      .order('created_at');

    if (error) throw error;

    // Mark messages as delivered
    if (messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      await supabase
        .from('webrtc_signaling')
        .update({ delivered: true })
        .in('id', messageIds);
    }

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get signaling messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

// Get all call sessions (admin only)
router.get('/admin/sessions', authMiddleware, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = supabase
      .from('call_sessions')
      .select(`
        *,
        client:profiles!client_id(first_name, last_name, display_name, email),
        reader:profiles!reader_id(first_name, last_name, display_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) {
      query = query.eq('status', status);
    }

    const { data: sessions, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Get admin sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve emergency extension (admin only)
router.post('/admin/emergency-extensions/:extensionId/approve', 
  authMiddleware, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { extensionId } = req.params;
      const adminId = req.user.id;
      const { approved = true, rejection_reason } = req.body;

      const approvalStatus = approved ? 'approved' : 'rejected';

      const { data: extension, error } = await supabase
        .from('call_emergency_extensions')
        .update({
          approval_status: approvalStatus,
          approved_by: adminId,
          approval_timestamp: new Date().toISOString(),
          rejection_reason: approved ? null : rejection_reason,
          extension_started_at: approved ? new Date().toISOString() : null
        })
        .eq('id', extensionId)
        .select()
        .single();

      if (error) throw error;

      // If approved, update the call session
      if (approved) {
        await supabase
          .from('call_sessions')
          .update({
            emergency_extension_count: supabase.sql`emergency_extension_count + 1`,
            emergency_extension_minutes: supabase.sql`emergency_extension_minutes + ${extension.additional_minutes}`,
            max_duration_minutes: supabase.sql`max_duration_minutes + ${extension.additional_minutes}`
          })
          .eq('id', extension.call_session_id);
      }

      res.json({
        success: true,
        data: extension,
        message: `Emergency extension ${approvalStatus} successfully`
      });
    } catch (error) {
      console.error('Approve emergency extension error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;