const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkExistingDatabase() {
  try {
    console.log('🔍 [CHECK] Checking existing database structure...');
    
    // Test profiles table structure
    console.log('\n📋 [CHECK] Testing profiles table...');
    try {
      const { data: profileTest, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (profileError) {
        console.error('❌ [CHECK] Profiles table error:', profileError);
      } else {
        console.log('✅ [CHECK] Profiles table exists');
        if (profileTest && profileTest.length > 0) {
          console.log('📊 [CHECK] Profile structure:', Object.keys(profileTest[0]));
        }
      }
    } catch (err) {
      console.error('❌ [CHECK] Profiles table test failed:', err.message);
    }
    
    // Test notifications table
    console.log('\n📋 [CHECK] Testing notifications table...');
    try {
      const { data: notifTest, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .limit(1);
      
      if (notifError) {
        console.error('❌ [CHECK] Notifications table error:', notifError);
      } else {
        console.log('✅ [CHECK] Notifications table exists');
        if (notifTest && notifTest.length > 0) {
          console.log('📊 [CHECK] Notifications structure:', Object.keys(notifTest[0]));
        }
      }
    } catch (err) {
      console.error('❌ [CHECK] Notifications table test failed:', err.message);
    }
    
    // Test other common tables
    const tablesToCheck = ['users', 'user_profiles', 'accounts', 'auth_users'];
    
    for (const tableName of tablesToCheck) {
      console.log(`\n📋 [CHECK] Testing ${tableName} table...`);
      try {
        const { data: tableTest, error: tableError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (tableError) {
          console.log(`❌ [CHECK] ${tableName} table error: ${tableError.message}`);
        } else {
          console.log(`✅ [CHECK] ${tableName} table exists`);
          if (tableTest && tableTest.length > 0) {
            console.log(`📊 [CHECK] ${tableName} structure:`, Object.keys(tableTest[0]));
          }
        }
      } catch (err) {
        console.log(`❌ [CHECK] ${tableName} table test failed: ${err.message}`);
      }
    }
    
    // Check for existing functions by trying to call them
    console.log('\n📋 [CHECK] Testing notification functions...');
    try {
      const { data: funcTest, error: funcError } = await supabase
        .rpc('get_unread_notifications_count', { target_user_id: 'c3922fea-329a-4d6e-800c-3e03c9fe341d' });
      
      if (funcError) {
        console.error('❌ [CHECK] get_unread_notifications_count function error:', funcError);
      } else {
        console.log('✅ [CHECK] get_unread_notifications_count function exists');
      }
    } catch (err) {
      console.error('❌ [CHECK] Function test failed:', err.message);
    }
    
    console.log('\n🎯 [CHECK] Database check complete!');
    
  } catch (error) {
    console.error('❌ [CHECK] Database check failed:', error);
  }
}

// Run the check
checkExistingDatabase(); 