// =============================================================================
// SOCKET.IO CHAT HANDLER - إعداد الدردشة الفورية
// =============================================================================
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const setupChatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('👤 User connected to chat:', socket.id);
    
    // Authentication check
    socket.on('authenticate', async (data) => {
      try {
        const { token } = data;
        
        if (!token) {
          socket.emit('auth_error', { message: 'Token required' });
          return;
        }
        
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
          socket.emit('auth_error', { message: 'Invalid token' });
          return;
        }
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!profile || !profile.is_active) {
          socket.emit('auth_error', { message: 'User not found or inactive' });
          return;
        }
        
        socket.userId = user.id;
        socket.userProfile = profile;
        socket.join(`user_${user.id}`);
        
        socket.emit('authenticated', {
          user: { id: user.id, name: `${profile.first_name} ${profile.last_name}` }
        });
        
        console.log(`✅ User ${profile.first_name} authenticated (${user.id})`);
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    });
    
    // Join chat session
    socket.on('join_chat', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Please authenticate first' });
          return;
        }
        
        const { session_id } = data;
        
        const { data: session, error } = await supabase
          .from('chat_sessions')
          .select('id, participants, status')
          .eq('id', session_id)
          .single();
        
        if (!error && session && session.participants.includes(socket.userId)) {
          socket.join(`chat_${session_id}`);
          socket.currentChatSession = session_id;
          
          socket.to(`chat_${session_id}`).emit('user_joined', {
            user_id: socket.userId,
            user_name: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`,
            timestamp: new Date().toISOString()
          });
          
          socket.emit('chat_joined', { session_id });
          console.log(`💬 User ${socket.userId} joined chat ${session_id}`);
        } else {
          socket.emit('error', { message: 'Access denied to chat session' });
        }
      } catch (error) {
        console.error('Join chat error:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });
    
    // Typing indicators
    socket.on('typing_start', () => {
      if (socket.currentChatSession && socket.userId) {
        socket.to(`chat_${socket.currentChatSession}`).emit('user_typing', {
          user_id: socket.userId,
          user_name: socket.userProfile.first_name,
          is_typing: true
        });
      }
    });
    
    socket.on('typing_stop', () => {
      if (socket.currentChatSession && socket.userId) {
        socket.to(`chat_${socket.currentChatSession}`).emit('user_typing', {
          user_id: socket.userId,
          user_name: socket.userProfile.first_name,
          is_typing: false
        });
      }
    });
    
    // Send message
    socket.on('send_message', async (data) => {
      try {
        if (!socket.userId || !socket.currentChatSession) {
          socket.emit('error', { message: 'Not authenticated or not in chat' });
          return;
        }
        
        const { message } = data;
        
        socket.to(`chat_${socket.currentChatSession}`).emit('new_message', {
          ...message,
          sender: {
            id: socket.userId,
            name: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`,
            avatar: socket.userProfile.avatar_url
          },
          timestamp: new Date().toISOString()
        });
        
        socket.emit('message_sent', {
          message_id: message.id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Message reactions
    socket.on('message_reaction', async (data) => {
      try {
        if (!socket.userId || !socket.currentChatSession) return;
        
        const { message_id, reaction } = data;
        
        const { error } = await supabase
          .from('message_reactions')
          .upsert({
            message_id,
            user_id: socket.userId,
            reaction
          });
        
        if (!error) {
          io.to(`chat_${socket.currentChatSession}`).emit('message_reaction_update', {
            message_id,
            user_id: socket.userId,
            user_name: socket.userProfile.first_name,
            reaction,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Message reaction error:', error);
      }
    });
    
    // Disconnect handler
    socket.on('disconnect', (reason) => {
      if (socket.userId) {
        console.log(`👋 User ${socket.userId} disconnected: ${reason}`);
        
        if (socket.currentChatSession) {
          socket.to(`chat_${socket.currentChatSession}`).emit('user_left', {
            user_id: socket.userId,
            user_name: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`,
            timestamp: new Date().toISOString()
          });
        }
        
        // Update last seen
        supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', socket.userId)
          .catch(error => console.error('Error updating last seen:', error));
      }
    });
  });
};

module.exports = setupChatSocket; 