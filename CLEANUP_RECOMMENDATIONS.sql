-- ============================================================
-- DATABASE CLEANUP RECOMMENDATIONS
-- Identifies tables that might need cleanup or removal
-- ============================================================

DO $$
DECLARE
    cleanup_rec RECORD;
    cleanup_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🧹 DATABASE CLEANUP ANALYSIS';
    RAISE NOTICE '════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- ============================================================
    -- POTENTIALLY PROBLEMATIC TABLES
    -- ============================================================
    
    RAISE NOTICE '🔍 CHECKING FOR POTENTIALLY PROBLEMATIC TABLES...';
    RAISE NOTICE '';
    
    -- Look for tables with suspicious patterns
    FOR cleanup_rec IN (
        SELECT 
            table_name,
            (SELECT COUNT(*) FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = t.table_name) as column_count,
            pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size,
            (xpath('/row/c/text()', query_to_xml(format('SELECT COUNT(*) as c FROM %I', table_name), false, true, '')))[1]::text::int AS row_count
        FROM information_schema.tables t
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND (
            -- Tables with very few columns (might be incomplete)
            (SELECT COUNT(*) FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = t.table_name) <= 2
            OR
            -- Tables with duplicate/test names
            table_name LIKE '%_test%' 
            OR table_name LIKE '%_temp%' 
            OR table_name LIKE '%_backup%'
            OR table_name LIKE '%_old%'
            OR table_name LIKE '%_copy%'
            OR
            -- Tables that might be duplicates (ending with numbers)
            table_name ~ '.*_[0-9]+$'
        )
        ORDER BY table_name
    )
    LOOP
        cleanup_count := cleanup_count + 1;
        RAISE NOTICE '⚠️ SUSPICIOUS TABLE: %', cleanup_rec.table_name;
        RAISE NOTICE '   📊 Columns: % | Rows: % | Size: %', 
            cleanup_rec.column_count, cleanup_rec.row_count, cleanup_rec.size;
        
        -- Specific recommendations
        IF cleanup_rec.column_count <= 2 THEN
            RAISE NOTICE '   💡 RECOMMENDATION: Very few columns - might be incomplete table';
        END IF;
        
        IF cleanup_rec.table_name LIKE '%_test%' OR 
           cleanup_rec.table_name LIKE '%_temp%' OR
           cleanup_rec.table_name LIKE '%_backup%' OR
           cleanup_rec.table_name LIKE '%_old%' OR
           cleanup_rec.table_name LIKE '%_copy%' THEN
            RAISE NOTICE '   💡 RECOMMENDATION: Appears to be temporary/test table - consider removal';
            RAISE NOTICE '   🗑️ SUGGESTED ACTION: DROP TABLE % CASCADE;', cleanup_rec.table_name;
        END IF;
        
        IF cleanup_rec.table_name ~ '.*_[0-9]+$' THEN
            RAISE NOTICE '   💡 RECOMMENDATION: Might be duplicate table - verify if needed';
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
    
    -- ============================================================
    -- EMPTY TABLES CHECK
    -- ============================================================
    
    RAISE NOTICE '🔍 CHECKING FOR EMPTY TABLES...';
    RAISE NOTICE '';
    
    FOR cleanup_rec IN (
        SELECT 
            table_name,
            pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
        FROM information_schema.tables t
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND (xpath('/row/c/text()', query_to_xml(format('SELECT COUNT(*) as c FROM %I', table_name), false, true, '')))[1]::text::int = 0
        ORDER BY table_name
    )
    LOOP
        RAISE NOTICE 'ℹ️ EMPTY TABLE: % (Size: %)', cleanup_rec.table_name, cleanup_rec.size;
        RAISE NOTICE '   💡 This is normal for new tables, but verify it should exist';
        RAISE NOTICE '';
    END LOOP;
    
    -- ============================================================
    -- TABLES WITHOUT PROPER STRUCTURE
    -- ============================================================
    
    RAISE NOTICE '🔍 CHECKING FOR TABLES WITHOUT PROPER STRUCTURE...';
    RAISE NOTICE '';
    
    FOR cleanup_rec IN (
        SELECT table_name
        FROM information_schema.tables t
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = t.table_name 
            AND column_name = 'id'
        )
        ORDER BY table_name
    )
    LOOP
        RAISE NOTICE '⚠️ NO PRIMARY KEY: %', cleanup_rec.table_name;
        RAISE NOTICE '   💡 RECOMMENDATION: Table lacks id column - might need restructuring';
        RAISE NOTICE '';
    END LOOP;
    
    -- ============================================================
    -- TABLES WITHOUT RLS
    -- ============================================================
    
    RAISE NOTICE '🔍 CHECKING FOR TABLES WITHOUT ROW LEVEL SECURITY...';
    RAISE NOTICE '';
    
    FOR cleanup_rec IN (
        SELECT tablename
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND NOT rowsecurity
        ORDER BY tablename
    )
    LOOP
        RAISE NOTICE '🔒 NO RLS: %', cleanup_rec.tablename;
        RAISE NOTICE '   💡 RECOMMENDATION: Consider enabling RLS for security';
        RAISE NOTICE '   🔧 SUGGESTED ACTION: ALTER TABLE % ENABLE ROW LEVEL SECURITY;', cleanup_rec.tablename;
        RAISE NOTICE '';
    END LOOP;
    
    -- ============================================================
    -- FINAL RECOMMENDATIONS
    -- ============================================================
    
    RAISE NOTICE '🎯 CLEANUP SUMMARY & RECOMMENDATIONS';
    RAISE NOTICE '════════════════════════════════════════════════';
    
    IF cleanup_count = 0 THEN
        RAISE NOTICE '✅ No obvious cleanup needed - database looks clean!';
    ELSE
        RAISE NOTICE '⚠️ Found % potentially problematic tables', cleanup_count;
        RAISE NOTICE '';
        RAISE NOTICE '📋 RECOMMENDED ACTIONS:';
        RAISE NOTICE '1. Review tables marked as "SUSPICIOUS" above';
        RAISE NOTICE '2. Drop any confirmed test/temporary tables';
        RAISE NOTICE '3. Enable RLS on tables that need security';
        RAISE NOTICE '4. Add proper primary keys to tables missing them';
        RAISE NOTICE '5. Verify empty tables are intentional';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ CAUTION: Always backup before dropping tables!';
    RAISE NOTICE '🔍 Use COMPLETE_DATABASE_AUDIT.sql for full analysis';
    RAISE NOTICE '';
    
END $$; 