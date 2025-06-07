// =============================================================================
// SOCKET.IO SERVER - نظام الدردشة والإشعارات الفورية
// =============================================================================
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const setupSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL]
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return next(new Error('Invalid token'));
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!profile || !profile.is_active) {
        return next(new Error('User not found or inactive'));
      }
      
      socket.userId = user.id;
      socket.userProfile = profile;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`👤 User ${socket.userProfile.first_name} connected`);
    
    socket.join(`user_${socket.userId}`);
    
    // Chat functionality
    socket.on('join_chat', async (data) => {
      const { session_id } = data;
      
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('participants, status')
        .eq('id', session_id)
        .single();
      
      if (session && session.participants.includes(socket.userId)) {
        socket.join(`chat_${session_id}`);
        socket.currentChatSession = session_id;
        
        socket.to(`chat_${session_id}`).emit('user_joined', {
          user_id: socket.userId,
          user_name: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`
        });
      }
    });
    
    socket.on('typing_start', () => {
      if (socket.currentChatSession) {
        socket.to(`chat_${socket.currentChatSession}`).emit('user_typing', {
          user_id: socket.userId,
          is_typing: true
        });
      }
    });
    
    socket.on('typing_stop', () => {
      if (socket.currentChatSession) {
        socket.to(`chat_${socket.currentChatSession}`).emit('user_typing', {
          user_id: socket.userId,
          is_typing: false
        });
      }
    });
    
    socket.on('send_message', (data) => {
      const { session_id, message } = data;
      
      if (socket.currentChatSession === session_id) {
        socket.to(`chat_${session_id}`).emit('new_message', {
          ...message,
          sender: {
            id: socket.userId,
            name: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`,
            avatar: socket.userProfile.avatar_url
          }
        });
      }
    });
    
    socket.on('disconnect', () => {
      console.log(`👋 User ${socket.userId} disconnected`);
      
      if (socket.currentChatSession) {
        socket.to(`chat_${socket.currentChatSession}`).emit('user_left', {
          user_id: socket.userId
        });
      }
    });
  });
  
  return io;
};

module.exports = setupSocketIO; 