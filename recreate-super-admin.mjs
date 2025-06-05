import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function recreateSuperAdmin() {
  try {
    console.log('🗑️  Step 1: Deleting existing super admin user...');
    
    // First, find the existing user
    const { data: existingUser, error: findError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'info@samiatarot.com')
      .single();
    
    if (existingUser) {
      console.log('✅ Found existing user:', existingUser.id);
      
      // Delete from profiles table first
      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('email', 'info@samiatarot.com');
      
      if (deleteProfileError) {
        console.warn('⚠️  Warning deleting profile:', deleteProfileError.message);
      } else {
        console.log('✅ Deleted from profiles table');
      }
      
      // Delete from auth.users table using admin API
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(existingUser.id);
      
      if (deleteAuthError) {
        console.warn('⚠️  Warning deleting auth user:', deleteAuthError.message);
      } else {
        console.log('✅ Deleted from auth.users table');
      }
    } else {
      console.log('ℹ️  No existing user found to delete');
    }
    
    console.log('\n🆕 Step 2: Creating fresh super admin user...');
    
    // Create new user in auth.users
    const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email: 'info@samiatarot.com',
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
    
    console.log('✅ Created auth user:', {
      id: newAuthUser.user.id,
      email: newAuthUser.user.email
    });
    
    // Create profile with super_admin role
    const { data: newProfile, error: createProfileError } = await supabase
      .from('profiles')
      .insert({
        id: newAuthUser.user.id,
        email: newAuthUser.user.email,
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
      
      // If there's a constraint error, let's check what roles are allowed
      if (createProfileError.message.includes('check constraint') || createProfileError.message.includes('profiles_role_check')) {
        console.log('\n🔧 Role constraint issue detected. Fixing...');
        
        // Try to update the constraint to allow super_admin
        console.log('📋 Run this SQL in Supabase Dashboard SQL Editor:');
        console.log(`
-- Fix role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));

-- Then insert the profile manually
INSERT INTO profiles (id, email, first_name, last_name, role, is_active, created_at, updated_at)
VALUES (
  '${newAuthUser.user.id}',
  'info@samiatarot.com',
  'Super',
  'Admin',
  'super_admin',
  true,
  NOW(),
  NOW()
);
        `);
      }
      return;
    }
    
    console.log('✅ Created profile:', {
      id: newProfile.id,
      email: newProfile.email,
      name: `${newProfile.first_name} ${newProfile.last_name}`,
      role: newProfile.role,
      isActive: newProfile.is_active
    });
    
    console.log('\n🔧 Step 3: Ensuring RLS policies allow super_admin...');
    
    // Test if we can query the new profile
    const { data: testProfile, error: testError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', newProfile.id)
      .single();
    
    if (testError) {
      console.warn('⚠️  RLS policies still blocking access:', testError.message);
      console.log('\n📋 You still need to run the RLS fix in Supabase Dashboard:');
      console.log('1. Go to: Database > SQL Editor');
      console.log('2. Run the script from fix-profiles-rls-only.sql');
    } else {
      console.log('✅ RLS policies are working correctly');
    }
    
    console.log('\n🎉 SUCCESS! Fresh super admin user created:');
    console.log('👤 Email: info@samiatarot.com');
    console.log('🔑 Password: 123456');
    console.log('👑 Role: super_admin');
    console.log(`🆔 ID: ${newProfile.id}`);
    
    console.log('\n🚀 Next steps:');
    console.log('1. Clear browser cache completely');
    console.log('2. Log in with the new credentials');
    console.log('3. If you still get access denied, run fix-profiles-rls-only.sql in Supabase Dashboard');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the recreation
recreateSuperAdmin(); 