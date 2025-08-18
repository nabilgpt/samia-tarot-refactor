# TAROT V2 CLIENT REVEAL SYSTEM - PRODUCTION GUIDE

## 🔮 **TAROT V2 CLIENT REVEAL SYSTEM**

**Document Version**: 1.0  
**Last Updated**: August 18, 2025  
**Classification**: Business Critical  
**Security Level**: HIGH (AI Content Isolation)

---

## 📋 **SYSTEM OVERVIEW**

Tarot V2 implements a progressive card reveal system where clients reveal cards 1→N with no rollback capability, while maintaining strict AI content isolation. The system ensures clients NEVER see AI-generated interpretations while providing readers with AI assistance.

---

## 🎯 **CORE BUSINESS RULES**

### **Critical Security Rules (NON-NEGOTIABLE)**
1. **AI Content Isolation**: Clients can NEVER see AI-generated content
2. **Progressive Reveal**: Cards revealed 1→N with no rollback
3. **Permanent Timestamps**: All reveals permanently logged
4. **Reader AI Access**: AI drafts visible to readers only
5. **Audit Trails**: All AI access logged for security

### **Database Schema**
```sql
-- Main reading session
tarot_v2_readings {
    id: UUID,
    client_id: UUID,
    reader_id: UUID,
    status: VARCHAR,
    ai_draft_visible_to_client: BOOLEAN DEFAULT FALSE,  -- CRITICAL: Always FALSE
    created_at: TIMESTAMPTZ
}

-- Individual card reveals
tarot_v2_card_selections {
    id: UUID,
    reading_id: UUID,
    card_id: UUID,
    position: INTEGER,
    is_revealed: BOOLEAN DEFAULT FALSE,
    revealed_at: TIMESTAMPTZ,
    created_at: TIMESTAMPTZ
}

-- Security audit logging
tarot_v2_audit_logs {
    id: UUID,
    reading_id: UUID,
    action: VARCHAR,
    user_id: UUID,
    ai_content_accessed: BOOLEAN,
    timestamp: TIMESTAMPTZ
}
```

---

## 🔒 **AI CONTENT ISOLATION (CRITICAL)**

### **Isolation Architecture**
```
CLIENT SIDE:
- Never receives AI content
- Only sees card names/images
- Progressive reveal interface only

READER SIDE:
- Receives AI draft interpretations
- Banner: "AI DRAFT - CLIENT CANNOT SEE THIS"
- Copy/paste protection enabled
- All access logged in audit trail
```

### **Database Enforcement**
```sql
-- RLS Policy: AI Draft Isolation
CREATE POLICY "ai_draft_isolation" ON tarot_v2_readings 
FOR ALL USING (
    CASE 
        WHEN auth.jwt() ->> 'role' = 'client' THEN 
            client_id = auth.uid() AND ai_draft_visible_to_client = FALSE
        WHEN auth.jwt() ->> 'role' IN ('reader', 'admin', 'super_admin') THEN 
            TRUE
        ELSE FALSE
    END
);
```

### **API Separation**
```javascript
// CLIENT API: No AI content
GET /api/tarot-v2/readings/{id}/cards
Response: {
    cards: [
        { id, name, image_url, position, is_revealed }
        // NO AI interpretation fields
    ]
}

// READER API: With AI content
GET /api/tarot-v2/readings/{id}/ai-draft
Response: {
    ai_interpretation: "...",
    confidence_score: 0.85,
    generated_at: "2025-08-18T...",
    warning: "CLIENT_CANNOT_SEE_THIS_CONTENT"
}
```

---

## 🎲 **PROGRESSIVE REVEAL SYSTEM**

### **Reveal Flow**
```
1. Client starts reading → All cards face-down
2. Client clicks card #1 → Card reveals (irreversible)
3. Timestamp logged → is_revealed = TRUE, revealed_at = NOW()
4. Client clicks card #2 → Second card reveals
5. Process continues 1→N → No rollback possible
6. Final state → All selected cards permanently revealed
```

### **Frontend Implementation Rules**
```javascript
// Progressive reveal rules
const revealCard = (position) => {
    // Check if previous cards are revealed
    const previousRevealed = checkPreviousCardsRevealed(position);
    if (!previousRevealed) {
        showError("Must reveal cards in order");
        return;
    }
    
    // Irreversible reveal
    revealCardPermanently(position);
    logRevealTimestamp(position);
    
    // Update UI state (cannot be undone)
    updateCardState(position, { 
        revealed: true, 
        canUndo: false 
    });
};
```

