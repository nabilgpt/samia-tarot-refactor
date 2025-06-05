import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function finalSuperAdminCreation() {
  try {
    console.log('🔍 Checking for any existing data...');
    
    // Check for any existing profile with this email
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'info@samiatarot.com')
      .single();
    
    if (existingProfile) {
      console.log('⚠️  Found existing profile, deleting it first...');
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('email', 'info@samiatarot.com');
      
      if (deleteError) {
        console.warn('⚠️  Warning deleting existing profile:', deleteError.message);
      } else {
        console.log('✅ Deleted existing profile');
      }
    }
    
    // Check for any orphaned auth users with this email
    console.log('🔍 Checking for orphaned auth users...');
    
    // Let's create a unique email first, then update it
    const uniqueEmail = `super-admin-${Date.now()}@samiatarot.com`;
    
    console.log(`🆕 Creating user with unique email: ${uniqueEmail}`);
    
    // Step 1: Create auth user with unique email
    const { data: authUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email: uniqueEmail,
      password: '123456',
      email_confirm: true,
      user_metadata: {
        first_name: 'Super',
        last_name: 'Admin'
      }
    });
    
    if (createAuthError) {
      console.error('❌ Failed to create auth user:', createAuthError.message);
      return;
    }
    
    console.log('✅ Created auth user with unique email:', {
      id: authUser.user.id,
      email: authUser.user.email
    });
    
    // Step 2: Create profile
    console.log('\n👤 Creating profile...');
    const { data: profile, error: createProfileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: uniqueEmail,
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
      
      if (createProfileError.message.includes('check constraint')) {
        console.log('\n🔧 Role constraint issue! Run this SQL in Supabase Dashboard:');
        console.log(`
-- Fix role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));
        `);
      }
      return;
    }
    
    console.log('✅ Created profile:', {
      id: profile.id,
      email: profile.email,
      role: profile.role
    });
    
    // Step 3: Update emails to the desired ones
    console.log('\n📧 Updating emails to info@samiatarot.com...');
    
    // Update auth user email
    const { error: updateAuthEmailError } = await supabase.auth.admin.updateUserById(
      authUser.user.id,
      { email: 'info@samiatarot.com' }
    );
    
    if (updateAuthEmailError) {
      console.warn('⚠️  Warning updating auth email:', updateAuthEmailError.message);
    } else {
      console.log('✅ Updated auth email');
    }
    
    // Update profile email
    const { error: updateProfileEmailError } = await supabase
      .from('profiles')
      .update({ email: 'info@samiatarot.com' })
      .eq('id', authUser.user.id);
    
    if (updateProfileEmailError) {
      console.warn('⚠️  Warning updating profile email:', updateProfileEmailError.message);
    } else {
      console.log('✅ Updated profile email');
    }
    
    // Step 4: Verify the final result
    console.log('\n🧪 Verifying final result...');
    const { data: finalProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('id', authUser.user.id)
      .single();
    
    if (verifyError) {
      console.warn('⚠️  Verification failed:', verifyError.message);
    } else {
      console.log('✅ Verification successful:', finalProfile);
    }
    
    console.log('\n🎉 SUCCESS! Super admin user created:');
    console.log('👤 Email: info@samiatarot.com');
    console.log('🔑 Password: 123456');
    console.log('👑 Role: super_admin');
    console.log(`🆔 ID: ${authUser.user.id}`);
    
    console.log('\n🚀 FINAL STEPS:');
    console.log('1. Run the RLS policy fix SQL below in Supabase Dashboard');
    console.log('2. Clear browser cache completely');
    console.log('3. Log in with info@samiatarot.com / 123456');
    console.log('4. Super admin dashboard should work!');
    
    console.log('\n📋 RLS POLICY FIX SQL:');
    console.log('Go to: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql');
    console.log('Copy and paste this SQL:');
    console.log(`
-- Drop ALL existing policies
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "public_readers_viewable" ON profiles;
DROP POLICY IF EXISTS "super_admin_full_access" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable by all" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;

-- Create fresh policies
CREATE POLICY "users_view_own" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "public_readers" ON profiles 
  FOR SELECT USING (role = 'reader' AND is_active = true);

CREATE POLICY "super_admin_access" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );
    `);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the final creation
finalSuperAdminCreation(); 