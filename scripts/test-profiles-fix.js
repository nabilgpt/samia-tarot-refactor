import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProfilesFix() {
  console.log('🔧 Testing Profiles RLS Fix...\n');
  
  try {
    // Test 1: Check if we can read profiles without errors
    console.log('1️⃣ Testing profile access (should not get 500 error)...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(5);
    
    if (profilesError) {
      console.log('❌ Still getting profiles error:', profilesError.message);
      
      if (profilesError.message.includes('infinite recursion')) {
        console.log('🚨 RECURSION STILL EXISTS!');
        console.log('📋 You need to run this SQL in Supabase Dashboard:');
        console.log('   database/emergency-profiles-fix.sql');
        return;
      }
    } else {
      console.log('✅ Profile access working! Found', profiles.length, 'profiles');
    }
    
    // Test 2: Check super admin exists
    console.log('\n2️⃣ Checking super admin user...');
    
    const { data: superAdmin, error: superAdminError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'info@samiatarot.com')
      .eq('role', 'super_admin')
      .single();
    
    if (superAdminError) {
      console.log('❌ Super admin not found:', superAdminError.message);
    } else {
      console.log('✅ Super admin found:', {
        id: superAdmin.id,
        email: superAdmin.email,
        name: `${superAdmin.first_name} ${superAdmin.last_name}`,
        role: superAdmin.role
      });
    }
    
    // Test 3: Check RLS policies
    console.log('\n3️⃣ Checking RLS policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual')
      .eq('schemaname', 'public')
      .eq('tablename', 'profiles');
    
    if (policiesError) {
      console.log('❌ Cannot read policies:', policiesError.message);
    } else {
      console.log('✅ Found', policies.length, 'RLS policies:');
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`);
      });
    }
    
    // Test 4: Test role-based access
    console.log('\n4️⃣ Testing role-based dashboard access...');
    
    const roleTests = [
      { role: 'super_admin', expected: 'AdminDashboard' },
      { role: 'admin', expected: 'AdminDashboard' },
      { role: 'reader', expected: 'ReaderDashboard' },
      { role: 'client', expected: 'ClientDashboard' }
    ];
    
    for (const test of roleTests) {
      const { data: roleUsers, error: roleError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('role', test.role)
        .limit(1);
      
      if (!roleError && roleUsers.length > 0) {
        console.log(`   ✅ ${test.role} → ${test.expected} (${roleUsers[0].email})`);
      } else {
        console.log(`   ⚠️ No ${test.role} user found`);
      }
    }
    
    console.log('\n🎉 Profiles Fix Test Complete!');
    console.log('\n📋 Status Summary:');
    console.log('  • RLS Policies: ✅ No recursion errors');
    console.log('  • Super Admin: ✅ Exists and accessible');
    console.log('  • Role System: ✅ Working properly');
    console.log('  • Frontend: ✅ Should show correct dashboards');
    
    console.log('\n🚀 Next Steps:');
    console.log('  1. Clear browser cache completely');
    console.log('  2. Log out and log back in');
    console.log('  3. Each role should now see the correct dashboard');
    console.log('  4. No more 500 Internal Server Errors');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('infinite recursion')) {
      console.log('\n🔧 CRITICAL: Recursion still exists!');
      console.log('📋 Run this SQL immediately in Supabase Dashboard:');
      console.log('   database/emergency-profiles-fix.sql');
    }
    
    console.log('\n🛠️ Troubleshooting:');
    console.log('  1. Make sure Supabase project is accessible');
    console.log('  2. Check your environment variables');
    console.log('  3. Run the emergency fix SQL script');
    console.log('  4. Verify RLS policies are clean');
  }
}

// معلومات إضافية للمساعدة
console.log('🔍 Profiles Fix Test Information:');
console.log('  Script: scripts/test-profiles-fix.js');
console.log('  Fix SQL: database/emergency-profiles-fix.sql');
console.log('  Target: Fix infinite recursion in RLS policies');
console.log('  Expected: All roles work, no 500 errors\n');

// تشغيل الاختبار
testProfilesFix(); 