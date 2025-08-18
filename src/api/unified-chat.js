// =============================================================================
// UNIFIED CHAT API - Real-time Chat & Audio System
// =============================================================================
// Complete unified chat system using consolidated database schema

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireRole } from './middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =============================================================================
// FILE UPLOAD CONFIGURATION
// =============================================================================
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow audio, image, and document files
    const allowedTypes = [
      'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// =============================================================================
// RATE LIMITING
// =============================================================================
const chatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 messages per minute
  message: {
    error: 'Too many messages sent, please slow down',
    code: 'CHAT_RATE_LIMIT_EXCEEDED'
  }
});

const voiceRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 voice messages per minute
  message: {
    error: 'Too many voice messages sent, please slow down',
    code: 'VOICE_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate message data
 */
const validateMessage = (messageData) => {
  const errors = [];
  
  if (!messageData.session_id) {
    errors.push('Session ID is required');
  }
  
  if (!messageData.type) {
    messageData.type = 'text';
  }
  
  if (!['text', 'audio', 'image', 'file', 'video', 'system', 'emergency'].includes(messageData.type)) {
    errors.push('Invalid message type');
  }
  
  if (messageData.type === 'text' && !messageData.content?.trim()) {
    errors.push('Text content is required for text messages');
  }
  
  return errors;
};

/**
 * Check if user has access to session
 */
const checkSessionAccess = async (sessionId, userId) => {
  try {
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('participants, status')
      .eq('id', sessionId)
      .single();
    
    if (error || !session) {
      return { hasAccess: false, error: 'Session not found' };
    }
    
    if (!session.participants.includes(userId)) {
      return { hasAccess: false, error: 'Access denied to this session' };
    }
    
    return { hasAccess: true, session };
  } catch (error) {
    return { hasAccess: false, error: error.message };
  }
};

/**
 * Generate secure file path for chat files
 */
const generateFilePath = (sessionId, userId, originalName) => {
  const timestamp = Date.now();
  const fileExt = originalName.split('.').pop();
  return `${sessionId}/${userId}/${timestamp}.${fileExt}`;
};

// =============================================================================
// CHAT SESSION ROUTES
// =============================================================================

/**
 * @route GET /api/chat/sessions
 * @desc Get user's chat sessions
 * @access Private
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    console.log(`💬 [CHAT] Fetching sessions for user: ${req.user.id}`);
    
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        participants,
        type,
        booking_id,
        status,
        title,
        last_message_at,
        created_at,
        updated_at,
        metadata,
        bookings (
          id,
          service_name,
          scheduled_for
        )
      `)
      .contains('participants', [req.user.id])
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [CHAT] Error fetching sessions:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch chat sessions',
        details: error.message 
      });
    }

    // Get unread message counts for each session
    const sessionsWithUnread = await Promise.all(
      sessions.map(async (session) => {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .neq('sender_id', req.user.id)
          .eq('is_read', false);

        return {
          ...session,
          unread_count: count || 0
        };
      })
    );

    console.log(`✅ [CHAT] Found ${sessions.length} sessions for user`);
    res.json({ sessions: sessionsWithUnread });

  } catch (error) {
    console.error('💥 [CHAT] Sessions fetch error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

/**
 * @route POST /api/chat/sessions
 * @desc Create new chat session
 * @access Private
 */
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { participants, type = 'booking', booking_id, title } = req.body;

    console.log(`💬 [CHAT] Creating session for participants:`, participants);

    // Validate participants
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ 
        error: 'Participants array is required and must not be empty' 
      });
    }

    // Ensure current user is in participants
    const allParticipants = [...new Set([req.user.id, ...participants])];

    // Validate all participants exist
    const { data: validUsers, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .in('id', allParticipants);

    if (userError || validUsers.length !== allParticipants.length) {
      return res.status(400).json({ 
        error: 'One or more participants not found' 
      });
    }

    // Create the session
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        participants: allParticipants,
        type,
        booking_id,
        title,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [CHAT] Error creating session:', error);
      return res.status(500).json({ 
        error: 'Failed to create chat session',
        details: error.message 
      });
    }

    console.log(`✅ [CHAT] Session created: ${session.id}`);
    res.status(201).json({ session });

  } catch (error) {
    console.error('💥 [CHAT] Session creation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/chat/sessions/:sessionId
 * @desc Get specific session details
 * @access Private
 */
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        participants,
        type,
        booking_id,
        status,
        title,
        last_message_at,
        created_at,
        updated_at,
        metadata,
        bookings (
          id,
          service_name,
          scheduled_for
        )
      `)
      .eq('id', sessionId)
      .contains('participants', [req.user.id])
      .single();

    if (error) {
      console.error('❌ [CHAT] Error fetching session:', error);
      return res.status(404).json({ 
        error: 'Session not found or access denied' 
      });
    }

    console.log(`✅ [CHAT] Session fetched: ${sessionId}`);
    res.json({ session });

  } catch (error) {
    console.error('💥 [CHAT] Session fetch error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// =============================================================================
// MESSAGE ROUTES
// =============================================================================

/**
 * @route GET /api/chat/sessions/:sessionId/messages
 * @desc Get messages from a chat session
 * @access Private
 */
router.get('/sessions/:sessionId/messages', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { limit = 50, offset = 0, before } = req.query;
    
    // Check session access
    const accessCheck = await checkSessionAccess(sessionId, userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        error: accessCheck.error,
        code: 'ACCESS_DENIED'
      });
    }
    
    let query = supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!chat_messages_sender_id_fkey(
          id, first_name, last_name, avatar_url, role
        ),
        reply_to:chat_messages!chat_messages_reply_to_message_id_fkey(
          id, content, type,
          sender:profiles!chat_messages_sender_id_fkey(
            first_name, last_name
          )
        )
      `)
      .eq('session_id', sessionId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (before) {
      query = query.lt('created_at', before);
    }
    
    const { data: messages, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      message: 'Messages retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @route POST /api/chat/sessions/:sessionId/messages
 * @desc Send a message to a chat session
 * @access Private
 */
router.post('/sessions/:sessionId/messages', chatRateLimit, authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const messageData = req.body;
    
    // Validate message data
    const validationErrors = validateMessage({ ...messageData, session_id: sessionId });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }
    
    // Check session access
    const accessCheck = await checkSessionAccess(sessionId, userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        error: accessCheck.error,
        code: 'ACCESS_DENIED'
      });
    }
    
    if (accessCheck.session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot send messages to inactive session',
        code: 'SESSION_INACTIVE'
      });
    }
    
    const newMessage = {
      session_id: sessionId,
      sender_id: userId,
      type: messageData.type || 'text',
      content: messageData.content,
      file_url: messageData.file_url,
      file_name: messageData.file_name,
      file_size: messageData.file_size,
      file_type: messageData.file_type,
      duration_seconds: messageData.duration_seconds,
      waveform_data: messageData.waveform_data,
      reply_to_message_id: messageData.reply_to_message_id,
      metadata: messageData.metadata || {}
    };
    
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert([newMessage])
      .select(`
        *,
        sender:profiles!chat_messages_sender_id_fkey(
          id, first_name, last_name, avatar_url, role
        )
      `)
      .single();
    
    if (messageError) throw messageError;
    
    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully'
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// FILE UPLOAD ROUTES
// =============================================================================

