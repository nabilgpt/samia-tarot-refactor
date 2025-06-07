# 💬 CHAT API DOCUMENTATION
## Real-time Messaging System for SAMIA TAROT Platform

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Status:** ✅ COMPLETED

---

## 🚀 OVERVIEW

The Chat API provides a complete real-time messaging solution for the SAMIA TAROT platform, enabling seamless communication between clients and tarot readers through text messages, voice notes, and file sharing.

### 🎯 Key Features
- ✅ **Real-time messaging** with Socket.IO
- ✅ **Voice notes** with audio file upload
- ✅ **File sharing** (images, documents, PDFs)
- ✅ **Message reactions** and interactions
- ✅ **Typing indicators** for live feedback
- ✅ **Chat sessions** tied to bookings
- ✅ **Message read status** tracking
- ✅ **Rate limiting** for spam protection
- ✅ **Role-based access** control

---

## 📡 REAL-TIME EVENTS (Socket.IO)

### Connection & Authentication
```javascript
// Connect with authentication
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Authentication success
socket.on('authenticated', (data) => {
  console.log('User authenticated:', data.user);
});

// Authentication error
socket.on('auth_error', (error) => {
  console.error('Auth failed:', error.message);
});
```

### Chat Session Management
```javascript
// Join a chat session
socket.emit('join_chat', { session_id: 'uuid' });

// Confirmation of joining
socket.on('chat_joined', (data) => {
  console.log('Joined chat:', data.session_id);
});

// User joined notification
socket.on('user_joined', (data) => {
  console.log(`${data.user_name} joined the chat`);
});

// User left notification
socket.on('user_left', (data) => {
  console.log(`${data.user_name} left the chat`);
});
```

### Message Events
```javascript
// Send a message
socket.emit('send_message', {
  session_id: 'uuid',
  message: {
    id: 'message-uuid',
    content: 'Hello, I need help with my reading',
    type: 'text'
  }
});

// Message sent confirmation
socket.on('message_sent', (data) => {
  console.log('Message delivered:', data.message_id);
});

// Receive new message
socket.on('new_message', (message) => {
  console.log('New message:', message);
  // message structure:
  // {
  //   id: 'uuid',
  //   content: 'message text',
  //   type: 'text|voice|image|file',
  //   sender: { id, name, avatar },
  //   timestamp: '2024-12-...'
  // }
});
```

### Typing Indicators
```javascript
// Start typing
socket.emit('typing_start');

// Stop typing
socket.emit('typing_stop');

// Receive typing status
socket.on('user_typing', (data) => {
  if (data.is_typing) {
    console.log(`${data.user_name} is typing...`);
  } else {
    console.log(`${data.user_name} stopped typing`);
  }
});
```

### Message Reactions
```javascript
// React to a message
socket.emit('message_reaction', {
  message_id: 'uuid',
  reaction: '❤️', // emoji reaction
  session_id: 'uuid'
});

// Receive reaction update
socket.on('message_reaction_update', (data) => {
  console.log(`${data.user_name} reacted with ${data.reaction}`);
});
```

---

## 🔗 REST API ENDPOINTS

### 1. Chat Sessions

