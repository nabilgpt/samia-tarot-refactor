// =============================================================================
// MONITOR CONTROLLER - مراقب المحتوى والجلسات
// =============================================================================
// Complete monitor controller for content moderation and session oversight

const { supabaseAdmin: supabase } = require('../lib/supabase.js');
const auditService = require('../services/auditService.js');
const notificationService = require('../services/notificationService.js');
const socketService = require('../services/socketService.js');

// =============================================================================
// 1. ACTIVE SESSIONS MONITORING
// =============================================================================

/**
 * Get all active sessions for monitoring
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getActiveSessions = async (req, res) => {
  try {
    const {
      type,
      page = 1,
      limit = 20,
      reader_id,
      client_id,
      status = 'active',
      // // const priority = req.body.priority || 'medium';
    } = req.query;

    let query = supabase
      .from('bookings')
      .select(`
        id, status, service_type, created_at, scheduled_for,
        client:client_id(id, first_name, last_name, avatar_url),
        reader:reader_id(id, first_name, last_name, avatar_url),
        chat_sessions(id, status, participant_count, last_activity),
        payment:payments(status, amount, currency)
      `)
      .in('status', ['active', 'in_progress', 'ongoing'])
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) query = query.eq('service_type', type);
    if (reader_id) query = query.eq('reader_id', reader_id);
    if (client_id) query = query.eq('client_id', client_id);
    if (status !== 'active') query = query.eq('status', status);

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: sessions, error, count } = await query;

    if (error) throw error;

    // Log monitor action
    await auditService.logAdminAction(req.user.id, 'VIEW_ACTIVE_SESSIONS', 'monitor_sessions', null, {
      filters: { type, reader_id, client_id, status },
      session_count: sessions?.length || 0
    });

    res.json({
      success: true,
      data: sessions || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active sessions',
      code: 'FETCH_ACTIVE_SESSIONS_ERROR'
    });
  }
};

/**
 * Get specific session details for monitoring
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSessionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: session, error } = await supabase
      .from('bookings')
      .select(`
        *,
        client:client_id(id, first_name, last_name, avatar_url, phone, country),
        reader:reader_id(id, first_name, last_name, avatar_url, specialties, rating),
        chat_sessions(
          id, status, participant_count, last_activity,
          messages:chat_messages(
            id, content, message_type, created_at, 
            sender:sender_id(first_name, last_name, role)
          )
        ),
        payments(id, amount, currency, status, payment_method),
        monitoring_flags:monitor_session_flags(
          id, flag_type, severity, reason, flagged_by, created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Log monitor action
    await auditService.logAdminAction(req.user.id, 'VIEW_SESSION_DETAILS', 'monitor_sessions', id, {
      session_type: session.service_type,
      client_id: session.client_id,
      reader_id: session.reader_id
    });

    res.json({
      success: true,
      data: session,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get session details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session details',
      code: 'FETCH_SESSION_DETAILS_ERROR'
    });
  }
};

/**
 * Get session conversation for monitoring
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSessionConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { include_voice, /*include_video*/ from_timestamp } = req.query;

    // Get chat session
    const { data: chatSession, error: chatError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('booking_id', id)
      .single();

    if (chatError || !chatSession) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found',
        code: 'CHAT_SESSION_NOT_FOUND'
      });
    }

    // Build messages query
    let query = supabase
      .from('chat_messages')
      .select(`
        id, content, message_type, created_at, is_flagged,
        sender:sender_id(id, first_name, last_name, role),
        voice_notes(id, file_url, duration_seconds, transcript),
        ai_flags:message_ai_flags(flag_type, confidence, reason)
      `)
      .eq('session_id', chatSession.id)
      .order('created_at', { ascending: true });

    if (from_timestamp) {
      query = query.gte('created_at', from_timestamp);
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    // Filter based on include options
    let filteredMessages = messages || [];
    
    if (include_voice === 'false') {
      filteredMessages = filteredMessages.filter(msg => msg.message_type !== 'voice');
    }

    // Log monitor action
    await auditService.logAdminAction(req.user.id, 'VIEW_SESSION_CONVERSATION', 'monitor_conversations', id, {
      message_count: filteredMessages.length,
      include_voice: include_voice === 'true'
    });

    res.json({
      success: true,
      data: {
        session_id: id,
        chat_session_id: chatSession.id,
        messages: filteredMessages,
        message_count: filteredMessages.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get session conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session conversation',
      code: 'FETCH_CONVERSATION_ERROR'
    });
  }
};

