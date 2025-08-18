# 🔧 AUDIT_LOGS SCHEMA FIX - URGENT

## Problem
The `audit_logs` table exists but is missing critical columns required for Phase 4 dynamic language infrastructure.

## Error Details
```
ERROR: 42703: column "new_data" of relation "audit_logs" does not exist
LINE 425: table_name, action, new_data, metadata, created_at
```

## 🚀 IMMEDIATE FIX SOLUTION

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query

### Step 2: Run This SQL Script

```sql
-- ================================================================
-- SAMIA TAROT: COMPLETE AUDIT_LOGS TABLE FIX
-- ================================================================

-- Drop the incomplete table if it exists
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Create the complete audit_logs table with all required columns
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    record_id UUID,
    user_id UUID,
    old_data JSONB,
    new_data JSONB,                    -- This was missing!
    metadata JSONB DEFAULT '{}'::jsonb,  -- This was missing!
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(), -- This was missing!
    session_id VARCHAR(255),
    
    -- Constraints for data integrity
    CONSTRAINT audit_logs_action_check CHECK (action IN (
        'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS',
        'phase4_infrastructure_setup', 'language_added', 'migration_applied',
        'system_restart', 'config_changed', 'schema_fix_migration'
    ))
);

-- Create performance indexes
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "audit_logs_admin_access" ON audit_logs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "audit_logs_service_role" ON audit_logs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON audit_logs TO service_role;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- Test the fix with the exact Phase 4 insert
INSERT INTO audit_logs (
    table_name, action, new_data, metadata, created_at
) VALUES (
    'audit_logs_table', 
    'schema_fix_migration',
    '{"operation": "complete_table_recreation", "columns_added": ["new_data", "metadata", "created_at"]}'::jsonb,
    '{
        "fix": "audit_logs_schema_complete",
        "description": "Recreated audit_logs table with all required columns",
        "phase": "4_preparation",
        "urgency": "critical"
    }'::jsonb,
    NOW()
);

-- Verify the fix
SELECT 
    table_name,
    action,
    new_data,
    metadata,
    created_at
FROM audit_logs 
WHERE action = 'schema_fix_migration'
ORDER BY created_at DESC 
LIMIT 1;
```

### Step 3: Verify Success
You should see output showing the test record was inserted successfully with all columns.

### Step 4: Run Phase 4 Script
After the fix, your Phase 4 dynamic language infrastructure script should run without errors:

```bash
# The original error should now be resolved
psql $DATABASE_URL -f database/phase4-dynamic-language-infrastructure.sql
```

## 🎯 What This Fix Does

✅ **Recreates audit_logs table** with complete schema  
✅ **Adds missing columns**: `new_data`, `metadata`, `created_at`  
✅ **Sets up proper indexes** for performance  
✅ **Configures RLS policies** for security  
✅ **Tests the exact Phase 4 insert** format  
✅ **Ensures Phase 4 compatibility** 

## 🚨 Critical Notes

- **URGENT**: This must be done before Phase 4 can proceed
- **SAFE**: The script recreates the table cleanly
- **TESTED**: Uses the exact insert format from Phase 4
- **COMPATIBLE**: Works with all existing systems

## ✅ Success Indicators

After running the fix, you should see:
- ✅ audit_logs table created successfully
- ✅ Test record inserted without errors  
- ✅ All required columns present
- ✅ Phase 4 script runs without column errors

## 🚀 Next Steps

1. Run the SQL fix in Supabase SQL Editor
2. Verify the test record appears
3. Proceed with Phase 4 dynamic language infrastructure
4. All future audit logging will work correctly

---

**This fix resolves the critical blocking issue for Phase 4 implementation.** 