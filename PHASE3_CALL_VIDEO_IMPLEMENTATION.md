# Phase 3: Call & Video System with Emergency Logic - Implementation Guide

## 🎯 Overview

Phase 3 of the SAMIA TAROT platform introduces a comprehensive **Call & Video System with Emergency Logic**, featuring WebRTC-based voice/video calls, emergency call handling with siren alerts, automatic call recording, admin oversight, and sophisticated escalation workflows.

## 🚀 Key Features Implemented

### 1. 📞 **WebRTC Call & Video System**
- **Real-time voice and video calls** using WebRTC technology
- **Scheduled calls** linked to bookings with strict duration control
- **Auto-disconnect** when time limit is reached
- **Connection quality monitoring** with real-time metrics
- **Adaptive bitrate** and quality adjustment

### 2. 🚨 **Emergency Call System**
- **Instant emergency calls** with no prior booking required
- **Loud siren alerts** that override device silent mode
- **Forced attention** - readers cannot decline emergency calls
- **20-second timeout** with automatic escalation to admin
- **Priority routing** to available readers

### 3. ⏱️ **Call Duration Control**
- **Strict time limits** based on booking duration
- **Visual countdown timer** with warnings at 5min and 1min
- **Automatic call termination** when time expires
- **Emergency calls** fixed at 30 minutes
- **Admin override** capabilities for duration extension

### 4. 🔴 **Recording & Surveillance**
- **Automatic recording** of all calls (audio/video)
- **Secure storage** in Supabase with access controls
- **Admin/Monitor access** to all recordings
- **Download and review** capabilities
- **Quality metrics** tracking

### 5. 👁️‍🗨️ **Admin & Monitor Oversight**
- **Stealth join** capability for admin/monitor roles
- **Silent monitoring** without participant notification
- **Real-time call oversight** dashboard
- **Emergency escalation** handling
- **Call termination** powers for admins

### 6. 🛡️ **Security & Permissions**
- **Role-based access control** (Client ↔ Reader only)
- **Emergency call routing** to assigned readers
- **Audit logging** of all call activities
- **Secure WebRTC** with STUN/TURN servers

## 📁 File Structure

```
src/
├── api/
│   └── callApi.js                    # Comprehensive Call API
├── components/
│   └── Call/
│       ├── CallRoom.jsx              # Main WebRTC call interface
│       ├── CallTimer.jsx             # Duration countdown timer
│       ├── CallControls.jsx          # Audio/video/end call controls
│       ├── CallParticipants.jsx      # Participant list with roles
│       ├── EmergencyButton.jsx       # Emergency call trigger
│       ├── CallNotification.jsx      # Siren alerts & call notifications
│       ├── RecordingManager.jsx      # Recording playback & management
│       └── AdminCallPanel.jsx        # Admin oversight dashboard
└── database/
    └── phase3-call-video-system.sql  # Complete database schema
```

## 🗄️ Database Schema

### Core Tables

#### `call_sessions`
- Stores all voice/video call sessions
- Links to bookings and tracks emergency status
- Manages call duration and status

#### `call_recordings`
- Stores recording metadata and file references
- Tracks recording type (audio/video/screen)
- File size and processing status

#### `emergency_logs`
- Logs all emergency call events
- Tracks escalation workflow
- Priority levels and response times

#### `call_participants`
- Tracks who joins/leaves calls
- Silent mode for admin/monitor stealth
- Media permissions (audio/video)

#### `reader_availability`
- Manages reader availability status
- Emergency call availability
- Concurrent call limits

#### `call_notifications`
- Emergency siren notifications
- Call status updates
- Read/unread tracking

### Key Functions

#### `create_emergency_call(user_id, call_type)`
- Finds available emergency reader
- Creates call session with priority routing
- Triggers siren notifications

#### `auto_escalate_emergency()`
- Automatically escalates unanswered emergency calls
- Finds available admin/monitor
- Creates escalation records

