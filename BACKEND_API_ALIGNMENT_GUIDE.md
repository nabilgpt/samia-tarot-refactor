# BACKEND API ALIGNMENT GUIDE - PRODUCTION READY

## 🔧 **BACKEND API ALIGNMENT GUIDE**

**Document Version**: 1.0  
**Last Updated**: August 18, 2025  
**Classification**: Technical Implementation  
**Team**: Backend Development, DevOps

---

## 📋 **OVERVIEW**

This guide provides the complete roadmap for aligning backend APIs with the production database schema. All 11 new tables use flat naming (no schema prefixes) and require API query updates for seamless integration.

---

## 🎯 **NAMING CONVENTION CHANGES**

### **Schema Migration Summary**
```
Blueprint Design → Production Implementation:
tarot.deck_cards → deck_cards (public schema)
calls.sessions → call_sessions (existing table)
calls.consent_logs → call_consent_logs (new table)
tarot.spreads → tarot_spreads (existing table)
```

### **Affected Tables**
```sql
-- New production tables (flat naming)
public.call_consent_logs
public.call_emergency_extensions  
public.deck_cards
public.deck_uploads
public.payment_transactions
public.reader_availability
public.reader_availability_overrides
public.reader_emergency_requests
public.tarot_v2_audit_logs
public.tarot_v2_card_selections
public.user_wallets
```

---

## 🔄 **API QUERY MIGRATIONS**

### **1. Deck Management APIs**

#### **Before: Schema-based queries**
```javascript
// OLD: Schema-based approach
const getDeckCards = async (deckTypeId) => {
    const { data, error } = await supabase
        .from('tarot.deck_cards')  // ❌ Schema prefix
        .select('*')
        .eq('deck_type_id', deckTypeId);
    
    return { data, error };
};
```

#### **After: Flat table queries**
```javascript
// NEW: Flat table approach
const getDeckCards = async (deckTypeId) => {
    const { data, error } = await supabase
        .from('deck_cards')  // ✅ Direct table name
        .select('*')
        .eq('deck_type_id', deckTypeId);
    
    return { data, error };
};
```

#### **Deck Upload Progress Tracking**
```javascript
// NEW: Deck upload session management
const createDeckUploadSession = async (deckTypeId, uploadedBy) => {
    const { data, error } = await supabase
        .from('deck_uploads')
        .insert({
            deck_type_id: deckTypeId,
            upload_session_id: crypto.randomUUID(),
            status: 'uploading',
            total_files: 79,
            uploaded_by: uploadedBy
        })
        .select()
        .single();
    
    return { data, error };
};

const updateUploadProgress = async (sessionId, progress) => {
    const { data, error } = await supabase
        .from('deck_uploads')
        .update({ 
            progress: progress,
            updated_at: new Date().toISOString()
        })
        .eq('upload_session_id', sessionId);
    
    return { data, error };
};
```

### **2. Call System APIs**

#### **Call Consent Management**
```javascript
// NEW: Legal consent logging with IP tracking
const logCallConsent = async (sessionId, userId, consentType, ipAddress, userAgent) => {
    const { data, error } = await supabase
        .from('call_consent_logs')
        .insert({
            session_id: sessionId,
            user_id: userId,
            consent_type: consentType,
            consent_given: true,
            ip_address: ipAddress,  // Required for legal compliance
            user_agent: userAgent,
            timestamp: new Date().toISOString()
        });
    
    return { data, error };
};

const getConsentHistory = async (sessionId) => {
    const { data, error } = await supabase
        .from('call_consent_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false });
    
    return { data, error };
};
```

#### **Emergency Extensions**
```javascript
// NEW: Emergency call extension management
const requestEmergencyExtension = async (sessionId, clientId, extensionType) => {
    const { data, error } = await supabase
        .from('call_emergency_extensions')
        .insert({
            session_id: sessionId,
            client_id: clientId,
            extension_type: extensionType,  // '5min', '10min', etc.
            status: 'pending',
            requested_at: new Date().toISOString()
        })
        .select()
        .single();
    
    return { data, error };
};

const approveExtension = async (extensionId, adminId) => {
    const { data, error } = await supabase
        .from('call_emergency_extensions')
        .update({
            status: 'approved',
            approved_by: adminId,
            approved_at: new Date().toISOString()
        })
        .eq('id', extensionId);
    
    return { data, error };
};
```

### **3. Reader Availability APIs**

