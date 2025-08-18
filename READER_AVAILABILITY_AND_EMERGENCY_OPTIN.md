# READER AVAILABILITY & EMERGENCY OPT-IN SYSTEM

## 📅 **READER AVAILABILITY & EMERGENCY OPT-IN**

**Document Version**: 1.0  
**Last Updated**: August 18, 2025  
**Classification**: Production Feature  
**Team**: Admin, Reader Management, Support

---

## 📋 **SYSTEM OVERVIEW**

The Reader Availability System manages reader scheduling with timezone support, instant availability windows, and emergency opt-in capabilities. The system ensures clients see accurate "Available Now" status while providing readers flexible scheduling with emergency service options.

---

## 🎯 **CORE COMPONENTS**

### **Database Schema**
```sql
-- Base availability schedules
reader_availability {
    id: UUID,
    reader_id: UUID,
    day_of_week: INTEGER (0-6, Sunday=0),
    start_time: TIME,
    end_time: TIME,
    is_active: BOOLEAN DEFAULT TRUE,
    emergency_opt_in: BOOLEAN DEFAULT FALSE,
    timezone: VARCHAR DEFAULT 'UTC',
    created_at: TIMESTAMPTZ,
    updated_at: TIMESTAMPTZ
}

-- Emergency request tracking
reader_emergency_requests {
    id: UUID,
    reader_id: UUID,
    client_id: UUID,
    status: VARCHAR DEFAULT 'pending',
    emergency_reason: TEXT,
    requested_at: TIMESTAMPTZ,
    responded_at: TIMESTAMPTZ
}

-- Schedule overrides (holidays, exceptions)
reader_availability_overrides {
    id: UUID,
    reader_id: UUID,
    date: DATE,
    start_time: TIME,
    end_time: TIME,
    is_available: BOOLEAN,
    reason: TEXT,
    created_at: TIMESTAMPTZ
}
```

### **Business Rules**
1. **Approval Required**: All availability changes need admin approval
2. **Emergency Commitment**: Emergency opt-in = 15-second response guarantee
3. **Badge Control**: "Available Now" only during active windows
4. **Call Priority**: Emergency calls disable availability badge
5. **Timezone Aware**: All times stored and displayed in reader's timezone

---

## ⏰ **AVAILABILITY WINDOWS**

### **Schedule Definition**
```javascript
// Example reader schedule
const readerSchedule = {
    reader_id: 'reader-uuid',
    timezone: 'Asia/Beirut',
    weekly_schedule: [
        { day: 1, start: '09:00', end: '17:00', emergency: true },   // Monday
        { day: 2, start: '09:00', end: '17:00', emergency: true },   // Tuesday
        { day: 3, start: '13:00', end: '21:00', emergency: false },  // Wednesday
        { day: 4, start: '09:00', end: '17:00', emergency: true },   // Thursday
        { day: 5, start: '09:00', end: '15:00', emergency: false },  // Friday
        // Saturday & Sunday: No availability
    ]
};
```

### **Real-Time Availability Check**
```javascript
const checkReaderAvailability = (readerId, currentTime) => {
    const readerTimezone = getReaderTimezone(readerId);
    const localTime = convertToTimezone(currentTime, readerTimezone);
    const dayOfWeek = localTime.getDay();
    
    // Check base schedule
    const schedule = getReaderSchedule(readerId, dayOfWeek);
    if (!schedule || !schedule.is_active) {
        return { available: false, reason: 'Outside scheduled hours' };
    }
    
    // Check time window
    const currentTimeStr = localTime.toTimeString().substring(0, 5); // HH:MM
    if (currentTimeStr < schedule.start_time || currentTimeStr > schedule.end_time) {
        return { available: false, reason: 'Outside scheduled hours' };
    }
    
    // Check overrides (holidays, exceptions)
    const override = getScheduleOverride(readerId, localTime.toDateString());
    if (override) {
        if (!override.is_available) {
            return { available: false, reason: override.reason };
        }
        // Override takes precedence
        return checkOverrideWindow(override, currentTimeStr);
    }
    
    // Check if currently in call
    const inCall = isReaderInCall(readerId);
    if (inCall) {
        return { available: false, reason: 'Currently in call' };
    }
    
    return { 
        available: true, 
        emergency_enabled: schedule.emergency_opt_in,
        time_remaining: calculateWindowEnd(schedule.end_time, currentTimeStr)
    };
};
```

---

## 🚨 **EMERGENCY OPT-IN SYSTEM**

