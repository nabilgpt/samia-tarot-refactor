#!/usr/bin/env node

/**
 * RESET USERS SCRIPT - SAMIA TAROT
 * 
 * Drops all existing users and inserts new ones with bcrypt-hashed passwords.
 * Uses existing authentication helpers for consistency and production readiness.
 * 
 * USAGE: node scripts/reset-users.js
 * 
 * SECURITY: All passwords use bcrypt with 12 salt rounds
 * VALIDATION: Unique emails, valid roles, NOT NULL encrypted_password
 */

import 'dotenv/config';
import { supabaseAdmin } from '../src/api/lib/supabase.js';
import { hashPassword } from '../src/api/helpers/authenticationHelpers.js';

// Drop all users from profiles table and insert new list with bcrypt-hashed passwords
// This script handles foreign key constraints by clearing referenced tables first

async function resetUsers() {
    console.log('🔄 Starting users reset...');
    
    try {
        // Step 1: Clear all tables that reference profiles table (to avoid foreign key constraints)
        console.log('🗑️  Dropping all existing users (handling foreign keys)...');
        
        // Clear tables that reference profiles
        const tablesToClear = [
            'wallets',          // New: Clear wallets table
            'admin_actions',    // New: Clear admin_actions table
            'tarot_spreads',    // New: Clear tarot_spreads table
            'spread_approval_logs',
            'auth_audit_log',
            'configuration_access_log',
            'notification_templates',
            'notifications',
            'reader_spread_notifications',
            'audit_logs',
            'system_health_checks'
        ];
        
        // Special handling for secrets_access_log (doesn't have created_at)
        const specialTables = [
            'secrets_access_log'
        ];
        
        // Clear regular tables with created_at column
        for (const table of tablesToClear) {
            try {
                const { error } = await supabaseAdmin
                    .from(table)
                    .delete()
                    .gt('created_at', '1900-01-01'); // Delete all records (use timestamp comparison)
                
                if (error) {
                    console.log(`⚠️  Could not clear ${table}: ${error.message}`);
                } else {
                    console.log(`✅ Cleared ${table}`);
                }
            } catch (err) {
                console.log(`⚠️  Could not clear ${table}: ${err.message}`);
            }
        }
        
        // Clear special tables with different column structure
        for (const table of specialTables) {
            try {
                const { error } = await supabaseAdmin
                    .from(table)
                    .delete()
                    .gt('accessed_at', '1900-01-01'); // Use accessed_at instead of created_at
                
                if (error) {
                    console.log(`⚠️  Could not clear ${table}: ${error.message}`);
                } else {
                    console.log(`✅ Cleared ${table}`);
                }
            } catch (err) {
                console.log(`⚠️  Could not clear ${table}: ${err.message}`);
            }
        }
        
        // Step 2: Now delete all profiles
        const { error: dropError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .gt('created_at', '1900-01-01'); // Delete all records (use timestamp comparison)
        
        if (dropError) {
            throw new Error(`Error dropping users: ${JSON.stringify(dropError, null, 2)}`);
        }
        
        console.log('✅ All existing users dropped successfully');
        
        // Step 3: Insert new users with bcrypt-hashed passwords
        console.log('👥 Creating new users...');
        
        const newUsers = [
            {
                email: 'info@samiatarot.com',
                role: 'super_admin',
                is_active: true,
                name: 'Samia Tarot Admin',
                phone: '+1234567890',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                email: 'admin@samiatarot.com',
                role: 'admin', 
                is_active: true,
                name: 'System Administrator',
                phone: '+1234567891',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                email: 'reader1@samiatarot.com',
                role: 'reader',
                is_active: true,
                name: 'Senior Reader',
                phone: '+1234567892',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                email: 'reader2@samiatarot.com',
                role: 'reader',
                is_active: true,
                name: 'Junior Reader',
                phone: '+1234567893',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                email: 'client@samiatarot.com',
                role: 'client',
                is_active: true,
                name: 'Test Client',
                phone: '+1234567894',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                email: 'monitor@samiatarot.com',
                role: 'monitor',
                is_active: true,
                name: 'System Monitor',
                phone: '+1234567895',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
        
        // Hash password for all users (same temporary password)
        const tempPassword = 'TempPass!2024';
        console.log('🔐 Hashing passwords...');
        
        for (const user of newUsers) {
            user.encrypted_password = await hashPassword(tempPassword);
        }
        
        console.log('💾 Inserting new users...');
        const { data: insertedUsers, error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert(newUsers)
            .select();
        
        if (insertError) {
            throw new Error(`Error inserting users: ${JSON.stringify(insertError, null, 2)}`);
        }
        
        console.log('✅ Successfully created new users:');
        insertedUsers.forEach(user => {
            console.log(`  - ${user.email} (${user.role})`);
        });
        
        console.log('🎉 User reset completed successfully!');
        console.log('📋 Summary:');
        console.log(`  - Total users: ${insertedUsers.length}`);
        console.log(`  - Temporary password: ${tempPassword}`);
        console.log(`  - Password hashing: bcrypt (12 salt rounds)`);
        console.log(`  - All users have encrypted_password NOT NULL`);
        
    } catch (error) {
        console.error('❌ Error during user reset:', error.message);
        process.exit(1);
    }
}

// Run the reset
resetUsers(); 