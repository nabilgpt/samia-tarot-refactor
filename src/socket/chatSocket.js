// =============================================================================
// SOCKET.IO CHAT HANDLER - إعداد الدردشة الفورية
// =============================================================================
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Store active connections
const activeConnections = new Map(); // userId -> Set of socketIds
const userSessions = new Map(); // sessionId -> Set of userIds
const typingUsers = new Map(); // sessionId -> Set of userIds

/**
 * Initialize Socket.IO for unified chat system
 * @param {import('http').Server} server - HTTP server instance
 */
export function initializeChatSocket(server) {
    console.log('🔌 Initializing Unified Chat Socket.IO...');

    const io = new Server(server, {
        cors: {
            origin: function (origin, callback) {
                const allowedOrigins = [
                    'http://localhost:3000',
                    'http://localhost:5173',
                    'https://samia-tarot.netlify.app',
                    'https://samia-tarot.vercel.app'
                ];
                
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Authentication middleware for Socket.IO
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                console.log('❌ [SOCKET] No token provided');
                return next(new Error('Authentication token required'));
            }

            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user profile from database
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, email, role, full_name, avatar_url')
                .eq('id', decoded.user_id)
                .single();

            if (error || !profile) {
                console.log('❌ [SOCKET] User not found:', decoded.user_id);
                return next(new Error('User not found'));
            }

            socket.user = profile;
            console.log(`✅ [SOCKET] User authenticated: ${profile.email} (${profile.role})`);
            next();

        } catch (error) {
            console.log('❌ [SOCKET] Authentication failed:', error.message);
            next(new Error('Authentication failed'));
        }
    });

    // Handle new connections
    io.on('connection', (socket) => {
        const userId = socket.user.id;
        const userEmail = socket.user.email;
        
        console.log(`🔌 [SOCKET] User connected: ${userEmail} (Socket: ${socket.id})`);

        // Track active connection
        if (!activeConnections.has(userId)) {
            activeConnections.set(userId, new Set());
        }
        activeConnections.get(userId).add(socket.id);

        // Log monitoring event
        logMonitoringEvent(userId, 'user_connected', {
            socket_id: socket.id,
            user_agent: socket.handshake.headers['user-agent'],
            ip_address: socket.handshake.address
        });

        // =====================================================================
        // SESSION MANAGEMENT
        // =====================================================================

        /**
         * Join a chat session
         */
        socket.on('join_session', async (data) => {
            try {
                const { session_id } = data;
                
                if (!session_id) {
                    socket.emit('error', { message: 'Session ID is required' });
                    return;
                }

                console.log(`💬 [SOCKET] User ${userEmail} joining session: ${session_id}`);

                // Verify user has access to this session
                const { data: session, error } = await supabase
                    .from('chat_sessions')
                    .select('id, participants, type, status')
                    .eq('id', session_id)
                    .contains('participants', [userId])
                    .single();

                if (error || !session) {
                    socket.emit('error', { 
                        message: 'Session not found or access denied',
                        code: 'SESSION_ACCESS_DENIED'
                    });
                    return;
                }

                // Join the session room
                socket.join(session_id);
                
                // Track session participation
                if (!userSessions.has(session_id)) {
                    userSessions.set(session_id, new Set());
                }
                userSessions.get(session_id).add(userId);

                // Notify other participants
                socket.to(session_id).emit('user_joined', {
                    user_id: userId,
                    user_name: socket.user.full_name,
                    timestamp: new Date().toISOString()
                });

                // Send join confirmation
                socket.emit('session_joined', {
                    session_id,
                    participants_online: Array.from(userSessions.get(session_id))
                });

                // Log monitoring event
                await logMonitoringEvent(userId, 'session_joined', { session_id });

                console.log(`✅ [SOCKET] User ${userEmail} joined session: ${session_id}`);

            } catch (error) {
                console.error('❌ [SOCKET] Join session error:', error);
                socket.emit('error', { 
                    message: 'Failed to join session',
                    code: 'JOIN_SESSION_ERROR'
                });
            }
        });

        /**
         * Leave a chat session
         */
        socket.on('leave_session', async (data) => {
            try {
                const { session_id } = data;
                
                if (!session_id) {
                    socket.emit('error', { message: 'Session ID is required' });
                    return;
                }

                console.log(`💬 [SOCKET] User ${userEmail} leaving session: ${session_id}`);

                // Leave the session room
                socket.leave(session_id);

                // Remove from session tracking
                if (userSessions.has(session_id)) {
                    userSessions.get(session_id).delete(userId);
                    if (userSessions.get(session_id).size === 0) {
                        userSessions.delete(session_id);
                    }
                }

                // Stop typing if user was typing
                if (typingUsers.has(session_id)) {
                    typingUsers.get(session_id).delete(userId);
                    socket.to(session_id).emit('user_stopped_typing', {
                        user_id: userId,
                        user_name: socket.user.full_name
                    });
                }

                // Notify other participants
                socket.to(session_id).emit('user_left', {
                    user_id: userId,
                    user_name: socket.user.full_name,
                    timestamp: new Date().toISOString()
                });

                // Log monitoring event
                await logMonitoringEvent(userId, 'session_left', { session_id });

                console.log(`✅ [SOCKET] User ${userEmail} left session: ${session_id}`);

            } catch (error) {
                console.error('❌ [SOCKET] Leave session error:', error);
                socket.emit('error', { 
                    message: 'Failed to leave session',
                    code: 'LEAVE_SESSION_ERROR'
                });
            }
        });

        // =====================================================================
        // REAL-TIME MESSAGING
        // =====================================================================

        /**
         * Send a message
         */
        socket.on('send_message', async (data) => {
            try {
                const { 
                    session_id, 
                    type = 'text', 
                    content = '', 
                    reply_to_message_id,
                    metadata = {} 
                } = data;

                if (!session_id) {
                    socket.emit('error', { message: 'Session ID is required' });
                    return;
                }

                console.log(`💬 [SOCKET] Message from ${userEmail} in session: ${session_id}`);

                // Verify user has access to this session
                const { data: session, error: sessionError } = await supabase
                    .from('chat_sessions')
                    .select('id, participants')
                    .eq('id', session_id)
                    .contains('participants', [userId])
                    .single();

                if (sessionError || !session) {
                    socket.emit('error', { 
                        message: 'Session not found or access denied',
                        code: 'SESSION_ACCESS_DENIED'
                    });
                    return;
                }

                // Validate message content
                if (type === 'text' && (!content || content.trim().length === 0)) {
                    socket.emit('error', { 
                        message: 'Text messages must have content',
                        code: 'INVALID_MESSAGE_CONTENT'
                    });
                    return;
                }

                // Store message in database
                const { data: message, error } = await supabase
                    .from('chat_messages')
                    .insert({
                        session_id,
                        sender_id: userId,
                        type,
                        content: content.trim(),
                        reply_to_message_id,
                        is_delivered: true,
                        delivered_at: new Date().toISOString(),
                        metadata
                    })
                    .select(`
                        id,
                        session_id,
                        sender_id,
                        type,
                        content,
                        file_url,
                        file_name,
                        file_size,
                        file_type,
                        duration_seconds,
                        reply_to_message_id,
                        is_read,
                        is_delivered,
                        delivered_at,
                        read_at,
                        created_at,
                        updated_at,
                        metadata,
                        profiles!chat_messages_sender_id_fkey (
                            id,
                            full_name,
                            avatar_url
                        )
                    `)
                    .single();

                if (error) {
                    console.error('❌ [SOCKET] Error storing message:', error);
                    socket.emit('error', { 
                        message: 'Failed to send message',
                        code: 'MESSAGE_STORE_ERROR'
                    });
                    return;
                }

                // Update session last_message_at
                await supabase
                    .from('chat_sessions')
                    .update({ last_message_at: new Date().toISOString() })
                    .eq('id', session_id);

                // Stop typing indicator for sender
                if (typingUsers.has(session_id)) {
                    typingUsers.get(session_id).delete(userId);
                    socket.to(session_id).emit('user_stopped_typing', {
                        user_id: userId,
                        user_name: socket.user.full_name
                    });
                }

                // Broadcast message to all session participants
                io.to(session_id).emit('new_message', message);

                console.log(`✅ [SOCKET] Message sent: ${message.id}`);

            } catch (error) {
                console.error('❌ [SOCKET] Send message error:', error);
                socket.emit('error', { 
                    message: 'Failed to send message',
                    code: 'SEND_MESSAGE_ERROR'
                });
            }
        });

        /**
         * Mark messages as read
         */
        socket.on('mark_messages_read', async (data) => {
            try {
                const { session_id, up_to_message_id } = data;

                if (!session_id) {
                    socket.emit('error', { message: 'Session ID is required' });
                    return;
                }

                console.log(`📖 [SOCKET] Marking messages as read in session: ${session_id}`);

                // Build update query
                let query = supabase
                    .from('chat_messages')
                    .update({ 
                        is_read: true, 
                        read_at: new Date().toISOString() 
                    })
                    .eq('session_id', session_id)
                    .neq('sender_id', userId)
                    .eq('is_read', false);

                if (up_to_message_id) {
                    // Get the timestamp of the target message
                    const { data: targetMessage } = await supabase
                        .from('chat_messages')
                        .select('created_at')
                        .eq('id', up_to_message_id)
                        .single();

                    if (targetMessage) {
                        query = query.lte('created_at', targetMessage.created_at);
                    }
                }

                const { data, error } = await query.select();

                if (error) {
                    console.error('❌ [SOCKET] Error marking messages as read:', error);
                    return;
                }

                const updatedCount = data?.length || 0;

                // Notify other participants about read status
                if (updatedCount > 0) {
                    socket.to(session_id).emit('messages_read', {
                        user_id: userId,
                        user_name: socket.user.full_name,
                        up_to_message_id,
                        read_count: updatedCount,
                        timestamp: new Date().toISOString()
                    });
                }

                console.log(`✅ [SOCKET] Marked ${updatedCount} messages as read`);

            } catch (error) {
                console.error('❌ [SOCKET] Mark read error:', error);
            }
        });

        // =====================================================================
        // TYPING INDICATORS
        // =====================================================================

        /**
         * User started typing
         */
        socket.on('typing_start', (data) => {
            try {
                const { session_id } = data;

                if (!session_id) return;

                // Track typing user
                if (!typingUsers.has(session_id)) {
                    typingUsers.set(session_id, new Set());
                }
                typingUsers.get(session_id).add(userId);

                // Notify other participants
                socket.to(session_id).emit('user_typing', {
                    user_id: userId,
                    user_name: socket.user.full_name,
                    timestamp: new Date().toISOString()
                });

                console.log(`⌨️ [SOCKET] ${userEmail} started typing in session: ${session_id}`);

            } catch (error) {
                console.error('❌ [SOCKET] Typing start error:', error);
            }
        });

        /**
         * User stopped typing
         */
        socket.on('typing_stop', (data) => {
            try {
                const { session_id } = data;

                if (!session_id) return;

                // Remove from typing users
                if (typingUsers.has(session_id)) {
                    typingUsers.get(session_id).delete(userId);
                    if (typingUsers.get(session_id).size === 0) {
                        typingUsers.delete(session_id);
                    }
                }

                // Notify other participants
                socket.to(session_id).emit('user_stopped_typing', {
                    user_id: userId,
                    user_name: socket.user.full_name,
                    timestamp: new Date().toISOString()
                });

                console.log(`⌨️ [SOCKET] ${userEmail} stopped typing in session: ${session_id}`);

            } catch (error) {
                console.error('❌ [SOCKET] Typing stop error:', error);
            }
        });

        // =====================================================================
        // PRESENCE MANAGEMENT
        // =====================================================================

        /**
         * Get online users in session
         */
        socket.on('get_online_users', (data) => {
            try {
                const { session_id } = data;

                if (!session_id) {
                    socket.emit('error', { message: 'Session ID is required' });
                    return;
                }

                const onlineUsers = userSessions.get(session_id) || new Set();
                
                socket.emit('online_users', {
                    session_id,
                    users: Array.from(onlineUsers),
                    count: onlineUsers.size
                });

            } catch (error) {
                console.error('❌ [SOCKET] Get online users error:', error);
            }
        });

        // =====================================================================
        // DISCONNECT HANDLING
        // =====================================================================

        socket.on('disconnect', async (reason) => {
            try {
                console.log(`🔌 [SOCKET] User disconnected: ${userEmail} (Reason: ${reason})`);

                // Remove from active connections
                if (activeConnections.has(userId)) {
                    activeConnections.get(userId).delete(socket.id);
                    if (activeConnections.get(userId).size === 0) {
                        activeConnections.delete(userId);
                    }
                }

                // Remove from all session tracking
                for (const [sessionId, users] of userSessions.entries()) {
                    if (users.has(userId)) {
                        users.delete(userId);
                        
                        // Notify other participants
                        socket.to(sessionId).emit('user_left', {
                            user_id: userId,
                            user_name: socket.user.full_name,
                            timestamp: new Date().toISOString()
                        });

                        // Clean up empty sessions
                        if (users.size === 0) {
                            userSessions.delete(sessionId);
                        }
                    }
                }

                // Remove from typing indicators
                for (const [sessionId, typingUsersSet] of typingUsers.entries()) {
                    if (typingUsersSet.has(userId)) {
                        typingUsersSet.delete(userId);
                        
                        // Notify other participants
                        socket.to(sessionId).emit('user_stopped_typing', {
                            user_id: userId,
                            user_name: socket.user.full_name
                        });

                        // Clean up empty typing sessions
                        if (typingUsersSet.size === 0) {
                            typingUsers.delete(sessionId);
                        }
                    }
                }

                // Log monitoring event
                await logMonitoringEvent(userId, 'user_disconnected', {
                    socket_id: socket.id,
                    reason,
                    duration: Date.now() - socket.handshake.time
                });

            } catch (error) {
                console.error('❌ [SOCKET] Disconnect handling error:', error);
            }
        });

        // =====================================================================
        // ERROR HANDLING
        // =====================================================================

        socket.on('error', (error) => {
            console.error(`❌ [SOCKET] Socket error for ${userEmail}:`, error);
        });
    });

    // =========================================================================
    // UTILITY FUNCTIONS
    // =========================================================================

    /**
     * Log monitoring events to database
     */
    async function logMonitoringEvent(userId, eventType, metadata = {}) {
        try {
            await supabase
                .from('chat_monitoring')
                .insert({
                    user_id: userId,
                    event_type: eventType,
                    timestamp: new Date().toISOString(),
                    metadata
                });
        } catch (error) {
            console.error('❌ [SOCKET] Error logging monitoring event:', error);
        }
    }

    console.log('✅ Unified Chat Socket.IO initialized successfully');
    
    return io;
}

/**
 * Get current system statistics
 */
export function getChatSocketStats() {
    return {
        active_connections: activeConnections.size,
        active_sessions: userSessions.size,
        typing_sessions: typingUsers.size,
        total_socket_connections: Array.from(activeConnections.values())
            .reduce((total, sockets) => total + sockets.size, 0)
    };
} 