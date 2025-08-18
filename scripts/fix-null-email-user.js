#!/usr/bin/env node

/**
 * FIX NULL EMAIL USER - SAMIA TAROT
 * 
 * This script fixes the specific user with null email that the migration missed.
 * It uses proper bcrypt hashing for the temporary password.
 */

import 'dotenv/config';
import { supabaseAdmin } from '../src/api/lib/supabase.js';
import bcrypt from 'bcryptjs';

async function fixNullEmailUser() {
    console.log('🔧 Starting fix for null email user...');
    
    try {
        // STEP 1: Check current status
        const { data: users, error: checkError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role, encrypted_password')
            .is('email', null);
            
        if (checkError) {
            console.error('❌ Error checking users:', checkError);
            return;
        }
        
        console.log('📊 Found users with null email:', users.length);
        
        if (users.length === 0) {
            console.log('✅ No users with null email found. All good!');
            return;
        }
        
        // STEP 2: Generate proper bcrypt hash for temporary password
        const tempPassword = 'TempPass!2024';
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);
        
        console.log('🔐 Generated bcrypt hash for temporary password');
        
        // STEP 3: Update the null email user
        for (const user of users) {
            console.log(`🔄 Updating user: ${user.id} (role: ${user.role})`);
            
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    encrypted_password: hashedPassword,
                    password_updated_at: new Date().toISOString(),
                    email: user.role === 'super_admin' ? 'admin@samiatarot.com' : `user_${user.id.slice(0, 8)}@samiatarot.com`
                })
                .eq('id', user.id);
                
            if (updateError) {
                console.error(`❌ Error updating user ${user.id}:`, updateError);
            } else {
                console.log(`✅ Successfully updated user ${user.id}`);
                console.log(`📧 Email set to: ${user.role === 'super_admin' ? 'admin@samiatarot.com' : `user_${user.id.slice(0, 8)}@samiatarot.com`}`);
                console.log(`🔑 Temporary password: ${tempPassword}`);
            }
        }
        
        // STEP 4: Verify all users now have passwords
        const { data: finalCheck, error: finalError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role, encrypted_password')
            .is('encrypted_password', null);
            
        if (finalError) {
            console.error('❌ Error in final check:', finalError);
            return;
        }
        
        console.log('\n📊 FINAL STATUS:');
        console.log(`Users without passwords: ${finalCheck.length}`);
        
        if (finalCheck.length === 0) {
            console.log('🎉 SUCCESS: All users now have encrypted passwords!');
            console.log('✅ Ready to proceed with adding NOT NULL constraint');
        } else {
            console.log('⚠️  Still have users without passwords:');
            finalCheck.forEach(user => {
                console.log(`- ${user.id} (${user.email}) - ${user.role}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Script failed:', error);
    }
}

// Run the fix
fixNullEmailUser(); 