import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createFreshSuperAdmin() {
  try {
    console.log('🆕 Creating fresh super admin user...');
    
    // Step 1: Create auth user
    console.log('🔐 Step 1: Creating auth user...');
    const { data: authUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email: 'info@samiatarot.com',
      password: '123456',
      email_confirm: true,
      user_metadata: {
        first_name: 'Mohamad Nabil',
        last_name: 'Zein'
      }
    });
    
    if (createAuthError) {
      console.error('❌ Failed to create auth user:', createAuthError.message);
      return;
    }
    
    console.log('✅ Created auth user:', {
      id: authUser.user.id,
      email: authUser.user.email
    });
    
    // Step 2: Create profile with super_admin role
    console.log('\n👤 Step 2: Creating profile...');
    const { data: profile, error: createProfileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: authUser.user.email,
        first_name: 'Super',
        last_name: 'Admin',
        role: 'super_admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createProfileError) {
      console.error('❌ Failed to create profile:', createProfileError.message);
      
      if (createProfileError.message.includes('check constraint') || createProfileError.message.includes('profiles_role_check')) {
        console.log('\n🔧 Role constraint issue detected!');
        console.log('📋 Please run this SQL in Supabase Dashboard first:');
        console.log(`
-- STEP 1: Fix role constraint to allow super_admin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));

-- STEP 2: Delete any remaining conflicting profiles
DELETE FROM profiles WHERE email = 'info@samiatarot.com';
DELETE FROM profiles WHERE id = 'f66c1c35-7365-4814-8f56-59f85fcde98a';

-- STEP 3: Insert super admin profile with NEW user ID
INSERT INTO profiles (id, email, first_name, last_name, role, is_active, created_at, updated_at)
VALUES (
  'c3922fea-329a-4d6e-800c-3e03c9fe341d',
  'info@samiatarot.com',
  'Mohamad Nabil',
  'Zein',
  'super_admin',
  true,
  NOW(),
  NOW()
);

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
DROP POLICY IF EXISTS "user_profile_view" ON profiles;
DROP POLICY IF EXISTS "user_profile_update" ON profiles;
DROP POLICY IF EXISTS "reader_public_view" ON profiles;
DROP POLICY IF EXISTS "super_admin_all_access" ON profiles;

-- STEP 5: Create fresh RLS policies
CREATE POLICY "profile_own_view" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profile_own_update" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profile_reader_public" ON profiles 
  FOR SELECT USING (role = 'reader' AND is_active = true);

CREATE POLICY "profile_super_admin_access" ON profiles
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
      }
      return;
    }
    
    console.log('✅ Created profile:', {
      id: profile.id,
      email: profile.email,
      name: `${profile.first_name} ${profile.last_name}`,
      role: profile.role,
      isActive: profile.is_active
    });
    
    // Step 3: Verify the user can be queried
    console.log('\n🧪 Step 3: Testing database access...');
    const { data: testProfile, error: testError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', profile.id)
      .single();
    
    if (testError) {
      console.warn('⚠️  Database access test failed:', testError.message);
    } else {
      console.log('✅ Database access test successful:', testProfile);
    }
    
    console.log('\n🎉 SUCCESS! Fresh super admin user created:');
    console.log('👤 Email: info@samiatarot.com');
    console.log('🔑 Password: 123456');
    console.log('👑 Role: super_admin');
    console.log(`🆔 ID: ${profile.id}`);
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Run the RLS policy fix SQL in Supabase Dashboard');
    console.log('2. Clear browser cache completely');
    console.log('3. Log in with the new credentials');
    console.log('4. Super admin access should work perfectly!');
    
    console.log('\n📋 RLS POLICY FIX SQL (copy to Supabase Dashboard):');
    console.log(`
-- STEP 1: Fix role constraint to allow super_admin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));

-- STEP 2: Delete any remaining conflicting profiles
DELETE FROM profiles WHERE email = 'info@samiatarot.com';
DELETE FROM profiles WHERE id = 'f66c1c35-7365-4814-8f56-59f85fcde98a';

-- STEP 3: Insert super admin profile with NEW user ID
INSERT INTO profiles (id, email, first_name, last_name, role, is_active, created_at, updated_at)
VALUES (
  'c3922fea-329a-4d6e-800c-3e03c9fe341d',
  'info@samiatarot.com',
  'Mohamad Nabil',
  'Zein',
  'super_admin',
  true,
  NOW(),
  NOW()
);

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
DROP POLICY IF EXISTS "user_profile_view" ON profiles;
DROP POLICY IF EXISTS "user_profile_update" ON profiles;
DROP POLICY IF EXISTS "reader_public_view" ON profiles;
DROP POLICY IF EXISTS "super_admin_all_access" ON profiles;

-- STEP 5: Create fresh RLS policies
CREATE POLICY "profile_own_view" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profile_own_update" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profile_reader_public" ON profiles 
  FOR SELECT USING (role = 'reader' AND is_active = true);

CREATE POLICY "profile_super_admin_access" ON profiles
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

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the creation
createFreshSuperAdmin(); 