#### `end_call_session(call_session_id)`
- Properly terminates call sessions
- Updates participant leave times
- Triggers cleanup processes

## 🔧 API Integration

### CallAPI Methods

#### Session Management
```javascript
// Create new call session
await CallAPI.createCallSession(sessionData);

// Create emergency call
await CallAPI.createEmergencyCall(userId, 'voice');

// Start/end call sessions
await CallAPI.startCallSession(callSessionId);
await CallAPI.endCallSession(callSessionId);
```

#### Participant Management
```javascript
// Add participant (with silent mode for admin)
await CallAPI.addCallParticipant(callSessionId, userId, role, isSilent);

// Update participant status
await CallAPI.updateParticipantStatus(participantId, updates);
```

#### Recording Management
```javascript
// Upload call recording
await CallAPI.uploadRecording(file, callSessionId, recordingType);

// Get call recordings
await CallAPI.getCallRecordings(callSessionId);
```

#### Real-time Subscriptions
```javascript
// Subscribe to call updates
CallAPI.subscribeToCallSession(callSessionId, callback);

// Subscribe to emergency calls
CallAPI.subscribeToEmergencyCalls(readerId, callback);

// Subscribe to notifications
CallAPI.subscribeToCallNotifications(userId, callback);
```

## 🎮 Component Usage

### CallRoom Component
```jsx
<CallRoom 
  callSessionId={sessionId}
  onCallEnd={handleCallEnd}
/>
```

**Features:**
- Full WebRTC implementation
- Video/audio controls
- Recording management
- Quality monitoring
- Timer integration

### EmergencyButton Component
```jsx
<EmergencyButton 
  onEmergencyCall={handleEmergencyCall}
  className="fixed bottom-4 right-4"
/>
```

**Features:**
- Confirmation dialog
- Emergency call creation
- Visual feedback
- Error handling

### CallNotification Component
```jsx
<CallNotification 
  notification={notification}
  onAccept={handleAccept}
  onDecline={handleDecline}
  onDismiss={handleDismiss}
/>
```

**Features:**
- Emergency siren sound
- Countdown timer
- Auto-escalation
- Cannot decline emergency calls

### AdminCallPanel Component
```jsx
<AdminCallPanel className="w-full" />
```

**Features:**
- Real-time call monitoring
- Stealth join capabilities
- Call termination powers
- Escalation management

## 🔊 Emergency Call Workflow

### 1. Emergency Trigger
```
Client clicks Emergency Button
    ↓
Confirmation dialog appears
    ↓
Emergency call created in database
    ↓
Available reader found and assigned
```

### 2. Reader Notification
```
Siren notification sent to reader
    ↓
Loud audio siren plays (overrides silent mode)
    ↓
Visual emergency alert displayed
    ↓
20-second countdown begins
```

### 3. Response Scenarios

#### ✅ **Reader Answers (within 20s)**
```
Reader accepts call
    ↓
Siren stops
    ↓
Call room opens
    ↓
Recording starts automatically
    ↓
30-minute timer begins
```

#### ⏰ **No Answer (after 20s)**
```
Auto-escalation triggered
    ↓
Admin/Monitor notified
    ↓
Escalation record created
    ↓
Emergency log updated
    ↓
Admin can take over call
```

## 🎛️ Call Controls & Features

### Audio/Video Controls
- **Mute/Unmute** audio
- **Enable/Disable** video (for video calls)
- **End call** button
- **Connection status** indicator

### Timer Features
- **Real-time countdown** display
- **Warning alerts** at 5min and 1min remaining
- **Auto-disconnect** when time expires
- **Emergency call** special handling

### Recording Features
- **Automatic recording** for emergency calls
- **Admin-initiated recording** for regular calls
- **Real-time recording indicator**
- **Secure upload** to Supabase storage

## 👨‍💼 Admin & Monitor Features

### Stealth Monitoring
- **Silent join** any active call
- **No notification** to participants
- **Audio/video monitoring** without participation
- **Audit trail** of all monitoring activities

