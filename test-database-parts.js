const { supabase } = require('./src/api/lib/supabase');
const fs = require('fs');
const path = require('path');

async function testDatabasePart(partName, sqlFile) {
    console.log(`\n🔧 Testing ${partName}...`);
    console.log('='.repeat(60));
    
    try {
        // Read SQL file
        const sqlPath = path.join(__dirname, 'database', sqlFile);
        if (!fs.existsSync(sqlPath)) {
            console.log(`❌ SQL file not found: ${sqlPath}`);
            return false;
        }
        
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log(`📄 SQL file loaded: ${sqlFile}`);
        
        // Split SQL into individual statements and execute one by one
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        console.log(`📋 Found ${statements.length} SQL statements`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (!statement) continue;
            
            try {
                // Execute each statement individually
                const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
                
                if (error) {
                    console.log(`❌ Statement ${i + 1} failed:`, error.message);
                    console.log(`   SQL: ${statement.substring(0, 100)}...`);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (err) {
                console.log(`❌ Statement ${i + 1} error:`, err.message);
                console.log(`   SQL: ${statement.substring(0, 100)}...`);
                errorCount++;
            }
        }
        
        console.log(`\n📊 Results for ${partName}:`);
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Failed: ${errorCount}`);
        
        return errorCount === 0;
        
    } catch (error) {
        console.log(`❌ Error testing ${partName}:`, error.message);
        return false;
    }
}

async function testAllParts() {
    console.log('🚀 SAMIA TAROT DATABASE PARTS TESTING');
    console.log('='.repeat(80));
    
    const parts = [
        { name: 'Master Setup', file: '00-master-setup.sql' },
        { name: 'Payment System', file: '01-payment-system.sql' },
        { name: 'Chat System', file: '02-chat-system.sql' },
        { name: 'Analytics System', file: '03-analytics-system.sql' },
        { name: 'Emergency System', file: '04-emergency-system.sql' },
        { name: 'Foreign Keys', file: '05-foreign-keys.sql' }
    ];
    
    const results = [];
    
    for (const part of parts) {
        const success = await testDatabasePart(part.name, part.file);
        results.push({ name: part.name, success });
        
        // Add delay between parts
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎯 FINAL RESULTS:');
    console.log('='.repeat(80));
    
    results.forEach(result => {
        const status = result.success ? '✅ PASSED' : '❌ FAILED';
        console.log(`${status} - ${result.name}`);
    });
    
    const totalPassed = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Summary: ${totalPassed} passed, ${totalFailed} failed`);
    
    if (totalFailed === 0) {
        console.log('🎉 ALL DATABASE PARTS WORKING CORRECTLY!');
    } else {
        console.log('⚠️ Some parts need attention - check errors above');
    }
}

// Alternative: Test with direct SQL execution (if exec_sql doesn't work)
async function testWithDirectQuery(partName, sqlFile) {
    console.log(`\n🔧 Testing ${partName} with direct queries...`);
    
    try {
        const sqlPath = path.join(__dirname, 'database', sqlFile);
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // For testing, just try to create one table from each part
        if (sqlFile.includes('01-payment')) {
            const { error } = await supabase.from('payment_methods').select('*').limit(1);
            console.log('Payment methods table:', error ? `❌ ${error.message}` : '✅ OK');
        }
        
        if (sqlFile.includes('02-chat')) {
            const { error } = await supabase.from('chat_sessions').select('*').limit(1);
            console.log('Chat sessions table:', error ? `❌ ${error.message}` : '✅ OK');
        }
        
        if (sqlFile.includes('03-analytics')) {
            const { error } = await supabase.from('daily_analytics').select('*').limit(1);
            console.log('Daily analytics table:', error ? `❌ ${error.message}` : '✅ OK');
        }
        
        if (sqlFile.includes('04-emergency')) {
            const { error } = await supabase.from('emergency_escalations').select('*').limit(1);
            console.log('Emergency escalations table:', error ? `❌ ${error.message}` : '✅ OK');
        }
        
    } catch (error) {
        console.log(`❌ Error:`, error.message);
    }
}

// Run the test
if (require.main === module) {
    testAllParts().then(() => {
        console.log('\n🔍 Testing table accessibility...');
        return Promise.all([
            testWithDirectQuery('Payment System', '01-payment-system.sql'),
            testWithDirectQuery('Chat System', '02-chat-system.sql'),
            testWithDirectQuery('Analytics System', '03-analytics-system.sql'),
            testWithDirectQuery('Emergency System', '04-emergency-system.sql')
        ]);
    }).then(() => {
        process.exit(0);
    }).catch(err => {
        console.error('❌ Test failed:', err);
        process.exit(1);
    });
} 