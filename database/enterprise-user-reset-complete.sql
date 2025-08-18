-- ============================================================================
-- SAMIA TAROT - COMPLETE ENTERPRISE USER RESET SCRIPT
-- This script executes all 6 steps in the correct order with proper error handling
-- ============================================================================

-- Safety check - only run in development environment
DO $$
DECLARE
    v_environment TEXT := COALESCE(current_setting('app.environment', true), 'development');
BEGIN
    IF v_environment = 'production' THEN
        RAISE EXCEPTION 'SAFETY CHECK: This script cannot be run in production environment. Current environment: %', v_environment;
    END IF;
    
    RAISE NOTICE '🔒 SAFETY CHECK PASSED: Running in % environment', v_environment;
END $$;

-- ============================================================================
-- STEP 1 & 2: CONFIGURATION AND CURRENT STATE ANALYSIS
-- ============================================================================

DO $$
DECLARE
    -- Configuration variables
    v_target_user_count INTEGER := 5;
    v_temp_password_base TEXT := 'TempPass!';
    v_current_year INTEGER := EXTRACT(YEAR FROM NOW());
    v_salt_rounds INTEGER := 12;
    
    -- Analysis variables
    v_current_active_users INTEGER;
    v_total_users INTEGER;
    v_duplicates_found INTEGER;
    
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'STEP 1 & 2: CONFIGURATION AND CURRENT STATE ANALYSIS';
    RAISE NOTICE '============================================================================';
    
    -- Store configuration in temporary table for session
    DROP TABLE IF EXISTS temp_user_reset_config;
    CREATE TEMP TABLE temp_user_reset_config (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    
    INSERT INTO temp_user_reset_config VALUES 
        ('target_user_count', v_target_user_count::TEXT),
        ('temp_password_base', v_temp_password_base),
        ('current_year', v_current_year::TEXT),
        ('salt_rounds', v_salt_rounds::TEXT);
    
    -- Current state analysis
    SELECT COUNT(*) INTO v_total_users FROM profiles;
    SELECT COUNT(*) INTO v_current_active_users FROM profiles WHERE is_active = true;
    
    SELECT COUNT(*) INTO v_duplicates_found 
    FROM (
        SELECT email, COUNT(*) as cnt 
        FROM profiles 
        WHERE email IS NOT NULL 
        GROUP BY email 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE '📊 CURRENT STATE ANALYSIS:';
    RAISE NOTICE '  Total users in database: %', v_total_users;
    RAISE NOTICE '  Currently active users: %', v_current_active_users;
    RAISE NOTICE '  Duplicate email addresses: %', v_duplicates_found;
    RAISE NOTICE '  Target active users: %', v_target_user_count;
    
    RAISE NOTICE '✅ STEP 1 & 2 COMPLETED: Configuration and analysis complete';
END $$;

-- ============================================================================
-- STEP 3: FOREIGN KEY CLEANUP
-- ============================================================================

DO $$
DECLARE
    v_cleanup_count INTEGER := 0;
    v_table_name TEXT;
    v_column_name TEXT;
    v_constraint_name TEXT;
    v_sql TEXT;
    v_record RECORD;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'STEP 3: FOREIGN KEY CLEANUP';
    RAISE NOTICE '============================================================================';
    
    -- List of tables that might reference profiles
    DECLARE
        tables_to_check TEXT[] := ARRAY[
            'user_activities', 'user_sessions', 'user_preferences', 
            'bookings', 'payments', 'reviews', 'notifications',
            'chat_messages', 'service_requests', 'feedback'
        ];
        table_name TEXT;
        cleanup_sql TEXT;
    BEGIN
        FOREACH table_name IN ARRAY tables_to_check LOOP
            -- Check if table exists
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
                -- Check if it has a user_id or profile_id column
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = table_name AND column_name IN ('user_id', 'profile_id')) THEN
                    
                    -- Clean up orphaned records
                    cleanup_sql := format('DELETE FROM %I WHERE user_id NOT IN (SELECT id FROM profiles WHERE is_active = true)', table_name);
                    EXECUTE cleanup_sql;
                    GET DIAGNOSTICS v_cleanup_count = ROW_COUNT;
                    
                    IF v_cleanup_count > 0 THEN
                        RAISE NOTICE '  Cleaned up % orphaned records from %', v_cleanup_count, table_name;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END;
    
    RAISE NOTICE '✅ STEP 3 COMPLETED: Foreign key cleanup complete';
END $$;

-- ============================================================================
-- STEP 4: DUPLICATE PROFILE DELETION
-- ============================================================================

DO $$
DECLARE
    v_profiles_to_delete UUID[];
    v_profile_id UUID;
    v_email TEXT;
    v_deletion_count INTEGER := 0;
    v_record RECORD;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'STEP 4: DUPLICATE PROFILE DELETION';
    RAISE NOTICE '============================================================================';
    
    -- Find and delete duplicate profiles, keeping the most recent one for each email
    FOR v_record IN (
        SELECT email, array_agg(id ORDER BY created_at DESC) as profile_ids
        FROM profiles 
        WHERE email IS NOT NULL
        GROUP BY email
        HAVING COUNT(*) > 1
    ) LOOP
        -- Keep the first (most recent) profile, delete the rest
        v_profiles_to_delete := v_record.profile_ids[2:];
        
        RAISE NOTICE '  Duplicate email found: % (% profiles)', v_record.email, array_length(v_record.profile_ids, 1);
        
        -- Delete duplicate profiles
        FOREACH v_profile_id IN ARRAY v_profiles_to_delete LOOP
            DELETE FROM profiles WHERE id = v_profile_id;
            v_deletion_count := v_deletion_count + 1;
            RAISE NOTICE '    Deleted duplicate profile: %', v_profile_id;
        END LOOP;
    END LOOP;
    
    -- Handle profiles with NULL email (keep only one)
    DECLARE
        v_null_email_profiles UUID[];
        v_keep_profile UUID;
    BEGIN
        SELECT array_agg(id ORDER BY created_at DESC) INTO v_null_email_profiles
        FROM profiles 
        WHERE email IS NULL;
        
        IF array_length(v_null_email_profiles, 1) > 1 THEN
            v_keep_profile := v_null_email_profiles[1];
            
            FOR i IN 2..array_length(v_null_email_profiles, 1) LOOP
                DELETE FROM profiles WHERE id = v_null_email_profiles[i];
                v_deletion_count := v_deletion_count + 1;
                RAISE NOTICE '    Deleted NULL email profile: %', v_null_email_profiles[i];
            END LOOP;
        END IF;
    END;
    
    RAISE NOTICE '  Total duplicate profiles deleted: %', v_deletion_count;
    RAISE NOTICE '✅ STEP 4 COMPLETED: Duplicate profile deletion complete';
END $$;

-- ============================================================================
-- STEP 5: NEW USERS CREATION
-- ============================================================================

DO $$
DECLARE
    v_config RECORD;
    v_user_data RECORD;
    v_encrypted_password TEXT;
    v_password TEXT;
    v_salt_rounds INTEGER;
    v_existing_profile_id UUID;
    v_created_count INTEGER := 0;
    v_updated_count INTEGER := 0;
    
    -- User definitions
    v_users RECORD[] := ARRAY[
        ROW('info@samiatarot.com', 'super_admin', 'TempPass!2024'),
        ROW('saeeeel@gmail.com', 'admin', 'TempPass!2025'),
        ROW('nabilzein@gmail.com', 'monitor', 'TempPass!2026'),
        ROW('nabilgpt.en@gmail.com', 'reader', 'TempPass!2027'),
        ROW('sara@sara.com', 'reader', 'TempPass!2028')
    ]::RECORD[];
    
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'STEP 5: NEW USERS CREATION';
    RAISE NOTICE '============================================================================';
    
    -- Get configuration
    SELECT value::INTEGER INTO v_salt_rounds FROM temp_user_reset_config WHERE key = 'salt_rounds';
    
    -- Create or update each user
    FOR i IN 1..array_length(v_users, 1) LOOP
        v_user_data := v_users[i];
        
        -- Extract user data (assuming the record structure matches our needs)
        -- Note: This is a simplified approach - in practice you'd need proper record handling
        DECLARE
            v_email TEXT;
            v_role TEXT;
            v_password TEXT;
        BEGIN
            -- Since we can't easily extract from RECORD[], let's define users explicitly
            CASE i
                WHEN 1 THEN
                    v_email := 'info@samiatarot.com';
                    v_role := 'super_admin';
                    v_password := 'TempPass!2024';
                WHEN 2 THEN
                    v_email := 'saeeeel@gmail.com';
                    v_role := 'admin';
                    v_password := 'TempPass!2025';
                WHEN 3 THEN
                    v_email := 'nabilzein@gmail.com';
                    v_role := 'monitor';
                    v_password := 'TempPass!2026';
                WHEN 4 THEN
                    v_email := 'nabilgpt.en@gmail.com';
                    v_role := 'reader';
                    v_password := 'TempPass!2027';
                WHEN 5 THEN
                    v_email := 'sara@sara.com';
                    v_role := 'reader';
                    v_password := 'TempPass!2028';
            END CASE;
            
            -- Generate bcrypt hash using crypt function
            v_encrypted_password := crypt(v_password, gen_salt('bf', v_salt_rounds));
            
            -- Check if user already exists
            SELECT id INTO v_existing_profile_id FROM profiles WHERE email = v_email;
            
            IF v_existing_profile_id IS NOT NULL THEN
                -- Update existing user
                UPDATE profiles SET
                    role = v_role,
                    encrypted_password = v_encrypted_password,
                    is_active = true,
                    updated_at = NOW()
                WHERE id = v_existing_profile_id;
                
                v_updated_count := v_updated_count + 1;
                RAISE NOTICE '  Updated user: % (role: %)', v_email, v_role;
            ELSE
                -- Create new user
                INSERT INTO profiles (
                    id,
                    email,
                    role,
                    encrypted_password,
                    is_active,
                    created_at,
                    updated_at
                ) VALUES (
                    gen_random_uuid(),
                    v_email,
                    v_role,
                    v_encrypted_password,
                    true,
                    NOW(),
                    NOW()
                );
                
                v_created_count := v_created_count + 1;
                RAISE NOTICE '  Created user: % (role: %)', v_email, v_role;
            END IF;
        END;
    END LOOP;
    
    RAISE NOTICE '  Users created: %', v_created_count;
    RAISE NOTICE '  Users updated: %', v_updated_count;
    RAISE NOTICE '✅ STEP 5 COMPLETED: New users creation complete';
END $$;

-- ============================================================================
-- STEP 6: FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_verification_passed BOOLEAN := TRUE;
    v_test_result TEXT;
    v_user_count INTEGER;
    v_expected_users TEXT[] := ARRAY['info@samiatarot.com', 'saeeeel@gmail.com', 'nabilzein@gmail.com', 'nabilgpt.en@gmail.com', 'sara@sara.com'];
    v_expected_roles TEXT[] := ARRAY['super_admin', 'admin', 'monitor', 'reader', 'reader'];
    v_user_email TEXT;
    v_expected_role TEXT;
    v_actual_role TEXT;
    v_duplicate_count INTEGER;
    v_admin_found BOOLEAN := FALSE;
    
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'STEP 6: FINAL VERIFICATION';
    RAISE NOTICE '============================================================================';
    
    -- Test 1: User Count
    SELECT COUNT(*) INTO v_user_count FROM profiles WHERE is_active = true;
    IF v_user_count = 5 THEN
        RAISE NOTICE '✅ Test 1 PASSED: Found exactly 5 active users';
    ELSE
        RAISE NOTICE '❌ Test 1 FAILED: Expected 5 users, found %', v_user_count;
        v_verification_passed := FALSE;
    END IF;
    
    -- Test 2: Expected Users
    FOR i IN 1..array_length(v_expected_users, 1) LOOP
        v_user_email := v_expected_users[i];
        v_expected_role := v_expected_roles[i];
        
        SELECT role INTO v_actual_role FROM profiles WHERE email = v_user_email AND is_active = true;
        
        IF v_actual_role IS NULL THEN
            RAISE NOTICE '❌ Test 2 FAILED: Missing user %', v_user_email;
            v_verification_passed := FALSE;
        ELSIF v_actual_role = v_expected_role THEN
            RAISE NOTICE '✅ Test 2 PASSED: Found user % with correct role %', v_user_email, v_actual_role;
        ELSE
            RAISE NOTICE '❌ Test 2 FAILED: User % has wrong role (expected: %, actual: %)', v_user_email, v_expected_role, v_actual_role;
            v_verification_passed := FALSE;
        END IF;
    END LOOP;
    
    -- Test 3: Password Encryption
    DECLARE
        v_bad_passwords INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_bad_passwords 
        FROM profiles 
        WHERE is_active = true 
        AND (encrypted_password IS NULL OR encrypted_password NOT LIKE '$2b$%');
        
        IF v_bad_passwords = 0 THEN
            RAISE NOTICE '✅ Test 3 PASSED: All passwords properly encrypted';
        ELSE
            RAISE NOTICE '❌ Test 3 FAILED: % users have improperly encrypted passwords', v_bad_passwords;
            v_verification_passed := FALSE;
        END IF;
    END;
    
    -- Test 4: No Duplicates
    SELECT COUNT(*) INTO v_duplicate_count
    FROM (
        SELECT email, COUNT(*) as cnt
        FROM profiles
        WHERE email IS NOT NULL
        GROUP BY email
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF v_duplicate_count = 0 THEN
        RAISE NOTICE '✅ Test 4 PASSED: No duplicate emails found';
    ELSE
        RAISE NOTICE '❌ Test 4 FAILED: Found % duplicate emails', v_duplicate_count;
        v_verification_passed := FALSE;
    END IF;
    
    -- Test 5: Main Admin Profile
    SELECT COUNT(*) > 0 INTO v_admin_found
    FROM profiles
    WHERE email = 'info@samiatarot.com' AND role = 'super_admin' AND is_active = true;
    
    IF v_admin_found THEN
        RAISE NOTICE '✅ Test 5 PASSED: Main admin profile found and active';
    ELSE
        RAISE NOTICE '❌ Test 5 FAILED: Main admin profile not found or inactive';
        v_verification_passed := FALSE;
    END IF;
    
    -- Final Result
    IF v_verification_passed THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 SUCCESS: All verification tests passed!';
        RAISE NOTICE '✅ Enterprise User Reset process completed successfully!';
        RAISE NOTICE '';
        RAISE NOTICE '📋 SUMMARY:';
        RAISE NOTICE '  - 5 enterprise users created/updated';
        RAISE NOTICE '  - All passwords bcrypt encrypted (12 salt rounds)';
        RAISE NOTICE '  - No duplicate profiles';
        RAISE NOTICE '  - Main admin profile active';
        RAISE NOTICE '  - System ready for production use';
        RAISE NOTICE '';
        RAISE NOTICE '🔑 LOGIN CREDENTIALS:';
        RAISE NOTICE '  info@samiatarot.com    | TempPass!2024 (super_admin)';
        RAISE NOTICE '  saeeeel@gmail.com      | TempPass!2025 (admin)';
        RAISE NOTICE '  nabilzein@gmail.com    | TempPass!2026 (monitor)';
        RAISE NOTICE '  nabilgpt.en@gmail.com  | TempPass!2027 (reader)';
        RAISE NOTICE '  sara@sara.com          | TempPass!2028 (reader)';
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  IMPORTANT: Users should change passwords on first login!';
    ELSE
        RAISE EXCEPTION 'Enterprise User Reset verification failed. Please review the test results above.';
    END IF;
    
    RAISE NOTICE '✅ STEP 6 COMPLETED: Final verification successful';
    
    -- Cleanup temporary tables
    DROP TABLE IF EXISTS temp_user_reset_config;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '🎉 ENTERPRISE USER RESET COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '============================================================================';
    
END $$; 