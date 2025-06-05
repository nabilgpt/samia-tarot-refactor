# 🗨️ PHASE 1: REAL-TIME CHAT SYSTEM WITH AUDIO + NOTIFICATIONS

## Overview

This phase implements a comprehensive real-time chat system for the SAMIA TAROT platform with voice messaging, file sharing, moderation, and real-time notifications.

## ✅ Features Implemented

### 🔄 Real-time Messaging
- **Live message updates** using Supabase real-time subscriptions
- **Typing indicators** with auto-expiry
- **Message read receipts** and status tracking
- **Instant notifications** for new messages

### 🎵 Voice Messaging System
- **Audio recording** with WebRTC MediaRecorder API
- **Voice note playback** with progress indicators
- **Admin moderation** - Reader voice notes require approval
- **Quality controls** - Echo cancellation, noise suppression
- **Duration limits** - Configurable per service type

### 📸 File Sharing
- **Image uploads** with preview and full-screen view
- **File validation** - Type and size restrictions (5MB max)
- **Supabase storage** integration for secure file hosting
- **Download functionality** for all file types

### 🛡️ Moderation & Security
- **Voice note approval** workflow for admin/monitor roles
- **Content filtering** and flagging system
- **Message deletion** (5-minute window for senders)
- **Chat session locking** by readers (Finish Reading button)

### 📊 Usage Limits & Controls
- **Character limits** for text messages (10,000 default, 50,000 for candle readings)
- **Voice time limits** (10 minutes default)
- **Image limits** (10 default, 50 for candle readings)
- **Reader voice limits** (1 voice note per session)
- **Real-time usage tracking** and enforcement

### 🔔 Notification System
- **Real-time notifications** for new messages, approvals, chat locks
- **Unread message counters** with live updates
- **Push notification ready** (can integrate with Firebase)
- **Notification history** and management

## 🏗️ Database Schema

### Enhanced Tables

#### `messages` (Enhanced)
```sql
-- New columns added:
ALTER TABLE messages 
ADD COLUMN file_name TEXT,
ADD COLUMN file_size INTEGER,
ADD COLUMN duration_seconds INTEGER,
ADD COLUMN is_approved BOOLEAN DEFAULT true,
ADD COLUMN approved_by UUID REFERENCES profiles(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN flagged BOOLEAN DEFAULT false,
ADD COLUMN flagged_reason TEXT,
ADD COLUMN reply_to UUID REFERENCES messages(id);
```

#### `chat_sessions` (New)
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL UNIQUE,
  client_id UUID REFERENCES profiles(id) NOT NULL,
  reader_id UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('active', 'locked', 'completed')) DEFAULT 'active',
  locked_by UUID REFERENCES profiles(id),
  locked_at TIMESTAMP WITH TIME ZONE,
  -- Usage tracking
  client_text_chars_used INTEGER DEFAULT 0,
  client_voice_seconds_used INTEGER DEFAULT 0,
  client_images_sent INTEGER DEFAULT 0,
  reader_voice_notes_sent INTEGER DEFAULT 0,
  -- Limits (configurable per service)
  max_text_chars INTEGER DEFAULT 10000,
  max_voice_seconds INTEGER DEFAULT 600,
  max_images INTEGER DEFAULT 10,
  max_reader_voice_notes INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `voice_note_approvals` (New)
```sql
CREATE TABLE voice_note_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) NOT NULL,
  reader_id UUID REFERENCES profiles(id) NOT NULL,
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `chat_notifications` (New)
```sql
CREATE TABLE chat_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT CHECK (type IN ('new_message', 'voice_approved', 'chat_locked', 'typing')) NOT NULL,
  message_id UUID REFERENCES messages(id),
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Functions & Triggers

#### Auto Chat Session Creation
- **Trigger**: Creates chat session when booking status changes to 'confirmed'
- **Logic**: Sets appropriate limits based on service type (candle readings get higher limits)

#### Usage Limit Enforcement
- **Trigger**: Validates and updates usage counters before message insertion
- **Logic**: Prevents exceeding limits, requires approval for reader voice notes

#### Real-time Notifications
- **Trigger**: Automatically sends notifications for new messages and approvals
- **Logic**: Determines recipient and notification type based on context

## 🔧 API Implementation

### ChatAPI Functions

#### Core Messaging
```javascript
// Send different message types
ChatAPI.sendTextMessage(bookingId, senderId, content, replyTo)
ChatAPI.sendImageMessage(bookingId, senderId, imageFile, caption)
ChatAPI.sendVoiceMessage(bookingId, senderId, audioBlob, duration)

// Message management
ChatAPI.getMessages(bookingId, limit, offset)
ChatAPI.markMessagesAsRead(bookingId, userId)
ChatAPI.deleteMessage(messageId, userId)
```

