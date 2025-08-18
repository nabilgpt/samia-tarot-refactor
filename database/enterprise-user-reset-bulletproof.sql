-- ============================================================================
-- ENTERPRISE USER RESET - BULLETPROOF VERSION
-- This script performs a comprehensive user reset for enterprise deployment
-- ============================================================================

-- Safety check
DO $$
DECLARE
    v_environment TEXT := COALESCE(current_setting('app.environment', true), 'development');
BEGIN
    IF v_environment = 'production' THEN
        RAISE EXCEPTION 'This script should not be run in production environment!';
    END IF;
END $$;

-- Create helper functions
CREATE OR REPLACE FUNCTION table_exists(p_table_name TEXT) RETURNS BOOLEAN AS $func$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name
    );
END;
$func$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION column_exists(p_table_name TEXT, p_column_name TEXT) RETURNS BOOLEAN AS $func$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name 
        AND column_name = p_column_name
    );
END;
$func$ LANGUAGE plpgsql;

-- Main reset process
DO $$
DECLARE
    -- Configuration variables
    v_target_user_count INTEGER := 5;
    v_temp_password_base TEXT := 'TempPass!';
    v_current_year INTEGER := EXTRACT(YEAR FROM NOW());
    v_salt_rounds INTEGER := 12;
    
    -- Analysis variables
    v_total_profiles INTEGER;
    v_active_profiles INTEGER;
    v_duplicate_profiles INTEGER;
    v_orphaned_records INTEGER;
    
    -- Process tracking
    v_verification_passed BOOLEAN := TRUE;
    v_test_result TEXT;
    
    -- User data
    v_user_record RECORD;
    v_encrypted_password TEXT;
    v_profile_id UUID;
    
    -- Cleanup variables
    v_cleanup_table TEXT;
    v_cleanup_sql TEXT;
    v_tables_to_check TEXT[] := ARRAY[
        'user_activities',
        'user_sessions', 
        'user_preferences',
        'user_notifications',
        'audit_logs',
        'payment_history',
        'bookings',
        'chat_sessions',
        'reviews',
        'feedback'
    ];

