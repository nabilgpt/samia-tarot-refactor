import fetch from 'node-fetch';

async function checkUsersViaBackend() {
    console.log('🔍 Checking database state via backend API...\n');
    
    try {
        // Test backend health first
        console.log('🏥 Testing backend health...');
        const healthResponse = await fetch('http://localhost:5001/api/health');
        if (healthResponse.ok) {
            console.log('✅ Backend is healthy');
        } else {
            console.log('❌ Backend health check failed');
            return;
        }
        
        // Create a test request to get users (this would need authentication in real scenario)
        console.log('\n👥 Checking users via backend...');
        
        // Since we don't have authentication token, let's try a simple query
        // Let's create a direct SQL query instead
        console.log('📝 Need to run SQL query directly...');
        
        console.log('\n🔧 RECOMMENDATION:');
        console.log('Run the following SQL queries directly in your database:');
        console.log('');
        console.log('1. Check active users:');
        console.log('   SELECT email, role, is_active, encrypted_password IS NOT NULL as has_password FROM profiles WHERE is_active = true ORDER BY email;');
        console.log('');
        console.log('2. Check all users:');
        console.log('   SELECT email, role, is_active, id FROM profiles ORDER BY is_active DESC, email;');
        console.log('');
        console.log('3. Check for duplicates:');
        console.log('   SELECT email, COUNT(*) as count FROM profiles WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1;');
        console.log('');
        console.log('4. Check password encryption:');
        console.log('   SELECT email, encrypted_password LIKE \'$2b$%\' as is_bcrypt FROM profiles WHERE is_active = true;');
        
    } catch (error) {
        console.error('❌ Script error:', error.message);
    }
}

checkUsersViaBackend(); 