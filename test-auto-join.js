#!/usr/bin/env node

/**
 * 🧪 AUTO-JOIN TEST - اختبار الـ Auto-Join
 * Testing auto-join functionality between profiles and auth.users
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

async function testAutoJoin() {
  console.log('🧪 Testing Auto-Join Functionality - اختبار الـ Auto-Join');
  console.log('=====================================================\n');

  try {
    // Test 1: Basic auto-join with auth_users
    console.log('1️⃣ Testing basic auto-join: profiles + auth_users...');
    const { data: profilesWithAuth, error: joinError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, auth_users(email, created_at)')
      .limit(5);

    if (joinError) {
      console.log('❌ Auto-join failed:', joinError.message);
      console.log('   Code:', joinError.code);
      console.log('   Details:', joinError.details);
      
      if (joinError.message.includes('relationship') || joinError.message.includes('auth_users')) {
        console.log('\n🔧 SOLUTION NEEDED:');
        console.log('   1. Run the SQL script: fix-auto-join-constraint.sql');
        console.log('   2. Refresh Supabase schema cache');
        console.log('   3. Retry this test');
      }
    } else {
      console.log('✅ Auto-join successful!');
      console.log(`   Found ${profilesWithAuth.length} profiles with auth data`);
      
      if (profilesWithAuth.length > 0) {
        console.log('   Sample result:');
        console.log('   ', JSON.stringify(profilesWithAuth[0], null, 2));
      }
    }

    // Test 2: Specific user auto-join
    console.log('\n2️⃣ Testing specific user auto-join...');
    const { data: specificUser, error: specificError } = await supabase
      .from('profiles')
      .select('*, auth_users(*)')
      .eq('role', 'super_admin')
      .limit(1)
      .single();

    if (specificError) {
      console.log('❌ Specific user auto-join failed:', specificError.message);
    } else {
      console.log('✅ Specific user auto-join successful!');
      console.log('   User:', specificUser.first_name, specificUser.last_name);
      console.log('   Auth email:', specificUser.auth_users?.email || 'N/A');
    }

    // Test 3: Multiple join patterns
    console.log('\n3️⃣ Testing different join patterns...');
    
    const joinTests = [
      {
        name: 'Email only',
        query: supabase.from('profiles').select('id, first_name, auth_users(email)').limit(3)
      },
      {
        name: 'Created date only', 
        query: supabase.from('profiles').select('id, first_name, auth_users(created_at)').limit(3)
      },
      {
        name: 'Full auth data',
        query: supabase.from('profiles').select('id, first_name, auth_users(*)').limit(2)
      }
    ];

    for (const test of joinTests) {
      try {
        const { data, error } = await test.query;
        if (error) {
          console.log(`   ❌ ${test.name}: ${error.message}`);
        } else {
          console.log(`   ✅ ${test.name}: ${data.length} records`);
        }
      } catch (err) {
        console.log(`   ❌ ${test.name}: ${err.message}`);
      }
    }

    // Test 4: Admin-level auto-join (if available)
    if (supabaseAdmin) {
      console.log('\n4️⃣ Testing admin-level auto-join...');
      const { data: adminJoin, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('*, auth_users(email, email_confirmed_at, last_sign_in_at)')
        .limit(3);

      if (adminError) {
        console.log('❌ Admin auto-join failed:', adminError.message);
      } else {
        console.log('✅ Admin auto-join successful!');
        console.log(`   Retrieved ${adminJoin.length} profiles with extended auth data`);
      }
    }

    console.log('\n📊 Auto-Join Test Summary:');
    console.log('===========================');
    
    if (!joinError) {
      console.log('🎉 SUCCESS: Auto-join is working correctly!');
      console.log('✅ You can now use: select=*,auth_users(...)');
      console.log('✅ PostgREST detected the foreign key relationship');
      console.log('✅ No more 400 "relationship not found" errors');
      
      console.log('\n🚀 Available Auto-Join Patterns:');
      console.log('   • profiles?select=*,auth_users(email)');
      console.log('   • profiles?select=*,auth_users(email,created_at)');
      console.log('   • profiles?select=id,first_name,auth_users(*)');
      console.log('   • profiles?select=*,auth_users(*)');
    } else {
      console.log('❌ FAILED: Auto-join is not working yet');
      console.log('🔧 Next steps:');
      console.log('   1. Execute: fix-auto-join-constraint.sql in Supabase');
      console.log('   2. Refresh schema cache in Supabase Dashboard');
      console.log('   3. Run this test again');
    }

  } catch (error) {
    console.error('💥 Test suite crashed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testAutoJoin().catch(console.error); 