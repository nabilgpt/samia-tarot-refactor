# 🚨 STEP 6: EMERGENCY ESCALATION SYSTEM - MANUAL EXECUTION GUIDE

## Issue Resolution
You're seeing the error `column esc.is_active does not exist` because the escalation logic functions were created before all table columns were properly added.

## SOLUTION: Execute these SQL files in order in your Supabase SQL Editor

### Step 1: Fix Missing Columns (Siren Table)
**File:** `fix-siren-table-columns.sql`
```sql
-- Copy and paste the entire contents of fix-siren-table-columns.sql
-- This will add all missing columns to emergency_siren_control table
```
✅ **COMPLETED** - All 18 columns now exist in emergency_siren_control

### Step 2: Fix Missing Columns (Emergency Calls Table)
**File:** `fix-emergency-calls-missing-columns.sql`
```sql
-- Copy and paste the entire contents of fix-emergency-calls-missing-columns.sql
-- This will add missing escalation columns to emergency_calls table
```

### Step 3: Re-create Escalation Functions (BULLETPROOF VERSION)
**File:** `step6-escalation-logic-final-bulletproof.sql`
```sql
-- Copy and paste the entire contents of step6-escalation-logic-final-bulletproof.sql
-- This will create all the escalation functions with NO profile dependencies
```
🛡️ **BULLETPROOF VERSION** - Works regardless of profiles table structure

## Verification Steps

### 1. Check Table Structure
```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'emergency_siren_control' 
ORDER BY ordinal_position;
```

**Expected columns:**
- id (uuid)
- emergency_call_id (uuid)
- siren_type (varchar)
- target_roles (text[])
- intensity_level (integer)
- pattern (varchar)
- started_at (timestamp)
- auto_stop_after_minutes (integer)
- stopped_at (timestamp)
- stopped_by (uuid)
- stop_reason (varchar)
- **is_active (boolean)** ← This was missing!
- acknowledged_by (uuid[])
- triggered_by_escalation_id (uuid)
- escalation_level (integer)
- siren_metadata (jsonb)
- created_at (timestamp)
- updated_at (timestamp)

### 2. Check Functions Exist
```sql
SELECT proname 
FROM pg_proc 
WHERE proname IN (
    'trigger_emergency_escalation',
    'stop_emergency_siren',
    'check_emergency_call_timeouts',
    'handle_emergency_call_accepted',
    'acknowledge_emergency_siren',
    'get_active_sirens_for_role'
)
ORDER BY proname;
```

**Expected:** 6 functions should be listed

### 3. Test Escalation System
```sql
-- Test with a sample emergency call
SELECT trigger_emergency_escalation(
    (SELECT id FROM emergency_calls LIMIT 1),
    'test_scenario'
);
```

## 🎯 What This Escalation System Does

### ⚡ **Automatic Escalation**
- Monitors emergency calls every 30 seconds
- Escalates when readers don't respond within timeout
- Increases escalation level (1 → 2 → 3 → Critical)

### 🚨 **Persistent Sirens**
- Creates audio/visual alerts for admins and monitors
- Intensity increases with escalation level (25% → 50% → 75% → 100%)
- Different siren types: `standard_alert` → `urgent_alert` → `critical_alarm` → `emergency_siren`

### 👥 **Role-Based Targeting**
- **Level 1:** Available readers + monitors
- **Level 2:** All readers + admins + monitors  
- **Level 3+:** All admins + super admins + monitors

### 📊 **Complete Audit Trail**
- Every escalation event logged in `emergency_escalation_timeline`
- Full metadata: who, when, why, what action
- Siren acknowledgments tracked

### 🔄 **Automatic Cleanup**
- Sirens auto-stop after configured timeout (default: 30 min for levels 1-2)
- Critical level sirens (3+) require manual stop
- Background cleanup every minute

## 🔧 Usage Commands

```sql
-- Trigger manual escalation
SELECT trigger_emergency_escalation('call-uuid', 'manual_escalation');

-- Stop all sirens for a call
SELECT stop_emergency_siren('call-uuid', 'admin-uuid', 'issue_resolved');

-- Get my active sirens  
SELECT * FROM get_active_sirens_for_role('admin');

-- Acknowledge a siren
SELECT acknowledge_emergency_siren('siren-uuid', 'user-uuid');

-- Check for timed-out calls (run every 30s)
SELECT check_emergency_call_timeouts();

-- Cleanup expired sirens (run every minute)
SELECT auto_stop_expired_sirens();
```

## ⏰ Scheduled Jobs Needed

Set up these as cron jobs or scheduled functions:

```bash
# Every 30 seconds - check for escalation timeouts
*/30 * * * * SELECT check_emergency_call_timeouts();

# Every minute - cleanup expired sirens
* * * * * SELECT auto_stop_expired_sirens();
```

## 🏆 Success Criteria

✅ `emergency_siren_control` table has all 18 columns
✅ All 6 escalation functions created without errors  
✅ RLS policies active for role-based access
✅ Test escalation creates siren successfully
✅ Siren can be stopped manually
✅ Escalation timeline logs all events

---

**Ready for Phase 4:** Frontend Components & Real-time Siren Display! 🎉 