### **Emergency Commitment Rules**
```
Emergency Opt-In = Commitment to:
1. Respond to emergency sirens within 15 seconds
2. Accept ALL emergency calls (no decline option)
3. Maintain availability during opted-in windows
4. Prioritize emergency calls over regular bookings
```

### **Emergency Flow**
```
Client Request Emergency Reading
        ↓
Query Available Emergency Readers
        ↓
Filter by: emergency_opt_in = TRUE AND available = TRUE
        ↓
Send Siren to Selected Reader
        ↓
15-Second Response Window
        ↓
Accept → Start Call | No Response → Escalate to Backup
```

### **Emergency Reader Selection**
```sql
-- Find available emergency readers
SELECT r.id, r.name, ra.timezone
FROM readers r
JOIN reader_availability ra ON r.id = ra.reader_id
WHERE ra.emergency_opt_in = TRUE
  AND ra.is_active = TRUE
  AND ra.day_of_week = EXTRACT(DOW FROM NOW())
  AND TIME(NOW() AT TIME ZONE ra.timezone) 
      BETWEEN ra.start_time AND ra.end_time
  AND NOT EXISTS (
      SELECT 1 FROM call_sessions cs 
      WHERE cs.reader_id = r.id 
      AND cs.status = 'active'
  )
ORDER BY r.priority_score DESC, RANDOM()
LIMIT 5;
```

---

## 🎛️ **ADMIN APPROVAL WORKFLOW**

### **Approval Queue**
```
┌─ READER AVAILABILITY REQUESTS ────────┐
│                                       │
│  📝 Sarah M. - Schedule Update        │
│  Requested: Mon-Fri 9AM-5PM          │
│  Emergency: Yes                       │
│  Timezone: Asia/Beirut                │
│  Status: [Approve] [Reject] [Edit]    │
│                                       │
│  📝 Ahmed K. - Holiday Override       │
│  Date: Dec 25, 2025                  │
│  Available: No (Christmas)            │
│  Status: [Approve] [Reject]           │
│                                       │
│  📝 Fatima A. - Emergency Opt-Out     │
│  Reason: Personal emergency           │
│  Duration: 1 week                     │
│  Status: [Approve] [Reject]           │
└───────────────────────────────────────┘
```

### **Approval Process**
```javascript
const processAvailabilityRequest = async (requestId, action, adminId) => {
    const request = await getAvailabilityRequest(requestId);
    
    switch (action) {
        case 'approve':
            // Update reader_availability table
            await updateReaderAvailability(request.reader_id, request.new_schedule);
            
            // Log approval
            await logAdminAction(adminId, 'AVAILABILITY_APPROVED', {
                reader_id: request.reader_id,
                request_id: requestId,
                schedule: request.new_schedule
            });
            
            // Notify reader
            await sendNotification(request.reader_id, 'schedule_approved', {
                message: 'Your availability schedule has been approved'
            });
            break;
            
        case 'reject':
            // Log rejection with reason
            await logAdminAction(adminId, 'AVAILABILITY_REJECTED', {
                reader_id: request.reader_id,
                request_id: requestId,
                reason: request.rejection_reason
            });
            
            // Notify reader with feedback
            await sendNotification(request.reader_id, 'schedule_rejected', {
                message: request.rejection_reason
            });
            break;
    }
};
```

---

## 🏷️ **"AVAILABLE NOW" BADGE SYSTEM**

### **Badge Display Logic**
```javascript
const shouldShowAvailableBadge = (reader) => {
    const availability = checkReaderAvailability(reader.id, new Date());
    
    return {
        show_badge: availability.available && !reader.in_call,
        badge_text: availability.available ? 'Available Now' : 'Offline',
        badge_color: availability.available ? 'green' : 'gray',
        emergency_icon: availability.emergency_enabled,
        time_remaining: availability.time_remaining
    };
};

// Real-time badge updates
const updateAvailabilityBadges = () => {
    setInterval(() => {
        readers.forEach(reader => {
            const badgeStatus = shouldShowAvailableBadge(reader);
            updateReaderBadge(reader.id, badgeStatus);
        });
    }, 30000); // Update every 30 seconds
};
```

### **Badge States**
```
🟢 "Available Now"     → Within availability window, not in call
🔴 "In Call"          → Currently serving a client
🟡 "Available Soon"   → Next window starts in <60 minutes
⚫ "Offline"          → Outside availability window
⚡ "Emergency Ready"  → Emergency opt-in enabled (icon overlay)
```