#### **Availability Management**
```javascript
// NEW: Reader availability with timezone support
const setReaderAvailability = async (readerId, schedule) => {
    const availabilityRecords = schedule.map(day => ({
        reader_id: readerId,
        day_of_week: day.dayOfWeek,
        start_time: day.startTime,
        end_time: day.endTime,
        emergency_opt_in: day.emergencyOptIn || false,
        timezone: day.timezone || 'UTC',
        is_active: true
    }));
    
    const { data, error } = await supabase
        .from('reader_availability')
        .upsert(availabilityRecords, {
            onConflict: 'reader_id,day_of_week'
        });
    
    return { data, error };
};

const getAvailableEmergencyReaders = async () => {
    const { data, error } = await supabase
        .from('reader_availability')
        .select(`
            *,
            readers:reader_id(id, name, status)
        `)
        .eq('emergency_opt_in', true)
        .eq('is_active', true)
        .eq('readers.status', 'active');
    
    return { data, error };
};
```

#### **Emergency Request Handling**
```javascript
// NEW: Emergency request workflow
const createEmergencyRequest = async (readerId, clientId, emergencyReason) => {
    const { data, error } = await supabase
        .from('reader_emergency_requests')
        .insert({
            reader_id: readerId,
            client_id: clientId,
            emergency_reason: emergencyReason,
            status: 'pending',
            requested_at: new Date().toISOString()
        })
        .select()
        .single();
    
    return { data, error };
};

const respondToEmergencyRequest = async (requestId, response) => {
    const { data, error } = await supabase
        .from('reader_emergency_requests')
        .update({
            status: response, // 'accepted' or 'declined'
            responded_at: new Date().toISOString()
        })
        .eq('id', requestId);
    
    return { data, error };
};
```

### **4. Tarot V2 APIs**

#### **Progressive Card Reveal**
```javascript
// NEW: Tarot V2 card selection with AI isolation
const createTarotV2Reading = async (clientId, readerId, spreadId) => {
    const { data, error } = await supabase
        .from('tarot_v2_readings')
        .insert({
            client_id: clientId,
            reader_id: readerId,
            spread_id: spreadId,
            status: 'active',
            ai_draft_visible_to_client: false,  // CRITICAL: Always false
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    return { data, error };
};

const revealCard = async (readingId, cardId, position) => {
    // First log the reveal for audit
    await supabase
        .from('tarot_v2_audit_logs')
        .insert({
            reading_id: readingId,
            action: 'CARD_REVEALED',
            user_id: (await supabase.auth.getUser()).data.user?.id,
            details: { card_id: cardId, position: position },
            timestamp: new Date().toISOString()
        });
    
    // Then reveal the card (irreversible)
    const { data, error } = await supabase
        .from('tarot_v2_card_selections')
        .update({
            is_revealed: true,
            revealed_at: new Date().toISOString()
        })
        .eq('reading_id', readingId)
        .eq('card_id', cardId)
        .eq('position', position);
    
    return { data, error };
};
```

#### **AI Content Security**
```javascript
// Client API: NO AI content access
const getClientReadingCards = async (readingId) => {
    const { data, error } = await supabase
        .from('tarot_v2_card_selections')
        .select(`
            id,
            card_id,
            position,
            is_revealed,
            revealed_at,
            cards:card_id(name, image_url)
        `)
        .eq('reading_id', readingId)
        .order('position');
    
    // No AI interpretation fields returned
    return { data, error };
};

// Reader API: WITH AI content access
const getReaderAIDraft = async (readingId) => {
    // Log AI access for security audit
    await supabase
        .from('tarot_v2_audit_logs')
        .insert({
            reading_id: readingId,
            action: 'AI_DRAFT_ACCESSED',
            user_id: (await supabase.auth.getUser()).data.user?.id,
            ai_content_accessed: true,
            timestamp: new Date().toISOString()
        });
    
    const { data, error } = await supabase
        .from('tarot_v2_readings')
        .select('ai_interpretation, confidence_score, generated_at')
        .eq('id', readingId)
        .single();
    
    return { data, error };
};
```

### **5. Payment & Wallet APIs**

#### **User Wallet Management**
```javascript
// NEW: User wallet operations
const getUserWallet = async (userId) => {
    const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    return { data, error };
};

const addWalletFunds = async (userId, amount, transactionType, description) => {
    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
            user_id: userId,
            amount: amount,
            transaction_type: transactionType,
            status: 'completed',
            description: description,
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (transactionError) return { data: null, error: transactionError };
    
    // Update wallet balance
    const { data, error } = await supabase
        .from('user_wallets')
        .update({
            balance: supabase.raw(`balance + ${amount}`),
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    
    return { data: transaction, error };
};
```

