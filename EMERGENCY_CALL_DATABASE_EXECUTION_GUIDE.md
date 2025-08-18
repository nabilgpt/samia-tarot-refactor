# 🚨 EMERGENCY CALL SYSTEM - DATABASE EXECUTION GUIDE

## ⚠️ CRITICAL EXECUTION ORDER

**You MUST execute these scripts in the exact order below. Each step depends on the previous one.**

---

## 📋 PRE-EXECUTION CHECKLIST

Before starting, run this diagnostic script to check your database:

```sql
-- Run this first: check-tables-first.sql
```

This will verify:
- ✅ `profiles` table exists with correct structure
- ✅ No conflicting `emergency_calls` table exists
- ✅ Required extensions are available

---

## 🔄 STEP-BY-STEP EXECUTION

### STEP 1: Create Base Emergency Calls Table
**File:** `step1-emergency-calls-table-only.sql`

**What it does:**
- Creates the main `emergency_calls` table
- Adds all necessary columns and constraints
- Verifies table creation

**Expected result:** 
```
emergency_calls table created successfully | 25
```

**⚠️ STOP HERE if you get any errors!** Fix the `profiles` table reference issue before continuing.

---

### STEP 2: Create Related Tables
**File:** `step2-related-tables.sql`

**What it does:**
- Creates 6 related tables that reference `emergency_calls`
- All tables have proper foreign key relationships
- Includes verification query

**Expected result:**
```
emergency_calls                    | 25
emergency_escalation_log           | 20
emergency_call_ai_monitoring       | 18
emergency_call_recordings          | 22
emergency_siren_control           | 18
emergency_webrtc_signaling        | 15
emergency_call_quality_metrics    | 14
```

---

### STEP 3: Create Pricing & Configuration Tables
**File:** `step3-pricing-tables.sql`

**What it does:**
- Creates pricing and configuration tables
- Adds reader settings and selection logging
- Includes transaction tracking

**Expected result:**
```
emergency_call_pricing             | 20
emergency_call_transactions        | 28
call_session_features             | 25
reader_emergency_settings         | 22
emergency_reader_selection_log    | 18
```

---

### STEP 4: Create Indexes & Security Policies
**File:** `step4-indexes-policies.sql`

**What it does:**
- Creates all performance indexes
- Enables Row Level Security (RLS)
- Creates security policies for all tables

**Expected result:**
- Multiple indexes created (check the verification query)
- All tables have RLS enabled
- Security policies in place

---

### STEP 5: Insert Initial Data & Functions
**File:** `step5-initial-data.sql`

**What it does:**
- Inserts default pricing ($5 audio, $8 video)
- Creates system settings table
- Adds default configuration
- Creates triggers for auto-updating timestamps

**Expected result:**
```
Emergency Call Pricing    | 2
Emergency Call Settings   | 14
Total Tables Created      | 15
```

---

## 🎯 EXECUTION INSTRUCTIONS

### Option A: Manual Execution (Recommended)
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste each script one by one
3. Execute in order (Step 1 → Step 2 → Step 3 → Step 4 → Step 5)
4. Verify results after each step

### Option B: Automated Execution
```bash
# If you have psql access (unlikely in your environment)
psql -d your_database -f step1-emergency-calls-table-only.sql
psql -d your_database -f step2-related-tables.sql
psql -d your_database -f step3-pricing-tables.sql
psql -d your_database -f step4-indexes-policies.sql
psql -d your_database -f step5-initial-data.sql
```

---

## 🔍 VERIFICATION AFTER COMPLETION

Run this query to verify everything was created:

```sql
-- Verify all tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND (table_name LIKE '%emergency%' OR table_name LIKE '%call%')
ORDER BY table_name;

-- Verify pricing data
SELECT call_type, base_price_usd, price_per_minute_usd 
FROM emergency_call_pricing 
WHERE is_active = true;

-- Verify settings
SELECT setting_key, setting_value 
FROM emergency_call_settings 
WHERE is_active = true
LIMIT 5;
```

**Expected final table count:** 15 tables total

---

## 🚨 TROUBLESHOOTING

### Error: "column client_id does not exist"
**Cause:** Trying to create indexes/policies before tables exist
**Solution:** Execute scripts in exact order, don't skip steps

### Error: "relation profiles does not exist"
**Cause:** `profiles` table missing or wrong name
**Solution:** Check your user table name, might be `users` instead of `profiles`

### Error: "permission denied"
**Cause:** Insufficient database permissions
**Solution:** Use service role key or admin account

### Error: "syntax error near USING"
**Cause:** Old PostgreSQL version
**Solution:** All scripts are compatible with PostgreSQL 13+

---

## 📊 WHAT YOU GET AFTER COMPLETION

### ✅ 15 New Tables Created:
1. `emergency_calls` - Main call records
2. `emergency_escalation_log` - Escalation tracking
3. `emergency_call_ai_monitoring` - AI analysis
4. `emergency_call_recordings` - Recording management
5. `emergency_siren_control` - Siren/alarm control
6. `emergency_webrtc_signaling` - WebRTC data
7. `emergency_call_quality_metrics` - Call quality
8. `emergency_call_pricing` - Dynamic pricing
9. `emergency_call_transactions` - Payment tracking
10. `call_session_features` - Call controls
11. `reader_emergency_settings` - Reader preferences
12. `emergency_reader_selection_log` - Selection tracking
13. `emergency_call_settings` - System configuration
14. `emergency_call_recording_permissions` - Access control
15. `emergency_escalation_timeline` - Complete escalation history

### ✅ Security Features:
- Row Level Security on all tables
- Role-based access control
- Secure foreign key relationships

### ✅ Performance Features:
- 50+ optimized indexes
- JSONB indexing for metadata
- Automatic timestamp updates

### ✅ Default Configuration:
- Audio calls: $5 base + $2.50/min
- Video calls: $8 base + $4/min
- 50% emergency surcharge
- 25% peak hours surcharge
- Complete system settings

---

## 🎉 NEXT STEPS AFTER DATABASE COMPLETION

1. **Test the schema** - Verify all tables and relationships
2. **Update backend APIs** - Connect to new emergency call tables
3. **Test frontend components** - Ensure UI works with new database
4. **Configure pricing** - Adjust rates in admin dashboard
5. **Set up WebRTC** - Configure ICE servers for calls
6. **Enable AI monitoring** - Connect AI services to monitoring table

---

## 📞 SUPPORT

If you encounter any issues during execution:

1. **Check the error message carefully**
2. **Verify you executed previous steps successfully**
3. **Ensure you have admin/service role permissions**
4. **Try executing one table at a time if needed**

**Remember:** Each script includes verification queries to confirm successful execution! 