#### GET `/api/chat/sessions`
List user's chat sessions with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Session status filter (default: 'active')
- `booking_id` (string): Filter by booking ID

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "booking_id": "uuid",
        "session_type": "booking",
        "status": "active",
        "participants": ["user1-id", "reader1-id"],
        "last_message_at": "2024-12-...",
        "unread_count": 3,
        "bookings": {
          "id": "uuid",
          "services": { "name": "Full Tarot Reading", "type": "comprehensive" },
          "profiles": [...]
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

#### GET `/api/chat/sessions/:id`
Get detailed information about a specific chat session.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "booking_id": "uuid",
    "session_type": "booking",
    "status": "active",
    "participants": ["user1", "reader1"],
    "participant_profiles": [
      {
        "id": "user1",
        "first_name": "Sarah",
        "last_name": "Johnson",
        "avatar_url": "https://...",
        "role": "client"
      }
    ],
    "metadata": {},
    "created_at": "2024-12-...",
    "bookings": {...}
  }
}
```

#### POST `/api/chat/sessions`
Create a new chat session.

**Request Body:**
```json
{
  "booking_id": "uuid", // Optional: for booking-based chats
  "participant_ids": ["user1", "user2"], // Optional: for manual sessions
  "session_type": "booking", // or "support", "general"
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-session-uuid",
    "booking_id": "uuid",
    "session_type": "booking",
    "status": "active",
    "participants": ["user1", "reader1"],
    "created_at": "2024-12-..."
  },
  "message": "Chat session created successfully"
}
```

### 2. Messages

#### GET `/api/chat/messages`
Retrieve messages from a chat session with pagination.

**Query Parameters:**
- `session_id` (required): Chat session ID
- `page` (number): Page number (default: 1)
- `limit` (number): Messages per page (default: 50)
- `before_message_id` (string): Get messages before this message (for infinite scroll)

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "session_id": "uuid",
        "sender_id": "uuid",
        "content": "Hello! How can I help you today?",
        "type": "text",
        "file_url": null,
        "file_name": null,
        "is_read": true,
        "created_at": "2024-12-...",
        "profiles": {
          "first_name": "Samia",
          "last_name": "Reader",
          "avatar_url": "https://..."
        },
        "message_reactions": [
          {
            "user_id": "uuid",
            "reaction": "❤️",
            "profiles": {"first_name": "Sarah"}
          }
        ]
      }
    ],
    "has_more": true
  }
}
```

#### POST `/api/chat/messages`
Send a text message to a chat session.

**Request Body:**
```json
{
  "session_id": "uuid",
  "content": "Thank you for the reading, it was very insightful!",
  "type": "text", // or "system"
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-message-uuid",
    "session_id": "uuid",
    "sender_id": "current-user-id",
    "content": "Thank you for the reading...",
    "type": "text",
    "created_at": "2024-12-...",
    "profiles": {...}
  },
  "message": "Message sent successfully"
}
```

#### PUT `/api/chat/messages/:id/read`
Mark a message as read by the current user.

**Response:**
```json
{
  "success": true,
  "message": "Message marked as read"
}
```

### 3. Voice Notes

#### POST `/api/chat/voice-notes`
Upload and send a voice note message.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `voice_note` (file): Audio file (mp3, wav, ogg, webm)
- `session_id` (string): Chat session ID
- `duration` (number, optional): Voice note duration in seconds

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "voice-message-uuid",
    "session_id": "uuid",
    "sender_id": "uuid",
    "content": "Voice message",
    "type": "voice",
    "file_url": "https://supabase.../voice_notes/...",
    "file_name": "original_filename.mp3",
    "file_size": 245760,
    "metadata": {
      "duration": 15,
      "audio_format": "mp3"
    },
    "created_at": "2024-12-...",
    "profiles": {...}
  },
  "message": "Voice note uploaded successfully"
}
```

---

## 🔒 SECURITY & RATE LIMITING

### Rate Limits
- **Chat Messages:** 100 messages per minute per user
- **Voice Notes:** 10 voice messages per minute per user
- **File Uploads:** 10MB maximum file size

### File Upload Security
- **Allowed Audio Types:** mp3, wav, ogg, webm
- **Allowed Image Types:** jpg, png, gif, webp
- **Allowed Document Types:** pdf
- **Virus Scanning:** Files are scanned before storage
- **Storage:** Supabase Storage with CDN

### Access Control
- Users can only access chat sessions they're participants of
- Messages are filtered by session participation
- File uploads require valid session access
- Admin users have override access for moderation

---

## 🎯 USAGE EXAMPLES

### Frontend React Integration

#### Basic Chat Component
```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ChatComponent({ sessionId, token }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    // Join chat session
    newSocket.emit('join_chat', { session_id: sessionId });

    // Listen for new messages
    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing indicators
    newSocket.on('user_typing', (data) => {
      if (data.is_typing) {
        setTypingUsers(prev => [...prev, data.user_name]);
      } else {
        setTypingUsers(prev => prev.filter(u => u !== data.user_name));
      }
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [sessionId, token]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // Send via API
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        session_id: sessionId,
        content: newMessage,
        type: 'text'
      })
    });

    const result = await response.json();

    // Emit via socket for real-time delivery
    if (result.success) {
      socket.emit('send_message', {
        session_id: sessionId,
        message: result.data
      });
      setNewMessage('');
    }
  };

  const handleTyping = () => {
    socket.emit('typing_start');
    // Stop typing after 3 seconds of inactivity
    setTimeout(() => socket.emit('typing_stop'), 3000);
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className="message">
            <strong>{message.sender.name}:</strong>
            {message.type === 'voice' ? (
              <audio controls src={message.file_url} />
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        ))}
      </div>
      
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}
      
      <div className="message-input">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleTyping}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
