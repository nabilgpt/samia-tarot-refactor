const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkNotificationsTable() {
  try {
    console.log('🔍 [CHECK] Checking notifications table structure...');
    
    // First, try to select everything from notifications table
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    if (notifError) {
      console.error('❌ [CHECK] Error reading notifications table:', notifError);
      return;
    }
    
    console.log('✅ [CHECK] Notifications table exists');
    
    if (notifications && notifications.length > 0) {
      console.log('📊 [CHECK] Current table structure:');
      const columns = Object.keys(notifications[0]);
      columns.forEach(col => {
        console.log(`   - ${col}`);
      });
      
      console.log('\n📋 [CHECK] Sample record:');
      console.log(JSON.stringify(notifications[0], null, 2));
    } else {
      console.log('📋 [CHECK] Table is empty, trying to insert a test record...');
      
      // Try to insert a simple test record to see what works
      const { data: insertData, error: insertError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: 'c3922fea-329a-4d6e-800c-3e03c9fe341d',
            type: 'test',
            title: 'Test Notification',
            message: 'This is a test message',
            is_read: false
          }
        ])
        .select();
      
      if (insertError) {
        console.error('❌ [CHECK] Insert test failed:', insertError);
        console.log('💡 [CHECK] This tells us about the table structure');
      } else {
        console.log('✅ [CHECK] Insert test successful');
        console.log('📊 [CHECK] Inserted record structure:');
        if (insertData && insertData.length > 0) {
          const columns = Object.keys(insertData[0]);
          columns.forEach(col => {
            console.log(`   - ${col}`);
          });
        }
      }
    }
    
    // Check if functions exist
    console.log('\n🔧 [CHECK] Testing notification functions...');
    
    try {
      const { data: funcResult, error: funcError } = await supabase
        .rpc('get_unread_notifications_count', { target_user_id: 'c3922fea-329a-4d6e-800c-3e03c9fe341d' });
      
      if (funcError) {
        console.error('❌ [CHECK] Function test failed:', funcError);
      } else {
        console.log('✅ [CHECK] get_unread_notifications_count function works!');
        console.log('📊 [CHECK] Unread count:', funcResult);
      }
    } catch (err) {
      console.error('❌ [CHECK] Function test exception:', err.message);
    }
    
    console.log('\n🎯 [CHECK] Table check complete!');
    
  } catch (error) {
    console.error('❌ [CHECK] Table check failed:', error);
  }
}

// Run the check
checkNotificationsTable(); 