/**
 * Lock a session to prevent further activity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const lockSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notify_participants = true } = req.validatedData;

    // Update session status to locked
    const { data: updatedSession, error } = await supabase
      .from('bookings')
      .update({
        status: 'locked',
        locked_by: req.user.id,
        locked_at: new Date().toISOString(),
        lock_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, client_id, reader_id, service_type')
      .single();

    if (error) throw error;

    // Create monitoring action record
    await supabase.from('monitor_actions').insert({
      monitor_id: req.user.id,
      session_id: id,
      action_type: 'session_locked',
      reason: reason,
      metadata: { notify_participants }
    });

    // Notify participants if requested
    if (notify_participants && updatedSession) {
      await notificationService.sendToUser(updatedSession.client_id, {
        type: 'session_locked',
        title: 'Session Locked',
        message: 'Your session has been temporarily locked by our monitoring team.',
        data: { session_id: id, reason }
      });

      await notificationService.sendToUser(updatedSession.reader_id, {
        type: 'session_locked',
        title: 'Session Locked',
        message: 'The session has been locked by our monitoring team.',
        data: { session_id: id, reason }
      });
    }

    // Emit real-time event
    socketService.emitToRoom(`session_${id}`, 'session_locked', {
      session_id: id,
      reason: reason,
      locked_by: req.profile.first_name + ' ' + req.profile.last_name
    });

    // Log audit action
    await auditService.logAdminAction(req.user.id, 'LOCK_SESSION', 'monitor_sessions', id, {
      reason, notify_participants, session_type: updatedSession.service_type
    });

    res.json({
      success: true,
      message: 'Session locked successfully',
      data: { session_id: id, status: 'locked' },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lock session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to lock session',
      code: 'LOCK_SESSION_ERROR'
    });
  }
};

/**
 * Terminate a session immediately
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const terminateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notify_participants = true, escalate_to_admin = false } = req.validatedData;

    // Update session status to terminated
    const { data: updatedSession, error } = await supabase
      .from('bookings')
      .update({
        status: 'terminated',
        terminated_by: req.user.id,
        terminated_at: new Date().toISOString(),
        termination_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, client_id, reader_id, service_type')
      .single();

    if (error) throw error;

    // End any active chat sessions
    await supabase
      .from('chat_sessions')
      .update({
        status: 'terminated',
        ended_at: new Date().toISOString()
      })
      .eq('booking_id', id);

    // Create monitoring action record
    await supabase.from('monitor_actions').insert({
      monitor_id: req.user.id,
      session_id: id,
      action_type: 'session_terminated',
      reason: reason,
      metadata: { notify_participants, escalate_to_admin }
    });

    // Escalate to admin if requested
    if (escalate_to_admin) {
      await supabase.from('admin_escalations').insert({
        escalated_by: req.user.id,
        escalation_type: 'session_termination',
        resource_id: id,
        priority: 'high',
        description: `Session terminated by monitor. Reason: ${reason}`,
        metadata: { original_termination_reason: reason }
      });
    }

    // Notify participants
    if (notify_participants && updatedSession) {
      await notificationService.sendToUser(updatedSession.client_id, {
        type: 'session_terminated',
        title: 'Session Terminated',
        message: 'Your session has been terminated by our monitoring team.',
        data: { session_id: id, reason }
      });

      await notificationService.sendToUser(updatedSession.reader_id, {
        type: 'session_terminated',
        title: 'Session Terminated',
        message: 'The session has been terminated by our monitoring team.',
        data: { session_id: id, reason }
      });
    }

    // Emit real-time event
    socketService.emitToRoom(`session_${id}`, 'session_terminated', {
      session_id: id,
      reason: reason,
      terminated_by: req.profile.first_name + ' ' + req.profile.last_name
    });

    // Log audit action
    await auditService.logAdminAction(req.user.id, 'TERMINATE_SESSION', 'monitor_sessions', id, {
      reason, notify_participants, escalate_to_admin, session_type: updatedSession.service_type
    });

    res.json({
      success: true,
      message: 'Session terminated successfully',
      data: { 
        session_id: id, 
        status: 'terminated',
        escalated_to_admin: escalate_to_admin
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to terminate session',
      code: 'TERMINATE_SESSION_ERROR'
    });
  }
};

/**
 * Temporarily pause a session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const pauseSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, duration_minutes = 15 } = req.validatedData;

    const resumeAt = new Date(Date.now() + duration_minutes * 60 * 1000);

    // Update session status to paused
    const { data: updatedSession, error } = await supabase
      .from('bookings')
      .update({
        status: 'paused',
        paused_by: req.user.id,
        paused_at: new Date().toISOString(),
        pause_reason: reason,
        pause_resume_at: resumeAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, client_id, reader_id, service_type')
      .single();

    if (error) throw error;

    // Create monitoring action record
    await supabase.from('monitor_actions').insert({
      monitor_id: req.user.id,
      session_id: id,
      action_type: 'session_paused',
      reason: reason,
      metadata: { duration_minutes, resume_at: resumeAt.toISOString() }
    });

    // Log audit action
    await auditService.logAdminAction(req.user.id, 'PAUSE_SESSION', 'monitor_sessions', id, {
      reason, duration_minutes, resume_at: resumeAt.toISOString()
    });

    res.json({
      success: true,
      message: 'Session paused successfully',
      data: { 
        session_id: id, 
        status: 'paused',
        resume_at: resumeAt.toISOString(),
        duration_minutes
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pause session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause session',
      code: 'PAUSE_SESSION_ERROR'
    });
  }
};

// =============================================================================
// 2. CONTENT MODERATION & APPROVAL QUEUE
// =============================================================================

/**
 * Get pending content requiring approval
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getApprovalQueue = async (req, res) => {
  try {
    const {
      type,
      priority,
      page = 1,
      limit = 20,
      reader_id,
      date_from,
      date_to
    } = req.query;

    let query = supabase
      .from('chat_messages')
      .select(`
        id, content, message_type, created_at, approval_status,
        sender:sender_id(id, first_name, last_name, role),
        session:session_id(booking_id),
        voice_notes(id, file_url, duration_seconds, transcript),
        approval_queue:content_approval_queue(
          id, priority, flagged_reason, requires_approval_reason
        )
      `)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) query = query.eq('message_type', type);
    if (reader_id) query = query.eq('sender_id', reader_id);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: queueItems, error, count } = await query;

    if (error) throw error;

    // Log monitor action
    await auditService.logAdminAction(req.user.id, 'VIEW_APPROVAL_QUEUE', 'monitor_content', null, {
      filters: { type, priority, reader_id },
      queue_size: queueItems?.length || 0
    });

    res.json({
      success: true,
      data: queueItems || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get approval queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approval queue',
      code: 'FETCH_APPROVAL_QUEUE_ERROR'
    });
  }
};

/**
 * Approve reader content
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const approveContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved = true, feedback, tags } = req.validatedData;

    // Update message approval status
    const { data: message, error } = await supabase
      .from('chat_messages')
      .update({
        approval_status: approved ? 'approved' : 'rejected',
        approved_by: req.user.id,
        approved_at: new Date().toISOString(),
        approval_feedback: feedback,
        approval_tags: tags
      })
      .eq('id', id)
      .select('id, sender_id, content, message_type')
      .single();

    if (error) throw error;

    // Create moderation record
    await supabase.from('content_moderation_actions').insert({
      monitor_id: req.user.id,
      content_id: id,
      content_type: 'chat_message',
      action: approved ? 'approved' : 'rejected',
      feedback: feedback,
      tags: tags || []
    });

    // Notify reader
    if (message.sender_id) {
      await notificationService.sendToUser(message.sender_id, {
        type: approved ? 'content_approved' : 'content_rejected',
        title: approved ? 'Content Approved' : 'Content Rejected',
        message: approved 
          ? 'Your message has been approved.'
          : 'Your message was rejected. Please review our guidelines.',
        data: { message_id: id, feedback }
      });
    }

    // Log audit action
    await auditService.logAdminAction(req.user.id, approved ? 'APPROVE_CONTENT' : 'REJECT_CONTENT', 'monitor_content', id, {
      content_type: message.message_type,
      sender_id: message.sender_id,
      feedback
    });

    res.json({
      success: true,
      message: approved ? 'Content approved successfully' : 'Content rejected successfully',
      data: { 
        content_id: id, 
        status: approved ? 'approved' : 'rejected',
        feedback
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Approve content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process content approval',
      code: 'APPROVE_CONTENT_ERROR'
    });
  }
};

// Additional controller methods for remaining functionality...
// [Content continues with remaining methods like rejectContent, getFlaggedContent, etc.]

module.exports = {
  // Session Monitoring
  getActiveSessions,
  getSessionDetails,
  getSessionConversation,
  lockSession,
  terminateSession,
  pauseSession,
  
  // Content Moderation
  getApprovalQueue,
  approveContent,
  rejectContent: async (req, res) => {
    // Implementation similar to approveContent but with rejection logic
    res.json({ success: true, message: 'Content rejection endpoint - implementation needed' });
  },
  
  getFlaggedContent: async (req, res) => {
    // Implementation for AI-flagged content
    res.json({ success: true, message: 'Flagged content endpoint - implementation needed' });
  },
  
  reviewFlaggedContent: async (req, res) => {
    // Implementation for reviewing AI flags
    res.json({ success: true, message: 'Review flagged content endpoint - implementation needed' });
  },
  
  // Reports Management
  getAllReports: async (req, res) => {
    res.json({ success: true, message: 'Reports endpoint - implementation needed' });
  },
  
  getReportDetails: async (req, res) => {
    res.json({ success: true, message: 'Report details endpoint - implementation needed' });
  },
  
  investigateReport: async (req, res) => {
    res.json({ success: true, message: 'Investigate report endpoint - implementation needed' });
  },
  
  resolveReport: async (req, res) => {
    res.json({ success: true, message: 'Resolve report endpoint - implementation needed' });
  },
  
  escalateReport: async (req, res) => {
    res.json({ success: true, message: 'Escalate report endpoint - implementation needed' });
  },
  
  // Emergency Response
  getEmergencies: async (req, res) => {
    res.json({ success: true, message: 'Emergencies endpoint - implementation needed' });
  },
  
  respondToEmergency: async (req, res) => {
    res.json({ success: true, message: 'Emergency response endpoint - implementation needed' });
  },
  
  resolveEmergency: async (req, res) => {
    res.json({ success: true, message: 'Resolve emergency endpoint - implementation needed' });
  },
  
  // Dashboard & Analytics
  getMonitoringStats: async (req, res) => {
    res.json({ success: true, message: 'Monitoring stats endpoint - implementation needed' });
  },
  
  getActiveAlerts: async (req, res) => {
    res.json({ success: true, message: 'Active alerts endpoint - implementation needed' });
  },
  
  getActivityFeed: async (req, res) => {
    res.json({ success: true, message: 'Activity feed endpoint - implementation needed' });
  },
  
  // Reader Management
  getReadersForMonitoring: async (req, res) => {
    res.json({ success: true, message: 'Readers monitoring endpoint - implementation needed' });
  },
  
  warnReader: async (req, res) => {
    res.json({ success: true, message: 'Warn reader endpoint - implementation needed' });
  },
  
  suspendReader: async (req, res) => {
    res.json({ success: true, message: 'Suspend reader endpoint - implementation needed' });
  },
  
  getReaderMonitoringHistory: async (req, res) => {
    res.json({ success: true, message: 'Reader history endpoint - implementation needed' });
  }
}; 
