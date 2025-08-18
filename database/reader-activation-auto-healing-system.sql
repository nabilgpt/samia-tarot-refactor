-- ============================================================================
-- SAMIA TAROT - READER ACTIVATION & AUTO-HEALING SYSTEM
-- Ensures all readers are always set to is_active=true and never blocked
-- by wrong activation flags unless explicitly banned by admin
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 1: ENSURE ACTIVATION COLUMNS EXIST WITH PROPER DEFAULTS
-- ============================================================================

DO $$
BEGIN
    -- Add is_active column if it doesn't exist with proper default
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
        RAISE NOTICE '✅ Added is_active column to profiles table with default true';
    ELSE
        -- Ensure default is true for existing column
        ALTER TABLE profiles ALTER COLUMN is_active SET DEFAULT true;
        RAISE NOTICE '✅ Updated is_active column default to true';
    END IF;
    
    -- Add deactivated column if it doesn't exist with proper default
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deactivated') THEN
        ALTER TABLE profiles ADD COLUMN deactivated BOOLEAN DEFAULT false NOT NULL;
        RAISE NOTICE '✅ Added deactivated column to profiles table with default false';
    ELSE
        -- Ensure default is false for existing column
        ALTER TABLE profiles ALTER COLUMN deactivated SET DEFAULT false;
        RAISE NOTICE '✅ Updated deactivated column default to false';
    END IF;
    
    -- Add banned_by_admin column for explicit admin bans
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'banned_by_admin') THEN
        ALTER TABLE profiles ADD COLUMN banned_by_admin BOOLEAN DEFAULT false NOT NULL;
        RAISE NOTICE '✅ Added banned_by_admin column to profiles table';
    END IF;
    
    -- Add banned_reason column for admin ban reasons
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'banned_reason') THEN
        ALTER TABLE profiles ADD COLUMN banned_reason TEXT;
        RAISE NOTICE '✅ Added banned_reason column to profiles table';
    END IF;
    
    -- Add banned_at timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'banned_at') THEN
        ALTER TABLE profiles ADD COLUMN banned_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added banned_at column to profiles table';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: AUTO-HEAL ALL EXISTING READERS TO PROPER ACTIVATION STATE
-- ============================================================================

DO $$
DECLARE
    healed_count INTEGER := 0;
    reader_record RECORD;
BEGIN
    RAISE NOTICE '🔄 Starting reader activation auto-healing process...';
    
    -- Auto-heal all readers to be properly activated (unless explicitly banned)
    FOR reader_record IN 
        SELECT id, email, display_name, role, is_active, deactivated, banned_by_admin
        FROM profiles 
        WHERE role IN ('reader', 'admin', 'super_admin')
    LOOP
        -- Only heal if not explicitly banned by admin
        IF NOT COALESCE(reader_record.banned_by_admin, false) THEN
            -- Check if healing is needed
            IF NOT COALESCE(reader_record.is_active, false) OR COALESCE(reader_record.deactivated, false) THEN
                UPDATE profiles 
                SET 
                    is_active = true,
                    deactivated = false,
                    updated_at = NOW()
                WHERE id = reader_record.id;
                
                healed_count := healed_count + 1;
                RAISE NOTICE '✅ Auto-healed reader: % (%) - set to active', 
                            COALESCE(reader_record.display_name, reader_record.email), 
                            reader_record.role;
            END IF;
        ELSE
            RAISE NOTICE '⚠️ Skipped banned reader: % (banned by admin)', 
                        COALESCE(reader_record.display_name, reader_record.email);
        END IF;
    END LOOP;
    
    RAISE NOTICE '📊 Auto-healing completed: % readers healed', healed_count;
END $$;

-- ============================================================================
-- STEP 3: CREATE AUTO-HEALING TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_heal_reader_activation()
RETURNS TRIGGER AS $$
DECLARE
    has_deactivated_column BOOLEAN;
