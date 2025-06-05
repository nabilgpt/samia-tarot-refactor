import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAndFixDuplicate() {
  try {
    console.log('🔍 Checking current database state...');
    
    const duplicateUserId = 'f66c1c35-7365-4814-8f56-59f85fcde98a';
    
    // Check if profile exists
    console.log('\n📋 Checking for existing profile...');
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', duplicateUserId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', checkError.message);
      return;
    }
    
    if (existingProfile) {
      console.log('⚠️  Found existing profile:', existingProfile);
      
      if (existingProfile.email === 'info@samiatarot.com' && existingProfile.role === 'super_admin') {
        console.log('🎉 GREAT NEWS! Super admin profile already exists and is correctly configured!');
        console.log('👤 Email:', existingProfile.email);
        console.log('👑 Role:', existingProfile.role);
        console.log('✅ Active:', existingProfile.is_active);
        
        console.log('\n🚀 You can now:');
        console.log('1. Clear your browser cache completely');
        console.log('2. Log in with info@samiatarot.com / 123456');
        console.log('3. Super admin dashboard should work!');
        
        console.log('\n📋 If you still get RLS errors, run this SQL in Supabase Dashboard:');
        console.log('🔗 Go to: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql');
        console.log(`
-- Clean up RLS policies and create fresh ones
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "public_readers_viewable" ON profiles;
DROP POLICY IF EXISTS "super_admin_full_access" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable by all" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "users_view_own" ON profiles;
DROP POLICY IF EXISTS "users_update_own" ON profiles;
DROP POLICY IF EXISTS "public_readers" ON profiles;
DROP POLICY IF EXISTS "super_admin_access" ON profiles;
DROP POLICY IF EXISTS "allow_own_profile_view" ON profiles;
DROP POLICY IF EXISTS "allow_own_profile_update" ON profiles;
DROP POLICY IF EXISTS "allow_public_readers" ON profiles;
DROP POLICY IF EXISTS "allow_super_admin_all" ON profiles;
DROP POLICY IF EXISTS "user_own_profile_view" ON profiles;
DROP POLICY IF EXISTS "user_own_profile_update" ON profiles;
DROP POLICY IF EXISTS "public_reader_view" ON profiles;

-- Create fresh RLS policies
CREATE POLICY "user_profile_view" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "user_profile_update" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "reader_public_view" ON profiles 
  FOR SELECT USING (role = 'reader' AND is_active = true);

CREATE POLICY "super_admin_all_access" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );
        `);
        return;
      } else {
        console.log('⚠️  Profile exists but with wrong configuration. Deleting it...');
        
        // Delete the existing profile
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', duplicateUserId);
        
        if (deleteError) {
          console.error('❌ Failed to delete existing profile:', deleteError.message);
          return;
        } else {
          console.log('✅ Deleted existing profile');
        }
      }
    } else {
      console.log('ℹ️  No existing profile found');
    }
    
    // Check for profiles with the email
    console.log('\n📋 Checking for profiles with info@samiatarot.com...');
    const { data: emailProfiles, error: emailError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'info@samiatarot.com');
    
    if (emailError) {
      console.error('❌ Error checking email profiles:', emailError.message);
    } else {
      console.log('Email profiles found:', emailProfiles);
      
      if (emailProfiles.length > 0) {
        console.log('🧹 Cleaning up existing email profiles...');
        const { error: cleanupError } = await supabase
          .from('profiles')
          .delete()
          .eq('email', 'info@samiatarot.com');
        
        if (cleanupError) {
          console.warn('⚠️  Warning cleaning up email profiles:', cleanupError.message);
        } else {
          console.log('✅ Cleaned up email profiles');
        }
      }
    }
    
    console.log('\n🔧 CORRECTED SQL TO RUN IN SUPABASE DASHBOARD:');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql');
    console.log('📝 Copy and paste this SQL:');
    console.log(`
-- STEP 1: Fix role constraint to allow super_admin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));

-- STEP 2: Delete any conflicting profiles completely
DELETE FROM profiles WHERE email = 'info@samiatarot.com';
DELETE FROM profiles WHERE id = '${duplicateUserId}';

-- STEP 3: Insert super admin profile (UPSERT to avoid duplicates)
INSERT INTO profiles (id, email, first_name, last_name, role, is_active, created_at, updated_at)
VALUES (
  '${duplicateUserId}',
  'info@samiatarot.com',
  'Mohamad Nabil',
  'Zein',
  'super_admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- STEP 4: Clean up ALL existing RLS policies
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "public_readers_viewable" ON profiles;
DROP POLICY IF EXISTS "super_admin_full_access" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable by all" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "users_view_own" ON profiles;
DROP POLICY IF EXISTS "users_update_own" ON profiles;
DROP POLICY IF EXISTS "public_readers" ON profiles;
DROP POLICY IF EXISTS "super_admin_access" ON profiles;
DROP POLICY IF EXISTS "allow_own_profile_view" ON profiles;
DROP POLICY IF EXISTS "allow_own_profile_update" ON profiles;
DROP POLICY IF EXISTS "allow_public_readers" ON profiles;
DROP POLICY IF EXISTS "allow_super_admin_all" ON profiles;
DROP POLICY IF EXISTS "user_own_profile_view" ON profiles;
DROP POLICY IF EXISTS "user_own_profile_update" ON profiles;
DROP POLICY IF EXISTS "public_reader_view" ON profiles;

-- STEP 5: Create fresh RLS policies with super_admin support
CREATE POLICY "user_profile_view" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "user_profile_update" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "reader_public_view" ON profiles 
  FOR SELECT USING (role = 'reader' AND is_active = true);

CREATE POLICY "super_admin_all_access" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- STEP 6: Verify the super admin user
SELECT id, email, first_name, last_name, role, is_active 
FROM profiles 
WHERE email = 'info@samiatarot.com';
    `);
    
    console.log('\n🚀 After running the SQL:');
    console.log('1. Clear your browser cache completely');
    console.log('2. Log in with info@samiatarot.com / 123456');
    console.log('3. Super admin dashboard should work perfectly!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the check and fix
checkAndFixDuplicate(); 