### **Call State Management**
```javascript
const handleCallStart = (readerId) => {
    // Remove availability badge during call
    updateReaderStatus(readerId, { 
        available: false, 
        in_call: true,
        call_started_at: new Date()
    });
    
    // Hide from emergency rotation
    removeFromEmergencyPool(readerId);
    
    // Update real-time badge
    updateReaderBadge(readerId, {
        show_badge: false,
        badge_text: 'In Call',
        badge_color: 'red'
    });
};

const handleCallEnd = (readerId) => {
    // Check if still in availability window
    const availability = checkReaderAvailability(readerId, new Date());
    
    updateReaderStatus(readerId, {
        available: availability.available,
        in_call: false,
        call_ended_at: new Date()
    });
    
    // Restore to emergency pool if opted in
    if (availability.emergency_enabled) {
        addToEmergencyPool(readerId);
    }
    
    // Restore badge if still available
    updateReaderBadge(readerId, shouldShowAvailableBadge(readerId));
};
```

---

## 🌍 **TIMEZONE MANAGEMENT**

### **Supported Timezones**
```javascript
const supportedTimezones = [
    'UTC',
    'Asia/Beirut',      // Lebanon
    'Asia/Damascus',    // Syria  
    'Asia/Baghdad',     // Iraq
    'Asia/Kuwait',      // Kuwait
    'Asia/Riyadh',      // Saudi Arabia
    'Asia/Dubai',       // UAE
    'Africa/Cairo',     // Egypt
    'Europe/Istanbul',  // Turkey
    'Europe/London',    // UK
    'America/New_York', // US East
    'America/Los_Angeles' // US West
];
```

### **Timezone Conversion**
```javascript
const convertScheduleToUserTimezone = (readerSchedule, userTimezone) => {
    return readerSchedule.map(day => {
        const readerTz = day.timezone || 'UTC';
        
        // Convert reader's local time to user's timezone
        const startTime = convertTime(day.start_time, readerTz, userTimezone);
        const endTime = convertTime(day.end_time, readerTz, userTimezone);
        
        return {
            ...day,
            display_start: startTime,
            display_end: endTime,
            display_timezone: userTimezone,
            original_timezone: readerTz
        };
    });
};

// Example: Reader in Beirut, Client in New York
const displaySchedule = convertScheduleToUserTimezone(
    { start_time: '09:00', end_time: '17:00', timezone: 'Asia/Beirut' },
    'America/New_York'
);
// Result: { display_start: '02:00', display_end: '10:00' } (UTC-5 offset)
```

---

## 📊 **MONITORING & ANALYTICS**

### **Availability Metrics**
```sql
-- Reader availability statistics
SELECT 
    r.id,
    r.name,
    COUNT(ra.id) as availability_windows,
    SUM(CASE WHEN ra.emergency_opt_in THEN 1 ELSE 0 END) as emergency_windows,
    AVG(
        EXTRACT(EPOCH FROM (ra.end_time - ra.start_time)) / 3600
    ) as avg_hours_per_window,
    SUM(
        EXTRACT(EPOCH FROM (ra.end_time - ra.start_time)) / 3600 * 
        CASE WHEN ra.is_active THEN 1 ELSE 0 END
    ) as total_available_hours_per_week
FROM readers r
LEFT JOIN reader_availability ra ON r.id = ra.reader_id
GROUP BY r.id, r.name
ORDER BY total_available_hours_per_week DESC;
```

### **Emergency Response Analytics**
```sql
-- Emergency response performance
SELECT 
    r.name,
    COUNT(rer.id) as emergency_requests,
    AVG(
        EXTRACT(EPOCH FROM (rer.responded_at - rer.requested_at))
    ) as avg_response_time_seconds,
    SUM(CASE WHEN rer.status = 'accepted' THEN 1 ELSE 0 END) as accepted_count,
    SUM(CASE WHEN rer.responded_at IS NULL THEN 1 ELSE 0 END) as missed_count
FROM readers r
LEFT JOIN reader_emergency_requests rer ON r.id = rer.reader_id
WHERE rer.requested_at >= NOW() - INTERVAL '30 days'
GROUP BY r.id, r.name
HAVING COUNT(rer.id) > 0
ORDER BY avg_response_time_seconds ASC;
```

### **Availability Patterns**
```sql
-- Peak availability hours analysis
SELECT 
    EXTRACT(HOUR FROM (ra.start_time)) as hour,
    COUNT(*) as readers_available,
    SUM(CASE WHEN ra.emergency_opt_in THEN 1 ELSE 0 END) as emergency_readers
FROM reader_availability ra
WHERE ra.is_active = TRUE
GROUP BY EXTRACT(HOUR FROM (ra.start_time))
ORDER BY hour;
```

---