### **Reveal Validation**
- **Sequential Order**: Must reveal cards 1→2→3 (no skipping)
- **No Rollback**: Cannot "unrevealed" cards once revealed
- **Timestamp Logging**: Every reveal permanently timestamped
- **Session Persistence**: Reveal state survives page refresh

---

## 👁️ **USER INTERFACES**

### **Client Interface (NO AI Content)**
```
┌─ TAROT V2 READING ────────────────┐
│                                   │
│  [🂠] [🂠] [🂠]  ← Face-down cards   │
│                                   │
│  Progress: 0/3 cards revealed     │
│                                   │
│  Click to reveal next card →      │
│                                   │
│  ⚠️ Cards cannot be hidden once   │
│     revealed                      │
└───────────────────────────────────┘
```

### **Reader Interface (WITH AI Content)**
```
┌─ TAROT V2 READING (READER) ───────┐
│                                   │
│  🚨 AI DRAFT - CLIENT CANNOT SEE  │
│  ┌─────────────────────────────┐   │
│  │ Card 1: The Fool             │   │
│  │ AI Interpretation: New begin...│   │
│  │ Confidence: 85%              │   │
│  │ [Copy Protection Active]     │   │
│  └─────────────────────────────┘   │
│                                   │
│  Client View: [🂠] [🂠] [🂠]       │
│  Client Progress: 0/3 revealed   │
└───────────────────────────────────┘
```

### **UI Protection Measures**
- **Copy Protection**: Right-click disabled on AI content
- **Text Selection**: Disabled on AI interpretation text
- **Screen Recording**: Warning overlay on sensitive content
- **Developer Tools**: AI content hidden from DOM inspection

---

## 📊 **AUDIT & LOGGING**

### **Required Audit Events**
```sql
-- Card reveal logging
INSERT INTO tarot_v2_audit_logs (
    reading_id,
    action,
    user_id,
    details,
    timestamp
) VALUES (
    'reading-uuid',
    'CARD_REVEALED',
    'client-uuid',
    '{"position": 1, "card_id": "card-uuid", "irreversible": true}',
    NOW()
);

-- AI content access logging
INSERT INTO tarot_v2_audit_logs (
    reading_id,
    action,
    user_id,
    ai_content_accessed,
    timestamp
) VALUES (
    'reading-uuid',
    'AI_DRAFT_ACCESSED',
    'reader-uuid',
    TRUE,
    NOW()
);
```

### **Security Monitoring**
- **AI Access Attempts**: Any client attempt to access AI content
- **Reveal Sequence**: Validation of proper reveal order
- **Rollback Attempts**: Any attempt to "unrevealed" cards
- **Copy Attempts**: Text selection/copy attempts on AI content

---

## 🔧 **TECHNICAL IMPLEMENTATION**

### **State Management**
```javascript
// Reading state (immutable reveals)
const readingState = {
    id: 'reading-uuid',
    cards: [
        { position: 1, revealed: false, revealed_at: null },
        { position: 2, revealed: false, revealed_at: null },
        { position: 3, revealed: false, revealed_at: null }
    ],
    can_rollback: false,  // Always false
    progress: 0
};

// Reveal mutation (irreversible)
const revealCard = (position) => {
    // Validate sequence
    if (!canRevealPosition(position)) {
        throw new Error('Invalid reveal sequence');
    }
    
    // Permanent state change
    return updateState({
        ...readingState,
        cards: readingState.cards.map(card => 
            card.position === position 
                ? { ...card, revealed: true, revealed_at: new Date() }
                : card
        ),
        progress: readingState.progress + 1
    });
};
```

### **API Endpoints**
```
POST /api/tarot-v2/readings                    // Create new reading
GET  /api/tarot-v2/readings/{id}/cards         // Client: Get revealed cards only
POST /api/tarot-v2/readings/{id}/reveal        // Client: Reveal next card
GET  /api/tarot-v2/readings/{id}/ai-draft      // Reader: Get AI interpretation
POST /api/tarot-v2/readings/{id}/complete      // Reader: Complete reading
GET  /api/tarot-v2/audit/{reading_id}          // Admin: Audit logs
```

### **WebSocket Events**
```javascript
// Real-time updates between client and reader
socket.on('card_revealed', (data) => {
    updateClientProgress(data.position);
    updateReaderView(data.position, data.card_id);
    logAuditEvent('CARD_REVEALED', data);
});

socket.on('ai_draft_ready', (data) => {
    // Only sent to reader socket
    if (userRole === 'reader') {
        displayAIDraft(data.interpretation);
        logAuditEvent('AI_DRAFT_ACCESSED', data);
    }
});
```

