# CALLS & EMERGENCY LOGIC - STANDARD OPERATING PROCEDURES

## 🚨 **EMERGENCY CALL SYSTEM SOP**

**Document Version**: 1.0  
**Last Updated**: August 18, 2025  
**Classification**: Production Critical  
**Team**: Support, Operations, Development

---

## 📋 **OVERVIEW**

The Emergency Call System provides voice-only emergency tarot consultations with strict time controls, consent management, and permanent recording storage. This SOP covers all operational procedures and business rules.

---

## 🔧 **SYSTEM ARCHITECTURE**

### **Core Components**
- **Call Sessions**: `call_sessions` table
- **Consent Logging**: `call_consent_logs` table (IP + timestamp)
- **Emergency Extensions**: `call_emergency_extensions` table
- **Recording Management**: `call_recordings` table (permanent storage)
- **Reader Availability**: `reader_availability` table (emergency opt-in)

### **Business Rules (NON-NEGOTIABLE)**
1. **30-minute sessions**: Duration CANNOT be modified after booking
2. **Voice-only**: Video calls are DISABLED by feature flag
3. **Permanent recording**: All calls MUST be permanently stored
4. **Extension method**: Only through purchasing new Emergency session
5. **Consent required**: IP address and timestamp logging mandatory

---

## 🎯 **OPERATIONAL PROCEDURES**

### **1. EMERGENCY CALL INITIATION**

#### **Client Request Flow**
```
1. Client clicks "Emergency Reading" → Immediate availability check
2. System queries: reader_availability WHERE emergency_opt_in = TRUE
3. Available readers shown with "Available Now" badge
4. Client selects reader → Instant booking (no scheduling delay)
5. Siren notification sent to reader
6. Reader has 15 seconds to respond (configurable by Super Admin)
```

#### **Siren Escalation Logic**
```
T+0s:   Initial siren to primary reader
T+15s:  Escalate to backup reader (if no response)
T+30s:  Escalate to admin notification
T+45s:  System-wide emergency alert
```

#### **Reader Response Requirements**
- **MUST respond within 15 seconds**
- **NO decline option** (emergency opt-in = commitment)
- **Badge turns OFF** during active call
- **Availability restored** after call completion

### **2. CONSENT MANAGEMENT**

#### **Required Consents (LEGAL COMPLIANCE)**
1. **Call Participation**: Agreement to emergency session
2. **Recording Consent**: Mandatory for all calls
3. **Emergency Extension**: Consent for additional charges

#### **Consent Logging Requirements**
```sql
INSERT INTO call_consent_logs (
    session_id,
    user_id,
    consent_type,
    consent_given,
    ip_address,      -- REQUIRED for legal compliance
    user_agent,      -- Browser/device info
    timestamp        -- UTC timestamp
);
```

#### **IP Address Validation**
- **MUST capture real client IP** (not proxy/CDN IP)
- **Store as INET type** in PostgreSQL
- **Include in all consent records**
- **Required for legal disputes**

### **3. CALL DURATION & EXTENSION LOGIC**

#### **Fixed Duration Rule**
- **Initial Duration**: Exactly 30 minutes
- **Non-Editable**: Cannot be changed after booking confirmation
- **Timer Display**: Countdown visible to both parties
- **Auto-End**: System terminates call at 30:00 exactly

#### **Emergency Extension Process**
```
1. Client requests extension (5 minutes before end)
2. System creates new Emergency purchase flow
3. Payment processed immediately
4. New session created (seamless transition)
5. Original session ends, new session begins
6. No interruption to call audio/video
```

#### **Extension Pricing (Feature Flag OFF by default)**
```
Extension #1: $5.00  (auto-approved)
Extension #2: $10.00 (manual approval)
Extension #3: $15.00 (manual approval)
Extension #4+: $20.00 (manual approval)
```

### **4. RECORDING MANAGEMENT**

#### **Mandatory Recording Rules**
- **ALL calls MUST be recorded** (no exceptions)
- **Consent required before recording starts**
- **Permanent storage** (`is_permanently_stored = TRUE`)
- **No automatic deletion** (ever)

#### **Recording Access Control**
```
- Client: Can access own recordings only
- Reader: Can access own session recordings
- Admin: Can access all recordings
- Super Admin: Full access + deletion rights
```

#### **Recording Storage SOP**
1. **Start recording** immediately after consent
2. **Store in Supabase Storage** with encryption
3. **Generate permanent URL** for future access
4. **Log access attempts** in audit trail
5. **Never delete** without Super Admin approval

---

## 🚨 **EMERGENCY PROCEDURES**

### **Siren Not Answered (15+ seconds)**
1. **Escalate to backup reader** automatically
2. **Log incident** in emergency escalation table
3. **Notify admin** of delayed response
4. **Continue escalation** until answered

### **Call Quality Issues**
1. **Check connection quality** metrics
2. **Attempt reconnection** (WebRTC)
3. **Fall back to phone bridge** if needed
4. **Extend session** to compensate for issues

### **Payment Failure During Extension**
1. **Allow call to continue** for 2 minutes
2. **Display payment retry** interface
3. **End call gracefully** if payment fails
4. **Send payment reminder** notification