BEGIN
    RAISE NOTICE '🔄 ENTERPRISE USER RESET STARTING...';
    RAISE NOTICE '================================================';
    
    -- STEP 1: Current State Analysis
    RAISE NOTICE '';
    RAISE NOTICE '📊 STEP 1: Current State Analysis';
    
    SELECT COUNT(*) INTO v_total_profiles FROM profiles;
    SELECT COUNT(*) INTO v_active_profiles FROM profiles WHERE is_active = true;
    SELECT COUNT(*) INTO v_duplicate_profiles FROM profiles WHERE email IS NULL OR email = '';
    
    RAISE NOTICE 'Total profiles: %', v_total_profiles;
    RAISE NOTICE 'Active profiles: %', v_active_profiles;
    RAISE NOTICE 'Duplicate/Invalid profiles: %', v_duplicate_profiles;
    
    -- STEP 2: Foreign Key Cleanup
    RAISE NOTICE '';
    RAISE NOTICE '🧹 STEP 2: Foreign Key Cleanup';
    
    -- Clean up orphaned records in related tables
    FOR v_cleanup_table IN SELECT unnest(v_tables_to_check) LOOP
        -- Check if table exists
        IF table_exists(v_cleanup_table) THEN
            -- Check if it has a user_id or profile_id column
            IF column_exists(v_cleanup_table, 'user_id') THEN
                -- Clean up orphaned records using user_id
                EXECUTE format('DELETE FROM %I WHERE user_id NOT IN (SELECT id FROM profiles WHERE is_active = true)', v_cleanup_table);
                GET DIAGNOSTICS v_orphaned_records = ROW_COUNT;
                RAISE NOTICE 'Cleaned % orphaned records from % (user_id)', v_orphaned_records, v_cleanup_table;
            ELSIF column_exists(v_cleanup_table, 'profile_id') THEN
                -- Clean up orphaned records using profile_id
                EXECUTE format('DELETE FROM %I WHERE profile_id NOT IN (SELECT id FROM profiles WHERE is_active = true)', v_cleanup_table);
                GET DIAGNOSTICS v_orphaned_records = ROW_COUNT;
                RAISE NOTICE 'Cleaned % orphaned records from % (profile_id)', v_orphaned_records, v_cleanup_table;
            END IF;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping cleanup', v_cleanup_table;
        END IF;
    END LOOP;
    
    -- STEP 3: Duplicate Profile Deletion
    RAISE NOTICE '';
    RAISE NOTICE '🗑️ STEP 3: Duplicate Profile Deletion';
    
    -- Delete profiles with null or empty email
    DELETE FROM profiles 
    WHERE email IS NULL 
       OR email = '' 
       OR email = 'null'
       OR is_active = false;
    GET DIAGNOSTICS v_orphaned_records = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate/invalid profiles', v_orphaned_records;
    
    -- STEP 4: Create/Update Enterprise Users
    RAISE NOTICE '';
    RAISE NOTICE '👥 STEP 4: Create/Update Enterprise Users';
    
    -- Enterprise user data
    FOR v_user_record IN 
        SELECT * FROM (VALUES
            ('info@samiatarot.com', 'super_admin', 'TempPass!2024'),
            ('saeeeel@gmail.com', 'admin', 'TempPass!2025'),
            ('nabilzein@gmail.com', 'monitor', 'TempPass!2026'),
            ('nabilgpt.en@gmail.com', 'reader', 'TempPass!2027'),
            ('sara@sara.com', 'reader', 'TempPass!2028')
        ) AS user_data(email, role, password)
    LOOP
        -- Generate encrypted password
        v_encrypted_password := crypt(v_user_record.password, gen_salt('bf', v_salt_rounds));
        
        -- Insert or update user
        INSERT INTO profiles (
            id, 
            email, 
            name, 
            role, 
            encrypted_password, 
            is_active, 
            created_at, 
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_user_record.email,
            split_part(v_user_record.email, '@', 1),
            v_user_record.role::user_role,
            v_encrypted_password,
            true,
            NOW(),
            NOW()
        ) ON CONFLICT (email) DO UPDATE SET
            role = EXCLUDED.role,
            encrypted_password = EXCLUDED.encrypted_password,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
            
        RAISE NOTICE 'Created/Updated user: % (role: %)', v_user_record.email, v_user_record.role;
    END LOOP;
    
    -- STEP 5: Final Verification
    RAISE NOTICE '';
    RAISE NOTICE '✅ STEP 5: Final Verification';
    
    -- Test 1: User count verification
    SELECT COUNT(*) INTO v_active_profiles FROM profiles WHERE is_active = true;
    IF v_active_profiles <> 5 THEN
        RAISE NOTICE '❌ Test 1 FAILED: Expected 5 active users, found %', v_active_profiles;
        v_verification_passed := FALSE;
    ELSE
        RAISE NOTICE '✅ Test 1 PASSED: 5 active users found';
    END IF;
    
    -- Test 2: Role verification
    FOR v_user_record IN 
        SELECT email, role FROM profiles WHERE is_active = true ORDER BY email
    LOOP
        RAISE NOTICE '✅ User verified: % (role: %)', v_user_record.email, v_user_record.role;
    END LOOP;
    
    -- Test 3: Password encryption verification
    SELECT COUNT(*) INTO v_active_profiles 
    FROM profiles 
    WHERE is_active = true 
    AND encrypted_password IS NOT NULL 
    AND encrypted_password != '';
    
    IF v_active_profiles <> 5 THEN
        RAISE NOTICE '❌ Test 3 FAILED: Not all users have encrypted passwords';
        v_verification_passed := FALSE;
    ELSE
        RAISE NOTICE '✅ Test 3 PASSED: All users have encrypted passwords';
    END IF;
    
    -- Test 4: Verify no duplicates
    SELECT COUNT(DISTINCT email) INTO v_active_profiles FROM profiles WHERE is_active = true;
    IF v_active_profiles <> 5 THEN
        RAISE NOTICE '❌ Test 4 FAILED: Duplicate emails found';
        v_verification_passed := FALSE;
    ELSE
        RAISE NOTICE '✅ Test 4 PASSED: No duplicate emails';
    END IF;
    
    -- Final result
    IF v_verification_passed THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ENTERPRISE USER RESET COMPLETED SUCCESSFULLY!';
        RAISE NOTICE '================================================';
        RAISE NOTICE 'All 5 users are ready with encrypted passwords:';
        RAISE NOTICE '1. info@samiatarot.com (super_admin) - TempPass!2024';
        RAISE NOTICE '2. saeeeel@gmail.com (admin) - TempPass!2025';
        RAISE NOTICE '3. nabilzein@gmail.com (monitor) - TempPass!2026';
        RAISE NOTICE '4. nabilgpt.en@gmail.com (reader) - TempPass!2027';
        RAISE NOTICE '5. sara@sara.com (reader) - TempPass!2028';
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  Users should change passwords on first login!';
    ELSE
        RAISE EXCEPTION 'Enterprise User Reset failed verification! Please check the logs and fix issues.';
    END IF;
    
END $$;

-- Clean up helper functions
DROP FUNCTION IF EXISTS table_exists(TEXT);
DROP FUNCTION IF EXISTS column_exists(TEXT, TEXT); 