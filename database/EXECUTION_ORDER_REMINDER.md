# 🚨 CRITICAL: DATABASE MIGRATION EXECUTION ORDER

## ⚠️ **STOP! READ THIS FIRST**

**You are getting errors because you're running the scripts in the wrong order!**

## ✅ **CORRECT ORDER:**

### 1. **FIRST** - Drop Old Tables
```bash
# This MUST be run first - removes old tables with incorrect structure
psql -h your-db-host -U your-user -d your-database -f database/drop-old-tables.sql
```

### 2. **SECOND** - Create New Schema Tables
```bash
# This creates all new tables with correct structure
psql -h your-db-host -U your-user -d your-database -f database/new-refactored-schema.sql
```

### 3. **THIRD** - Debug Table Structure (if needed)
```bash
# Only if you get column errors - check what tables exist
psql -h your-db-host -U your-user -d your-database -f database/debug-table-structure.sql
```

### 4. **FOURTH** - Run Migration Script
```bash
# This migrates data from old to new tables
psql -h your-db-host -U your-user -d your-database -f database/safe-migration-script.sql
```

## 🔥 **COMMON ERRORS:**

❌ **"Table providers not found"** = You skipped Step 1 or 2  
❌ **"Column secret_category does not exist"** = Old table exists, you skipped Step 1  
❌ **"Column setting_category does not exist"** = Old translation_settings table exists, you skipped Step 1  
❌ **"violates check constraint secret_category_check"** = CHECK constraint missing categories (communication, system), need to recreate schema  
❌ **"violates check constraint providers_health_status_check"** = CHECK constraint missing health statuses (success, failed, untested), need to recreate schema  
❌ **"structure of query does not match function result type"** = Function return type mismatch (VARCHAR vs TEXT), now fixed in migration script  
❌ **"syntax error at or near \"** = You're using psql commands in wrong client

## 🛠️ **SOLUTION:**

1. **Run Step 1 first** - This drops old tables with wrong structure
2. **Then run Step 2** - This creates all tables with correct structure
3. **Then run Step 4** - This migrates the data
4. **Skip Step 3** unless you have problems

## 💡 **Remember:**
- The **drop-old-tables.sql** removes old tables with wrong structure
- The **new-refactored-schema.sql** creates the tables with correct structure
- The **safe-migration-script.sql** moves data into those tables
- **Order matters!** Old tables must be dropped before new ones can be created properly 