#### **Payment Transaction Tracking**
```javascript
// NEW: Comprehensive payment tracking
const createPaymentTransaction = async (transactionData) => {
    const { data, error } = await supabase
        .from('payment_transactions')
        .insert({
            user_id: transactionData.userId,
            amount: transactionData.amount,
            currency: transactionData.currency || 'USD',
            transaction_type: transactionData.type,
            payment_method: transactionData.paymentMethod,
            status: 'pending',
            payment_gateway: transactionData.gateway,
            gateway_transaction_id: transactionData.gatewayTransactionId,
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    return { data, error };
};

const updateTransactionStatus = async (transactionId, status, gatewayResponse) => {
    const { data, error } = await supabase
        .from('payment_transactions')
        .update({
            status: status,
            gateway_response: gatewayResponse,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);
    
    return { data, error };
};
```

---

## 🔍 **API ENDPOINT UPDATES**

### **Required Route Changes**

#### **Deck Management Routes**
```javascript
// src/api/routes/deckRoutes.js
router.get('/decks/:deckTypeId/cards', async (req, res) => {
    const { deckTypeId } = req.params;
    
    const { data, error } = await supabase
        .from('deck_cards')  // Updated table name
        .select('*')
        .eq('deck_type_id', deckTypeId);
    
    if (error) return res.status(400).json({ error });
    res.json(data);
});

router.post('/decks/upload-session', async (req, res) => {
    const { deckTypeId, uploadedBy } = req.body;
    
    const { data, error } = await supabase
        .from('deck_uploads')  // New table
        .insert({
            deck_type_id: deckTypeId,
            upload_session_id: crypto.randomUUID(),
            status: 'uploading',
            total_files: 79,
            uploaded_by: uploadedBy
        });
    
    if (error) return res.status(400).json({ error });
    res.json(data);
});
```

#### **Call System Routes**
```javascript
// src/api/routes/callRoutes.js
router.post('/calls/:sessionId/consent', async (req, res) => {
    const { sessionId } = req.params;
    const { consentType, ipAddress, userAgent } = req.body;
    
    const { data, error } = await supabase
        .from('call_consent_logs')  // New table
        .insert({
            session_id: sessionId,
            user_id: req.user.id,
            consent_type: consentType,
            consent_given: true,
            ip_address: ipAddress,
            user_agent: userAgent,
            timestamp: new Date().toISOString()
        });
    
    if (error) return res.status(400).json({ error });
    res.json({ success: true, consent_logged: true });
});

router.post('/calls/:sessionId/emergency-extension', async (req, res) => {
    const { sessionId } = req.params;
    const { extensionType } = req.body;
    
    const { data, error } = await supabase
        .from('call_emergency_extensions')  // New table
        .insert({
            session_id: sessionId,
            client_id: req.user.id,
            extension_type: extensionType,
            status: 'pending',
            requested_at: new Date().toISOString()
        });
    
    if (error) return res.status(400).json({ error });
    res.json(data);
});
```

#### **Reader Availability Routes**
```javascript
// src/api/routes/readerRoutes.js
router.get('/readers/emergency-available', async (req, res) => {
    const { data, error } = await supabase
        .from('reader_availability')  // New table
        .select(`
            *,
            readers:reader_id(id, name, status)
        `)
        .eq('emergency_opt_in', true)
        .eq('is_active', true)
        .eq('readers.status', 'active');
    
    if (error) return res.status(400).json({ error });
    res.json(data);
});

router.post('/readers/:readerId/availability', async (req, res) => {
    const { readerId } = req.params;
    const { schedule } = req.body;
    
    const availabilityRecords = schedule.map(day => ({
        reader_id: readerId,
        day_of_week: day.dayOfWeek,
        start_time: day.startTime,
        end_time: day.endTime,
        emergency_opt_in: day.emergencyOptIn || false,
        timezone: day.timezone || 'UTC',
        is_active: true
    }));
    
    const { data, error } = await supabase
        .from('reader_availability')  // New table
        .upsert(availabilityRecords);
    
    if (error) return res.status(400).json({ error });
    res.json({ success: true, updated: data });
});
```

#### **Tarot V2 Routes**
```javascript
// src/api/routes/tarotV2Routes.js
router.post('/tarot-v2/readings', async (req, res) => {
    const { clientId, readerId, spreadId } = req.body;
    
    const { data, error } = await supabase
        .from('tarot_v2_readings')  // New table
        .insert({
            client_id: clientId,
            reader_id: readerId,
            spread_id: spreadId,
            status: 'active',
            ai_draft_visible_to_client: false,  // CRITICAL
            created_at: new Date().toISOString()
        });
    
    if (error) return res.status(400).json({ error });
    res.json(data);
});

router.post('/tarot-v2/readings/:readingId/reveal', async (req, res) => {
    const { readingId } = req.params;
    const { cardId, position } = req.body;
    
    // Log audit event
    await supabase
        .from('tarot_v2_audit_logs')  // New table
        .insert({
            reading_id: readingId,
            action: 'CARD_REVEALED',
            user_id: req.user.id,
            details: { card_id: cardId, position: position },
            timestamp: new Date().toISOString()
        });
    
    // Reveal card
    const { data, error } = await supabase
        .from('tarot_v2_card_selections')  // New table
        .update({
            is_revealed: true,
            revealed_at: new Date().toISOString()
        })
        .eq('reading_id', readingId)
        .eq('position', position);
    
    if (error) return res.status(400).json({ error });
    res.json({ success: true, card_revealed: true });
});
```

