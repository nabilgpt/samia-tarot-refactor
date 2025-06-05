import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function completeCleanupAndCreate() {
  try {
    console.log('🧹 Complete cleanup and fresh super admin creation...');
    
    const orphanedUserId = '9867a417-7667-4bdf-8ef2-e738ded6c424';
    
    console.log('\n🗑️  Step 1: Clean up orphaned user completely...');
    
    // Delete wallet for orphaned user
    console.log('🔄 Deleting wallet for orphaned user...');
    const { error: walletError } = await supabase
      .from('wallets')
      .delete()
      .eq('user_id', orphanedUserId);
    
    if (walletError) {
      console.warn('⚠️  Warning deleting wallet:', walletError.message);
    } else {
      console.log('✅ Deleted wallet');
    }
    
    // Delete other related data
    const relatedTables = ['transactions', 'bookings', 'payments', 'notifications'];
    
    for (const table of relatedTables) {
      console.log(`🔄 Deleting from ${table}...`);
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', orphanedUserId);
      
      if (error) {
        console.warn(`⚠️  Warning deleting from ${table}:`, error.message);
      } else {
        console.log(`✅ Deleted from ${table}`);
      }
    }
    
    // Also check reader_id in bookings
    const { error: bookingsReaderError } = await supabase
      .from('bookings')
      .delete()
      .eq('reader_id', orphanedUserId);
    
    if (bookingsReaderError) {
      console.warn('⚠️  Warning deleting bookings (reader):', bookingsReaderError.message);
    } else {
      console.log('✅ Deleted bookings (as reader)');
    }
    
    // Now delete the profile
    console.log('🗑️  Deleting orphaned profile...');
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', orphanedUserId);
    
    if (deleteProfileError) {
      console.warn('⚠️  Warning deleting profile:', deleteProfileError.message);
    } else {
      console.log('✅ Deleted orphaned profile');
    }
    
    // Delete auth user
    console.log('🗑️  Deleting orphaned auth user...');
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(orphanedUserId);
    
    if (deleteAuthError) {
      console.warn('⚠️  Warning deleting auth user:', deleteAuthError.message);
    } else {
      console.log('✅ Deleted orphaned auth user');
    }
    
    console.log('\n🆕 Step 2: Create fresh super admin user...');
    
    // Create new auth user
    const { data: authUser, error: createAuthError } = await supabase.auth.admin.createUser({
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
      id: authUser.user.id,
      email: authUser.user.email
    });
    
    // Create profile
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
      
      if (createProfileError.message.includes('check constraint')) {
        console.log('\n🔧 CONSTRAINT ISSUE! Run this SQL in Supabase Dashboard:');
        console.log('Go to: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql');
        console.log(`
-- Fix role constraint to allow super_admin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));

-- Then manually insert the profile
INSERT INTO profiles (id, email, first_name, last_name, role, is_active, created_at, updated_at)
VALUES (
  '${authUser.user.id}',
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
      id: profile.id,
      email: profile.email,
      name: `${profile.first_name} ${profile.last_name}`,
      role: profile.role,
      isActive: profile.is_active
    });
    
    // Test access
    console.log('\n🧪 Testing database access...');
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
    
    console.log('\n🚀 FINAL STEPS TO COMPLETE SETUP:');
    console.log('1. Run the RLS policy fix SQL below in Supabase Dashboard');
    console.log('2. Clear browser cache completely');
    console.log('3. Log in with info@samiatarot.com / 123456');
    console.log('4. Super admin dashboard should work perfectly!');
    
    console.log('\n📋 RLS POLICY FIX SQL (copy to Supabase Dashboard):');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql');
    console.log('📝 Copy and paste this SQL:');
    console.log(`
-- CLEAN RLS POLICIES FOR SUPER ADMIN ACCESS
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

-- CREATE FRESH POLICIES
CREATE POLICY "allow_own_profile_view" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "allow_own_profile_update" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "allow_public_readers" ON profiles 
  FOR SELECT USING (role = 'reader' AND is_active = true);

CREATE POLICY "allow_super_admin_all" ON profiles
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

// Run the complete cleanup and creation
completeCleanupAndCreate(); 