### Call Management
- **View all active calls** in real-time
- **Emergency call prioritization**
- **Force end calls** (admin only)
- **Escalation handling**

### Recording Access
- **Download all recordings**
- **Playback interface** with controls
- **Quality metrics** review
- **Deletion capabilities** (admin only)

## 🔐 Security Features

### Access Control
- **Role-based permissions** (Client, Reader, Admin, Monitor)
- **Call participant validation**
- **Emergency call routing** restrictions
- **Recording access** limited to admin/monitor

### Audit & Logging
- **Complete call history** tracking
- **Emergency event logging**
- **Escalation audit trail**
- **Quality metrics** storage

### Data Protection
- **Encrypted call recordings**
- **Secure WebRTC** connections
- **GDPR compliance** considerations
- **Data retention** policies

## 🚀 Deployment Requirements

### Environment Variables
```env
# WebRTC Configuration
REACT_APP_STUN_SERVER=stun:stun.l.google.com:19302
REACT_APP_TURN_SERVER=turn:your-turn-server.com:3478
REACT_APP_TURN_USERNAME=username
REACT_APP_TURN_PASSWORD=password

# Supabase Storage
REACT_APP_SUPABASE_STORAGE_BUCKET=call-recordings
```

### Database Setup
```sql
-- Run the Phase 3 schema
\i database/phase3-call-video-system.sql

-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'call_%';
```

### Storage Configuration
```sql
-- Create storage bucket for recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('call-recordings', 'call-recordings', false);

-- Set up storage policies
CREATE POLICY "Admin can upload recordings" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'call-recordings' AND auth.role() = 'admin');
```

## 📊 Performance Considerations

### WebRTC Optimization
- **STUN/TURN servers** for NAT traversal
- **Adaptive bitrate** based on connection quality
- **Quality monitoring** with automatic adjustment
- **Bandwidth optimization** for mobile devices

### Database Performance
- **Indexed queries** for call lookups
- **Efficient real-time subscriptions**
- **Optimized recording storage**
- **Cleanup procedures** for old data

### Scalability
- **Horizontal scaling** with load balancers
- **CDN integration** for recording delivery
- **Microservices architecture** consideration
- **Caching strategies** for frequent queries

## 🧪 Testing Strategy

### Unit Tests
- **API method testing**
- **Component rendering** tests
- **WebRTC functionality** mocking
- **Database function** validation

### Integration Tests
- **End-to-end call flows**
- **Emergency escalation** scenarios
- **Recording upload/download**
- **Admin oversight** features

### Load Testing
- **Concurrent call** handling
- **Emergency call** stress testing
- **Database performance** under load
- **Storage bandwidth** testing

## 🔄 Future Enhancements

### Planned Features
- **Screen sharing** capabilities
- **Group calls** for multiple participants
- **AI-powered call** quality enhancement
- **Advanced analytics** and reporting

### Technical Improvements
- **WebRTC mesh networking** for group calls
- **Machine learning** for quality optimization
- **Advanced recording** features (transcription)
- **Mobile app** integration

## 📞 Support & Maintenance

### Monitoring
- **Real-time call** quality metrics
- **Emergency response** time tracking
- **System health** monitoring
- **Error rate** tracking

### Maintenance Tasks
- **Recording cleanup** procedures
- **Database optimization**
- **Security updates**
- **Performance tuning**

---

## 🎉 Phase 3 Success Metrics

✅ **WebRTC Implementation** - Complete voice/video calling system
✅ **Emergency Call System** - Siren alerts and forced attention
✅ **Call Duration Control** - Automatic time enforcement
✅ **Recording System** - Automatic recording and admin access
✅ **Admin Oversight** - Stealth monitoring and call management
✅ **Security Implementation** - Role-based access and audit logging

**Phase 3 successfully transforms SAMIA TAROT into a comprehensive call and video platform with advanced emergency handling, complete admin oversight, and enterprise-grade security features.** 