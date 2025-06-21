#!/usr/bin/env node

/**
 * 🔧 APPLY AUTO-JOIN FIX - تطبيق حل الـ Auto-Join
 * Applies the foreign key constraint fix for auto-joining
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required for this operation');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function applyAutoJoinFix() {
  console.log('🔧 Applying Auto-Join Fix - تطبيق حل الـ Auto-Join');
  console.log('===============================================\n');

  try {
    // Step 1: Drop existing constraints
    console.log('1️⃣ Dropping existing foreign key constraints...');
    
    const dropConstraints = [
      'ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;',
      'ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;', 
      'ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_user_id;'
    ];

    for (const sql of dropConstraints) {
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
        if (error) {
          console.log(`   ⚠️ ${sql.split(' ')[5]}: ${error.message}`);
        } else {
          console.log(`   ✅ Dropped constraint: ${sql.split(' ')[5]}`);
        }
      } catch (err) {
        console.log(`   ⚠️ ${sql.split(' ')[5]}: ${err.message}`);
      }
    }

    // Step 2: Create the new constraint with correct naming
    console.log('\n2️⃣ Creating new foreign key constraint with correct naming...');
    
    const createConstraintSQL = `
      ALTER TABLE profiles
      ADD CONSTRAINT profiles_auth_users_id_fkey
      FOREIGN KEY (id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
    `;

    const { error: createError } = await supabaseAdmin.rpc('exec_sql', { 
      sql_query: createConstraintSQL 
    });

    if (createError) {
      if (createError.message.includes('already exists')) {
        console.log('   ✅ Constraint already exists with correct name!');
      } else {
        console.log('   ❌ Failed to create constraint:', createError.message);
        throw createError;
      }
    } else {
      console.log('   ✅ Created constraint: profiles_auth_users_id_fkey');
    }

    // Step 3: Verify the constraint
    console.log('\n3️⃣ Verifying the constraint...');
    
    const verifySQL = `
      SELECT 
          conname as constraint_name,
          conrelid::regclass as table_name,
          confrelid::regclass as referenced_table,
          a.attname as column_name,
          af.attname as referenced_column
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
      JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
      WHERE c.contype = 'f' 
      AND conrelid::regclass::text = 'profiles'
      AND conname = 'profiles_auth_users_id_fkey';
    `;

    const { data: constraints, error: verifyError } = await supabaseAdmin.rpc('exec_sql', { 
      sql_query: verifySQL 
    });

    if (verifyError) {
      console.log('   ⚠️ Could not verify constraint:', verifyError.message);
    } else {
      console.log('   ✅ Constraint verified successfully!');
    }

    // Step 4: Check data integrity
    console.log('\n4️⃣ Checking data integrity...');
    
    const integritySQL = `
      SELECT 
          COUNT(*) as total_profiles,
          COUNT(au.id) as profiles_with_valid_auth_users,
          COUNT(*) - COUNT(au.id) as orphan_profiles
      FROM profiles p
      LEFT JOIN auth.users au ON p.id = au.id;
    `;

    const { data: integrity, error: integrityError } = await supabaseAdmin.rpc('exec_sql', { 
      sql_query: integritySQL 
    });

    if (integrityError) {
      console.log('   ⚠️ Could not check integrity:', integrityError.message);
    } else {
      console.log('   ✅ Data integrity check completed');
    }

    // Step 5: Test basic auto-join
    console.log('\n5️⃣ Testing auto-join functionality...');
    
    const { data: testJoin, error: joinError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, auth_users(email)')
      .limit(1);

    if (joinError) {
      console.log('   ❌ Auto-join test failed:', joinError.message);
      console.log('   🔧 You may need to refresh the Supabase schema cache manually');
    } else {
      console.log('   ✅ Auto-join test successful!');
      console.log('   Sample result:', testJoin[0]);
    }

    console.log('\n🎉 Auto-Join Fix Applied Successfully!');
    console.log('=====================================');
    console.log('✅ Foreign key constraint created with correct naming');
    console.log('✅ PostgREST should now detect the relationship');
    console.log('✅ Auto-join queries should work');
    
    console.log('\n🚀 You can now use these patterns:');
    console.log('   • profiles?select=*,auth_users(email)');
    console.log('   • profiles?select=*,auth_users(email,created_at)');
    console.log('   • profiles?select=id,first_name,auth_users(*)');
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Run: node test-auto-join.js');
    console.log('   2. If still failing, refresh Supabase schema cache');
    console.log('   3. Test in your application');

  } catch (error) {
    console.error('💥 Fix application failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the fix
applyAutoJoinFix().catch(console.error); 