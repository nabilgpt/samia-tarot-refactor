# SAMIA TAROT - Communication System Documentation

## Overview
The SAMIA TAROT Communication System provides comprehensive real-time communication capabilities including text chat, voice calls, video sessions, and emergency communication features.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Chat System](#chat-system)
3. [Video Call System](#video-call-system)
4. [WebRTC Implementation](#webrtc-implementation)
5. [Socket.IO Integration](#socketio-integration)
6. [Emergency Communication](#emergency-communication)
7. [Message Encryption](#message-encryption)
8. [File Sharing](#file-sharing)
9. [Notification System](#notification-system)
10. [Moderation Features](#moderation-features)

## Architecture Overview

### System Components
- **Chat Engine**: Real-time messaging with Socket.IO
- **WebRTC Service**: Peer-to-peer video/audio calls
- **Media Server**: TURN/STUN servers for connectivity
- **Message Store**: Encrypted message persistence
- **Notification Service**: Push notifications and alerts
- **Moderation AI**: Content filtering and safety

### Communication Flow
```
Client A ↔ Socket.IO Server ↔ Client B
Client A ↔ WebRTC (P2P) ↔ Client B
```

## Chat System

### Chat Architecture
```javascript
// src/services/chatService.js
class ChatService {
  constructor() {
    this.socket = null;
    this.currentRoom = null;
    this.messageQueue = [];
  }

  async initializeChat(userId, token) {
    this.socket = io('/chat', {
      auth: { token, userId },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
    return new Promise((resolve) => {
      this.socket.on('connect', () => {
        console.log('Chat connected:', this.socket.id);
        resolve(this.socket.id);
      });
    });
  }

  setupEventListeners() {
    this.socket.on('message', this.handleIncomingMessage.bind(this));
    this.socket.on('typing', this.handleTypingIndicator.bind(this));
    this.socket.on('user_joined', this.handleUserJoined.bind(this));
    this.socket.on('user_left', this.handleUserLeft.bind(this));
    this.socket.on('room_created', this.handleRoomCreated.bind(this));
    this.socket.on('error', this.handleError.bind(this));
  }

  async joinRoom(roomId) {
    return new Promise((resolve, reject) => {
      this.socket.emit('join_room', { roomId }, (response) => {
        if (response.success) {
          this.currentRoom = roomId;
          resolve(response.room);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  sendMessage(content, type = 'text', metadata = {}) {
    const message = {
      id: uuidv4(),
      content,
      type,
      timestamp: new Date().toISOString(),
      roomId: this.currentRoom,
      metadata
    };

    this.socket.emit('send_message', message);
    return message;
  }

  sendTypingIndicator(isTyping) {
    this.socket.emit('typing', {
      roomId: this.currentRoom,
      isTyping
    });
  }

  handleIncomingMessage(message) {
    // Decrypt message if encrypted
    if (message.encrypted) {
      message.content = this.decryptMessage(message.content);
    }

    // Trigger message received event
    this.onMessageReceived?.(message);
  }
}

export const chatService = new ChatService();
```

### Chat Component
```jsx
// src/components/Chat/ChatInterface.jsx
const ChatInterface = ({ roomId, recipientId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initializeChat();
    return () => chatService.disconnect();
  }, []);

  useEffect(() => {
    if (roomId) {
      joinChatRoom();
    }
  }, [roomId]);

  const initializeChat = async () => {
    try {
      await chatService.initializeChat(user.id, token);
      setIsConnected(true);
      
      chatService.onMessageReceived = handleNewMessage;
      chatService.onTypingUpdate = setTypingUsers;
    } catch (error) {
      console.error('Chat initialization failed:', error);
    }
  };

  const joinChatRoom = async () => {
    try {
      const room = await chatService.joinRoom(roomId);
      setMessages(room.messages || []);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const handleNewMessage = (message) => {
    setMessages(prev => [...prev, message]);
    scrollToBottom();
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const message = chatService.sendMessage(newMessage);
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    scrollToBottom();
  };

  const handleTyping = (value) => {
    setNewMessage(value);
    
    if (value && !isTyping) {
      setIsTyping(true);
      chatService.sendTypingIndicator(true);
    } else if (!value && isTyping) {
      setIsTyping(false);
      chatService.sendTypingIndicator(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <CosmicCard className="chat-interface h-96 flex flex-col">
      <div className="chat-header p-4 border-b border-cosmic-purple-400/30">
        <div className="flex items-center justify-between">
          <h3 className="cosmic-subheading">Chat</h3>
          <div className={`flex items-center space-x-2 ${
            isConnected ? 'text-cosmic-mint' : 'text-cosmic-rose'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-cosmic-mint' : 'bg-cosmic-rose'
            }`} />
            <span className="text-sm">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className="chat-messages flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(message => (
          <ChatMessage 
            key={message.id}
            message={message}
            isOwn={message.senderId === user.id}
          />
        ))}
        
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input p-4 border-t border-cosmic-purple-400/30">
        <div className="flex space-x-2">
          <CosmicInput
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1"
          />
          <CosmicButton onClick={sendMessage} variant="primary">
            Send
          </CosmicButton>
        </div>
      </div>
    </CosmicCard>
  );
};
```

## Video Call System

### WebRTC Service
```javascript
// src/services/webrtcService.js
class WebRTCService {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.socket = null;
    this.isInitiator = false;
    
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: 'turn:your-turn-server.com:3478',
          username: process.env.REACT_APP_TURN_USERNAME,
          credential: process.env.REACT_APP_TURN_CREDENTIAL
        }
      ]
    };
  }

  async initializeCall(roomId, isInitiator = false) {
    this.isInitiator = isInitiator;
    
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });

      // Create peer connection
      this.createPeerConnection();

      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Connect to signaling server
      await this.connectToSignalingServer(roomId);

      if (this.isInitiator) {
        await this.createOffer();
      }

      return this.localStream;
    } catch (error) {
      console.error('Failed to initialize call:', error);
      throw error;
    }
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.configuration);

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.onRemoteStream?.(this.remoteStream);
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice_candidate', {
          candidate: event.candidate,
          roomId: this.currentRoom
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      this.onConnectionStateChange?.(this.peerConnection.connectionState);
    };
  }

  async connectToSignalingServer(roomId) {
    this.socket = io('/webrtc', {
      auth: { token: localStorage.getItem('token') }
    });

    this.socket.emit('join_room', { roomId });
    this.currentRoom = roomId;

    this.socket.on('offer', this.handleOffer.bind(this));
    this.socket.on('answer', this.handleAnswer.bind(this));
    this.socket.on('ice_candidate', this.handleIceCandidate.bind(this));
    this.socket.on('user_left', this.handleUserLeft.bind(this));
  }

  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.socket.emit('offer', {
        offer,
        roomId: this.currentRoom
      });
    } catch (error) {
      console.error('Failed to create offer:', error);
    }
  }

  async handleOffer(data) {
    try {
      await this.peerConnection.setRemoteDescription(data.offer);
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.socket.emit('answer', {
        answer,
        roomId: this.currentRoom
      });
    } catch (error) {
      console.error('Failed to handle offer:', error);
    }
  }

  async handleAnswer(data) {
    try {
      await this.peerConnection.setRemoteDescription(data.answer);
    } catch (error) {
      console.error('Failed to handle answer:', error);
    }
  }

  async handleIceCandidate(data) {
    try {
      await this.peerConnection.addIceCandidate(data.candidate);
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  toggleVideo() {
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  toggleAudio() {
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    
    if (this.socket) {
      this.socket.emit('leave_room', { roomId: this.currentRoom });
      this.socket.disconnect();
    }
  }
}

export const webrtcService = new WebRTCService();
```

### Video Call Component
```jsx
// src/components/Call/VideoCallInterface.jsx
const VideoCallInterface = ({ roomId, isInitiator }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('new');
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const callStartTime = useRef();

  useEffect(() => {
    initializeCall();
    return () => webrtcService.endCall();
  }, []);

  useEffect(() => {
    if (connectionState === 'connected' && !callStartTime.current) {
      callStartTime.current = Date.now();
      startDurationTimer();
    }
  }, [connectionState]);

  const initializeCall = async () => {
    try {
      webrtcService.onRemoteStream = setRemoteStream;
      webrtcService.onConnectionStateChange = setConnectionState;
      
      const stream = await webrtcService.initializeCall(roomId, isInitiator);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Call initialization failed:', error);
    }
  };

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const startDurationTimer = () => {
    const timer = setInterval(() => {
      if (callStartTime.current) {
        setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  };

  const toggleVideo = () => {
    const enabled = webrtcService.toggleVideo();
    setIsVideoEnabled(enabled);
  };

  const toggleAudio = () => {
    const enabled = webrtcService.toggleAudio();
    setIsAudioEnabled(enabled);
  };

  const endCall = () => {
    webrtcService.endCall();
    // Navigate back or close call interface
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-call-interface h-screen bg-cosmic-purple-900 relative">
      {/* Remote Video */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Local Video */}
      <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-cosmic-purple-400">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>

      {/* Call Info */}
      <div className="absolute top-4 left-4 bg-cosmic-purple-800/80 backdrop-blur-sm rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionState === 'connected' ? 'bg-cosmic-mint' : 'bg-cosmic-rose'
          }`} />
          <span className="text-white text-sm">
            {connectionState === 'connected' ? formatDuration(callDuration) : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Call Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center space-x-4 bg-cosmic-purple-800/80 backdrop-blur-sm rounded-full p-4">
          <CallControlButton
            icon={isVideoEnabled ? VideoCameraIcon : VideoCameraSlashIcon}
            onClick={toggleVideo}
            active={isVideoEnabled}
          />
          <CallControlButton
            icon={isAudioEnabled ? MicrophoneIcon : MicrophoneSlashIcon}
            onClick={toggleAudio}
            active={isAudioEnabled}
          />
          <CallControlButton
            icon={PhoneXMarkIcon}
            onClick={endCall}
            variant="danger"
          />
        </div>
      </div>
    </div>
  );
};

const CallControlButton = ({ icon: Icon, onClick, active = true, variant = 'default' }) => {
  const variants = {
    default: active ? 'bg-cosmic-purple-600' : 'bg-cosmic-purple-700',
    danger: 'bg-cosmic-rose'
  };

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-full transition-cosmic ${variants[variant]}`}
    >
      <Icon className="w-6 h-6 text-white" />
    </button>
  );
};
```

## Socket.IO Integration

### Backend Socket Server
```javascript
// src/api/socket/chatSocket.js
const socketAuth = require('../middleware/socketAuth');

const setupChatSocket = (io) => {
  const chatNamespace = io.of('/chat');
  
  chatNamespace.use(socketAuth);
  
  chatNamespace.on('connection', (socket) => {
    console.log('Chat user connected:', socket.userId);
    
    socket.on('join_room', async (data, callback) => {
      try {
        const room = await joinChatRoom(socket.userId, data.roomId);
        socket.join(data.roomId);
        
        // Notify other users in room
        socket.to(data.roomId).emit('user_joined', {
          userId: socket.userId,
          user: socket.user
        });
        
        callback({ success: true, room });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    socket.on('send_message', async (message) => {
      try {
        // Save message to database
        const savedMessage = await saveMessage({
          ...message,
          senderId: socket.userId,
          senderName: socket.user.full_name
        });

        // Broadcast to room
        chatNamespace.to(message.roomId).emit('message', savedMessage);
        
        // Send push notification if recipient offline
        await sendMessageNotification(message.roomId, savedMessage);
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', (data) => {
      socket.to(data.roomId).emit('typing', {
        userId: socket.userId,
        isTyping: data.isTyping
      });
    });

    socket.on('disconnect', () => {
      console.log('Chat user disconnected:', socket.userId);
    });
  });
};

const setupWebRTCSocket = (io) => {
  const webrtcNamespace = io.of('/webrtc');
  
  webrtcNamespace.use(socketAuth);
  
  webrtcNamespace.on('connection', (socket) => {
    console.log('WebRTC user connected:', socket.userId);
    
    socket.on('join_room', (data) => {
      socket.join(data.roomId);
      socket.to(data.roomId).emit('user_joined', {
        userId: socket.userId
      });
    });

    socket.on('offer', (data) => {
      socket.to(data.roomId).emit('offer', data);
    });

    socket.on('answer', (data) => {
      socket.to(data.roomId).emit('answer', data);
    });

    socket.on('ice_candidate', (data) => {
      socket.to(data.roomId).emit('ice_candidate', data);
    });

    socket.on('leave_room', (data) => {
      socket.leave(data.roomId);
      socket.to(data.roomId).emit('user_left', {
        userId: socket.userId
      });
    });
  });
};

module.exports = { setupChatSocket, setupWebRTCSocket };
```

## Emergency Communication

### Emergency Call System
```jsx
// src/components/Emergency/EmergencyCallButton.jsx
const EmergencyCallButton = () => {
  const [isEmergency, setIsEmergency] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [emergencySession, setEmergencySession] = useState(null);

  const initiateEmergencyCall = async () => {
    try {
      setIsEmergency(true);
      
      // Create emergency session
      const session = await emergencyService.createEmergencySession({
        userId: user.id,
        type: 'tarot_emergency',
        priority: 'high'
      });
      
      setEmergencySession(session);
      
      // Find available emergency reader
      const reader = await emergencyService.findEmergencyReader();
      
      if (reader) {
        // Start call immediately
        await webrtcService.initializeCall(session.roomId, true);
      } else {
        // Start countdown for callback
        startEmergencyCountdown();
      }
    } catch (error) {
      console.error('Emergency call failed:', error);
    }
  };

  const startEmergencyCountdown = () => {
    setCountdown(300); // 5 minutes
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Trigger emergency callback
          emergencyService.scheduleEmergencyCallback(emergencySession.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="emergency-call-button">
      {!isEmergency ? (
        <CosmicButton
          onClick={initiateEmergencyCall}
          variant="cosmic"
          className="bg-cosmic-rose hover:bg-cosmic-rose/80 pulse-animation"
        >
          <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
          Emergency Reading
        </CosmicButton>
      ) : (
        <EmergencyCallInterface 
          session={emergencySession}
          countdown={countdown}
        />
      )}
    </div>
  );
};
```

## Message Encryption

### End-to-End Encryption
```javascript
// src/security/messageEncryption.js
class MessageEncryption {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
  }

  async generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey']
    );

    return keyPair;
  }

  async deriveSharedKey(privateKey, publicKey) {
    const sharedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey
      },
      privateKey,
      {
        name: 'AES-GCM',
        length: this.keyLength
      },
      false,
      ['encrypt', 'decrypt']
    );

    return sharedKey;
  }

  async encryptMessage(message, sharedKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: this.algorithm,
        iv: iv
      },
      sharedKey,
      data
    );

    return {
      encrypted: Array.from(new Uint8Array(encryptedData)),
      iv: Array.from(iv)
    };
  }

  async decryptMessage(encryptedMessage, sharedKey) {
    const { encrypted, iv } = encryptedMessage;
    
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: this.algorithm,
        iv: new Uint8Array(iv)
      },
      sharedKey,
      new Uint8Array(encrypted)
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }
}

export const messageEncryption = new MessageEncryption();
```

## File Sharing

### File Upload Component
```jsx
// src/components/Chat/FileUpload.jsx
const FileUpload = ({ onFileUploaded, maxSize = 10 * 1024 * 1024 }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > maxSize) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        onFileUploaded({
          type: 'file',
          content: result.fileUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        });
      }
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="file-upload">
      <input
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        id="file-input"
        accept="image/*,audio/*,.pdf,.doc,.docx"
      />
      
      <label 
        htmlFor="file-input"
        className={`cosmic-button cursor-pointer ${uploading ? 'opacity-50' : ''}`}
      >
        <PaperClipIcon className="w-5 h-5" />
        {uploading ? `${uploadProgress}%` : 'Attach'}
      </label>
    </div>
  );
};
```

## Notification System

### Push Notifications
```javascript
// src/services/notificationService.js
class NotificationService {
  async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async showNotification(title, options = {}) {
    if (await this.requestPermission()) {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.onClick) {
          options.onClick();
        }
      };

      return notification;
    }
  }

  async showMessageNotification(message) {
    return this.showNotification(
      `New message from ${message.senderName}`,
      {
        body: message.content,
        tag: `message-${message.id}`,
        onClick: () => {
          // Navigate to chat
          window.location.href = `/chat/${message.roomId}`;
        }
      }
    );
  }

  async showCallNotification(caller) {
    return this.showNotification(
      `Incoming call from ${caller.name}`,
      {
        body: 'Tap to answer',
        tag: `call-${caller.id}`,
        requireInteraction: true,
        actions: [
          { action: 'answer', title: 'Answer' },
          { action: 'decline', title: 'Decline' }
        ]
      }
    );
  }
}

export const notificationService = new NotificationService();
```

## Moderation Features

### AI Content Moderation
```javascript
// src/services/contentModeration.js
class ContentModerationService {
  async moderateMessage(message) {
    try {
      const response = await fetch('/api/moderation/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: message.content,
          type: 'text'
        })
      });

      const result = await response.json();
      
      return {
        approved: result.approved,
        confidence: result.confidence,
        flags: result.flags,
        suggestedAction: result.suggestedAction
      };
    } catch (error) {
      console.error('Content moderation failed:', error);
      return { approved: true }; // Fail open for user experience
    }
  }

  async reportMessage(messageId, reason) {
    try {
      await fetch('/api/moderation/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          messageId,
          reason,
          reportedBy: user.id
        })
      });
    } catch (error) {
      console.error('Message report failed:', error);
    }
  }
}

export const contentModerationService = new ContentModerationService();
```

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: SAMIA TAROT Development Team 