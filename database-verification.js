const { supabase } = require('./src/api/lib/supabase');

async function verifyAllTables() {
    console.log('🔍 SAMIA TAROT DATABASE VERIFICATION');
    console.log('='.repeat(80));
    
    const tables = [
        'payment_settings',
        'system_settings', 
        'profiles',
        'bookings',
        'payment_methods',
        'wallet_transactions',
        'payment_receipts',
        'chat_sessions',
        'chat_messages',
        'voice_notes',
        'daily_analytics',
        'reader_analytics',
        'ai_reading_results',
        'user_activity_logs',
        'emergency_escalations',
        'emergency_alerts',
        'reader_applications'
    ];
    
    console.log('📋 Checking table accessibility...\n');
    
    const results = [];
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            
            if (error) {
                console.log(`❌ ${table}: ${error.message}`);
                results.push({ table, status: 'error', message: error.message });
            } else {
                console.log(`✅ ${table}: OK (${data ? data.length : 0} rows sample)`);
                results.push({ table, status: 'ok', count: data ? data.length : 0 });
            }
        } catch (err) {
            console.log(`❌ ${table}: ${err.message}`);
            results.push({ table, status: 'error', message: err.message });
        }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(80));
    
    const okTables = results.filter(r => r.status === 'ok');
    const errorTables = results.filter(r => r.status === 'error');
    
    console.log(`✅ Working tables: ${okTables.length}`);
    console.log(`❌ Error tables: ${errorTables.length}`);
    
    if (errorTables.length > 0) {
        console.log('\n🚨 TABLES WITH ERRORS:');
        errorTables.forEach(table => {
            console.log(`   ${table.table}: ${table.message}`);
        });
    }
    
    console.log('\n🔍 TESTING SPECIFIC OPERATIONS:');
    console.log('='.repeat(80));
    
    // Test payment system
    try {
        const { data, error } = await supabase.from('payment_settings').select('method, enabled').limit(5);
        if (error) {
            console.log(`❌ Payment settings query: ${error.message}`);
        } else {
            console.log(`✅ Payment settings: ${data.length} methods available`);
            data.forEach(method => console.log(`   - ${method.method}: ${method.enabled ? 'enabled' : 'disabled'}`));
        }
    } catch (err) {
        console.log(`❌ Payment settings error: ${err.message}`);
    }
    
    // Test system settings
    try {
        const { data, error } = await supabase.from('system_settings').select('setting_key, setting_category').limit(3);
        if (error) {
            console.log(`❌ System settings query: ${error.message}`);
        } else {
            console.log(`✅ System settings: ${data.length} settings available`);
        }
    } catch (err) {
        console.log(`❌ System settings error: ${err.message}`);
    }
    
    return results;
}

// Check for user_id column issues specifically
async function checkUserIdIssues() {
    console.log('\n🔍 CHECKING USER_ID COLUMN ISSUES:');
    console.log('='.repeat(80));
    
    const tablesWithUserId = [
        'payment_methods',
        'wallet_transactions', 
        'payment_receipts',
        'voice_notes',
        'ai_reading_results',
        'user_activity_logs',
        'emergency_escalations',
        'emergency_alerts',
        'reader_applications'
    ];
    
    for (const table of tablesWithUserId) {
        try {
            // Try to select user_id column specifically
            const { data, error } = await supabase.from(table).select('user_id').limit(1);
            
            if (error) {
                if (error.message.includes('user_id')) {
                    console.log(`❌ ${table}: user_id column issue - ${error.message}`);
                } else {
                    console.log(`⚠️ ${table}: other issue - ${error.message}`);
                }
            } else {
                console.log(`✅ ${table}: user_id column exists`);
            }
        } catch (err) {
            console.log(`❌ ${table}: ${err.message}`);
        }
    }
}

if (require.main === module) {
    verifyAllTables()
        .then(() => checkUserIdIssues())
        .then(() => {
            console.log('\n🎯 VERIFICATION COMPLETE!');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Verification failed:', err);
            process.exit(1);
        });
} 