```

#### Voice Note Component
```jsx
import { useState, useRef } from 'react';

function VoiceNoteRecorder({ sessionId, token, onVoiceNoteSent }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        await uploadVoiceNote(blob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Stop after 60 seconds max
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
        clearInterval(timer);
      }, 60000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setRecordingTime(0);
  };

  const uploadVoiceNote = async (audioBlob) => {
    const formData = new FormData();
    formData.append('voice_note', audioBlob, 'voice_note.wav');
    formData.append('session_id', sessionId);
    formData.append('duration', recordingTime);

    try {
      const response = await fetch('/api/chat/voice-notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        onVoiceNoteSent(result.data);
      }
    } catch (error) {
      console.error('Error uploading voice note:', error);
    }
  };

  return (
    <div className="voice-recorder">
      {!isRecording ? (
        <button onClick={startRecording} className="record-button">
          🎤 Record Voice Note
        </button>
      ) : (
        <div className="recording-controls">
          <div className="recording-indicator">
            🔴 Recording... {recordingTime}s
          </div>
          <button onClick={stopRecording} className="stop-button">
            Stop Recording
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 🔍 ERROR HANDLING

### Common Error Codes
- `AUTHENTICATION_REQUIRED` - Missing or invalid JWT token
- `CHAT_ACCESS_DENIED` - User not participant of chat session
- `SESSION_NOT_FOUND` - Chat session doesn't exist
- `VALIDATION_ERROR` - Invalid request data
- `FILE_TOO_LARGE` - Uploaded file exceeds size limit
- `UNSUPPORTED_FILE_TYPE` - File type not allowed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SESSION_INACTIVE` - Cannot send messages to inactive session

### Error Response Format
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": ["Additional error details array"]
}
```

---

## 🚀 DEPLOYMENT NOTES

### Environment Variables Required
```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_URL=http://localhost:3000
PORT=5000
```

### Database Tables Required
- `chat_sessions` - Chat session metadata
- `chat_messages` - Individual messages
- `message_reactions` - Message reactions
- `profiles` - User profiles
- `bookings` - Booking information

### Storage Bucket Required
- `chat-files` - For voice notes and file uploads

---

## 📊 PERFORMANCE CONSIDERATIONS

### Scalability Features
- **Message Pagination:** Prevents loading too many messages at once
- **Rate Limiting:** Protects against spam and abuse
- **File Compression:** Images are automatically compressed
- **CDN Delivery:** Files served through Supabase CDN
- **Connection Pooling:** Efficient database connections
- **Memory Management:** Proper socket cleanup on disconnect

### Monitoring Metrics
- Active socket connections
- Messages per second
- File upload volume
- Database query performance
- Error rates by endpoint

---

**🎉 Chat API is now COMPLETE and ready for production use!** 