/**
 * @route POST /api/chat/sessions/:sessionId/upload
 * @desc Upload file to chat session
 * @access Private
 */
router.post('/sessions/:sessionId/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File is required',
        code: 'FILE_REQUIRED'
      });
    }
    
    // Check session access
    const accessCheck = await checkSessionAccess(sessionId, userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        error: accessCheck.error,
        code: 'ACCESS_DENIED'
      });
    }
    
    // Generate file path
    const filePath = generateFilePath(sessionId, userId, req.file.originalname);
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });
    
    if (uploadError) {
      console.error('File upload error:', uploadError);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload file',
        code: 'UPLOAD_ERROR'
      });
    }
    
    // Get signed URL for the file
    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);
    
    // Determine message type based on file type
    let messageType = 'file';
    if (req.file.mimetype.startsWith('image/')) {
      messageType = 'image';
    } else if (req.file.mimetype.startsWith('audio/')) {
      messageType = 'audio';
    } else if (req.file.mimetype.startsWith('video/')) {
      messageType = 'video';
    }
    
    // Create message record
    const messageData = {
      session_id: sessionId,
      sender_id: userId,
      type: messageType,
      content: req.body.caption || `${messageType.charAt(0).toUpperCase() + messageType.slice(1)} attachment`,
      file_url: urlData.publicUrl,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: req.file.mimetype,
      duration_seconds: req.body.duration || null,
      metadata: {
        upload_timestamp: new Date().toISOString(),
        original_name: req.file.originalname
      }
    };
    
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert([messageData])
      .select(`
        *,
        sender:profiles!chat_messages_sender_id_fkey(
          id, first_name, last_name, avatar_url, role
        )
      `)
      .single();
    
    if (messageError) {
      console.error('Message creation error:', messageError);
      // Clean up uploaded file
      await supabase.storage.from('chat-files').remove([filePath]);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create message record',
        code: 'MESSAGE_CREATION_ERROR'
      });
    }
    
    res.status(201).json({
      success: true,
      data: message,
      message: 'File uploaded successfully'
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// VOICE MESSAGE ROUTES
// =============================================================================

/**
 * @route POST /api/chat/sessions/:sessionId/voice
 * @desc Upload voice message to chat session
 * @access Private
 */
router.post('/sessions/:sessionId/voice', voiceRateLimit, authenticateToken, upload.single('voice'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { duration } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Voice file is required',
        code: 'FILE_REQUIRED'
      });
    }
    
    // Check session access
    const accessCheck = await checkSessionAccess(sessionId, userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        error: accessCheck.error,
        code: 'ACCESS_DENIED'
      });
    }
    
    // Generate file path for voice message
    const filePath = generateFilePath(sessionId, userId, `voice_${Date.now()}.webm`);
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });
    
    if (uploadError) {
      console.error('Voice upload error:', uploadError);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload voice message',
        code: 'UPLOAD_ERROR'
      });
    }
    
    // Get signed URL
    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);
    
    // Create voice message record
    const voiceMessageData = {
      session_id: sessionId,
      sender_id: userId,
      type: 'audio',
      content: 'Voice message',
      file_url: urlData.publicUrl,
      file_name: req.file.originalname || 'voice_message.webm',
      file_size: req.file.size,
      file_type: req.file.mimetype,
      duration_seconds: duration ? parseInt(duration) : null,
      status: 'sent', // Voice approval can be implemented later if needed
      metadata: {
        audio_format: req.file.mimetype,
        recorded_at: new Date().toISOString()
      }
    };
    
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert([voiceMessageData])
      .select(`
        *,
        sender:profiles!chat_messages_sender_id_fkey(
          id, first_name, last_name, avatar_url, role
        )
      `)
      .single();
    
    if (messageError) {
      console.error('Voice message creation error:', messageError);
      // Clean up uploaded file
      await supabase.storage.from('chat-files').remove([filePath]);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create voice message',
        code: 'MESSAGE_CREATION_ERROR'
      });
    }
    
    res.status(201).json({
      success: true,
      data: message,
      message: 'Voice message sent successfully'
    });
    
  } catch (error) {
    console.error('Voice message error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// MESSAGE MANAGEMENT ROUTES
// =============================================================================

/**
 * @route PUT /api/chat/messages/:messageId/read
 * @desc Mark message as read
 * @access Private
 */
router.put('/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    
    // Get message and check access
    const { data: message, error: fetchError } = await supabase
      .from('chat_messages')
      .select('session_id, read_by')
      .eq('id', messageId)
      .single();
    
    if (fetchError || !message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }
    
    // Check session access
    const accessCheck = await checkSessionAccess(message.session_id, userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        error: accessCheck.error,
        code: 'ACCESS_DENIED'
      });
    }
    
    // Add user to read_by array if not already there
    const readBy = message.read_by || [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ read_by: readBy })
        .eq('id', messageId);
      
      if (updateError) throw updateError;
    }
    
    res.json({
      success: true,
      message: 'Message marked as read'
    });
    
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * @route DELETE /api/chat/messages/:messageId
 * @desc Delete a message (soft delete)
 * @access Private
 */
