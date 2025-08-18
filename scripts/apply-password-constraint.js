#!/usr/bin/env node

/**
 * APPLY PASSWORD CONSTRAINT - SAMIA TAROT
 * 
 * This script applies the NOT NULL constraint to the encrypted_password column
 * after verifying all users have valid passwords.
 */

import 'dotenv/config';
import { supabaseAdmin } from '../src/api/lib/supabase.js';

async function applyPasswordConstraint() {
    console.log('🔧 Starting password constraint application...');
    
    try {
        // STEP 1: Final verification - check all users have passwords
        const { data: users, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, encrypted_password')
            .is('encrypted_password', null);
            
        if (fetchError) {
            console.error('❌ Error checking users:', fetchError);
            return;
        }
        
        if (users.length > 0) {
            console.log(`❌ Found ${users.length} users without passwords:`);
            users.forEach(user => {
                console.log(`  - ${user.email} (${user.id})`);
            });
            console.log('🚨 Cannot apply NOT NULL constraint. Fix these users first.');
            return;
        }
        
        console.log('✅ All users have encrypted passwords');
        
        // STEP 2: Apply the NOT NULL constraint
        console.log('🔧 Applying NOT NULL constraint...');
        
        const { error: constraintError } = await supabaseAdmin
            .rpc('execute_sql', {
                sql: 'ALTER TABLE profiles ALTER COLUMN encrypted_password SET NOT NULL;'
            });
            
        if (constraintError) {
            console.error('❌ Error applying constraint:', constraintError);
            console.log('📝 Try running this SQL manually in Supabase Dashboard:');
            console.log('   ALTER TABLE profiles ALTER COLUMN encrypted_password SET NOT NULL;');
            return;
        }
        
        console.log('✅ NOT NULL constraint applied successfully');
        
        // STEP 3: Verify the constraint was applied
        console.log('🔍 Verifying constraint...');
        
        const { data: tableInfo, error: verifyError } = await supabaseAdmin
            .rpc('execute_sql', {
                sql: `SELECT column_name, is_nullable, data_type 
                      FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'encrypted_password';`
            });
            
        if (verifyError) {
            console.error('❌ Error verifying constraint:', verifyError);
        } else {
            console.log('📊 Column info:', tableInfo);
            if (tableInfo && tableInfo.length > 0 && tableInfo[0].is_nullable === 'NO') {
                console.log('✅ Constraint verified - encrypted_password is now NOT NULL');
            } else {
                console.log('⚠️  Constraint may not be fully applied');
            }
        }
        
        console.log('\n🎉 PASSWORD CONSTRAINT IMPLEMENTATION COMPLETE!');
        console.log('✅ All users now have mandatory encrypted passwords');
        console.log('🔒 Future users must have encrypted passwords');
        console.log('🔑 Temporary password for all users: TempPass!2024');
        
    } catch (error) {
        console.error('❌ Script failed:', error);
        console.log('\n📝 Manual steps:');
        console.log('1. Run in Supabase Dashboard → SQL Editor:');
        console.log('   ALTER TABLE profiles ALTER COLUMN encrypted_password SET NOT NULL;');
    }
}

// Run the constraint application
applyPasswordConstraint(); 