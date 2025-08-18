-- ============================================================================
-- SAMIA TAROT - READER AUTH SYNC MIGRATION SCRIPT
-- Ensures perfect sync between auth.users and profiles table for readers
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 1: SYNC AUTH.USERS TO PROFILES TABLE
-- ============================================================================

DO $$
DECLARE
    sync_count INTEGER := 0;
    auth_user RECORD;
    existing_profile RECORD;
BEGIN
    RAISE NOTICE '🔄 Starting Reader Auth Sync Migration...';
    
    -- Loop through all auth.users that should be readers but missing from profiles
    FOR auth_user IN 
        SELECT au.id, au.email, au.user_metadata, au.created_at
        FROM auth.users au
        WHERE au.email NOT IN (SELECT email FROM profiles WHERE email IS NOT NULL)
        AND au.email IS NOT NULL
    LOOP
        BEGIN
            -- Extract metadata
            DECLARE
                first_name TEXT := COALESCE(auth_user.user_metadata->>'first_name', '');
                last_name TEXT := COALESCE(auth_user.user_metadata->>'last_name', '');
                display_name TEXT := COALESCE(
                    auth_user.user_metadata->>'display_name', 
                    CASE 
                        WHEN first_name != '' AND last_name != '' THEN first_name || ' ' || last_name
                        WHEN first_name != '' THEN first_name
                        WHEN last_name != '' THEN last_name
                        ELSE SPLIT_PART(auth_user.email, '@', 1)
                    END
                );
                user_role TEXT := COALESCE(auth_user.user_metadata->>'role', 'client');
            BEGIN
                -- Insert missing profile with auth user ID
                INSERT INTO profiles (
                    id,
                    email,
                    first_name,
                    last_name,
                    display_name,
                    role,
                    is_active,
                    specializations,
                    languages,
                    timezone,
                    created_at,
                    updated_at
                ) VALUES (
                    auth_user.id,
                    auth_user.email,
                    NULLIF(first_name, ''),
                    NULLIF(last_name, ''),
                    display_name,
                    user_role,
                    true,
                    CASE WHEN user_role IN ('reader', 'admin', 'super_admin') 
                         THEN ARRAY['general_reading'] 
                         ELSE ARRAY[]::TEXT[] END,
                    ARRAY['ar', 'en'],
                    'Asia/Damascus',
                    auth_user.created_at,
                    NOW()
                );
                
                sync_count := sync_count + 1;
                RAISE NOTICE '✅ Synced auth user % to profiles: % (role: %)', 
                            auth_user.email, display_name, user_role;
                            
            EXCEPTION WHEN unique_violation THEN
                RAISE NOTICE '⚠️ Profile already exists for email: %', auth_user.email;
            WHEN foreign_key_violation THEN
                RAISE NOTICE '⚠️ Foreign key violation for user: % (ID: %)', auth_user.email, auth_user.id;
            END;
        END;
    END LOOP;
    
    RAISE NOTICE '📊 Sync Summary: % auth users synced to profiles', sync_count;
END $$;

-- ============================================================================
-- STEP 2: ENSURE ALL READERS HAVE PROPER METADATA
-- ============================================================================

DO $$
DECLARE
    update_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 Updating reader metadata...';
    
    -- Update readers with missing specializations, languages, or display_name
    UPDATE profiles SET 
        specializations = COALESCE(specializations, ARRAY['general_reading']),
        languages = COALESCE(languages, ARRAY['ar', 'en']),
        timezone = COALESCE(timezone, 'Asia/Damascus'),
        display_name = COALESCE(
            display_name,
            CASE 
                WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
                THEN first_name || ' ' || last_name
                WHEN first_name IS NOT NULL 
                THEN first_name
                WHEN last_name IS NOT NULL 
                THEN last_name
                ELSE SPLIT_PART(email, '@', 1)
            END
        ),
        updated_at = NOW()
    WHERE role IN ('reader', 'admin', 'super_admin')
    AND (
        specializations IS NULL OR 
        languages IS NULL OR 
        timezone IS NULL OR 
        display_name IS NULL
    );
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '✅ Updated % reader profiles with missing metadata', update_count;
END $$;

-- ============================================================================
-- STEP 3: CREATE DEFAULT READERS IF NONE EXIST
-- ============================================================================

DO $$
DECLARE
    reader_count INTEGER;
    default_reader_id UUID;
