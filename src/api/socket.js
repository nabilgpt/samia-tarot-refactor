// =============================================================================
// SOCKET.IO SERVER - إعداد الـ Real-time Communication
// =============================================================================
// Complete Socket.IO setup for chat, notifications, and live updates

const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');


// =============================================================================
// SUPABASE CLIENT SETUP
// =============================================================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =============================================================================
// SOCKET AUTHENTICATION MIDDLEWARE
// =============================================================================
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return next(new Error('Invalid or expired token'));
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || !profile.is_active) {
      return next(new Error('User profile not found or inactive'));
    }
    
    socket.userId = user.id;
    socket.userProfile = profile;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

// =============================================================================
// MAIN SOCKET.IO SETUP
// =============================================================================
const setupSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL, process.env.ADMIN_URL]
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  // Apply authentication middleware
  io.use(authenticateSocket);
  
  // =============================================================================
  // CONNECTION HANDLING
  // =============================================================================
  io.on('connection', (socket) => {
    console.log(`👤 User ${socket.userProfile.first_name} connected (${socket.userId})`);
    
    // Join user to their personal room for notifications
    socket.join(`user_${socket.userId}`);
    
    // =============================================================================
    // CHAT FUNCTIONALITY
    // =============================================================================
    
    // Join chat session
    socket.on('join_chat', async (data) => {
      try {
        const { session_id } = data;
        
        // Verify user has access to this chat session
        const { data: session, error } = await supabase
          .from('chat_sessions')
          .select('id, participants, status')
          .eq('id', session_id)
          .single();
        
        if (!error && session && session.participants.includes(socket.userId) && session.status === 'active') {
          socket.join(`chat_${session_id}`);
          socket.currentChatSession = session_id;
          
          // Notify others user joined
          socket.to(`chat_${session_id}`).emit('user_joined', {
            user_id: socket.userId,
            user_name: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`,
            timestamp: new Date().toISOString()
          });
          
          // Send confirmation to user
          socket.emit('chat_joined', {
            session_id,
            message: 'Successfully joined chat session'
          });
          
          console.log(`💬 User ${socket.userId} joined chat ${session_id}`);
        } else {
          socket.emit('error', { 
            message: 'Access denied to chat session or session inactive',
            code: 'CHAT_ACCESS_DENIED'
          });
        }
      } catch (error) {
        console.error('Join chat error:', error);
        socket.emit('error', { 
          message: 'Failed to join chat session',
          code: 'CHAT_JOIN_ERROR'
        });
      }
    });
    
    // Leave chat session
    socket.on('leave_chat', (data) => {
      const { session_id } = data;
      
      if (socket.currentChatSession === session_id) {
        socket.leave(`chat_${session_id}`);
        socket.to(`chat_${session_id}`).emit('user_left', {
          user_id: socket.userId,
          user_name: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`,
          timestamp: new Date().toISOString()
        });
        socket.currentChatSession = null;
        
        console.log(`💬 User ${socket.userId} left chat ${session_id}`);
      }
    });
    
    // Handle typing indicators
    socket.on('typing_start', () => {
      if (socket.currentChatSession) {
        socket.to(`chat_${socket.currentChatSession}`).emit('user_typing', {
          user_id: socket.userId,
          user_name: socket.userProfile.first_name,
          is_typing: true
        });
      }
    });
    
    socket.on('typing_stop', () => {
      if (socket.currentChatSession) {
        socket.to(`chat_${socket.currentChatSession}`).emit('user_typing', {
          user_id: socket.userId,
          user_name: socket.userProfile.first_name,
          is_typing: false
        });
      }
    });
    
    // Handle real-time message delivery
    socket.on('send_message', async (data) => {
      try {
        const { session_id, message } = data;
        
        if (socket.currentChatSession === session_id) {
          // Broadcast message to all users in the session except sender
          socket.to(`chat_${session_id}`).emit('new_message', {
            ...message,
            sender: {
              id: socket.userId,
              name: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`,
              avatar: socket.userProfile.avatar_url
            },
            timestamp: new Date().toISOString()
          });
          
          // Confirm to sender
          socket.emit('message_sent', {
            message_id: message.id,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { 
          message: 'Failed to send message',
          code: 'MESSAGE_SEND_ERROR'
        });
      }
    });
    
    // Handle message reactions
    socket.on('message_reaction', async (data) => {
      try {
        const { message_id, reaction, session_id } = data;
        
        if (socket.currentChatSession === session_id) {
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
            io.to(`chat_${session_id}`).emit('message_reaction_update', {
              message_id,
              user_id: socket.userId,
              user_name: socket.userProfile.first_name,
              reaction,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('Message reaction error:', error);
        socket.emit('error', { 
          message: 'Failed to update reaction',
          code: 'REACTION_ERROR'
        });
      }
    });
    
    // =============================================================================
    // BOOKING UPDATES
    // =============================================================================
    
    // Join booking room for real-time updates
    socket.on('join_booking', async (data) => {
      try {
        const { booking_id } = data;
        
        // Verify user has access to this booking
        const { data: booking, error } = await supabase
          .from('bookings')
          .select('user_id, reader_id')
          .eq('id', booking_id)
          .single();
        
        if (!error && booking && (booking.user_id === socket.userId || booking.reader_id === socket.userId)) {
          socket.join(`booking_${booking_id}`);
          socket.emit('booking_joined', { booking_id });
        }
      } catch (error) {
        console.error('Join booking error:', error);
      }
    });
    
    // =============================================================================
    // NOTIFICATIONS
    // =============================================================================
    
    // Send real-time notification
    socket.on('send_notification', async (data) => {
      try {
        const { recipient_id, title, message, type, notification_data } = data;
        
        // Only allow certain roles to send notifications
        if (!['admin', 'super_admin', 'reader'].includes(socket.userProfile.role)) {
          socket.emit('error', { 
            message: 'Insufficient permissions to send notifications',
            code: 'INSUFFICIENT_PERMISSIONS'
          });
          return;
        }
        
        // Create notification in database
        const { data: notification, error } = await supabase
          .from('notifications')
          .insert([{
            user_id: recipient_id,
            title,
            message,
            type: type || 'general',
            data: notification_data || {}
          }])
          .select()
          .single();
        
        if (!error) {
          // Send real-time notification
          io.to(`user_${recipient_id}`).emit('new_notification', {
            ...notification,
            sender: {
              id: socket.userId,
              name: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`
            }
          });
        }
      } catch (error) {
        console.error('Send notification error:', error);
      }
    });
    
    // =============================================================================
    // ADMIN BROADCASTS
    // =============================================================================
    
    // Admin broadcast to all users
    socket.on('admin_broadcast', async (data) => {
      try {
        if (!['admin', 'super_admin'].includes(socket.userProfile.role)) {
          socket.emit('error', { 
            message: 'Admin privileges required',
            code: 'ADMIN_REQUIRED'
          });
          return;
        }
        
        const { title, message, type, target_roles } = data;
        
        // Broadcast to all connected users or specific roles
        if (target_roles && target_roles.length > 0) {
          // Get users with specific roles
          const { data: targetUsers } = await supabase
            .from('profiles')
            .select('id')
            .in('role', target_roles)
            .eq('is_active', true);
          
          if (targetUsers) {
            targetUsers.forEach(user => {
              io.to(`user_${user.id}`).emit('admin_broadcast', {
                title,
                message,
                type: type || 'announcement',
                timestamp: new Date().toISOString(),
                sender: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`
              });
            });
          }
        } else {
          // Broadcast to all connected users
          io.emit('admin_broadcast', {
            title,
            message,
            type: type || 'announcement',
            timestamp: new Date().toISOString(),
            sender: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`
          });
        }
        
        console.log(`📢 Admin broadcast sent by ${socket.userId}: ${title}`);
      } catch (error) {
        console.error('Admin broadcast error:', error);
      }
    });
    
    // =============================================================================
    // EMERGENCY SYSTEM
    // =============================================================================
    
    // Emergency call signal
    socket.on('emergency_call', async (data) => {
      try {
        const { booking_id, emergency_type, priority_level } = data;
        
        // Create emergency log
        const { data: emergencyLog, error } = await supabase
          .from('emergency_call_logs')
          .insert([{
            user_id: socket.userId,
            booking_id,
            emergency_type: emergency_type || 'general',
            priority_level: priority_level || 5,
            status: 'pending'
          }])
          .select()
          .single();
        
        if (!error) {
          // Alert all available readers and admins
          const { data: availableStaff } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['reader', 'admin', 'super_admin'])
            .eq('is_active', true);
          
          if (availableStaff) {
            availableStaff.forEach(staff => {
              io.to(`user_${staff.id}`).emit('emergency_alert', {
                emergency_id: emergencyLog.id,
                user_id: socket.userId,
                user_name: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`,
                emergency_type,
                priority_level,
                timestamp: new Date().toISOString()
              });
            });
          }
          
          console.log(`🚨 Emergency call from user ${socket.userId}`);
        }
      } catch (error) {
        console.error('Emergency call error:', error);
      }
    });
    
    // =============================================================================
    // CONNECTION MANAGEMENT
    // =============================================================================
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`👋 User ${socket.userId} disconnected: ${reason}`);
      
      // Notify chat session if user was in one
      if (socket.currentChatSession) {
        socket.to(`chat_${socket.currentChatSession}`).emit('user_left', {
          user_id: socket.userId,
          user_name: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Update user's last seen
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', socket.userId)
        .then(() => {
          console.log(`Updated last seen for user ${socket.userId}`);
        })
        .catch(error => {
          console.error('Error updating last seen:', error);
        });
    });
    
    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });
  
  // =============================================================================
  // UTILITY FUNCTIONS FOR EXTERNAL USE
  // =============================================================================
  
  // Send notification to specific user
  io.sendNotificationToUser = (userId, notification) => {
    io.to(`user_${userId}`).emit('new_notification', notification);
  };
  
  // Send message to chat session
  io.sendMessageToChat = (sessionId, message) => {
    io.to(`chat_${sessionId}`).emit('new_message', message);
  };
  
  // Broadcast booking update
  io.broadcastBookingUpdate = (bookingId, update) => {
    io.to(`booking_${bookingId}`).emit('booking_update', update);
  };
  
  // Emergency broadcast
  io.emergencyBroadcast = (alert) => {
    io.emit('emergency_alert', alert);
  };
  
  console.log('🚀 Socket.IO server initialized successfully');
  
  return io;
};

module.exports = setupSocketIO; 