BEGIN
    -- Check if deactivated column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'deactivated'
    ) INTO has_deactivated_column;
    
    -- Auto-heal new readers on INSERT
    IF TG_OP = 'INSERT' THEN
        -- Ensure all new readers are properly activated unless explicitly banned
        IF NEW.role IN ('reader', 'admin', 'super_admin') AND NOT COALESCE(NEW.banned_by_admin, false) THEN
            NEW.is_active := true;
            IF has_deactivated_column THEN
                NEW.deactivated := false;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Auto-heal existing readers on UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- If someone tries to deactivate a reader without explicit admin ban, auto-heal it
        IF NEW.role IN ('reader', 'admin', 'super_admin') AND NOT COALESCE(NEW.banned_by_admin, false) THEN
            -- Force activation unless it's an explicit admin ban
            IF NOT NEW.is_active OR (has_deactivated_column AND COALESCE(NEW.deactivated, false)) THEN
                NEW.is_active := true;
                IF has_deactivated_column THEN
                    NEW.deactivated := false;
                END IF;
                
                -- Log the auto-healing
                RAISE NOTICE '🔧 Auto-healed reader activation: % (%) - forced to active', 
                            COALESCE(NEW.display_name::TEXT, NEW.email), 
                            NEW.role;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_heal_reader_activation_trigger ON profiles;

-- Create the auto-healing trigger
CREATE TRIGGER auto_heal_reader_activation_trigger
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_heal_reader_activation();

-- Log trigger creation
DO $$
BEGIN
    RAISE NOTICE '✅ Created auto-healing trigger for reader activation';
END $$;

-- ============================================================================
-- STEP 4: CREATE READER SYNC & AUTO-FIX FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_and_fix_reader_activation()
RETURNS TABLE(
    action TEXT,
    reader_id UUID,
    reader_email TEXT,
    reader_name TEXT,
    old_status TEXT,
    new_status TEXT,
    message TEXT
) AS $$
DECLARE
    reader_record RECORD;
    fix_count INTEGER := 0;
BEGIN
    -- Return header
    RETURN QUERY SELECT 
        'SYNC_START'::TEXT, 
        NULL::UUID, 
        NULL::TEXT, 
        NULL::TEXT, 
        NULL::TEXT, 
        NULL::TEXT, 
        'Starting reader activation sync and auto-fix process'::TEXT;
    
    -- Loop through all readers and fix activation issues
    FOR reader_record IN 
        SELECT 
            id, 
            email, 
            display_name, 
            role, 
            is_active, 
            COALESCE(deactivated, false) as deactivated,
            COALESCE(banned_by_admin, false) as banned_by_admin
        FROM profiles 
        WHERE role IN ('reader', 'admin', 'super_admin')
        ORDER BY created_at
    LOOP
        DECLARE
            old_status_text TEXT;
            new_status_text TEXT;
            needs_fix BOOLEAN := false;
        BEGIN
            -- Determine old status
            old_status_text := CASE 
                WHEN reader_record.banned_by_admin THEN 'BANNED'
                WHEN COALESCE(reader_record.is_active, false) AND NOT reader_record.deactivated THEN 'ACTIVE'
                ELSE 'INACTIVE'
            END;
            
            -- Check if reader needs fixing (not banned but inactive)
            IF NOT reader_record.banned_by_admin THEN
                IF NOT COALESCE(reader_record.is_active, false) OR reader_record.deactivated THEN
                    needs_fix := true;
                END IF;
            END IF;
            
            -- Apply fix if needed
            IF needs_fix THEN
                UPDATE profiles 
                SET 
                    is_active = true,
                    updated_at = NOW()
                WHERE id = reader_record.id;
                
                -- Also update deactivated column if it exists
                UPDATE profiles 
                SET deactivated = false
                WHERE id = reader_record.id 
                AND EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'profiles' AND column_name = 'deactivated'
                );
                
                new_status_text := 'ACTIVE';
                fix_count := fix_count + 1;
                
                RETURN QUERY SELECT 
                    'FIXED'::TEXT,
                    reader_record.id,
                    reader_record.email,
                    COALESCE(reader_record.display_name::TEXT, reader_record.email),
                    old_status_text,
                    new_status_text,
                    'Auto-fixed reader activation status'::TEXT;
            ELSE
                new_status_text := old_status_text;
                
                RETURN QUERY SELECT 
                    'OK'::TEXT,
                    reader_record.id,
                    reader_record.email,
                    COALESCE(reader_record.display_name::TEXT, reader_record.email),
                    old_status_text,
                    new_status_text,
                    'Reader status is correct'::TEXT;
            END IF;
        END;
    END LOOP;
    
    -- Return summary
    RETURN QUERY SELECT 
        'SYNC_COMPLETE'::TEXT, 
        NULL::UUID, 
        NULL::TEXT, 
        NULL::TEXT, 
        NULL::TEXT, 
        NULL::TEXT, 
        format('Sync completed: %s readers auto-fixed', fix_count)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: CREATE PERIODIC AUTO-FIX JOB FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION run_reader_activation_maintenance()
