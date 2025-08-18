// =============================================================================
// EXISTING USERS PASSWORD MIGRATION - SAMIA TAROT
// Fix users without encrypted_password field
// =============================================================================

// Load environment variables
import 'dotenv/config';

import { supabaseAdmin } from '../src/api/lib/supabase.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Generate secure temporary password
function generateSecurePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one uppercase letter
    password += chars.charAt(Math.floor(Math.random() * 26));
    
    // Ensure at least one lowercase letter
    password += chars.charAt(Math.floor(Math.random() * 26) + 26);
    
    // Ensure at least one number
    password += chars.charAt(Math.floor(Math.random() * 10) + 52);
    
    // Ensure at least one special character
    password += chars.charAt(Math.floor(Math.random() * 8) + 62);
    
    // Fill remaining characters randomly
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Hash password using bcrypt
async function hashPassword(password) {
    const saltRounds = 12; // Higher salt rounds for better security
    return await bcrypt.hash(password, saltRounds);
}

// Validate password strength
function validatePasswordStrength(password) {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[!@#$%^&*]/.test(password)) return false;
    return true;
}

// Log migration action
async function logMigrationAction(action, userId, email, details) {
    try {
        await supabaseAdmin
            .from('auth_audit_log')
            .insert([{
                user_id: userId,
                email: email,
                action: action,
                ip_address: '127.0.0.1', // Migration script
                user_agent: 'Password Migration Script',
                success: true,
                failure_reason: null,
                session_id: 'migration-' + Date.now()
            }]);
    } catch (error) {
        console.error('❌ Failed to log migration action:', error);
    }
}

// =============================================================================
// MAIN MIGRATION FUNCTION
// =============================================================================

async function migrateExistingUsers() {
    try {
        console.log('🔐 Starting password migration for existing users...');
        console.log('=' .repeat(60));

        // Get all users without encrypted_password
        const { data: usersWithoutPassword, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, first_name, last_name, role, is_active, created_at')
            .or('encrypted_password.is.null,encrypted_password.eq.')
            .order('created_at', { ascending: true });

        if (fetchError) {
            console.error('❌ Error fetching users without passwords:', fetchError);
            throw fetchError;
        }

        if (!usersWithoutPassword || usersWithoutPassword.length === 0) {
            console.log('✅ No users found without encrypted passwords. Migration not needed.');
            return;
        }

        console.log(`📊 Found ${usersWithoutPassword.length} users without encrypted passwords:`);
        console.log('');

        // Log users that will be migrated
        usersWithoutPassword.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} (${user.role}) - ${user.is_active ? 'Active' : 'Inactive'}`);
        });

        console.log('');
        console.log('🔄 Starting password generation and hashing...');
        console.log('');

        const migrationResults = [];
        let successCount = 0;
        let failureCount = 0;

        // Process each user
        for (const user of usersWithoutPassword) {
            try {
                console.log(`🔄 Processing: ${user.email}...`);

                // Generate secure temporary password
                const tempPassword = generateSecurePassword();
                
                // Validate password strength
                if (!validatePasswordStrength(tempPassword)) {
                    throw new Error('Generated password does not meet strength requirements');
                }

                // Hash the password
                const hashedPassword = await hashPassword(tempPassword);

                // Update user record
                const { error: updateError } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        encrypted_password: hashedPassword,
                        password_updated_at: new Date().toISOString(),
                        failed_login_attempts: 0,
                        locked_until: null
                    })
                    .eq('id', user.id);

                if (updateError) {
                    throw updateError;
                }

                // Log the migration action
                await logMigrationAction('password_migration', user.id, user.email, {
                    temporary_password_generated: true,
                    migration_timestamp: new Date().toISOString()
                });

                // Store result for summary
                migrationResults.push({
                    user_id: user.id,
                    email: user.email,
                    role: user.role,
                    temporary_password: tempPassword,
                    success: true
                });

                console.log(`✅ ${user.email} - Password updated successfully`);
                successCount++;

            } catch (error) {
                console.error(`❌ ${user.email} - Migration failed:`, error.message);
                
                migrationResults.push({
                    user_id: user.id,
                    email: user.email,
                    role: user.role,
                    temporary_password: null,
                    success: false,
                    error: error.message
                });

                failureCount++;
            }
        }

        console.log('');
        console.log('=' .repeat(60));
        console.log('📊 MIGRATION SUMMARY');
        console.log('=' .repeat(60));
        console.log(`✅ Successfully migrated: ${successCount} users`);
        console.log(`❌ Failed migrations: ${failureCount} users`);
        console.log(`📝 Total users processed: ${usersWithoutPassword.length}`);
        console.log('');

        // Display temporary passwords for successful migrations
        if (successCount > 0) {
            console.log('🔑 TEMPORARY PASSWORDS (SAVE THIS OUTPUT):');
            console.log('=' .repeat(60));
            
            migrationResults
                .filter(result => result.success)
                .forEach(result => {
                    console.log(`${result.email} (${result.role}): ${result.temporary_password}`);
                });
            
            console.log('');
            console.log('⚠️  IMPORTANT SECURITY NOTES:');
            console.log('1. These are temporary passwords - users should change them immediately');
            console.log('2. Save this output securely and delete it after users have been notified');
            console.log('3. Consider implementing a password reset flow for production use');
            console.log('4. These passwords meet all security requirements (8+ chars, mixed case, numbers, symbols)');
        }

        // Display failed migrations
        if (failureCount > 0) {
            console.log('');
            console.log('❌ FAILED MIGRATIONS:');
            console.log('=' .repeat(60));
            
            migrationResults
                .filter(result => !result.success)
                .forEach(result => {
                    console.log(`${result.email}: ${result.error}`);
                });
        }

        // Log migration summary
        await supabaseAdmin
            .from('auth_migration_log')
            .insert([{
                migration_step: 'existing_users_password_migration',
                description: `Migrated ${successCount} users without encrypted passwords`,
                affected_users: successCount,
                status: failureCount > 0 ? 'partial' : 'completed',
                error_message: failureCount > 0 ? `${failureCount} users failed to migrate` : null
            }]);

        console.log('');
        console.log('✅ Password migration completed successfully!');
        
        if (successCount > 0) {
            console.log('');
            console.log('🎯 NEXT STEPS:');
            console.log('1. Update backend authentication logic to use encrypted_password field');
            console.log('2. Add final NOT NULL constraint to encrypted_password column');
            console.log('3. Test authentication with the new system');
            console.log('4. Notify users of their temporary passwords');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        
        // Log migration failure
        try {
            await supabaseAdmin
                .from('auth_migration_log')
                .insert([{
                    migration_step: 'existing_users_password_migration',
                    description: 'Failed to migrate users without encrypted passwords',
                    affected_users: 0,
                    status: 'failed',
                    error_message: error.message
                }]);
        } catch (logError) {
            console.error('❌ Failed to log migration failure:', logError);
        }
        
        throw error;
    }
}

// =============================================================================
// EXECUTE MIGRATION
// =============================================================================

// Check if running as main module
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateExistingUsers()
        .then(() => {
            console.log('🎉 Migration script completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Migration script failed:', error);
            process.exit(1);
        });
}

export { migrateExistingUsers, generateSecurePassword, hashPassword, validatePasswordStrength }; 