---

## 🚨 **SECURITY PROCEDURES**

### **AI Content Leak Prevention**
1. **Server-Side Filtering**: Never send AI content to client endpoints
2. **Role-Based Access**: Validate user role before AI content access
3. **Audit Logging**: Log every AI content access attempt
4. **Real-Time Monitoring**: Alert on suspicious access patterns

### **Rollback Attack Prevention**
1. **Database Constraints**: Prevent reveal timestamp modification
2. **API Validation**: Reject any rollback requests
3. **State Immutability**: Frontend state cannot be reversed
4. **Audit Trails**: Log any rollback attempts for investigation

### **Copy Protection Enforcement**
```javascript
// Disable text selection on AI content
document.addEventListener('selectstart', (e) => {
    if (e.target.classList.contains('ai-content')) {
        e.preventDefault();
        logSecurityEvent('COPY_ATTEMPT', { element: e.target.id });
    }
});

// Disable right-click on AI content
document.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('ai-content')) {
        e.preventDefault();
        logSecurityEvent('RIGHT_CLICK_ATTEMPT', { element: e.target.id });
    }
});
```

---

## 📋 **TESTING PROCEDURES**

### **Security Testing**
```bash
# Test AI content isolation
curl -H "Authorization: Bearer client-token" /api/tarot-v2/readings/123/ai-draft
# Expected: 403 Forbidden

# Test rollback prevention
curl -X POST -H "Authorization: Bearer client-token" /api/tarot-v2/readings/123/rollback
# Expected: 405 Method Not Allowed

# Test reveal sequence validation
curl -X POST -H "Authorization: Bearer client-token" /api/tarot-v2/readings/123/reveal -d '{"position": 3}'
# Expected: 400 Bad Request (must reveal position 1 first)
```

### **Functional Testing**
- **Progressive Reveal**: Verify cards reveal in order only
- **State Persistence**: Refresh page, verify reveals maintained
- **Real-Time Sync**: Multiple sessions, verify sync between client/reader
- **Audit Logging**: Verify all actions properly logged

---

## 🛠️ **TROUBLESHOOTING**

### **Common Issues**

#### **"Client Can See AI Content"**
```
CRITICAL SECURITY BREACH - IMMEDIATE ACTION:
1. Check RLS policy: ai_draft_visible_to_client = FALSE
2. Verify API endpoint filtering AI content
3. Review frontend code for AI content leaks
4. Audit recent changes to Tarot V2 system
5. Escalate to security team immediately
```

#### **"Cards Won't Reveal"**
```
Check: Sequential reveal validation
Check: Network connectivity
Check: WebSocket connection
Action: Refresh session, verify state sync
```

#### **"Reveal State Lost"**
```
Check: Database transaction completion
Check: Session persistence in localStorage
Check: WebSocket reconnection logic
Action: Restore from audit log timestamps
```

### **Emergency Procedures**
1. **AI Content Leak**: Immediate system lockdown, security investigation
2. **Rollback Exploit**: Audit log review, user account investigation
3. **State Corruption**: Restore from audit trail, rebuild reading state

---

## 📊 **MONITORING & METRICS**

### **Key Metrics**
- **AI Isolation Success Rate**: 100% (any failure = critical alert)
- **Reveal Sequence Accuracy**: > 99.5%
- **Audit Log Completeness**: 100% coverage
- **Copy Protection Effectiveness**: Measured by attempt logs

### **Alerts**
- **AI Content Leak**: Immediate alert (P0 incident)
- **Rollback Attempts**: Investigation required
- **Unusual Reveal Patterns**: Potential bot activity
- **Audit Log Gaps**: Data integrity issue

---

## 🎯 **SUCCESS CRITERIA**

### **Security Goals**
- ✅ **Zero AI content leaks** to client side
- ✅ **No rollback capabilities** (reveals are permanent)
- ✅ **Complete audit trails** for all actions
- ✅ **Copy protection** effectiveness > 95%

### **User Experience Goals**
- ✅ **Smooth progressive reveal** (< 1s response time)
- ✅ **Real-time synchronization** between client/reader
- ✅ **Clear progress indicators** for clients
- ✅ **Intuitive AI draft interface** for readers

---

*Tarot V2 Client Reveal System v1.0*  
*Security Classification: HIGH*  
*Next Security Review: November 18, 2025*

**🔒 AI CONTENT ISOLATION IS BUSINESS CRITICAL - ZERO TOLERANCE FOR LEAKS**