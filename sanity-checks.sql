-- SANITY CHECKS — SAMIA TAROT  
-- Pre-canary validation queries
-- maintainable & short — preserve theme integrity

-- =====================================================
-- 1. DECK CARDS PARITY CHECK
-- =====================================================

-- Total deck cards in system
SELECT COUNT(*) as total_deck_cards FROM deck_cards;

-- Verify proper card distribution (78 face + 1 back per complete deck)
SELECT 
  deck_id,
  COUNT(*) FILTER (WHERE is_back = true) AS back_cards,
  COUNT(*) FILTER (WHERE is_back = false) AS face_cards,
  COUNT(*) as total_cards,
  -- Validation flags
  (COUNT(*) FILTER (WHERE is_back = true) = 1) as has_single_back,
  (COUNT(*) FILTER (WHERE is_back = false) = 78) as has_78_faces,
  (COUNT(*) = 79) as is_complete_deck
FROM deck_cards
GROUP BY deck_id
ORDER BY deck_id;

-- =====================================================
-- 2. TAROT V2 REVEAL ORDER INTEGRITY  
-- =====================================================

-- Verify all readings start at position 1
SELECT 
  reading_id, 
  MIN(card_position) = 1 AS starts_at_one,
  MAX(card_position) as max_revealed_position,
  COUNT(*) as total_reveals,
  -- Check for gaps in sequence
  (MAX(card_position) = COUNT(*)) as no_sequence_gaps
FROM tarot_v2_card_selections 
GROUP BY reading_id
HAVING COUNT(*) > 0
ORDER BY reading_id;

-- Find any readings with sequence violations
SELECT 
  reading_id,
  array_agg(card_position ORDER BY card_position) as positions,
  'Sequence violation' as issue
FROM tarot_v2_card_selections
GROUP BY reading_id  
HAVING NOT (MIN(card_position) = 1 AND MAX(card_position) = COUNT(*));

-- =====================================================
-- 3. CALL CONSENT COMPLETENESS
-- =====================================================

-- Check for missing IP addresses in consent logs
SELECT COUNT(*) as missing_ip_count
FROM call_consent_logs 
WHERE client_ip IS NULL OR client_ip = '' OR client_ip = '0.0.0.0';

-- Recent consent logs validation (last 24h)
SELECT 
  consent_given,
  COUNT(*) as log_count,
  COUNT(client_ip) as with_ip,
  COUNT(timestamp) as with_timestamp
FROM call_consent_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY consent_given;

-- =====================================================
-- 4. AI DRAFT ISOLATION VERIFICATION
-- =====================================================

-- Critical: Ensure NO drafts are visible to clients
SELECT COUNT(*) as exposed_ai_drafts
FROM tarot_v2_readings 
WHERE ai_draft_visible_to_client = true;

-- Verify audit logging for AI draft access
SELECT 
  DATE(created_at) as access_date,
  COUNT(*) as draft_accesses,
  COUNT(DISTINCT reading_id) as unique_readings,
  COUNT(DISTINCT reader_id) as unique_readers
FROM tarot_v2_audit_logs
WHERE event_type = 'ai_draft_accessed'
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY access_date DESC;

-- =====================================================
-- 5. EMERGENCY EXTENSION VALIDATION
-- =====================================================

-- Verify emergency extensions create new bookings (not modify existing)
SELECT 
  original_booking_id,
  COUNT(*) as extension_bookings,
  SUM(duration_minutes) as total_extension_minutes,
  AVG(price_cents) as avg_extension_price
FROM emergency_call_bookings
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY original_booking_id
HAVING COUNT(*) > 0
ORDER BY extension_bookings DESC;

-- =====================================================
-- 6. DAILY ZODIAC PIPELINE HEALTH
-- =====================================================

-- Check recent zodiac generation success (last 7 days)
SELECT 
  generation_date,
  COUNT(*) as signs_generated,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE audio_file_path IS NOT NULL) as with_audio,
  -- Should be 12 signs per day
  (COUNT(*) = 12) as all_signs_generated
FROM daily_zodiac_content
WHERE generation_date > CURRENT_DATE - INTERVAL '7 days'
GROUP BY generation_date
ORDER BY generation_date DESC;

-- =====================================================
-- 7. RLS POLICY COVERAGE
-- =====================================================

-- Verify critical tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  -- Count policies per table
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE tablename IN (
  'payment_transactions',
  'tarot_v2_card_selections', 
  'tarot_v2_audit_logs',
  'call_consent_logs',
  'deck_cards',
  'reader_availability',
  'user_wallets'
)
ORDER BY tablename;

-- =====================================================
-- 8. EXPECTED RESULTS SUMMARY
-- =====================================================

/*
EXPECTED SANITY CHECK RESULTS:

1. Deck Cards:
   - back_cards = 1 per deck
   - face_cards = 78 per complete deck  
   - is_complete_deck = true for production decks

2. Tarot V2 Reveals:
   - starts_at_one = true for ALL readings
   - no_sequence_gaps = true for ALL readings
   - Zero sequence violations found

3. Call Consent:
   - missing_ip_count = 0 
   - with_ip = with_timestamp for all logs

4. AI Draft Isolation:
   - exposed_ai_drafts = 0 (CRITICAL)
   - audit_logs show reader access only

5. Emergency Extensions:
   - New bookings created (not modifications)
   - Progressive pricing applied

6. Daily Zodiac:
   - all_signs_generated = true (12 per day)
   - successful = 12, with_audio = 12

7. RLS Coverage:
   - rls_enabled = true for all critical tables
   - policy_count > 0 for all tables

If ANY result doesn't match expected values:
🚨 DO NOT PROCEED TO CANARY 🚨
*/