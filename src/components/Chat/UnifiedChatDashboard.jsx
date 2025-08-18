import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { io } from 'socket.io-client';
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Mic, 
  MicOff, 
  Users, 
  Phone,
  VideoIcon,
  MoreVertical,
  Search,
  Filter,
  Plus,
  X,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  Circle,
  Zap,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Eye,
  EyeOff
} from 'lucide-react';
import { hasAdminOrMonitorAccess } from '../../utils/roleHelpers';

// Import unified chat components
import UnifiedChatList from './UnifiedChatList.jsx';
import UnifiedChatThread from './UnifiedChatThread.jsx';
import UnifiedAudioRecorder from './UnifiedAudioRecorder.jsx';
import VoiceApprovalPanel from './VoiceApprovalPanel.jsx';

const UnifiedChatDashboard = () => {
  const { user, profile, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [presenceStatus, setPresenceStatus] = useState('online');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [showVoiceApprovals, setShowVoiceApprovals] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPresencePanel, setShowPresencePanel] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const audioRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // =========================================================================
  // ENHANCED SOCKET.IO CONNECTION & EVENT HANDLERS
  // =========================================================================

  useEffect(() => {
    if (!user || !token) return;

    console.log('🔌 Connecting to unified chat socket...');
    setConnectionStatus('connecting');
    
    const socketInstance = io(process.env.VITE_API_URL || 'http://localhost:5001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 10,
      timeout: 20000
    });

    // Connection events with enhanced status tracking
    socketInstance.on('connect', () => {
      console.log('✅ Connected to unified chat socket');
      setSocket(socketInstance);
      setConnectionStatus('connected');
      setError(null);
      
      // Clear any reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Show connection notification
      showNotification('Connected to chat server', 'success');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from chat socket:', reason);
      setSocket(null);
      setConnectionStatus('disconnected');
      setOnlineUsers(new Map());
      setTypingUsers(new Map());
      
      showNotification('Disconnected from chat server', 'warning');
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnectionStatus('error');
      setError('Failed to connect to chat server');
      showNotification('Connection failed - retrying...', 'error');
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      setConnectionStatus('connected');
      setError(null);
      showNotification('Reconnected to chat server', 'success');
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('❌ Reconnection failed:', error);
      setConnectionStatus('reconnecting');
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect after maximum attempts');
      setConnectionStatus('failed');
      setError('Unable to connect to chat server');
      showNotification('Connection failed permanently', 'error');
    });

    // Enhanced session events
    socketInstance.on('session_joined', (data) => {
      console.log('✅ Joined session:', data.session_id);
      setOnlineUsers(new Map(data.participants_online?.map(p => [p.id, p]) || []));
      showNotification(`Joined chat session`, 'info');
    });

    socketInstance.on('user_joined', (data) => {
      console.log('👤 User joined:', data.user_name);
      setOnlineUsers(prev => new Map([...prev, [data.user_id, data]]));
      showNotification(`${data.user_name} joined the chat`, 'info');
      playNotificationSound('join');
    });

    socketInstance.on('user_left', (data) => {
      console.log('👤 User left:', data.user_name);
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.user_id);
        return newMap;
      });
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.user_id);
        return newMap;
      });
      showNotification(`${data.user_name} left the chat`, 'info');
      playNotificationSound('leave');
    });

    // Enhanced message events with delivery status
    socketInstance.on('new_message', (message) => {
      console.log('💬 New message received:', message.id);
      setMessages(prev => [...prev, { ...message, status: 'delivered' }]);
      
      // Update session last message
      setSessions(prev => prev.map(session => 
        session.id === message.session_id 
          ? { ...session, last_message_at: message.created_at, unread_count: (session.unread_count || 0) + 1 }
          : session
      ));

      // Show notification for new messages (not from current user)
      if (message.sender_id !== user.id) {
        const senderName = message.sender?.first_name || 'Someone';
        const content = message.type === 'text' ? message.content : `Sent a ${message.type}`;
        showNotification(`${senderName}: ${content}`, 'message');
        playNotificationSound('message');
        
        // Update unread count
        setUnreadCount(prev => prev + 1);
      }
    });

    socketInstance.on('message_delivered', (data) => {
      console.log('📬 Message delivered:', data.message_id);
      setMessages(prev => prev.map(msg => 
        msg.id === data.message_id 
          ? { ...msg, status: 'delivered', delivered_at: data.timestamp }
          : msg
      ));
    });

    socketInstance.on('messages_read', (data) => {
      console.log('📖 Messages marked as read by:', data.user_name);
      setMessages(prev => prev.map(msg => 
        msg.created_at <= data.timestamp && msg.sender_id === user.id
          ? { ...msg, status: 'read', read_at: data.timestamp }
          : msg
      ));
    });

    // Enhanced typing events with user details
    socketInstance.on('user_typing', (data) => {
      if (data.user_id !== user.id) {
        setTypingUsers(prev => new Map([...prev, [data.user_id, {
          ...data,
          timestamp: Date.now()
        }]]));
        
        // Auto-remove typing indicator after 5 seconds
        setTimeout(() => {
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(data.user_id);
            if (existing && existing.timestamp === data.timestamp) {
              newMap.delete(data.user_id);
            }
            return newMap;
          });
        }, 5000);
      }
    });

    socketInstance.on('user_stopped_typing', (data) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.user_id);
        return newMap;
      });
    });

    // Enhanced presence events
    socketInstance.on('user_presence_changed', (data) => {
      console.log(`👤 ${data.user_name} is now ${data.status}`);
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.user_id);
        if (existing) {
          newMap.set(data.user_id, { ...existing, status: data.status, last_seen: data.timestamp });
        }
        return newMap;
      });
    });

    socketInstance.on('online_users', (data) => {
      console.log('👥 Online users updated:', data.users?.length || 0);
      setOnlineUsers(new Map(data.users?.map(u => [u.id, u]) || []));
    });

    // Error handling with enhanced feedback
    socketInstance.on('error', (error) => {
      console.error('❌ Socket error:', error);
      setError(error.message || 'Chat error occurred');
      showNotification(error.message || 'Chat error occurred', 'error');
    });

    // Voice approval events for admins
    if (hasAdminOrMonitorAccess(profile?.role)) {
      socketInstance.on('voice_approval_needed', (data) => {
        setPendingApprovals(prev => prev + 1);
        showNotification('New voice message needs approval', 'warning');
        playNotificationSound('approval');
      });

      socketInstance.on('voice_approved', (data) => {
        setPendingApprovals(prev => Math.max(0, prev - 1));
        showNotification('Voice message approved', 'success');
      });
    }

    setSocket(socketInstance);

    return () => {
      console.log('🔌 Disconnecting unified chat socket...');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socketInstance.disconnect();
    };
  }, [user, token, profile?.role]);

  // =========================================================================
  // ENHANCED NOTIFICATION SYSTEM
  // =========================================================================

  const showNotification = useCallback((message, type = 'info') => {
    if (!notificationsEnabled) return;

    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString()
    };

    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);

    // Browser notification for important messages
    if (type === 'message' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('SAMIA TAROT Chat', {
        body: message,
        icon: '/favicon.ico',
        tag: 'chat-message'
      });
    }
  }, [notificationsEnabled]);

  const playNotificationSound = useCallback((type) => {
    if (!soundEnabled || !audioRef.current) return;

    // Different sounds for different events
    const sounds = {
      message: '/sounds/message.mp3',
      join: '/sounds/join.mp3',
      leave: '/sounds/leave.mp3',
      approval: '/sounds/approval.mp3',
      error: '/sounds/error.mp3'
    };

    if (sounds[type]) {
      audioRef.current.src = sounds[type];
      audioRef.current.play().catch(console.error);
    }
  }, [soundEnabled]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // =========================================================================
  // ENHANCED API FUNCTIONS
  // =========================================================================

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
      
      // Calculate total unread count
      const totalUnread = (data.sessions || []).reduce((sum, session) => sum + (session.unread_count || 0), 0);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('❌ Error fetching sessions:', error);
      setError('Failed to load chat sessions');
      showNotification('Failed to load chat sessions', 'error');
    }
  }, [token, showNotification]);

  const fetchMessages = useCallback(async (sessionId) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data.messages || []);
      
      // Mark messages as read
      if (data.messages?.length > 0) {
        markMessagesAsRead(sessionId);
      }
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      setError('Failed to load messages');
      showNotification('Failed to load messages', 'error');
    }
  }, [token, showNotification]);

  const markMessagesAsRead = useCallback(async (sessionId) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok && socket) {
        socket.emit('mark_messages_read', { session_id: sessionId });
        
        // Update local session unread count
        setSessions(prev => prev.map(session => 
          session.id === sessionId 
            ? { ...session, unread_count: 0 }
            : session
        ));
      }
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  }, [token, socket]);

  // =========================================================================
  // ENHANCED MESSAGE HANDLING
  // =========================================================================

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending || !activeSession) return;

    try {
      setSending(true);
      setError(null);

      const response = await fetch(`/api/chat/sessions/${activeSession.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          type: 'text'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Add message with sending status
      const messageWithStatus = { ...data.message, status: 'sending' };
      setMessages(prev => [...prev, messageWithStatus]);
      
      // Emit via socket for real-time delivery
      if (socket) {
        socket.emit('send_message', {
          session_id: activeSession.id,
          message: messageWithStatus
        });
      }

      setNewMessage('');
      
      // Stop typing indicator
      if (isTyping && socket) {
        socket.emit('typing_stop', { session_id: activeSession.id });
        setIsTyping(false);
      }

    } catch (error) {
      console.error('❌ Error sending message:', error);
      setError('Failed to send message');
      showNotification('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!socket || !activeSession) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing_start', { session_id: activeSession.id });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing_stop', { session_id: activeSession.id });
    }, 1000);
  };

  // =========================================================================
  // ENHANCED FILE HANDLING
  // =========================================================================

  const handleFileUpload = async (file) => {
    if (!file || !activeSession) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', activeSession.id);

    try {
      setSending(true);
      const response = await fetch(`/api/chat/sessions/${activeSession.id}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      
      // Add message immediately
      setMessages(prev => [...prev, data.message]);
      
      // Emit via socket
      if (socket) {
        socket.emit('new_message', data.message);
      }

      showNotification('File uploaded successfully', 'success');
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      setError('Failed to upload file');
      showNotification('Failed to upload file', 'error');
    } finally {
      setSending(false);
    }
  };

  // =========================================================================
  // ENHANCED VOICE MESSAGE HANDLING
  // =========================================================================

  const handleVoiceMessage = async (audioBlob, duration) => {
    if (!activeSession) return;

    const formData = new FormData();
    formData.append('voice', audioBlob, 'voice_message.webm');
    formData.append('duration', Math.round(duration));
    formData.append('session_id', activeSession.id);

    try {
      setSending(true);
      const response = await fetch(`/api/chat/sessions/${activeSession.id}/voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to send voice message');
      }

      const data = await response.json();
      
      // Add message immediately
      setMessages(prev => [...prev, data.message]);
      
      // Emit via socket
      if (socket) {
        socket.emit('new_message', data.message);
      }

      setShowAudioRecorder(false);
      showNotification('Voice message sent', 'success');
    } catch (error) {
      console.error('❌ Error sending voice message:', error);
      setError('Failed to send voice message');
      showNotification('Failed to send voice message', 'error');
    } finally {
      setSending(false);
    }
  };

  // =========================================================================
  // SESSION MANAGEMENT
  // =========================================================================

  const handleSessionSelect = (session) => {
    setActiveSession(session);
    setSelectedSessionId(session.id);
    
    // Join session via socket
    if (socket) {
      socket.emit('join_session', { session_id: session.id });
    }
    
    // Fetch messages for this session
    fetchMessages(session.id);
    
    // Mark as read
    markMessagesAsRead(session.id);
  };

  const createNewSession = async (participants, type = 'support', title = '') => {
    try {
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participants,
          type,
          title
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      setSessions(prev => [data.session, ...prev]);
      setActiveSession(data.session);
      setShowNewSessionModal(false);
      showNotification('New chat session created', 'success');
      
      return data.session;
    } catch (error) {
      console.error('❌ Error creating session:', error);
      setError('Failed to create session');
      showNotification('Failed to create session', 'error');
    }
  };

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStatus = (message) => {
    if (message.sender_id !== user.id) return null;
    
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-400" />;
      default:
        return <AlertCircle className="w-3 h-3 text-red-400" />;
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'connecting':
      case 'reconnecting':
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'disconnected':
      case 'error':
      case 'failed':
        return <WifiOff className="w-4 h-4 text-red-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPresenceColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-400';
      case 'away':
        return 'bg-yellow-400';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  // =========================================================================
  // EFFECTS
  // =========================================================================

  useEffect(() => {
    if (user && token) {
      fetchSessions().finally(() => setLoading(false));
    }
  }, [user, token, fetchSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // =========================================================================
  // RENDER
  // =========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-dark-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cosmic-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading chat system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-dark-900 text-white">
      {/* Hidden audio element for notifications */}
      <audio ref={audioRef} preload="none" />
      
      {/* Enhanced Notification Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg backdrop-blur-lg border transition-all duration-300 transform ${
              notification.type === 'success' ? 'bg-green-900/80 border-green-400/50 text-green-100' :
              notification.type === 'error' ? 'bg-red-900/80 border-red-400/50 text-red-100' :
              notification.type === 'warning' ? 'bg-yellow-900/80 border-yellow-400/50 text-yellow-100' :
              notification.type === 'message' ? 'bg-cosmic-900/80 border-cosmic-400/50 text-cosmic-100' :
              'bg-blue-900/80 border-blue-400/50 text-blue-100'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' && <Check className="w-4 h-4" />}
              {notification.type === 'error' && <AlertCircle className="w-4 h-4" />}
              {notification.type === 'warning' && <AlertCircle className="w-4 h-4" />}
              {notification.type === 'message' && <MessageCircle className="w-4 h-4" />}
              {notification.type === 'info' && <Zap className="w-4 h-4" />}
              <span className="text-sm font-medium">{notification.message}</span>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Sidebar */}
      <div className="w-80 border-r border-gray-700 flex flex-col bg-dark-800">
        {/* Enhanced Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-cosmic-300 flex items-center">
              <MessageCircle className="w-6 h-6 mr-2" />
              Chat Dashboard
            </h1>
            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                {getConnectionStatusIcon()}
                <span className="text-xs text-gray-400 capitalize">{connectionStatus}</span>
              </div>
              
              {/* Settings */}
              <button
                onClick={() => setShowPresencePanel(!showPresencePanel)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Settings"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Enhanced Controls */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-400"
              />
            </div>
            <button
              onClick={() => setShowNewSessionModal(true)}
              className="p-2 bg-cosmic-600 hover:bg-cosmic-700 text-white rounded-lg transition-colors"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Enhanced Status Bar */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-400">
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                    {unreadCount} unread
                  </span>
                )}
              </span>
              <span className="text-gray-400">
                {onlineUsers.size} online
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`p-1 transition-colors ${notificationsEnabled ? 'text-green-400' : 'text-gray-400'}`}
                title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
              >
                {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1 transition-colors ${soundEnabled ? 'text-green-400' : 'text-gray-400'}`}
                title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Session List */}
        <div className="flex-1 overflow-y-auto">
          <UnifiedChatList
            sessions={sessions}
            activeSession={activeSession}
            onSessionSelect={handleSessionSelect}
            searchTerm={searchTerm}
            onlineUsers={onlineUsers}
            typingUsers={typingUsers}
          />
        </div>

        {/* Enhanced Admin Panel */}
        {hasAdminOrMonitorAccess(profile?.role) && (
          <div className="border-t border-gray-700 p-4">
            <button
              onClick={() => setShowVoiceApprovals(!showVoiceApprovals)}
              className="w-full flex items-center justify-between p-3 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors"
            >
              <span className="text-purple-300">Voice Approvals</span>
              {pendingApprovals > 0 && (
                <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                  {pendingApprovals}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeSession ? (
          <>
            {/* Enhanced Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-dark-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-semibold text-white">
                      {activeSession.title || `Chat Session`}
                    </h2>
                    <span className="text-sm text-gray-400">
                      #{activeSession.id.slice(-8)}
                    </span>
                  </div>
                  
                  {/* Online Participants */}
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">{onlineUsers.size}</span>
                    <div className="flex -space-x-1">
                      {Array.from(onlineUsers.values()).slice(0, 3).map((user) => (
                        <div
                          key={user.id}
                          className="relative"
                          title={user.name}
                        >
                          <div className="w-6 h-6 rounded-full bg-cosmic-600 border border-gray-600 flex items-center justify-center">
                            <span className="text-xs text-white">
                              {user.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-dark-800 ${getPresenceColor(user.status)}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Typing Indicators */}
                  {typingUsers.size > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-cosmic-400 rounded-full animate-bounce" />
                        <div className="w-1 h-1 bg-cosmic-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-1 h-1 bg-cosmic-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                      <span>
                        {Array.from(typingUsers.values()).map(u => u.user_name).join(', ')} typing...
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <button
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Voice Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Video Call"
                  >
                    <VideoIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Chat Thread */}
            <div className="flex-1">
              <UnifiedChatThread
                session={activeSession}
                messages={messages}
                currentUser={user}
                onSendMessage={handleSendMessage}
                onFileUpload={handleFileUpload}
                onVoiceMessage={handleVoiceMessage}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                sending={sending}
                onTyping={handleTyping}
                showAudioRecorder={showAudioRecorder}
                setShowAudioRecorder={setShowAudioRecorder}
                getMessageStatus={getMessageStatus}
                onlineUsers={onlineUsers}
                typingUsers={typingUsers}
              />
            </div>
          </>
        ) : (
          /* Enhanced Empty State */
          <div className="flex-1 flex items-center justify-center bg-dark-900">
            <div className="text-center max-w-md">
              <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-300 mb-2">
                Welcome to SAMIA TAROT Chat
              </h2>
              <p className="text-gray-500 mb-6">
                Select a conversation to start chatting, or create a new session to begin.
              </p>
              <button
                onClick={() => setShowNewSessionModal(true)}
                className="px-6 py-3 bg-cosmic-600 hover:bg-cosmic-700 text-white rounded-lg transition-colors flex items-center mx-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Voice Approval Panel */}
      {showVoiceApprovals && hasAdminOrMonitorAccess(profile?.role) && (
        <VoiceApprovalPanel
          onClose={() => setShowVoiceApprovals(false)}
          pendingCount={pendingApprovals}
          onApprovalChange={(delta) => setPendingApprovals(prev => Math.max(0, prev + delta))}
        />
      )}

      {/* Enhanced Audio Recorder Modal */}
      {showAudioRecorder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-dark-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full mx-4">
            <UnifiedAudioRecorder
              onSend={handleVoiceMessage}
              onCancel={() => setShowAudioRecorder(false)}
              maxDuration={600}
            />
          </div>
        </div>
      )}

      {/* Enhanced Settings Panel */}
      {showPresencePanel && (
        <div className="absolute top-16 right-4 z-40 bg-dark-800 border border-gray-700 rounded-lg shadow-xl p-4 w-64">
          <h3 className="text-sm font-semibold text-white mb-3">Chat Settings</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Notifications</span>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`w-8 h-4 rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                  notificationsEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Sound Effects</span>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-8 h-4 rounded-full transition-colors ${
                  soundEnabled ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                  soundEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="pt-2 border-t border-gray-700">
              <label className="text-sm text-gray-300 block mb-2">Your Status</label>
              <select
                value={presenceStatus}
                onChange={(e) => setPresenceStatus(e.target.value)}
                className="w-full bg-dark-700 border border-gray-600 rounded text-white text-sm p-2"
              >
                <option value="online">🟢 Online</option>
                <option value="away">🟡 Away</option>
                <option value="offline">⚫ Offline</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setShowPresencePanel(false)}
            className="w-full mt-4 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default UnifiedChatDashboard; 