## 🔧 **API ENDPOINTS**

### **Reader Availability Management**
```
GET  /api/reader-availability/{reader_id}           // Get reader schedule
POST /api/reader-availability/{reader_id}/request   // Request schedule change
PUT  /api/reader-availability/{reader_id}/emergency // Toggle emergency opt-in
POST /api/reader-availability/{reader_id}/override  // Add schedule override

GET  /api/admin/availability-requests               // Admin: Pending requests
POST /api/admin/availability-requests/{id}/approve  // Admin: Approve request
POST /api/admin/availability-requests/{id}/reject   // Admin: Reject request
```

### **Emergency System**
```
GET  /api/emergency/available-readers               // Get emergency-ready readers
POST /api/emergency/request                         // Client: Request emergency reading
POST /api/emergency/respond/{request_id}            // Reader: Respond to emergency
GET  /api/emergency/analytics                       // Admin: Emergency performance
```

### **Real-Time Updates**
```javascript
// WebSocket events for real-time updates
socket.on('reader_availability_changed', (data) => {
    updateReaderBadge(data.reader_id, data.availability);
});

socket.on('emergency_siren', (data) => {
    // Only sent to opted-in readers
    showEmergencySiren(data.client_info, data.request_id);
    startResponseTimer(15000); // 15 second countdown
});

socket.on('availability_approved', (data) => {
    showNotification('Schedule approved and activated');
    refreshAvailabilityDisplay();
});
```

---

## 🛠️ **TROUBLESHOOTING**

### **Common Issues**

#### **"Available Badge Not Showing"**
```
Check: Reader schedule active for current day/time
Check: Reader not currently in call
Check: Timezone conversion accuracy
Check: Schedule approval status
Action: Refresh availability calculation
```

#### **"Emergency Siren Not Received"**
```
Check: Emergency opt-in status (emergency_opt_in = TRUE)
Check: Reader availability window active
Check: WebSocket connection active
Check: Notification permissions granted
Action: Test emergency notification system
```

#### **"Schedule Changes Not Applied"**
```
Check: Admin approval status
Check: Request submission completion
Check: Database transaction commit
Action: Resubmit availability request
```

#### **"Wrong Timezone Display"**
```
Check: Reader timezone setting
Check: Client timezone detection
Check: Timezone conversion logic
Action: Manual timezone verification
```

### **Emergency Procedures**
1. **Emergency System Down**: Switch to manual emergency dispatch
2. **Badge System Failure**: Use real-time availability API
3. **Timezone Issues**: Fall back to UTC display with warnings

---

## 📋 **READER ONBOARDING GUIDE**

### **Setting Up Availability**
```
Step 1: Define Weekly Schedule
- Select days of the week
- Set start/end times in your timezone
- Choose emergency opt-in preference

Step 2: Submit for Approval
- Add notes for admin review
- Specify any special requirements
- Wait for admin approval (typically 24-48 hours)

Step 3: Emergency Training (if opted in)
- Understand 15-second response requirement
- Test emergency siren notification
- Practice emergency call acceptance

Step 4: Schedule Management
- Add holiday/exception overrides
- Monitor availability badge status
- Update schedule as needed
```

### **Best Practices for Readers**
- **Be Realistic**: Only commit to hours you can reliably maintain
- **Emergency Commitment**: Only opt-in if you can guarantee 15s response
- **Regular Updates**: Keep schedule current with life changes
- **Communication**: Notify admin of extended unavailability

---

## 🚀 **FEATURE FLAGS & CONFIGURATION**

### **Availability Settings**
```json
{
  "availability.requireApproval": true,
  "availability.emergencyTimeout": 15000,      // 15 seconds
  "availability.badgeUpdateInterval": 30000,   // 30 seconds
  "availability.timezoneSupport": true,
  "availability.maxWeeklyHours": 60,
  "availability.minWindowDuration": 2,         // 2 hours minimum
  "emergency.maxConcurrentReaders": 10,
  "emergency.escalationLevels": 3
}
```

### **Notification Settings**
```json
{
  "notifications.emergencySiren": {
    "enabled": true,
    "sound": "emergency_chime.mp3",
    "vibration": true,
    "persistent": true
  },
  "notifications.scheduleUpdates": {
    "enabled": true,
    "email": true,
    "push": true
  }
}
```

---

*Reader Availability & Emergency Opt-In v1.0*  
*Next Review: November 18, 2025*  
*Critical Feature: Reader Management*

**📅 READER AVAILABILITY DRIVES CLIENT SATISFACTION - ENSURE ACCURATE REAL-TIME STATUS**