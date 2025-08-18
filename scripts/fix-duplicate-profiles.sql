-- ============================================================================
-- FIX DUPLICATE PROFILES - SAMIA TAROT
-- Cleans up any orphaned or duplicate profiles that might cause reader creation issues
-- ============================================================================

-- First, let's see what we're dealing with
DO $$
DECLARE
    profile_count INTEGER;
    auth_user_count INTEGER;
    orphaned_profiles INTEGER;
    profiles_without_email INTEGER;
BEGIN
    -- Count profiles
    SELECT COUNT(*) INTO profile_count FROM profiles;
    
    -- Count auth users (need to use a function since we can't directly query auth.users from DO block)
    -- We'll handle this in the main cleanup
    
    -- Count orphaned profiles (profiles without corresponding auth users)
    SELECT COUNT(*) INTO orphaned_profiles 
    FROM profiles p 
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.users au WHERE au.id = p.id
    );
    
    -- Count profiles without email
    SELECT COUNT(*) INTO profiles_without_email 
    FROM profiles 
    WHERE email IS NULL OR email = '';
    
    RAISE NOTICE '📊 Profile Analysis:';
    RAISE NOTICE '   Total profiles: %', profile_count;
    RAISE NOTICE '   Orphaned profiles: %', orphaned_profiles;
    RAISE NOTICE '   Profiles without email: %', profiles_without_email;
END $$;

-- Clean up orphaned profiles (profiles without corresponding auth users)
DELETE FROM profiles 
WHERE id NOT IN (
    SELECT id FROM auth.users
) AND email != 'info@samiatarot.com'; -- Keep the super admin profile

-- Clean up profiles without email (these are usually corrupted)
DELETE FROM profiles 
WHERE (email IS NULL OR email = '' OR email = 'undefined') 
AND id != (SELECT id FROM profiles WHERE email = 'info@samiatarot.com' LIMIT 1);

-- Update any profiles that have empty display_name
UPDATE profiles 
SET display_name = COALESCE(
    CASE 
        WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
        THEN first_name || ' ' || last_name
        WHEN first_name IS NOT NULL 
        THEN first_name
        WHEN last_name IS NOT NULL 
        THEN last_name
        ELSE SPLIT_PART(email, '@', 1)
    END,
    'User'
)
WHERE display_name IS NULL OR display_name = '';

-- Ensure all reader profiles have proper specializations
UPDATE profiles 
SET specializations = ARRAY['general_reading']
WHERE role IN ('reader', 'admin', 'super_admin') 
AND (specializations IS NULL OR specializations = ARRAY[]::TEXT[]);

-- Ensure all profiles have proper languages
UPDATE profiles 
SET languages = ARRAY['ar', 'en']
WHERE languages IS NULL OR languages = ARRAY[]::TEXT[];

-- Ensure all profiles have proper timezone
UPDATE profiles 
SET timezone = 'Asia/Damascus'
WHERE timezone IS NULL OR timezone = '';

-- Final verification
DO $$
DECLARE
    final_profile_count INTEGER;
    reader_count INTEGER;
    active_reader_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO final_profile_count FROM profiles;
    SELECT COUNT(*) INTO reader_count FROM profiles WHERE role IN ('reader', 'admin', 'super_admin');
    SELECT COUNT(*) INTO active_reader_count FROM profiles WHERE role IN ('reader', 'admin', 'super_admin') AND is_active = true;
    
    RAISE NOTICE '✅ Cleanup Complete:';
    RAISE NOTICE '   Final profile count: %', final_profile_count;
    RAISE NOTICE '   Total readers: %', reader_count;
    RAISE NOTICE '   Active readers: %', active_reader_count;
    
    IF active_reader_count = 0 THEN
        RAISE NOTICE '⚠️ No active readers found - you may need to create some manually';
    END IF;
END $$; 