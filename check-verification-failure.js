import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://suxgmyeqzqmkxydsgkng.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1eGdteWVxenFta3h5ZHNna25nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDI2MjI2MiwiZXhwIjoyMDQ5ODM4MjYyfQ.wgITEvJ5MBKdHvIWPUNzj2hPRcSQ4JrFIXAIqcFsLLY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVerificationFailure() {
    console.log('🔍 Checking database state after Enterprise User Reset...\n');
    
    try {
        // Check 1: User count verification
        console.log('📊 Test 1: User Count Verification');
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('*')
            .eq('is_active', true);
        
        if (usersError) {
            console.error('❌ Error fetching users:', usersError);
            return;
        }
        
        console.log(`   Current active users: ${users.length}`);
        console.log(`   Expected: 5 users`);
        if (users.length !== 5) {
            console.log('   ❌ FAILED: Expected 5 users, got', users.length);
        } else {
            console.log('   ✅ PASSED: User count correct');
        }
        
        // Check 2: Expected users existence
        console.log('\n👥 Test 2: Expected Users Verification');
        const expectedEmails = [
            'info@samiatarot.com',
            'saeeeel@gmail.com', 
            'nabilzein@gmail.com',
            'nabilgpt.en@gmail.com',
            'sara@sara.com'
        ];
        
        const expectedRoles = {
            'info@samiatarot.com': 'super_admin',
            'saeeeel@gmail.com': 'admin',
            'nabilzein@gmail.com': 'monitor',
            'nabilgpt.en@gmail.com': 'reader',
            'sara@sara.com': 'reader'
        };
        
        let allUsersExist = true;
        for (const email of expectedEmails) {
            const user = users.find(u => u.email === email);
            if (!user) {
                console.log(`   ❌ Missing user: ${email}`);
                allUsersExist = false;
            } else {
                console.log(`   ✅ Found user: ${email} (role: ${user.role})`);
                if (user.role !== expectedRoles[email]) {
                    console.log(`   ❌ Wrong role for ${email}: expected ${expectedRoles[email]}, got ${user.role}`);
                    allUsersExist = false;
                }
            }
        }
        
        if (allUsersExist) {
            console.log('   ✅ PASSED: All expected users exist with correct roles');
        } else {
            console.log('   ❌ FAILED: Some expected users missing or have wrong roles');
        }
        
        // Check 3: Password encryption
        console.log('\n🔐 Test 3: Password Encryption Verification');
        let allPasswordsEncrypted = true;
        for (const user of users) {
            if (!user.encrypted_password) {
                console.log(`   ❌ User ${user.email} has no encrypted password`);
                allPasswordsEncrypted = false;
            } else if (!user.encrypted_password.startsWith('$2b$')) {
                console.log(`   ❌ User ${user.email} password not bcrypt encrypted`);
                allPasswordsEncrypted = false;
            } else {
                console.log(`   ✅ User ${user.email} has bcrypt encrypted password`);
            }
        }
        
        if (allPasswordsEncrypted) {
            console.log('   ✅ PASSED: All passwords properly encrypted');
        } else {
            console.log('   ❌ FAILED: Some passwords not properly encrypted');
        }
        
        // Check 4: Duplicate profiles
        console.log('\n🔄 Test 4: Duplicate Profile Cleanup');
        const { data: allProfiles, error: allProfilesError } = await supabase
            .from('profiles')
            .select('email, id, is_active');
        
        if (allProfilesError) {
            console.error('❌ Error fetching all profiles:', allProfilesError);
            return;
        }
        
        const emailCounts = {};
        for (const profile of allProfiles) {
            if (profile.email) {
                emailCounts[profile.email] = (emailCounts[profile.email] || 0) + 1;
            }
        }
        
        let hasDuplicates = false;
        for (const [email, count] of Object.entries(emailCounts)) {
            if (count > 1) {
                console.log(`   ❌ Duplicate profiles for ${email}: ${count} profiles`);
                hasDuplicates = true;
            }
        }
        
        if (!hasDuplicates) {
            console.log('   ✅ PASSED: No duplicate profiles found');
        } else {
            console.log('   ❌ FAILED: Duplicate profiles still exist');
        }
        
        // Summary
        console.log('\n📋 SUMMARY:');
        console.log(`   Total profiles in database: ${allProfiles.length}`);
        console.log(`   Active profiles: ${users.length}`);
        console.log(`   Inactive profiles: ${allProfiles.length - users.length}`);
        
        console.log('\n🔍 All active users:');
        for (const user of users) {
            console.log(`   - ${user.email} (${user.role}) - ID: ${user.id}`);
        }
        
        console.log('\n🗑️ All inactive users:');
        const inactiveUsers = allProfiles.filter(p => !p.is_active);
        for (const user of inactiveUsers) {
            console.log(`   - ${user.email || 'null'} - ID: ${user.id}`);
        }
        
    } catch (error) {
        console.error('❌ Script error:', error);
    }
}

checkVerificationFailure(); 