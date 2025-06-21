// =============================================================================
// SOCKET SERVICE - خدمة الاتصال المباشر
// =============================================================================
// Real-time communication service for monitoring and notifications

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { supabaseAdmin: supabase } = require('../lib/supabase.js');

class SocketService {
  constructor() {
    this.io = null;
    this.activeConnections = new Map();
    this.monitorSessions = new Map();
    this.chatRooms = new Map();
  }

  /**
   * Initialize Socket.IO server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? [process.env.FRONTEND_URL, process.env.ADMIN_URL]
          : ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupConnectionHandlers();
    console.log('✅ Socket.IO service initialized');
  }

  /**
   * Setup connection event handlers
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 New socket connection: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data) => {
        try {
          const { token } = data;
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, role, first_name, last_name')
            .eq('id', decoded.sub)
            .single();

          if (profile) {
            socket.userId = profile.id;
            socket.userRole = profile.role;
            socket.userName = `${profile.first_name} ${profile.last_name}`;
            
            // Store connection
            this.activeConnections.set(socket.id, {
              userId: profile.id,
              role: profile.role,
              name: socket.userName,
              connectedAt: new Date()
            });

            socket.emit('authenticated', { success: true, profile });
            console.log(`✅ User authenticated: ${socket.userName} (${profile.role})`);
          }
        } catch (error) {
          console.error('Socket authentication error:', error);
          socket.emit('authentication_error', { error: 'Invalid token' });
        }
      });

      // Handle joining monitoring rooms
      socket.on('join_monitor', (data) => {
        if (socket.userRole === 'admin' || socket.userRole === 'monitor' || socket.userRole === 'super_admin') {
          socket.join('monitors');
          console.log(`👁️ ${socket.userName} joined monitoring room`);
        }
      });

      // Handle joining chat rooms
      socket.on('join_chat', (data) => {
        const { sessionId } = data;
        if (sessionId && socket.userId) {
          socket.join(`chat_${sessionId}`);
          console.log(`💬 ${socket.userName} joined chat session: ${sessionId}`);
        }
      });

      // Handle session monitoring
      socket.on('monitor_session', (data) => {
        if (socket.userRole === 'admin' || socket.userRole === 'monitor' || socket.userRole === 'super_admin') {
          const { sessionId } = data;
          socket.join(`monitor_${sessionId}`);
          console.log(`🔍 ${socket.userName} monitoring session: ${sessionId}`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.activeConnections.delete(socket.id);
        console.log(`🔌 Socket disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Emit to all monitors
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToMonitors(event, data) {
    if (this.io) {
      this.io.to('monitors').emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Emit to specific session monitors
   * @param {string} sessionId - Session ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToSessionMonitors(sessionId, event, data) {
    if (this.io) {
      this.io.to(`monitor_${sessionId}`).emit(event, {
        sessionId,
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Emit to chat session participants
   * @param {string} sessionId - Session ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToChatSession(sessionId, event, data) {
    if (this.io) {
      this.io.to(`chat_${sessionId}`).emit(event, {
        sessionId,
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Emit session flagged alert
   * @param {Object} sessionData - Session information
   * @param {Object} flagData - Flag details
   */
  emitSessionFlagged(sessionData, flagData) {
    this.emitToMonitors('session_flagged', {
      session: sessionData,
      flag: flagData,
      priority: flagData.severity || 'medium'
    });
  }

  /**
   * Emit session terminated alert
   * @param {string} sessionId - Session ID
   * @param {string} reason - Termination reason
   * @param {string} terminatedBy - Who terminated it
   */
  emitSessionTerminated(sessionId, reason, terminatedBy) {
    this.emitToSessionMonitors(sessionId, 'session_terminated', {
      reason,
      terminatedBy,
      action: 'SESSION_TERMINATED'
    });
  }

  /**
   * Emit content approval request
   * @param {Object} contentData - Content requiring approval
   */
  emitContentApprovalRequest(contentData) {
    this.emitToMonitors('content_approval_required', {
      content: contentData,
      priority: contentData.ai_confidence > 0.8 ? 'high' : 'medium'
    });
  }

  /**
   * Get active connections count
   * @returns {number} Active connections count
   */
  getActiveConnectionsCount() {
    return this.activeConnections.size;
  }

  /**
   * Get connections by role
   * @param {string} role - User role
   * @returns {Array} Connections with specified role
   */
  getConnectionsByRole(role) {
    return Array.from(this.activeConnections.values())
      .filter(conn => conn.role === role);
  }

  /**
   * Emit emergency alert
   * @param {Object} alertData - Emergency alert data
   */
  emitEmergencyAlert(alertData) {
    if (this.io) {
      this.io.emit('emergency_alert', {
        ...alertData,
        timestamp: new Date().toISOString(),
        priority: 'critical'
      });
    }
  }

  /**
   * Broadcast system notification
   * @param {Object} notification - System notification
   */
  broadcastSystemNotification(notification) {
    if (this.io) {
      this.io.emit('system_notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

module.exports = socketService; 