#### Real-time Subscriptions
```javascript
// Subscribe to message updates
ChatAPI.subscribeToMessages(bookingId, callback)

// Subscribe to notifications
ChatAPI.subscribeToChatNotifications(userId, callback)

// Subscribe to voice approvals (admin)
ChatAPI.subscribeToVoiceApprovals(callback)
```

#### Admin Functions
```javascript
// Voice note moderation
ChatAPI.getPendingVoiceApprovals()
ChatAPI.approveVoiceNote(approvalId, reviewedBy, approved, notes)

// Chat session management
ChatAPI.getChatSession(bookingId)
ChatAPI.lockChatSession(bookingId, lockedBy)
```

## 🎨 UI Components

### Component Architecture

```
ChatDashboard (Main Container)
├── ChatList (Conversation List)
├── ChatThread (Active Conversation)
│   ├── MessageBubble (Individual Messages)
│   ├── AudioRecorder (Voice Recording)
│   └── Message Input Controls
└── VoiceApprovalPanel (Admin Only)
```

### Key Features

#### ChatDashboard
- **Responsive layout** - Mobile-first design with adaptive panels
- **Real-time updates** - Live unread counts and notifications
- **Role-based UI** - Admin/monitor get voice approval panel
- **Notification dropdown** - Recent activity with quick actions

#### ChatList
- **Live chat previews** - Latest message, timestamps, unread counts
- **Status indicators** - Locked chats, pending approvals, online status
- **Usage indicators** - Remaining limits for clients
- **Smart sorting** - Most recent activity first

#### ChatThread
- **Message types** - Text, images, voice notes, system messages
- **Reply functionality** - Quote and respond to specific messages
- **Typing indicators** - Real-time typing status
- **Usage limits display** - Live remaining quotas for clients
- **Finish Reading button** - Readers can lock chat when done

#### AudioRecorder
- **Professional recording** - High-quality audio with noise suppression
- **Visual feedback** - Waveform animation, progress bars, timers
- **Preview playback** - Test recording before sending
- **Auto-stop** - Prevents exceeding time limits

#### MessageBubble
- **Rich content** - Text, images, voice with proper formatting
- **Interactive elements** - Play/pause, image zoom, download
- **Message actions** - Reply, delete (time-limited), download
- **Status indicators** - Read receipts, approval status, timestamps

#### VoiceApprovalPanel (Admin)
- **Approval queue** - Pending voice notes with context
- **Audio playback** - Listen to voice notes before approval
- **Review notes** - Add comments for approval/rejection decisions
- **Batch actions** - Quick approve/reject with guidelines

## 🔐 Security & Permissions

### Row Level Security (RLS)
- **Chat sessions**: Users can only access their own sessions
- **Messages**: Filtered by booking participation and approval status
- **Voice approvals**: Only admins/monitors can view and modify
- **Notifications**: Users see only their own notifications

### Content Moderation
- **Voice note approval**: All reader voice notes require admin approval
- **File validation**: Type and size restrictions on uploads
- **Message deletion**: Time-limited self-deletion (5 minutes)
- **Chat locking**: Readers can end sessions to prevent further messages

### Usage Limits
- **Character counting**: Real-time text character tracking
- **Voice duration**: Precise second-by-second tracking
- **Image counting**: File upload limits with visual indicators
- **Reader restrictions**: Limited voice notes per session

## 📱 Mobile Responsiveness

### Adaptive Layout
- **Mobile-first design** - Optimized for touch interfaces
- **Panel switching** - Chat list ↔ Thread navigation on mobile
- **Touch-friendly controls** - Large buttons, swipe gestures
- **Responsive typography** - Readable text at all screen sizes

### Mobile-Specific Features
- **Touch recording** - Hold-to-record voice messages
- **Image capture** - Camera integration for photo sharing
- **Notification support** - Ready for push notifications
- **Offline handling** - Graceful degradation when offline

## 🚀 Performance Optimizations

### Real-time Efficiency
- **Selective subscriptions** - Only subscribe to relevant channels
- **Message pagination** - Load messages in chunks
- **Image lazy loading** - Load images as needed
- **Audio streaming** - Efficient audio file handling

### Memory Management
- **Audio cleanup** - Proper disposal of MediaRecorder instances
- **File URL cleanup** - Revoke blob URLs to prevent memory leaks
- **Subscription cleanup** - Unsubscribe on component unmount
- **Debounced typing** - Limit typing indicator frequency

## 🔧 Configuration