router.delete('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    
    // Get message and check ownership
    const { data: message, error: fetchError } = await supabase
      .from('chat_messages')
      .select('sender_id, created_at, file_url, session_id')
      .eq('id', messageId)
      .single();
    
    if (fetchError || !message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }
    
    if (message.sender_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own messages',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Check if message is within deletion window (5 minutes)
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    if (messageAge > 5 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        error: 'Messages can only be deleted within 5 minutes',
        code: 'DELETION_WINDOW_EXPIRED'
      });
    }
    
    // Soft delete the message
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        content: '[Message deleted]'
      })
      .eq('id', messageId);
    
    if (deleteError) throw deleteError;
    
    // Delete file from storage if exists
    if (message.file_url) {
      try {
        const fileName = message.file_url.split('/').pop();
        await supabase.storage
          .from('chat-files')
          .remove([`${message.session_id}/${userId}/${fileName}`]);
      } catch (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Don't fail the request if file deletion fails
      }
    }
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// ADMIN ROUTES
// =============================================================================

/**
 * @route GET /api/chat/admin/messages/pending-approval
 * @desc Get messages pending approval (for voice messages)
 * @access Admin
 */
router.get('/admin/messages/pending-approval', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(
            id, first_name, last_name, avatar_url, role
          ),
          session:chat_sessions!chat_messages_session_id_fkey(
            id, type, participants
          )
        `)
        .eq('type', 'audio')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      res.json({
        success: true,
        data: messages,
        message: 'Pending approval messages retrieved'
      });
      
    } catch (error) {
      console.error('Error fetching pending messages:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * @route PUT /api/chat/admin/messages/:messageId/approve
 * @desc Approve or reject a voice message
 * @access Admin
 */
router.put('/admin/messages/:messageId/approve', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const { approved } = req.body;
      const adminId = req.user.id;
      
      if (typeof approved !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Approved status must be boolean',
          code: 'VALIDATION_ERROR'
        });
      }
      
      const updateData = {
        status: approved ? 'approved' : 'rejected',
        approved_by: adminId,
        approved_at: new Date().toISOString()
      };
      
      const { data: message, error } = await supabase
        .from('chat_messages')
        .update(updateData)
        .eq('id', messageId)
        .eq('type', 'audio')
        .select()
        .single();
      
      if (error) throw error;
      
      res.json({
        success: true,
        data: message,
        message: `Voice message ${approved ? 'approved' : 'rejected'} successfully`
      });
      
    } catch (error) {
      console.error('Error updating message approval:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// =============================================================================
// MONITORING & ADMIN ENDPOINTS
// =============================================================================

/**
 * @route GET /api/chat/monitoring/:sessionId
 * @desc Get monitoring data for a session (admin only)
 * @access Admin
 */
router.get('/monitoring/:sessionId', authenticateToken, async (req, res) => {
  try {
    // Check admin access
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { sessionId } = req.params;

    const { data: monitoring, error } = await supabase
      .from('chat_monitoring')
      .select(`
        id,
        session_id,
        user_id,
        event_type,
        timestamp,
        metadata,
        profiles!chat_monitoring_user_id_fkey (
          full_name
        )
      `)
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ [CHAT] Error fetching monitoring data:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch monitoring data',
        details: error.message 
      });
    }

    res.json({ monitoring });

  } catch (error) {
    console.error('💥 [CHAT] Monitoring fetch error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/chat/audit
 * @desc Get audit logs (admin only)
 * @access Admin
 */
router.get('/audit', authenticateToken, async (req, res) => {
  try {
    // Check admin access
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { limit = 100, offset = 0, session_id, user_id } = req.query;

    let query = supabase
      .from('chat_audit_logs')
      .select(`
        id,
        user_id,
        action,
        table_name,
        record_id,
        session_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        timestamp,
        metadata,
        profiles!chat_audit_logs_user_id_fkey (
          full_name
        )
      `)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (session_id) {
      query = query.eq('session_id', session_id);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: audit, error } = await query;

    if (error) {
      console.error('❌ [CHAT] Error fetching audit logs:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch audit logs',
        details: error.message 
      });
    }

    res.json({ audit });

  } catch (error) {
    console.error('💥 [CHAT] Audit fetch error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

router.use((error, req, res, next) => {
  console.error('Chat API Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
  }
  
  if (error.message === 'File type not allowed') {
    return res.status(400).json({ error: 'File type not allowed. Supported: audio, image, PDF, text.' });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

export default router; 