---

## 🛡️ **SECURITY UPDATES**

### **RLS Policy Integration**
```javascript
// Ensure RLS policies are respected in API calls
const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true
        },
        global: {
            headers: {
                'x-rls-enforced': 'true'  // Ensure RLS is enforced
            }
        }
    }
);
```

### **Role-Based Access Verification**
```javascript
// Middleware to verify user roles for new tables
const verifyRoleAccess = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            const { data: { user } } = await supabase.auth.getUser(token);
            
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            const userRole = user.user_metadata?.role || 'client';
            
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
            
            req.user = user;
            req.userRole = userRole;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    };
};

// Usage in routes
router.get('/admin/audit-logs', 
    verifyRoleAccess(['admin', 'super_admin']),
    async (req, res) => {
        // Admin-only access to audit logs
    }
);
```

---

## 📊 **TESTING UPDATES**

### **API Testing Scripts**
```javascript
// test/api/newTables.test.js
describe('New Table APIs', () => {
    describe('Deck Cards API', () => {
        test('should fetch deck cards without schema prefix', async () => {
            const response = await request(app)
                .get('/api/decks/test-deck-id/cards')
                .expect(200);
            
            expect(response.body).toBeDefined();
            expect(Array.isArray(response.body)).toBe(true);
        });
    });
    
    describe('Call Consent API', () => {
        test('should log consent with IP address', async () => {
            const consentData = {
                consentType: 'recording',
                ipAddress: '192.168.1.1',
                userAgent: 'Test Browser'
            };
            
            const response = await request(app)
                .post('/api/calls/test-session/consent')
                .send(consentData)
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.consent_logged).toBe(true);
        });
    });
    
    describe('Tarot V2 Security', () => {
        test('should never expose AI content to clients', async () => {
            const response = await request(app)
                .get('/api/tarot-v2/readings/test-reading/cards')
                .set('Authorization', 'Bearer client-token')
                .expect(200);
            
            // Ensure no AI fields in response
            response.body.forEach(card => {
                expect(card.ai_interpretation).toBeUndefined();
                expect(card.ai_confidence).toBeUndefined();
            });
        });
    });
});
```

---

## 🚀 **DEPLOYMENT CHECKLIST**

### **Pre-Deployment Tasks**
```bash
# 1. Update all API queries to use flat table names
grep -r "tarot\." src/api/ # Should return no results
grep -r "calls\." src/api/ # Should return no results

# 2. Test new table access
npm run test:api:new-tables

# 3. Verify RLS policies
npm run test:security:rls

# 4. Check all environment variables
npm run test:env:validation
```

### **Post-Deployment Verification**
```sql
-- Verify API access to new tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN (
    'call_consent_logs',
    'call_emergency_extensions',
    'deck_cards',
    'deck_uploads',
    'payment_transactions',
    'reader_availability',
    'reader_availability_overrides',
    'reader_emergency_requests',
    'tarot_v2_audit_logs',
    'tarot_v2_card_selections',
    'user_wallets'
);

-- All should show rowsecurity = true
```

---

## 📈 **PERFORMANCE CONSIDERATIONS**

### **Recommended Indexes**
```sql
-- Performance indexes for API queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deck_cards_type ON deck_cards(deck_type_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_consent_session ON call_consent_logs(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reader_availability_reader ON reader_availability(reader_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tarot_v2_reading ON tarot_v2_card_selections(reading_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_wallets_user ON user_wallets(user_id);
```

### **Query Optimization**
```javascript
// Use selective field queries to reduce payload
const getEssentialDeckCards = async (deckTypeId) => {
    const { data, error } = await supabase
        .from('deck_cards')
        .select('id, card_number, image_url, name')  // Only needed fields
        .eq('deck_type_id', deckTypeId)
        .order('card_number');
    
    return { data, error };
};
```

---

*Backend API Alignment Guide v1.0*  
*Next Review: November 18, 2025*  
*Technical Implementation: Production Ready*

**🔧 API ALIGNMENT ENABLES SEAMLESS INTEGRATION - UPDATE ALL QUERIES TO FLAT TABLE NAMES**