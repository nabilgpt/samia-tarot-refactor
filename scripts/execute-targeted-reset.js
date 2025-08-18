// Execute Targeted User Reset Script
// This script runs the targeted SQL reset in a controlled way

import { supabaseAdmin } from '../src/api/lib/supabase.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function executeTargetedReset() {
    console.log('🎯 Starting targeted user reset...');
    
    try {
        // Read the SQL script
        const sqlScript = readFileSync(join(__dirname, '../database/targeted-user-reset.sql'), 'utf8');
        
        // Split the script into individual statements
        const statements = sqlScript
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== 'BEGIN' && stmt !== 'COMMIT');
        
        console.log(`📋 Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Skip empty statements and comments
            if (!statement || statement.startsWith('--')) {
                continue;
            }
            
            console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
            
            try {
                // Execute the statement
                const { error } = await supabaseAdmin.rpc('exec_sql', { 
                    sql: statement 
                });
                
                if (error) {
                    console.log(`⚠️  Statement ${i + 1} warning: ${error.message}`);
                } else {
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                }
            } catch (err) {
                console.log(`⚠️  Statement ${i + 1} error: ${err.message}`);
                // Continue with next statement
            }
        }
        
        // Verify the results
        console.log('\n📊 Verifying results...');
        
        const { data: users, error: verifyError } = await supabaseAdmin
            .from('profiles')
            .select('email, role, name, is_active, encrypted_password')
            .order('email');
        
        if (verifyError) {
            console.error('❌ Error verifying users:', verifyError.message);
        } else {
            console.log('✅ User reset verification:');
            console.log(`👥 Total users: ${users.length}`);
            
            users.forEach(user => {
                const hasPassword = user.encrypted_password ? '✅' : '❌';
                const isActive = user.is_active ? '🟢' : '🔴';
                console.log(`  ${hasPassword} ${isActive} ${user.email} (${user.role}) - ${user.name}`);
            });
            
            const usersWithPasswords = users.filter(u => u.encrypted_password).length;
            const activeUsers = users.filter(u => u.is_active).length;
            
            console.log('\n📈 Summary:');
            console.log(`  - Total users: ${users.length}`);
            console.log(`  - Users with passwords: ${usersWithPasswords}`);
            console.log(`  - Active users: ${activeUsers}`);
            
            if (usersWithPasswords === users.length && activeUsers === users.length) {
                console.log('🎉 User reset completed successfully!');
                console.log('🔑 All users have password: TempPass!2024');
                console.log('🔐 Password hashing: bcrypt (12 salt rounds)');
            } else {
                console.log('⚠️  Some users may not have proper passwords or active status');
            }
        }
        
    } catch (error) {
        console.error('❌ Error during targeted reset:', error.message);
        process.exit(1);
    }
}

// Run the reset
executeTargetedReset(); 