### Service-Specific Limits
```javascript
// Standard services
max_text_chars: 10000
max_voice_seconds: 600 (10 minutes)
max_images: 10
max_reader_voice_notes: 1

// Candle readings (enhanced limits)
max_text_chars: 50000
max_voice_seconds: 600 (10 minutes)
max_images: 50
max_reader_voice_notes: 1
```

### File Upload Limits
```javascript
// Image uploads
max_file_size: 5MB
allowed_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Voice recordings
max_duration: 600 seconds (10 minutes)
audio_format: 'audio/webm;codecs=opus'
sample_rate: 44100
```

## 🧪 Testing Scenarios

### Core Functionality
1. **Message sending** - Text, images, voice notes
2. **Real-time updates** - Multiple users, live sync
3. **Usage limits** - Exceed limits, enforcement
4. **Voice approval** - Admin workflow, notifications
5. **Chat locking** - Reader finish, client restrictions

### Edge Cases
1. **Network interruption** - Offline/online transitions
2. **File upload failures** - Large files, network errors
3. **Audio permissions** - Microphone access denied
4. **Concurrent sessions** - Multiple tabs, devices
5. **Database constraints** - Limit violations, conflicts

### Performance Testing
1. **Large message history** - 1000+ messages
2. **Multiple active chats** - Real-time performance
3. **File upload stress** - Multiple simultaneous uploads
4. **Voice recording limits** - Max duration handling
5. **Notification flooding** - High-frequency updates

## 🔄 Integration Points

### Existing System Integration
- **Booking system** - Chat sessions tied to confirmed bookings
- **User profiles** - Avatar, names, roles for chat display
- **Payment system** - Service types determine chat limits
- **Notification system** - Extends existing notification framework

### External Services
- **Supabase Storage** - File and audio hosting
- **Supabase Realtime** - Live message synchronization
- **WebRTC MediaRecorder** - Audio recording capabilities
- **Browser APIs** - File handling, permissions, notifications

## 🚀 Deployment Checklist

### Database Setup
- [ ] Run `chat-enhancements.sql` on production database
- [ ] Verify all triggers and functions are created
- [ ] Test RLS policies with different user roles
- [ ] Create Supabase storage bucket: `chat-attachments`

### Environment Configuration
- [ ] Configure Supabase storage permissions
- [ ] Set up real-time subscriptions
- [ ] Configure file upload limits
- [ ] Test audio recording permissions

### Component Integration
- [ ] Add ChatDashboard to main navigation
- [ ] Update user dashboards with chat access
- [ ] Configure admin panel with voice approvals
- [ ] Test mobile responsive layout

### Performance Monitoring
- [ ] Monitor real-time subscription performance
- [ ] Track file upload success rates
- [ ] Monitor voice approval queue length
- [ ] Set up error logging for chat failures

## 🔮 Future Enhancements

### Phase 2 Integration
- **Tarot card integration** - Send card images in chat
- **AI reading support** - Context-aware suggestions
- **Reading session flow** - Structured chat progression

### Advanced Features
- **Message search** - Full-text search across chat history
- **Chat export** - Download conversation transcripts
- **Voice transcription** - Auto-transcribe voice notes
- **Rich text formatting** - Bold, italic, emoji support
- **Message reactions** - Like, heart, thumbs up
- **Chat themes** - Customizable appearance
- **Group chats** - Multi-participant conversations
- **Screen sharing** - Visual reading support

### Analytics & Insights
- **Chat engagement metrics** - Message frequency, response times
- **Voice note analytics** - Duration, approval rates
- **Usage pattern analysis** - Peak times, popular features
- **Reader performance** - Response quality, client satisfaction

---

## 📞 Support & Troubleshooting

### Common Issues

#### Audio Recording Problems
```javascript
// Check microphone permissions
navigator.permissions.query({name: 'microphone'})

// Verify MediaRecorder support
if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
  // Fallback to different format
}
```

#### Real-time Connection Issues
```javascript
// Monitor subscription status
subscription.on('error', (error) => {
  console.error('Realtime error:', error);
  // Implement reconnection logic
});
```

#### File Upload Failures
```javascript
// Implement retry logic
const uploadWithRetry = async (file, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await supabase.storage.from('chat-attachments').upload(fileName, file);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### Performance Optimization Tips

1. **Limit message history** - Implement pagination for large conversations
2. **Optimize images** - Compress before upload, use appropriate formats
3. **Manage subscriptions** - Unsubscribe from inactive channels
4. **Cache frequently accessed data** - User profiles, chat metadata
5. **Implement message batching** - Group rapid messages for efficiency

---

**Phase 1 Complete! ✅**

The real-time chat system with audio messaging and notifications is now fully implemented and ready for production use. The system provides a robust foundation for the remaining phases of the SAMIA TAROT platform. 