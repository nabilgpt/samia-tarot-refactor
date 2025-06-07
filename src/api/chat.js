// =============================================================================
// CHAT API - نظام الدردشة والرسائل الفورية
// =============================================================================
// Complete real-time chat system with voice notes and file sharing

const express = require('express');
const { supabaseAdmin: supabase } = require('./lib/supabase.js');
const multer = require('multer');

const rateLimit = require('express-rate-limit');


const router = express.Router();

// =============================================================================
// SUPABASE CLIENT SETUP
// =============================================================================
// Already imported above

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
    // Voice notes: audio files
    // Images: jpg, png, gif
    // Documents: pdf
    const allowedTypes = [
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
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
  max: 10, // 10 voice notes per minute
  message: {
    error: 'Too many voice messages, please wait',
    code: 'VOICE_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// MIDDLEWARE
// =============================================================================
const { authenticateToken } = require('./middleware/auth');

// =============================================================================
// VALIDATION HELPERS
// =============================================================================
const validateChatSession = (data) => {
  const errors = [];
  
  if (!data.booking_id && !data.participant_ids) {
    errors.push('Either booking_id or participant_ids is required');
  }
  
  if (data.participant_ids && (!Array.isArray(data.participant_ids) || data.participant_ids.length < 2)) {
    errors.push('At least 2 participants required');
  }
  
  return errors;
};

const validateMessage = (data) => {
  const errors = [];
  
  if (!data.session_id) {
    errors.push('Session ID is required');
  }
  
  if (!data.content && !data.file_url && data.type !== 'system') {
    errors.push('Message content or file is required');
  }
  
  if (data.type && !['text', 'voice', 'image', 'file', 'system'].includes(data.type)) {
    errors.push('Invalid message type');
  }
  
  if (data.content && data.content.length > 5000) {
    errors.push('Message content too long (max 5000 characters)');
  }
  
  return errors;
};

// =============================================================================
// SOCKET.IO SETUP (will be imported by main server)
// =============================================================================
const setupChatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Chat socket connected:', socket.id);
    
    // Join chat session
    socket.on('join_chat', async (data) => {
      try {
        const { session_id, user_id } = data;
        
        // Verify user has access to this chat session
        const { data: session, error } = await supabase
          .from('chat_sessions')
          .select('id, participants')
          .eq('id', session_id)
          .single();
        
        if (!error && session && session.participants.includes(user_id)) {
          socket.join(`chat_${session_id}`);
          socket.userId = user_id;
          socket.sessionId = session_id;
          
          // Notify others user joined
          socket.to(`chat_${session_id}`).emit('user_joined', {
            user_id,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Join chat error:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });
    
    // Handle typing indicators
    socket.on('typing_start', (data) => {
      if (socket.sessionId && socket.userId) {
        socket.to(`chat_${socket.sessionId}`).emit('user_typing', {
          user_id: socket.userId,
          is_typing: true
        });
      }
    });
    
    socket.on('typing_stop', (data) => {
      if (socket.sessionId && socket.userId) {
        socket.to(`chat_${socket.sessionId}`).emit('user_typing', {
          user_id: socket.userId,
          is_typing: false
        });
      }
    });
    
    // Handle real-time message delivery
    socket.on('send_message', async (data) => {
      try {
        const { session_id, message } = data;
        
        if (socket.sessionId === session_id && socket.userId) {
          // Broadcast message to all users in the session
          io.to(`chat_${session_id}`).emit('new_message', {
            ...message,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle message reactions
    socket.on('message_reaction', async (data) => {
      try {
        const { message_id, reaction } = data;
        
        if (socket.sessionId && socket.userId) {
          // Update reaction in database
          const { error } = await supabase
            .from('message_reactions')
            .upsert({
              message_id,
              user_id: socket.userId,
              reaction
            });
          
          if (!error) {
            // Broadcast reaction to session
            io.to(`chat_${socket.sessionId}`).emit('message_reaction_update', {
              message_id,
              user_id: socket.userId,
              reaction
            });
          }
        }
      } catch (error) {
        console.error('Message reaction error:', error);
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.sessionId && socket.userId) {
        socket.to(`chat_${socket.sessionId}`).emit('user_left', {
          user_id: socket.userId,
          timestamp: new Date().toISOString()
        });
      }
      console.log('Chat socket disconnected:', socket.id);
    });
  });
};

// =============================================================================
// API ENDPOINTS
// =============================================================================

// GET /api/chat/sessions - List chat sessions
router.get('/sessions', chatRateLimit, authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'active',
      booking_id
    } = req.query;
    
    const userId = req.user.id;
    
    let query = supabase
      .from('chat_sessions')
      .select(`
        id, booking_id, session_type, status, created_at, updated_at,
        last_message_at, participants,
        bookings (
          id, services(name, type),
          profiles!bookings_user_id_fkey (first_name, last_name, avatar_url),
          profiles!bookings_reader_id_fkey (first_name, last_name, avatar_url)
        )
      `)
      .contains('participants', [userId]);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (booking_id) {
      query = query.eq('booking_id', booking_id);
    }
    
    query = query.order('last_message_at', { ascending: false });
    
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + parseInt(limit) - 1);
    
    const { data: sessions, error, count } = await query;
    
    if (error) {
      console.error('Error fetching chat sessions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch chat sessions',
        code: 'FETCH_ERROR'
      });
    }
    
    // Get unread message counts for each session
    for (let session of sessions) {
      const { count: unreadCount } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact' })
        .eq('session_id', session.id)
        .eq('is_read', false)
        .neq('sender_id', userId);
      
      session.unread_count = unreadCount || 0;
    }
    
    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Chat sessions fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/chat/sessions/:id - Get session details
router.get('/sessions/:id', chatRateLimit, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select(`
        id, booking_id, session_type, status, created_at, updated_at,
        last_message_at, participants, metadata,
        bookings (
          id, scheduled_at, status, services(name, type, price),
          profiles!bookings_user_id_fkey (
            id, first_name, last_name, avatar_url, timezone
          ),
          profiles!bookings_reader_id_fkey (
            id, first_name, last_name, avatar_url, specialties
          )
        )
      `)
      .eq('id', id)
      .contains('participants', [userId])
      .single();
    
    if (error || !session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found or access denied',
        code: 'SESSION_NOT_FOUND'
      });
    }
    
    // Get participant details
    const { data: participantProfiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, role')
      .in('id', session.participants);
    
    session.participant_profiles = participantProfiles || [];
    
    // Mark messages as read for this user
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('session_id', id)
      .neq('sender_id', userId);
    
    res.json({
      success: true,
      data: session
    });
    
  } catch (error) {
    console.error('Chat session fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/chat/sessions - Create chat session
router.post('/sessions', chatRateLimit, authenticateToken, async (req, res) => {
  try {
    const sessionData = req.body;
    const userId = req.user.id;
    
    const validationErrors = validateChatSession(sessionData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }
    
    let participants = [userId];
    let bookingId = null;
    
    if (sessionData.booking_id) {
      // Create session for a booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('user_id, reader_id')
        .eq('id', sessionData.booking_id)
        .single();
      
      if (bookingError || !booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found',
          code: 'BOOKING_NOT_FOUND'
        });
      }
      
      participants = [booking.user_id, booking.reader_id];
      bookingId = sessionData.booking_id;
      
      // Check if session already exists for this booking
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('booking_id', bookingId)
        .single();
      
      if (existingSession) {
        return res.json({
          success: true,
          data: existingSession,
          message: 'Chat session already exists'
        });
      }
    } else {
      // Manual session creation
      participants = sessionData.participant_ids;
    }
    
    const newSession = {
      booking_id: bookingId,
      session_type: sessionData.session_type || 'booking',
      status: 'active',
      participants: participants,
      metadata: sessionData.metadata || {}
    };
    
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert([newSession])
      .select()
      .single();
    
    if (sessionError) {
      console.error('Chat session creation error:', sessionError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create chat session',
        code: 'SESSION_CREATION_ERROR'
      });
    }
    
    // Send welcome message
    if (bookingId) {
      await supabase
        .from('chat_messages')
        .insert([{
          session_id: session.id,
          sender_id: userId,
          content: 'Chat session started for your booking. Feel free to ask any questions!',
          type: 'system'
        }]);
    }
    
    // Send notifications to participants
    const notifications = participants
      .filter(participantId => participantId !== userId)
      .map(participantId => ({
        user_id: participantId,
        title: 'New Chat Session',
        message: 'A new chat session has been started',
        type: 'chat',
        data: { session_id: session.id }
      }));
    
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }
    
    res.status(201).json({
      success: true,
      data: session,
      message: 'Chat session created successfully'
    });
    
  } catch (error) {
    console.error('Chat session creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/chat/messages - Get messages for a session
router.get('/messages', chatRateLimit, authenticateToken, async (req, res) => {
  try {
    const {
      session_id,
      page = 1,
      limit = 50,
      before_message_id
    } = req.query;
    
    const userId = req.user.id;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
        code: 'SESSION_ID_REQUIRED'
      });
    }
    
    // Verify user has access to this session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('participants')
      .eq('id', session_id)
      .single();
    
    if (sessionError || !session || !session.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this chat session',
        code: 'ACCESS_DENIED'
      });
    }
    
    let query = supabase
      .from('chat_messages')
      .select(`
        id, session_id, sender_id, content, type, file_url, file_name,
        file_size, metadata, is_read, created_at, updated_at,
        profiles!chat_messages_sender_id_fkey (
          first_name, last_name, avatar_url
        ),
        message_reactions (
          user_id, reaction,
          profiles!message_reactions_user_id_fkey (first_name, last_name)
        )
      `)
      .eq('session_id', session_id);
    
    if (before_message_id) {
      // For pagination - get messages before a specific message
      const { data: beforeMessage } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('id', before_message_id)
        .single();
      
      if (beforeMessage) {
        query = query.lt('created_at', beforeMessage.created_at);
      }
    }
    
    query = query.order('created_at', { ascending: false });
    query = query.limit(parseInt(limit));
    
    const { data: messages, error } = await query;
    
    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch messages',
        code: 'FETCH_ERROR'
      });
    }
    
    // Reverse to show oldest first
    messages.reverse();
    
    res.json({
      success: true,
      data: {
        messages,
        has_more: messages.length === parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/chat/messages - Send message
router.post('/messages', chatRateLimit, authenticateToken, async (req, res) => {
  try {
    const messageData = req.body;
    const userId = req.user.id;
    
    const validationErrors = validateMessage(messageData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }
    
    // Verify user has access to this session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('participants, status')
      .eq('id', messageData.session_id)
      .single();
    
    if (sessionError || !session || !session.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this chat session',
        code: 'ACCESS_DENIED'
      });
    }
    
    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot send messages to inactive session',
        code: 'SESSION_INACTIVE'
      });
    }
    
    const newMessage = {
      session_id: messageData.session_id,
      sender_id: userId,
      content: messageData.content,
      type: messageData.type || 'text',
      file_url: messageData.file_url,
      file_name: messageData.file_name,
      file_size: messageData.file_size,
      metadata: messageData.metadata || {}
    };
    
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert([newMessage])
      .select(`
        id, session_id, sender_id, content, type, file_url, file_name,
        file_size, metadata, is_read, created_at,
        profiles!chat_messages_sender_id_fkey (
          first_name, last_name, avatar_url
        )
      `)
      .single();
    
    if (messageError) {
      console.error('Message creation error:', messageError);
      return res.status(500).json({
        success: false,
        error: 'Failed to send message',
        code: 'MESSAGE_CREATION_ERROR'
      });
    }
    
    // Update session last message time
    await supabase
      .from('chat_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', messageData.session_id);
    
    // Send notifications to other participants
    const otherParticipants = session.participants.filter(id => id !== userId);
    const notifications = otherParticipants.map(participantId => ({
      user_id: participantId,
      title: 'New Message',
      message: message.type === 'text' ? 
        (message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content) :
        `New ${message.type} message`,
      type: 'chat',
      data: { 
        session_id: messageData.session_id,
        message_id: message.id
      }
    }));
    
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }
    
    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully'
    });
    
  } catch (error) {
    console.error('Message send error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/chat/voice-notes - Upload voice note
router.post('/voice-notes', voiceRateLimit, authenticateToken, upload.single('voice_note'), async (req, res) => {
  try {
    const { session_id } = req.body;
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Voice note file is required',
        code: 'FILE_REQUIRED'
      });
    }
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
        code: 'SESSION_ID_REQUIRED'
      });
    }
    
    // Verify user has access to this session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('participants')
      .eq('id', session_id)
      .single();
    
    if (sessionError || !session || !session.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this chat session',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `voice_notes/${session_id}/${userId}_${Date.now()}.${fileExtension}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });
    
    if (uploadError) {
      console.error('Voice note upload error:', uploadError);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload voice note',
        code: 'UPLOAD_ERROR'
      });
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(fileName);
    
    const voiceNoteData = {
      session_id: session_id,
      sender_id: userId,
      content: 'Voice message',
      type: 'voice',
      file_url: urlData.publicUrl,
      file_name: req.file.originalname,
      file_size: req.file.size,
      metadata: {
        duration: req.body.duration || null,
        audio_format: fileExtension
      }
    };
    
    // Create message record
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert([voiceNoteData])
      .select(`
        id, session_id, sender_id, content, type, file_url, file_name,
        file_size, metadata, created_at,
        profiles!chat_messages_sender_id_fkey (
          first_name, last_name, avatar_url
        )
      `)
      .single();
    
    if (messageError) {
      console.error('Voice note message creation error:', messageError);
      // Clean up uploaded file
      await supabase.storage.from('chat-files').remove([fileName]);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create voice note message',
        code: 'MESSAGE_CREATION_ERROR'
      });
    }
    
    // Update session last message time
    await supabase
      .from('chat_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', session_id);
    
    res.status(201).json({
      success: true,
      data: message,
      message: 'Voice note uploaded successfully'
    });
    
  } catch (error) {
    console.error('Voice note upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/chat/messages/:id/read - Mark message as read
router.put('/messages/:id/read', chatRateLimit, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verify message exists and user has access
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select(`
        id, session_id, sender_id,
        chat_sessions!inner(participants)
      `)
      .eq('id', id)
      .single();
    
    if (messageError || !message || !message.chat_sessions.participants.includes(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Message not found or access denied',
        code: 'MESSAGE_NOT_FOUND'
      });
    }
    
    // Don't mark own messages as read
    if (message.sender_id === userId) {
      return res.json({
        success: true,
        message: 'Cannot mark own message as read'
      });
    }
    
    // Mark as read
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('id', id);
    
    if (updateError) {
      console.error('Mark as read error:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to mark message as read',
        code: 'UPDATE_ERROR'
      });
    }
    
    res.json({
      success: true,
      message: 'Message marked as read'
    });
    
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
router.use((error, req, res, next) => {
  console.error('Chat API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

module.exports = { router, setupChatSocket }; 