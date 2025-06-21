#!/usr/bin/env node

/**
 * SAMIA TAROT - Database Completion Script
 * Runs all database parts sequentially with error handling
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// List of SQL files to execute in order
const sqlFiles = [
    'part-1-tarot-core-tables.sql',
    'part-2-call-enhancements.sql', 
    'part-3-ai-system.sql',
    'part-4-fix-trigger-conflicts.sql',
    'part-5-fix-jsonb-error.sql'
];

/**
 * Execute a SQL file
 */
async function executeSqlFile(filename) {
    const startTime = Date.now();
    
    try {
        console.log(`\n🔧 Executing: ${filename}`);
        console.log('═'.repeat(60));
        
        const filePath = path.join(__dirname, filename);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Execute the SQL
        const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
        
        if (error) {
            throw error;
        }
        
        const duration = Date.now() - startTime;
        
        // Log the success message from the SQL if available
        if (data && data.length > 0) {
            const result = data[data.length - 1]; // Get the last result (success message)
            if (result.status) {
                console.log(`✅ ${result.status}`);
                if (result.tables_created || result.result) {
                    console.log(`📋 ${result.tables_created || result.result}`);
                }
            }
        }
        
        console.log(`⏱️  Completed in ${duration}ms`);
        return true;
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Error in ${filename} (${duration}ms):`);
        console.error(`   ${error.message}`);
        
        // Log specific error details
        if (error.code) {
            console.error(`   Error Code: ${error.code}`);
        }
        if (error.hint) {
            console.error(`   Hint: ${error.hint}`);
        }
        
        return false;
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 SAMIA TAROT - Database Completion Process');
    console.log('═'.repeat(60));
    console.log(`📅 Started: ${new Date().toISOString()}`);
    console.log(`🌐 Supabase URL: ${supabaseUrl}`);
    console.log(`📁 Database Directory: ${__dirname}`);
    
    const totalStartTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each SQL file in order
    for (const filename of sqlFiles) {
        const success = await executeSqlFile(filename);
        
        if (success) {
            successCount++;
        } else {
            errorCount++;
            
            // Ask user if they want to continue
            console.log('\n❓ Do you want to continue with the next file? (y/N)');
            const answer = await new Promise(resolve => {
                process.stdin.once('data', data => {
                    resolve(data.toString().trim().toLowerCase());
                });
            });
            
            if (answer !== 'y' && answer !== 'yes') {
                console.log('🛑 Process stopped by user');
                break;
            }
        }
    }
    
    // Final summary
    const totalDuration = Date.now() - totalStartTime;
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Successful: ${successCount}/${sqlFiles.length} files`);
    console.log(`❌ Errors: ${errorCount}/${sqlFiles.length} files`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📅 Completed: ${new Date().toISOString()}`);
    
    if (errorCount === 0) {
        console.log('\n🎉 ALL DATABASE PARTS COMPLETED SUCCESSFULLY!');
        console.log('🔥 SAMIA TAROT platform is now ready for testing');
    } else {
        console.log('\n⚠️  Some parts failed. Check the errors above.');
        console.log('💡 You can re-run individual files that failed.');
    }
    
    process.exit(errorCount === 0 ? 0 : 1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the main function
main().catch(error => {
    console.error('❌ Fatal Error:', error.message);
    process.exit(1);
}); 