RETURNS TEXT AS $$
DECLARE
    fix_count INTEGER := 0;
    total_readers INTEGER := 0;
    result_message TEXT;
BEGIN
    -- Count total readers
    SELECT COUNT(*) INTO total_readers 
    FROM profiles 
    WHERE role IN ('reader', 'admin', 'super_admin');
    
    -- Fix any incorrectly deactivated readers (unless banned)
    UPDATE profiles 
    SET 
        is_active = true,
        updated_at = NOW()
    WHERE 
        role IN ('reader', 'admin', 'super_admin')
        AND NOT COALESCE(banned_by_admin, false)
        AND NOT COALESCE(is_active, false);
    
    GET DIAGNOSTICS fix_count = ROW_COUNT;
    
    -- Also fix deactivated column if it exists
    UPDATE profiles 
    SET deactivated = false
    WHERE role IN ('reader', 'admin', 'super_admin')
    AND NOT COALESCE(banned_by_admin, false)
    AND COALESCE(deactivated, false) = true
    AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'deactivated'
    );
    
    result_message := format(
        'Reader activation maintenance completed at %s. Total readers: %s, Fixed: %s',
        NOW()::TEXT,
        total_readers,
        fix_count
    );
    
    -- Log the maintenance run
    RAISE NOTICE '%', result_message;
    
    RETURN result_message;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: UPDATE READER CREATION DEFAULTS
-- ============================================================================

-- Ensure all future reader insertions have correct defaults
ALTER TABLE profiles 
    ALTER COLUMN is_active SET DEFAULT true,
    ALTER COLUMN banned_by_admin SET DEFAULT false;

-- Set deactivated column default if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deactivated') THEN
        ALTER TABLE profiles ALTER COLUMN deactivated SET DEFAULT false;
        RAISE NOTICE '✅ Set deactivated column default to false';
    END IF;
END $$;

-- ============================================================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create index for reader activation (handle missing deactivated column)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deactivated') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_reader_activation 
        ON profiles(role, is_active, deactivated) 
        WHERE role IN ('reader', 'admin', 'super_admin');
        RAISE NOTICE '✅ Created reader activation index with deactivated column';
    ELSE
        CREATE INDEX IF NOT EXISTS idx_profiles_reader_activation 
        ON profiles(role, is_active) 
        WHERE role IN ('reader', 'admin', 'super_admin');
        RAISE NOTICE '✅ Created reader activation index without deactivated column';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_banned_readers 
ON profiles(banned_by_admin, banned_at) 
WHERE banned_by_admin = true;

-- ============================================================================
-- STEP 8: RUN INITIAL SYNC AND AUTO-FIX
-- ============================================================================

