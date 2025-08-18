#!/usr/bin/env node

/**
 * FIX BCRYPT FORMAT ISSUE - SAMIA TAROT
 * 
 * This script fixes users with invalid bcrypt hash formats that don't match 
 * the encrypted_password_format constraint pattern.
 * 
 * CONSTRAINT: encrypted_password ~ '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$'
 * EXPECTED FORMAT: $2a$12$[53 chars of bcrypt alphabet]
 */

import 'dotenv/config';
import { supabaseAdmin } from '../src/api/lib/supabase.js';
import bcrypt from 'bcryptjs';

// Bcrypt format regex pattern (same as database constraint)
const BCRYPT_FORMAT_PATTERN = /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/;

async function checkBcryptFormat(hash) {
    return BCRYPT_FORMAT_PATTERN.test(hash);
}

async function fixBcryptFormats() {
    console.log('🔧 Starting bcrypt format fix...');
    
    try {
        // STEP 1: Get all users and check their password formats
        const { data: users, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role, encrypted_password');
            
        if (fetchError) {
            console.error('❌ Error fetching users:', fetchError);
            return;
        }
        
        console.log(`📊 Found ${users.length} users to check`);
        
        // STEP 2: Check each user's password format
        const invalidUsers = [];
        
        for (const user of users) {
            if (!user.encrypted_password) {
                console.log(`⚠️  User ${user.email} has no encrypted_password`);
                invalidUsers.push(user);
            } else if (!await checkBcryptFormat(user.encrypted_password)) {
                console.log(`❌ User ${user.email} has invalid bcrypt format`);
                console.log(`   Current hash: ${user.encrypted_password.substring(0, 20)}...`);
                invalidUsers.push(user);
            } else {
                console.log(`✅ User ${user.email} has valid bcrypt format`);
            }
        }
        
        if (invalidUsers.length === 0) {
            console.log('🎉 All users have valid bcrypt formats!');
            return;
        }
        
        console.log(`🔧 Found ${invalidUsers.length} users with invalid formats`);
        
        // STEP 3: Generate proper bcrypt hashes for invalid users
        const tempPassword = 'TempPass!2024';
        const saltRounds = 12;
        
        for (const user of invalidUsers) {
            console.log(`\n🔄 Fixing user: ${user.email} (${user.role})`);
            
            // Generate a proper bcrypt hash
            const properHash = await bcrypt.hash(tempPassword, saltRounds);
            
            // Verify the hash format
            if (!await checkBcryptFormat(properHash)) {
                console.error(`❌ Generated hash is still invalid for ${user.email}`);
                continue;
            }
            
            console.log(`✅ Generated valid bcrypt hash for ${user.email}`);
            console.log(`   Hash format: ${properHash.substring(0, 20)}...`);
            
            // Update the user in database
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    encrypted_password: properHash,
                    password_updated_at: new Date().toISOString()
                })
                .eq('id', user.id);
                
            if (updateError) {
                console.error(`❌ Error updating user ${user.email}:`, updateError);
            } else {
                console.log(`✅ Successfully updated user ${user.email}`);
                console.log(`🔑 Temporary password: ${tempPassword}`);
            }
        }
        
        // STEP 4: Final verification
        console.log('\n📊 FINAL VERIFICATION:');
        
        const { data: finalUsers, error: finalError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role, encrypted_password');
            
        if (finalError) {
            console.error('❌ Error in final verification:', finalError);
            return;
        }
        
        let validCount = 0;
        let invalidCount = 0;
        
        for (const user of finalUsers) {
            if (user.encrypted_password && await checkBcryptFormat(user.encrypted_password)) {
                validCount++;
            } else {
                invalidCount++;
                console.log(`❌ Still invalid: ${user.email}`);
            }
        }
        
        console.log(`✅ Valid bcrypt formats: ${validCount}`);
        console.log(`❌ Invalid bcrypt formats: ${invalidCount}`);
        
        if (invalidCount === 0) {
            console.log('🎉 SUCCESS: All users now have valid bcrypt formats!');
            console.log('✅ Ready to add NOT NULL constraint');
        } else {
            console.log('⚠️  Some users still have invalid formats');
        }
        
    } catch (error) {
        console.error('❌ Script failed:', error);
    }
}

// Run the fix
fixBcryptFormats(); 