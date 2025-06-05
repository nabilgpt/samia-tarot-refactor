import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function forceRecreateSuperAdmin() {
  try {
    console.log('🔍 Step 1: Checking existing super admin user...');
    
    // Find the existing user
    const { data: existingUser, error: findError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', 'info@samiatarot.com')
      .single();
    
    if (existingUser) {
      console.log('✅ Found existing user:', {
        id: existingUser.id,
        email: existingUser.email,
        role: existingUser.role
      });
      
      if (existingUser.role === 'super_admin') {
        console.log('💡 User already has super_admin role. Issue is likely RLS policies.');
        console.log('🔧 Let\'s fix the RLS policies instead of recreating the user.');
        
        // Try to test RLS policy access
        console.log('\n🧪 Testing RLS policy access...');
        
        // Using service role should bypass RLS, so this should work
        const { data: testData, error: testError } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('id', existingUser.id)
          .single();
        
        if (testError) {
          console.error('❌ Even service role query failed:', testError.message);
        } else {
          console.log('✅ Service role query successful:', testData);
        }
        
        console.log('\n📋 SOLUTION: Run this SQL in Supabase Dashboard (Database > SQL Editor):');
        console.log(`
-- Fix RLS policies for super_admin access
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable by all" ON profiles;

-- Recreate with super_admin support
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles viewable by all" ON profiles 
  FOR SELECT USING (role = 'reader' AND is_active = true);

-- CRITICAL: Allow super_admin to access everything
CREATE POLICY "Super admins can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );
        `);
        
        console.log('\n🚀 After running the SQL:');
        console.log('1. Clear browser cache completely');
        console.log('2. Log out and log back in');
        console.log('3. Super admin access should work!');
        
        return;
      }
      
      // If not super_admin, let's update the role
      console.log('🔄 Updating existing user to super_admin role...');
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: 'super_admin',
          updated_at: new Date().toISOString()
        })
        .eq('email', 'info@samiatarot.com')
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Failed to update role:', updateError.message);
        
        if (updateError.message.includes('check constraint') || updateError.message.includes('profiles_role_check')) {
          console.log('\n🔧 Role constraint issue. Run this SQL first:');
          console.log(`
-- Fix role constraint to allow super_admin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));

-- Update user to super_admin
UPDATE profiles 
SET role = 'super_admin', updated_at = NOW()
WHERE email = 'info@samiatarot.com';
          `);
        }
        return;
      }
      
      console.log('✅ Updated user role to super_admin:', {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      });
      
    } else {
      console.log('❌ No existing user found. Let\'s create a new one...');
      
      // Create new user with a different email temporarily, then update
      const tempEmail = `super-admin-${Date.now()}@samiatarot.com`;
      
      console.log(`🆕 Creating new user with temp email: ${tempEmail}`);
      
      const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
        email: tempEmail,
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
      
      console.log('✅ Created auth user with temp email');
      
      // Create profile
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: newAuthUser.user.id,
          email: tempEmail,
          first_name: 'Super',
          last_name: 'Admin',
          role: 'super_admin',
          is_active: true
        })
        .select()
        .single();
      
      if (createProfileError) {
        console.error('❌ Failed to create profile:', createProfileError.message);
        return;
      }
      
      // Update email to the desired one
      const { error: updateEmailError } = await supabase.auth.admin.updateUserById(
        newAuthUser.user.id,
        { email: 'info@samiatarot.com' }
      );
      
      if (updateEmailError) {
        console.warn('⚠️  Warning updating email:', updateEmailError.message);
      }
      
      // Update profile email
      const { error: updateProfileEmailError } = await supabase
        .from('profiles')
        .update({ email: 'info@samiatarot.com' })
        .eq('id', newAuthUser.user.id);
      
      if (updateProfileEmailError) {
        console.warn('⚠️  Warning updating profile email:', updateProfileEmailError.message);
      }
      
      console.log('✅ Created new super admin user');
    }
    
    console.log('\n🎉 Super Admin User Ready!');
    console.log('👤 Email: info@samiatarot.com');
    console.log('🔑 Password: 123456');
    console.log('👑 Role: super_admin');
    
    console.log('\n🚀 FINAL STEPS:');
    console.log('1. Run the RLS policy fix SQL in Supabase Dashboard');
    console.log('2. Clear browser cache completely');
    console.log('3. Log in with info@samiatarot.com / 123456');
    console.log('4. Super admin access should work!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the force recreation
forceRecreateSuperAdmin(); 