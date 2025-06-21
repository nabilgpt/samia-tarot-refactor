// =============================================================================
// SAMIA TAROT BACKEND SERVER - الخادم الرئيسي
// =============================================================================
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);

// =============================================================================
// SOCKET.IO SETUP
// =============================================================================
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

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Socket authentication middleware
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

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`👤 User ${socket.userProfile.first_name} connected (${socket.userId})`);
  
  socket.join(`user_${socket.userId}`);
  
  // Chat functionality
  socket.on('join_chat', async (data) => {
    try {
      const { session_id } = data;
      
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .select('participants, status')
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
      } else {
        socket.emit('error', { message: 'Access denied to chat session' });
      }
    } catch (error) {
      console.error('Join chat error:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });
  
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
  
  socket.on('send_message', (data) => {
    try {
      const { session_id, message } = data;
      
      if (socket.currentChatSession === session_id) {
        socket.to(`chat_${session_id}`).emit('new_message', {
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
      }
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  socket.on('message_reaction', async (data) => {
    try {
      const { message_id, reaction } = data;
      
      if (socket.currentChatSession) {
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
      }
    } catch (error) {
      console.error('Message reaction error:', error);
    }
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`👋 User ${socket.userId} disconnected: ${reason}`);
    
    if (socket.currentChatSession) {
      socket.to(`chat_${socket.currentChatSession}`).emit('user_left', {
        user_id: socket.userId,
        user_name: `${socket.userProfile.first_name} ${socket.userProfile.last_name}`,
        timestamp: new Date().toISOString()
      });
    }
    
    supabase
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', socket.userId)
      .catch(error => console.error('Error updating last seen:', error));
  });
});

// =============================================================================
// EXPRESS MIDDLEWARE
// =============================================================================
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, process.env.ADMIN_URL]
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

app.use(globalRateLimit);

// =============================================================================
// API ROUTES
// =============================================================================
app.use('/api/profiles', require('./api/profiles').router);
app.use('/api/bookings', require('./api/bookings').router);
app.use('/api/payments', require('./api/payments').router);
app.use('/api/chat', require('./api/chat').router);

// Advanced Admin Routes
try {
  app.use('/api/admin/advanced', require('./api/routes/advancedAdminRoutesV2'));
  console.log('✅ Advanced admin routes loaded successfully');
} catch (error) {
  console.warn('⚠️  Advanced admin routes not found, skipping...');
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      api: 'running',
      socket: 'running',
      database: 'connected'
    }
  });
});

// API documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'SAMIA TAROT API',
    version: '1.0.0',
    description: 'Complete tarot reading platform backend',
    endpoints: {
      profiles: '/api/profiles',
      bookings: '/api/bookings', 
      payments: '/api/payments',
      chat: '/api/chat'
    },
    realtime: {
      socket_url: '/socket.io',
      events: ['chat', 'notifications', 'bookings']
    }
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

app.use((error, req, res, _next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('🚀 ===============================================');
  console.log(`🔥 SAMIA TAROT SERVER RUNNING ON PORT ${PORT}`);
  console.log('🚀 ===============================================');
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`💬 Socket.IO URL: http://localhost:${PORT}/socket.io`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log('🚀 ===============================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = { app, server, io }; 