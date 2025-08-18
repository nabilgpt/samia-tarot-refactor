# SAMIA TAROT - System Secrets & Bilingual Settings Migration Guide

## ⚠️ CRITICAL EXECUTION ORDER

**NEVER run the migration script before creating the new schema!**

## 📋 Pre-Migration Checklist

1. ✅ **Backup completed** (using `run-backup.js` script)
2. ✅ **Backend server running** on port 5001
3. ✅ **Database accessible** and authenticated
4. ✅ **Super admin access** confirmed

## 🔄 Step-by-Step Execution

### Step 1: Validate Schema Syntax (Optional but Recommended)
```bash
# Run this FIRST - Check for SQL syntax errors
psql -h your-db-host -U your-user -d your-database -f database/validate-schema-syntax.sql
```

### Step 2: Create New Schema Tables
```bash
# Run this SECOND - Creates all new tables
psql -h your-db-host -U your-user -d your-database -f database/new-refactored-schema.sql
```

### Step 3: Debug Table Structure (If You Get Column Errors)
```bash
# Run this if you get "column does not exist" errors
psql -h your-db-host -U your-user -d your-database -f database/debug-table-structure.sql
```

### Step 4: Test Schema Creation (Optional but Recommended)
```bash
# Run this FOURTH - Verify tables were created correctly
psql -h your-db-host -U your-user -d your-database -f database/test-schema-creation.sql
```

### Step 5: Run Migration Script
```bash
# Run this LAST - Migrates data from old to new tables
psql -h your-db-host -U your-user -d your-database -f database/safe-migration-script.sql
```

## 🛠️ Alternative Execution (Programmatic)

```javascript
// For Node.js/Supabase execution
const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    try {
        // Step 1: Create schema
        console.log('Creating new schema...');
        const schemaSQL = fs.readFileSync('database/new-refactored-schema.sql', 'utf8');
        await supabase.rpc('exec_sql', { sql: schemaSQL });
        
        // Step 2: Run migration
        console.log('Running migration...');
        const migrationSQL = fs.readFileSync('database/safe-migration-script.sql', 'utf8');
        await supabase.rpc('exec_sql', { sql: migrationSQL });
        
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}
```

## 🔍 Common Errors & Solutions

### Error 1: "type 'idx_provider_usage_provider_id' does not exist"
**Cause**: Inline INDEX definitions in CREATE TABLE  
**Solution**: ✅ Fixed in `new-refactored-schema.sql`

### Error 2: "type 'idx_health_checks_target' does not exist"
**Cause**: Inline INDEX definitions in system_health_checks table  
**Solution**: ✅ Fixed in `new-refactored-schema.sql`

### Error 3: "type 'idx_audit_log_action_type' does not exist"
**Cause**: Inline INDEX definitions in system_audit_log table  
**Solution**: ✅ Fixed in `new-refactored-schema.sql`

### Error 3: "column 'secret_key' does not exist"
**Cause**: Migration script running before schema creation  
**Solution**: Always run schema creation first (Step 2)

### Error 4: "column 'secret_category' does not exist"
**Cause**: Table structure mismatch - old table or incomplete schema creation  
**Solution**: Run `database/debug-table-structure.sql` (Step 3) to check table structure, then re-run `new-refactored-schema.sql`

### Error 5: "table 'system_secrets' does not exist"
**Cause**: Wrong execution order  
**Solution**: Run `new-refactored-schema.sql` before `safe-migration-script.sql`

### Error 5: General SQL syntax errors
**Cause**: Various SQL syntax issues  
**Solution**: Run `validate-schema-syntax.sql` first (Step 1)

## 📊 Verification Steps

After migration, verify success:

```sql
-- Check table creation
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('system_secrets', 'providers', 'translation_settings');

-- Check data migration
SELECT COUNT(*) FROM system_secrets;
SELECT COUNT(*) FROM providers;
SELECT COUNT(*) FROM translation_settings;

-- Check migration log
SELECT * FROM migration_log ORDER BY created_at DESC;
```

## 🚨 Rollback Plan

If migration fails:

1. **Restore from backup** (created in pre-migration step)
2. **Drop new tables** (if partially created)
3. **Investigate error** before retrying
4. **Contact support** if issues persist

## 🎯 Success Indicators

Migration is successful when:
- ✅ All new tables created
- ✅ Data migrated from old tables
- ✅ No errors in migration log
- ✅ System Secrets tab loads correctly
- ✅ Bilingual Settings tab loads correctly

## 📞 Support

If you encounter issues:
1. Check error logs in `migration_log` table
2. Verify table existence with test script
3. Ensure proper execution order
4. Contact development team with specific error messages

---

**Remember: Schema creation MUST come before migration!** 