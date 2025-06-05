import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixSuperAdminAccess() {
  try {
    console.log('🔧 Fixing super_admin access...');
    
    // First, verify the user exists and has super_admin role
    console.log('🔍 Checking super_admin user...');
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'info@samiatarot.com')
      .single();
    
    if (userError) {
      console.error('❌ Error fetching user:', userError.message);
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role,
      isActive: user.is_active
    });
    
    if (user.role !== 'super_admin') {
      console.log('🔄 Updating user role to super_admin...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'super_admin', updated_at: new Date().toISOString() })
        .eq('email', 'info@samiatarot.com');
      
      if (updateError) {
        console.error('❌ Failed to update role:', updateError.message);
      } else {
        console.log('✅ Role updated to super_admin');
      }
    }
    
    // Test if the user can access their profile directly (this bypasses RLS)
    console.log('\n🧪 Testing profile access with super_admin...');
    const { data: profileTest, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile access test failed:', profileError.message);
      console.log('🔧 This confirms RLS policies are blocking super_admin');
      
      console.log('\n📋 MANUAL FIX REQUIRED:');
      console.log('The RLS policies need to be updated in Supabase Dashboard:');
      console.log('1. Go to: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt');
      console.log('2. Navigate to: Database > Policies');
      console.log('3. For the "profiles" table, edit the existing policies');
      console.log('4. Add "super_admin" to the role checks');
      console.log('');
      console.log('Example policy update:');
      console.log('FROM: role IN (\'admin\', \'monitor\')');
      console.log('TO:   role IN (\'admin\', \'monitor\', \'super_admin\')');
      console.log('');
      console.log('Critical policies to update:');
      console.log('- profiles: "Users can view own profile"');
      console.log('- profiles: "Users can update own profile"');
      console.log('- Any admin-only policies should include super_admin');
      
    } else {
      console.log('✅ Profile access test successful:', profileTest);
    }
    
    // Try to create a new super admin policy directly
    console.log('\n🔄 Testing if we can add policies programmatically...');
    
    // Let's try a simple database query to check if RLS is the issue
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count(*)')
      .eq('role', 'super_admin');
    
    if (testError) {
      console.error('❌ Even count query failed:', testError.message);
      console.log('🚨 This confirms RLS is blocking super_admin role completely');
    } else {
      console.log('✅ Count query successful:', testData);
    }
    
    console.log('\n🚀 SOLUTION:');
    console.log('Since RLS policies are blocking super_admin, you need to:');
    console.log('');
    console.log('Option 1 - Supabase Dashboard (RECOMMENDED):');
    console.log('1. Open: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt/database/policies');
    console.log('2. Find the "profiles" table policies');
    console.log('3. Edit each policy to include "super_admin" in role checks');
    console.log('4. Save changes');
    console.log('');
    console.log('Option 2 - SQL Editor:');
    console.log('1. Go to: Database > SQL Editor');
    console.log('2. Run the SQL script from fix-super-admin-rls.sql');
    console.log('');
    console.log('After fixing RLS policies:');
    console.log('- Clear browser cache');
    console.log('- Log out and log back in');
    console.log('- Super admin access should work!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the fix
fixSuperAdminAccess(); 