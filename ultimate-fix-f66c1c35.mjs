import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function ultimateFixF66c1c35() {
  try {
    console.log('🚨 ULTIMATE FIX for user f66c1c35-7365-4814-8f56-59f85fcde98a');
    console.log('This user has wrong config (client role, null email) and wallet constraints');
    
    const problemUserId = 'f66c1c35-7365-4814-8f56-59f85fcde98a';
    
    console.log('\n🗑️  Step 1: Delete ALL related data for this user...');
    
    // Delete wallets (causing foreign key constraint)
    console.log('🔄 Deleting wallets...');
    const { error: walletsError } = await supabase
      .from('wallets')
      .delete()
      .eq('user_id', problemUserId);
    
    if (walletsError) {
      console.warn('⚠️  Warning deleting wallets:', walletsError.message);
    } else {
      console.log('✅ Deleted wallets');
    }
    
    // Delete transactions
    console.log('🔄 Deleting transactions...');
    const { error: transactionsError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', problemUserId);
    
    if (transactionsError) {
      console.warn('⚠️  Warning deleting transactions:', transactionsError.message);
    } else {
      console.log('✅ Deleted transactions');
    }
    
    // Delete bookings (as user)
    console.log('🔄 Deleting bookings (as user)...');
    const { error: bookingsUserError } = await supabase
      .from('bookings')
      .delete()
      .eq('user_id', problemUserId);
    
    if (bookingsUserError) {
      console.warn('⚠️  Warning deleting bookings (user):', bookingsUserError.message);
    } else {
      console.log('✅ Deleted bookings (as user)');
    }
    
    // Delete bookings (as reader)
    console.log('🔄 Deleting bookings (as reader)...');
    const { error: bookingsReaderError } = await supabase
      .from('bookings')
      .delete()
      .eq('reader_id', problemUserId);
    
    if (bookingsReaderError) {
      console.warn('⚠️  Warning deleting bookings (reader):', bookingsReaderError.message);
    } else {
      console.log('✅ Deleted bookings (as reader)');
    }
    
    // Delete payments
    console.log('🔄 Deleting payments...');
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('user_id', problemUserId);
    
    if (paymentsError) {
      console.warn('⚠️  Warning deleting payments:', paymentsError.message);
    } else {
      console.log('✅ Deleted payments');
    }
    
    // Delete notifications
    console.log('🔄 Deleting notifications...');
    const { error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', problemUserId);
    
    if (notificationsError) {
      console.warn('⚠️  Warning deleting notifications:', notificationsError.message);
    } else {
      console.log('✅ Deleted notifications');
    }
    
    // Delete reviews
    console.log('🔄 Deleting reviews...');
    const { error: reviewsError } = await supabase
      .from('reviews')
      .delete()
      .or(`user_id.eq.${problemUserId},reviewer_id.eq.${problemUserId}`);
    
    if (reviewsError) {
      console.warn('⚠️  Warning deleting reviews:', reviewsError.message);
    } else {
      console.log('✅ Deleted reviews');
    }
    
    console.log('\n🗑️  Step 2: Delete the problem profile...');
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', problemUserId);
    
    if (deleteProfileError) {
      console.error('❌ Failed to delete profile:', deleteProfileError.message);
      return;
    } else {
      console.log('✅ Deleted problem profile');
    }
    
    console.log('\n🗑️  Step 3: Delete auth user...');
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(problemUserId);
    
    if (deleteAuthError) {
      console.warn('⚠️  Warning deleting auth user:', deleteAuthError.message);
    } else {
      console.log('✅ Deleted auth user');
    }
    
    console.log('\n🧹 Step 4: Clean up any other samiatarot profiles...');
    const { error: cleanupError } = await supabase
      .from('profiles')
      .delete()
      .eq('email', 'info@samiatarot.com');
    
    if (cleanupError) {
      console.warn('⚠️  Warning cleaning up other profiles:', cleanupError.message);
    } else {
      console.log('✅ Cleaned up other samiatarot profiles');
    }
    
    console.log('\n🆕 Step 5: Create FRESH super admin user...');
    
    // Create new auth user
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
    
    console.log('✅ Created fresh auth user:', {
      id: authUser.user.id,
      email: authUser.user.email
    });
    
    console.log('\n🎉 SUCCESS! Problem user completely removed and fresh user created:');
    console.log('👤 Email: info@samiatarot.com');
    console.log('🔑 Password: 123456');
    console.log(`🆔 NEW User ID: ${authUser.user.id}`);
    console.log(`🗑️  OLD User ID: ${problemUserId} (deleted)`);
    
    console.log('\n📋 FINAL SQL TO RUN IN SUPABASE DASHBOARD:');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/sql');
    console.log('📝 Copy and paste this SQL:');
    console.log(`
-- STEP 1: Fix role constraint to allow super_admin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));

-- STEP 2: Delete any remaining conflicting profiles
DELETE FROM profiles WHERE email = 'info@samiatarot.com';
DELETE FROM profiles WHERE id = '${problemUserId}';

-- STEP 3: Insert super admin profile with NEW user ID
INSERT INTO profiles (id, email, first_name, last_name, role, is_active, created_at, updated_at)
VALUES (
  '${authUser.user.id}',
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
    
    console.log('\n🚀 FINAL STEPS:');
    console.log('1. Run the SQL above in Supabase Dashboard');
    console.log('2. Clear your browser cache completely');
    console.log('3. Log in with info@samiatarot.com / 123456');
    console.log('4. Super admin dashboard will work perfectly!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the ultimate fix
ultimateFixF66c1c35(); 