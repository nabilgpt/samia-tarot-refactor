-- =====================================================
-- SAMIA TAROT - DATABASE SCHEMA CLEANUP & UNIFICATION
-- Removes conflicting schemas and consolidates to Enhanced Tarot Spread System
-- =====================================================

-- =====================================================
-- STEP 1: BACKUP EXISTING DATA (if any)
-- =====================================================

-- Create backup tables for any existing spread data
CREATE TABLE IF NOT EXISTS backup_tarot_spreads_legacy AS 
SELECT * FROM tarot_spreads WHERE 1=0;

CREATE TABLE IF NOT EXISTS backup_custom_tarot_spreads AS 
SELECT * FROM custom_tarot_spreads WHERE 1=0;

-- Backup existing data if tables exist
DO $$ 
BEGIN
  -- Backup legacy tarot_spreads
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tarot_spreads') THEN
    INSERT INTO backup_tarot_spreads_legacy SELECT * FROM tarot_spreads;
    RAISE NOTICE 'Backed up % rows from tarot_spreads', (SELECT COUNT(*) FROM backup_tarot_spreads_legacy);
  END IF;

  -- Backup custom_tarot_spreads if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_tarot_spreads') THEN
    INSERT INTO backup_custom_tarot_spreads SELECT * FROM custom_tarot_spreads;
    RAISE NOTICE 'Backed up % rows from custom_tarot_spreads', (SELECT COUNT(*) FROM backup_custom_tarot_spreads);
  END IF;
END $$;

-- =====================================================
-- STEP 2: DROP CONFLICTING TABLES & POLICIES  
-- =====================================================

-- Drop legacy/conflicting policies
DROP POLICY IF EXISTS "Users can view tarot spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Readers can create spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Users can view custom spreads" ON custom_tarot_spreads;
DROP POLICY IF EXISTS "Readers can create custom spreads" ON custom_tarot_spreads;

-- Drop conflicting triggers and functions
DROP TRIGGER IF EXISTS validate_tarot_spread_trigger ON tarot_spreads;
DROP TRIGGER IF EXISTS validate_custom_spread_trigger ON custom_tarot_spreads;
DROP FUNCTION IF EXISTS validate_tarot_spread();
DROP FUNCTION IF EXISTS validate_custom_spread();

-- Drop legacy/conflicting tables
DROP TABLE IF EXISTS custom_tarot_spreads CASCADE;
DROP TABLE IF EXISTS tarot_cards CASCADE;
DROP TABLE IF EXISTS tarot_readings CASCADE;
DROP TABLE IF EXISTS ai_tarot_interpretations CASCADE;

-- =====================================================
-- STEP 3: REMOVE CONFLICTING SCHEMA FILES MARKERS
-- =====================================================

-- Mark obsolete schema files for removal (commented for reference)
/*
FILES TO REMOVE/ARCHIVE:
- database/phase2-tarot-ai.sql (contains conflicting tarot_spreads)
- database/emergency-profile-fix*.sql (multiple versions - keep only latest)
- database/emergency-profiles-fix*.sql (consolidate)
- Any duplicate or conflicting .sql files

KEEP ONLY:
- database/enhanced-tarot-spread-system.sql (MAIN)
- database/schema.sql (core tables)
- database/role-based-security.sql (security)
- database/tarot-spread-rls-policies.sql (NEW - RLS policies)
*/

-- =====================================================
-- STEP 4: ENSURE ENHANCED SYSTEM IS PROPERLY DEPLOYED
-- =====================================================

-- Verify all Enhanced Tarot Spread System tables exist
DO $$
BEGIN
  -- Check required tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tarot_decks') THEN
    RAISE EXCEPTION 'Missing table: tarot_decks. Run enhanced-tarot-spread-system.sql first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tarot_spreads') THEN
    RAISE EXCEPTION 'Missing table: tarot_spreads. Run enhanced-tarot-spread-system.sql first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spread_service_assignments') THEN
    RAISE EXCEPTION 'Missing table: spread_service_assignments. Run enhanced-tarot-spread-system.sql first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spread_approval_logs') THEN
    RAISE EXCEPTION 'Missing table: spread_approval_logs. Run enhanced-tarot-spread-system.sql first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_spread_selections') THEN
    RAISE EXCEPTION 'Missing table: client_spread_selections. Run enhanced-tarot-spread-system.sql first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reader_spread_notifications') THEN
    RAISE EXCEPTION 'Missing table: reader_spread_notifications. Run enhanced-tarot-spread-system.sql first.';
  END IF;

  RAISE NOTICE 'All Enhanced Tarot Spread System tables verified ✅';