DO $$
DECLARE
    sync_result RECORD;
    total_fixed INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 Running initial reader activation sync...';
    
    -- Run the sync function and display results
    FOR sync_result IN SELECT * FROM sync_and_fix_reader_activation()
    LOOP
        IF sync_result.action = 'FIXED' THEN
            total_fixed := total_fixed + 1;
            RAISE NOTICE '🔧 FIXED: % (%) - % → %', 
                        sync_result.reader_name, 
                        sync_result.reader_email,
                        sync_result.old_status,
                        sync_result.new_status;
        ELSIF sync_result.action IN ('SYNC_START', 'SYNC_COMPLETE') THEN
            RAISE NOTICE 'ℹ️ %', sync_result.message;
        END IF;
    END LOOP;
    
    RAISE NOTICE '📊 Initial sync summary: % readers auto-fixed', total_fixed;
END $$;

-- ============================================================================
-- STEP 9: FINAL VERIFICATION AND REPORT
-- ============================================================================

DO $$
DECLARE
    total_readers INTEGER;
    active_readers INTEGER;
    inactive_readers INTEGER;
    banned_readers INTEGER;
    services_without_readers INTEGER;
BEGIN
    -- Get reader counts
    SELECT COUNT(*) INTO total_readers 
    FROM profiles 
    WHERE role IN ('reader', 'admin', 'super_admin');
    
    -- Count active readers (handle missing deactivated column)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deactivated') THEN
        SELECT COUNT(*) INTO active_readers 
        FROM profiles 
        WHERE role IN ('reader', 'admin', 'super_admin') 
        AND is_active = true 
        AND NOT COALESCE(deactivated, false)
        AND NOT COALESCE(banned_by_admin, false);
        
        SELECT COUNT(*) INTO inactive_readers 
        FROM profiles 
        WHERE role IN ('reader', 'admin', 'super_admin') 
        AND (NOT COALESCE(is_active, false) OR COALESCE(deactivated, false))
        AND NOT COALESCE(banned_by_admin, false);
    ELSE
        SELECT COUNT(*) INTO active_readers 
        FROM profiles 
        WHERE role IN ('reader', 'admin', 'super_admin') 
        AND is_active = true 
        AND NOT COALESCE(banned_by_admin, false);
        
        SELECT COUNT(*) INTO inactive_readers 
        FROM profiles 
        WHERE role IN ('reader', 'admin', 'super_admin') 
        AND NOT COALESCE(is_active, false)
        AND NOT COALESCE(banned_by_admin, false);
    END IF;
    
    SELECT COUNT(*) INTO banned_readers 
    FROM profiles 
    WHERE role IN ('reader', 'admin', 'super_admin') 
    AND COALESCE(banned_by_admin, false) = true;
    
    -- Check services without readers
    SELECT COUNT(*) INTO services_without_readers 
    FROM services 
    WHERE reader_id IS NULL 
    OR reader_id NOT IN (
        SELECT id FROM profiles 
        WHERE role IN ('reader', 'admin', 'super_admin') 
        AND is_active = true
        AND NOT COALESCE(banned_by_admin, false)
    );
    
    -- Display final report
    RAISE NOTICE '=== 📊 READER ACTIVATION SYSTEM FINAL REPORT ===';
    RAISE NOTICE 'Total Readers: %', total_readers;
    RAISE NOTICE 'Active Readers: %', active_readers;
    RAISE NOTICE 'Inactive Readers (should be 0): %', inactive_readers;
    RAISE NOTICE 'Banned Readers: %', banned_readers;
    RAISE NOTICE 'Services without valid readers: %', services_without_readers;
    
    -- Success criteria
    IF inactive_readers = 0 THEN
        RAISE NOTICE '🎉 SUCCESS: All readers properly activated!';
        RAISE NOTICE '✅ Reader Activation & Auto-Healing System is fully operational';
    ELSE
        RAISE NOTICE '⚠️ WARNING: % readers still inactive (may need manual review)', inactive_readers;
    END IF;
    
    -- Final completion message
    RAISE NOTICE '✅ Reader Activation & Auto-Healing System installation completed successfully!';
    RAISE NOTICE '🔧 System will now automatically ensure all readers stay activated unless explicitly banned';
END $$; 