### **Reader Unavailable During Call**
1. **Log disconnection** event
2. **Attempt reconnection** for 30 seconds
3. **Transfer to backup reader** if available
4. **Partial refund** if transfer not possible

---

## 📊 **MONITORING & ALERTS**

### **Critical Metrics**
- **Siren Response Time**: P90 < 15 seconds
- **Call Setup Time**: P95 < 3 seconds
- **Call Drop Rate**: < 1%
- **Extension Success Rate**: > 95%
- **Recording Success Rate**: 100%

### **Alert Thresholds**
- **Siren Delay**: > 20 seconds
- **High Drop Rate**: > 2% in 5 minutes
- **Payment Failures**: > 5% in 15 minutes
- **Recording Failures**: ANY failure (immediate alert)

### **Dashboard Monitoring**
- **Active emergency calls** count
- **Available emergency readers** count
- **Average response times** (real-time)
- **Extension request** success rate

---

## 🔒 **SECURITY & COMPLIANCE**

### **Data Protection**
- **Consent logs** with IP addresses (legal requirement)
- **Recording encryption** in storage
- **Access audit trails** for all recording access
- **GDPR compliance** for EU users

### **RLS Policy Enforcement**
```sql
-- Call sessions: Participant access only
CREATE POLICY "call_sessions_participant_access" ON call_sessions 
FOR ALL USING (client_id = auth.uid() OR reader_id = auth.uid());

-- Consent logs: User and admin access
CREATE POLICY "consent_logs_user_access" ON call_consent_logs 
FOR SELECT USING (user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- Emergency extensions: Participant access
CREATE POLICY "emergency_extensions_participant_access" ON call_emergency_extensions 
FOR ALL USING (session_id IN (SELECT id FROM call_sessions WHERE client_id = auth.uid() OR reader_id = auth.uid()));
```

---

## 🛠️ **TROUBLESHOOTING GUIDE**

### **Common Issues**

#### **"Siren Not Reaching Reader"**
```
Check: Reader notification settings
Check: Emergency opt-in status (reader_availability.emergency_opt_in = TRUE)
Check: Reader availability window active
Action: Escalate to backup reader
```

#### **"Call Won't Start"**
```
Check: Consent records complete
Check: WebRTC permissions granted
Check: Network connectivity
Action: Fall back to phone bridge
```

#### **"Extension Payment Fails"**
```
Check: Payment method validity
Check: Account balance/limits
Check: Payment gateway status
Action: Manual payment verification
```

#### **"Recording Missing"**
```
Check: Storage bucket permissions
Check: Recording service status
Check: File upload completion
Action: IMMEDIATE escalation (legal requirement)
```

### **Escalation Procedures**
1. **Level 1**: Support team (response time issues)
2. **Level 2**: Technical team (system failures)
3. **Level 3**: Legal team (consent/recording issues)
4. **Emergency**: On-call engineer (system down)

---

## 📞 **SUPPORT SCRIPTS**

### **Client Calling About Extension**
> "Emergency extensions work by purchasing a new emergency session that continues seamlessly. The system will process payment and extend your call without interruption. Each extension is priced progressively to ensure fair usage."

### **Reader Asking About Siren Response**
> "Emergency opt-in requires responding to all emergency sirens within 15 seconds. If you can't commit to this availability, please disable emergency opt-in in your settings. Missing responses affects other readers and client experience."

### **Recording Access Request**
> "All emergency calls are permanently recorded with consent. You can access your session recordings in your dashboard. Recordings are stored securely and never automatically deleted."

---

## 📋 **DAILY OPERATIONS CHECKLIST**

### **Morning (09:00)**
- [ ] Check emergency reader availability count
- [ ] Review overnight emergency call logs
- [ ] Verify recording storage status
- [ ] Test siren notification system

### **Peak Hours (12:00, 18:00)**
- [ ] Monitor real-time emergency response metrics
- [ ] Check payment processing success rates
- [ ] Verify WebRTC connection quality
- [ ] Review any escalated incidents

### **Evening (22:00)**
- [ ] Daily emergency call summary report
- [ ] Recording storage verification
- [ ] Payment reconciliation
- [ ] Prepare on-call handover notes

---

## 🚀 **FEATURE FLAGS & CONFIGURATION**

### **Production Settings**
```json
{
  "calls.video": false,                    // Voice-only emergency
  "calls.emergencyDuration": 30,          // Minutes (fixed)
  "calls.sirenTimeout": 15,                // Seconds (SA configurable)
  "calls.recordingMandatory": true,       // Cannot be disabled
  "billing.emergencyProgressivePricing": false,  // Enable later
  "emergency.escalationLevels": 3,         // Number of backup readers
  "emergency.maxConcurrentCalls": 50       // System capacity
}
```

### **Admin Configurable**
- **Siren timeout** (default 15s)
- **Escalation levels** (default 3)
- **Emergency pricing** (when enabled)
- **Maximum concurrent calls**

---

*Standard Operating Procedures v1.0*  
*Next Review: November 18, 2025*  
*Emergency Contact: DevOps On-Call*

**🚨 EMERGENCY CALLS ARE BUSINESS CRITICAL - ZERO TOLERANCE FOR FAILURES**