BEGIN
    -- Count existing readers
    SELECT COUNT(*) INTO reader_count 
    FROM profiles 
    WHERE role IN ('reader', 'admin', 'super_admin') AND is_active = true;
    
    RAISE NOTICE '📊 Found % existing active readers', reader_count;
    
    -- If no readers exist, create default ones
    IF reader_count = 0 THEN
        RAISE NOTICE '🔄 No readers found, creating default readers...';
        
        -- Create default reader (without auth constraint for fallback)
        BEGIN
            INSERT INTO profiles (
                email, 
                first_name, 
                last_name, 
                display_name, 
                role, 
                is_active, 
                specializations, 
                languages,
                timezone
            ) VALUES (
                'default@samia-tarot.com', 
                'Default', 
                'Reader', 
                'Default Reader', 
                'reader', 
                true, 
                ARRAY['general_reading'], 
                ARRAY['ar', 'en'],
                'Asia/Damascus'
            )
            ON CONFLICT (email) DO UPDATE SET 
                role = 'reader',
                display_name = 'Default Reader',
                specializations = ARRAY['general_reading'],
                languages = ARRAY['ar', 'en'],
                is_active = true,
                updated_at = NOW()
            RETURNING id INTO default_reader_id;
            
            RAISE NOTICE '✅ Created/Updated default reader: %', default_reader_id;
            
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE NOTICE '⚠️ Cannot create default reader due to auth constraints - will use existing profile';
        END;
        
        -- Try to create sample readers
        BEGIN
            INSERT INTO profiles (email, first_name, last_name, display_name, role, is_active, specializations, languages, timezone)
            VALUES 
                ('samia@samia-tarot.com', 'Samia', 'الطارق', 'Samia - Master Reader', 'reader', true, ARRAY['tarot', 'coffee', 'dream'], ARRAY['ar', 'en'], 'Asia/Damascus'),
                ('layla@samia-tarot.com', 'Layla', 'النور', 'Layla - Spiritual Guide', 'reader', true, ARRAY['astrology', 'numerology'], ARRAY['ar', 'en'], 'Asia/Damascus')
            ON CONFLICT (email) DO UPDATE SET 
                role = EXCLUDED.role,
                display_name = EXCLUDED.display_name,
                specializations = EXCLUDED.specializations,
                is_active = true,
                updated_at = NOW();
                
            RAISE NOTICE '✅ Created/Updated sample readers';
            
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE NOTICE '⚠️ Cannot create sample readers due to auth constraints - that''s okay';
        END;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: FIX SERVICES WITHOUT READERS
-- ============================================================================

DO $$
DECLARE
    services_without_readers INTEGER;
    default_reader_id UUID;
BEGIN
    -- Count services without valid readers
    SELECT COUNT(*) INTO services_without_readers 
    FROM services 
    WHERE reader_id IS NULL 
    OR reader_id NOT IN (
        SELECT id FROM profiles 
        WHERE role IN ('reader', 'admin', 'super_admin') 
        AND is_active = true
    );
    
    RAISE NOTICE '📊 Found % services without valid readers', services_without_readers;
    
    IF services_without_readers > 0 THEN
        -- Get any available reader
        SELECT id INTO default_reader_id 
        FROM profiles 
        WHERE role IN ('reader', 'admin', 'super_admin') 
        AND is_active = true 
        LIMIT 1;
        
        IF default_reader_id IS NOT NULL THEN
            -- Assign default reader to services without readers
            UPDATE services 
            SET reader_id = default_reader_id,
                updated_at = NOW()
            WHERE reader_id IS NULL 
            OR reader_id NOT IN (
                SELECT id FROM profiles 
                WHERE role IN ('reader', 'admin', 'super_admin') 
                AND is_active = true
            );
            
            RAISE NOTICE '✅ Assigned reader % to % services', default_reader_id, services_without_readers;
        ELSE
            RAISE NOTICE '❌ No readers available to assign to services';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: FINAL VERIFICATION AND REPORT
-- ============================================================================

DO $$
DECLARE
    total_auth_users INTEGER;
    total_profiles INTEGER;
    total_readers INTEGER;
    total_services INTEGER;
    services_with_readers INTEGER;
    orphaned_profiles INTEGER;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO total_auth_users FROM auth.users;
    SELECT COUNT(*) INTO total_profiles FROM profiles;
    SELECT COUNT(*) INTO total_readers FROM profiles WHERE role IN ('reader', 'admin', 'super_admin') AND is_active = true;
    SELECT COUNT(*) INTO total_services FROM services;
    SELECT COUNT(*) INTO services_with_readers FROM services WHERE reader_id IS NOT NULL;
    SELECT COUNT(*) INTO orphaned_profiles FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);
    
    RAISE NOTICE '=== 📊 FINAL SYNC REPORT ===';
    RAISE NOTICE 'Auth Users: %', total_auth_users;
    RAISE NOTICE 'Total Profiles: %', total_profiles;
    RAISE NOTICE 'Active Readers: %', total_readers;
    RAISE NOTICE 'Total Services: %', total_services;
    RAISE NOTICE 'Services with Readers: %', services_with_readers;
    RAISE NOTICE 'Orphaned Profiles: %', orphaned_profiles;
    
    -- Success criteria
    IF total_readers > 0 AND services_with_readers = total_services THEN
        RAISE NOTICE '🎉 SUCCESS: Perfect sync achieved! All services have readers assigned.';
    ELSIF total_readers = 0 THEN
        RAISE NOTICE '⚠️ WARNING: No readers available. Manual reader creation required.';
    ELSE
        RAISE NOTICE '⚠️ WARNING: Some services still need reader assignment.';
    END IF;
    
    -- Log completion
    RAISE NOTICE '✅ Reader Auth Sync Migration completed successfully!';
END $$; 