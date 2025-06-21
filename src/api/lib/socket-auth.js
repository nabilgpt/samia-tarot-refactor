// ===============================================
// SOCKET AUTHENTICATION MODULE
// ===============================================

const jwt = require('jsonwebtoken');
const { supabase } = require('./supabase');

/**
 * Authenticate socket connection using JWT token
 * @param {Object} socket - Socket.IO socket instance
 * @param {Function} next - Next middleware function
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user profile from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !profile) {
      return next(new Error('Invalid user credentials'));
    }

    // Attach user info to socket
    socket.userId = profile.id;
    socket.userRole = profile.role;
    socket.userEmail = profile.email;
    socket.userName = profile.first_name || profile.email;

    next();
  } catch (error) {
    next(new Error('Authentication failed: ' + error.message));
  }
};

/**
 * Check if user has required role for socket operation
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} Middleware function
 */
const requireRole = (allowedRoles) => {
  return (socket, next) => {
    if (!socket.userRole || !allowedRoles.includes(socket.userRole)) {
      return next(new Error('Insufficient permissions'));
    }
    next();
  };
};

/**
 * Log socket events for monitoring
 * @param {Object} socket - Socket.IO socket instance
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
const logSocketEvent = (socket, event, data) => {
  console.log(`[Socket ${socket.id}] User ${socket.userId} (${socket.userRole}): ${event}`, {
    timestamp: new Date().toISOString(),
    userId: socket.userId,
    userRole: socket.userRole,
    event,
    data: typeof data === 'object' ? JSON.stringify(data) : data
  });
};

/**
 * Join user to appropriate rooms based on their role
 * @param {Object} socket - Socket.IO socket instance
 */
const joinUserRooms = (socket) => {
  // Join user-specific room
  socket.join(`user_${socket.userId}`);
  
  // Join role-based rooms
  socket.join(`role_${socket.userRole}`);
  
  // Admin/Monitor users can join all rooms for monitoring
  if (['admin', 'super_admin', 'monitor'].includes(socket.userRole)) {
    socket.join('admin_room');
    socket.join('monitor_room');
  }
  
  // Readers join reader-specific rooms
  if (socket.userRole === 'reader') {
    socket.join('readers_room');
  }
  
  // Clients join client-specific rooms
  if (socket.userRole === 'client') {
    socket.join('clients_room');
  }

  logSocketEvent(socket, 'joined_rooms', {
    rooms: [`user_${socket.userId}`, `role_${socket.userRole}`]
  });
};

/**
 * Handle socket disconnection cleanup
 * @param {Object} socket - Socket.IO socket instance
 */
const handleDisconnection = (socket) => {
  logSocketEvent(socket, 'disconnected', {
    reason: 'user_disconnect',
    duration: Date.now() - socket.connectedAt
  });
  
  // Leave all rooms
  socket.leaveAll();
  
  // Emit user offline status to relevant rooms
  socket.broadcast.to(`role_${socket.userRole}`).emit('user_offline', {
    userId: socket.userId,
    userRole: socket.userRole,
    timestamp: new Date().toISOString()
  });
};

/**
 * Validate call session permissions
 * @param {Object} socket - Socket.IO socket instance
 * @param {string} sessionId - Call session ID
 * @returns {boolean} Whether user can access the session
 */
const validateCallSession = async (socket, sessionId) => {
  try {
    const { data: session, error } = await supabase
      .from('call_sessions')
      .select('client_id, reader_id, status')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return false;
    }

    // Admin/Monitor can access any session
    if (['admin', 'super_admin', 'monitor'].includes(socket.userRole)) {
      return true;
    }

    // Users can only access their own sessions
    return session.client_id === socket.userId || session.reader_id === socket.userId;
  } catch (error) {
    console.error('Error validating call session:', error);
    return false;
  }
};

module.exports = {
  authenticateSocket,
  requireRole,
  logSocketEvent,
  joinUserRooms,
  handleDisconnection,
  validateCallSession
}; 