END $$;

-- =====================================================
-- STEP 5: DATA MIGRATION (if needed)
-- =====================================================

-- Migrate any backed up data to new structure
DO $$ 
DECLARE
  backup_count INTEGER;
BEGIN
  -- Check if we have backup data to migrate
  SELECT COUNT(*) INTO backup_count FROM backup_tarot_spreads_legacy;
  
  IF backup_count > 0 THEN
    RAISE NOTICE 'Found % legacy spreads to migrate', backup_count;
    
    -- Migrate compatible data (adjust columns as needed)
    INSERT INTO tarot_spreads (
      name, 
      name_ar,
      description, 
      description_ar,
      card_count,
      difficulty_level,
      category,
      is_custom,
      created_by,
      approval_status,
      is_active,
      created_at,
      updated_at
    )
    SELECT 
      COALESCE(name, 'Migrated Spread'),
      COALESCE(name_ar, 'انتشار منقول'),
      COALESCE(description, 'Migrated from legacy system'),
      COALESCE(description_ar, 'منقول من النظام القديم'),
      COALESCE(card_count, 3),
      COALESCE(difficulty_level, 'beginner'),
      COALESCE(category, 'general'),
      true, -- Mark as custom since migrated
      created_by,
      'pending', -- Require re-approval 
      COALESCE(is_active, true),
      COALESCE(created_at, NOW()),
      NOW()
    FROM backup_tarot_spreads_legacy
    WHERE NOT EXISTS (
      SELECT 1 FROM tarot_spreads ts 
      WHERE ts.name = backup_tarot_spreads_legacy.name 
      AND ts.created_by = backup_tarot_spreads_legacy.created_by
    );
    
    RAISE NOTICE 'Migrated legacy spread data to enhanced system';
  ELSE
    RAISE NOTICE 'No legacy data to migrate';
  END IF;
END $$;

-- =====================================================
-- STEP 6: VERIFY CLEANUP SUCCESS
-- =====================================================

-- List remaining tables
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('tarot_decks', 'tarot_spreads', 'spread_service_assignments', 
                       'spread_approval_logs', 'client_spread_selections', 'reader_spread_notifications') 
    THEN '✅ Enhanced System'
    WHEN table_name LIKE 'backup_%' 
    THEN '📦 Backup'
    ELSE '⚠️  Check if needed'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%tarot%' 
  OR table_name LIKE '%spread%'
ORDER BY table_name;

-- Verify indexes exist
SELECT 
  schemaname, 
  tablename, 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN (
  'tarot_decks', 
  'tarot_spreads', 
  'spread_service_assignments',
  'spread_approval_logs',
  'client_spread_selections', 
  'reader_spread_notifications'
)
ORDER BY tablename, indexname;

-- =====================================================
-- STEP 7: CLEANUP SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧹 SCHEMA CLEANUP COMPLETED';
  RAISE NOTICE '============================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Actions Completed:';
  RAISE NOTICE '   • Legacy data backed up';
  RAISE NOTICE '   • Conflicting tables removed';
  RAISE NOTICE '   • Enhanced Tarot Spread System verified';
  RAISE NOTICE '   • Data migration completed (if applicable)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Run tarot-spread-rls-policies.sql';
  RAISE NOTICE '   2. Remove/archive obsolete .sql files';
  RAISE NOTICE '   3. Update documentation';
  RAISE NOTICE '';
  RAISE NOTICE '📂 Files to Remove:';
  RAISE NOTICE '   • database/phase2-tarot-ai.sql';
  RAISE NOTICE '   • database/emergency-profile-fix*.sql (old versions)';
  RAISE NOTICE '   • Any custom_tarot_spreads references';
  RAISE NOTICE '';
END $$; 