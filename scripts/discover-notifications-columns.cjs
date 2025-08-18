const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function discoverNotificationsColumns() {
  try {
    console.log('🔍 [DISCOVER] Discovering notifications table columns...');
    
    // Common column names to test
    const possibleColumns = [
      'id', 'user_id', 'type', 'title', 'message', 'body', 'content', 
      'is_read', 'read', 'status', 'created_at', 'updated_at', 'timestamp',
      'data', 'metadata', 'priority', 'category', 'action_url', 'read_at'
    ];
    
    const existingColumns = [];
    
    for (const column of possibleColumns) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select(column)
          .limit(1);
        
        if (!error) {
          existingColumns.push(column);
          console.log(`✅ [DISCOVER] Column '${column}' exists`);
        } else {
          console.log(`❌ [DISCOVER] Column '${column}' does not exist`);
        }
      } catch (err) {
        console.log(`❌ [DISCOVER] Column '${column}' test failed: ${err.message}`);
      }
    }
    
    console.log('\n📊 [DISCOVER] Existing columns found:');
    existingColumns.forEach(col => {
      console.log(`   - ${col}`);
    });
    
    // Try to create a minimal compatible record
    if (existingColumns.length > 0) {
      console.log('\n🧪 [DISCOVER] Testing with discovered columns...');
      
      // Create a minimal record with only the columns we found
      const testRecord = {};
      
      if (existingColumns.includes('user_id')) {
        testRecord.user_id = 'c3922fea-329a-4d6e-800c-3e03c9fe341d';
      }
      if (existingColumns.includes('type')) {
        testRecord.type = 'test';
      }
      if (existingColumns.includes('title')) {
        testRecord.title = 'Test Notification';
      }
      if (existingColumns.includes('message')) {
        testRecord.message = 'This is a test message';
      }
      if (existingColumns.includes('body')) {
        testRecord.body = 'This is a test message';
      }
      if (existingColumns.includes('content')) {
        testRecord.content = 'This is a test message';
      }
      if (existingColumns.includes('is_read')) {
        testRecord.is_read = false;
      }
      if (existingColumns.includes('read')) {
        testRecord.read = false;
      }
      if (existingColumns.includes('status')) {
        testRecord.status = 'unread';
      }
      
      console.log('🧪 [DISCOVER] Test record:', JSON.stringify(testRecord, null, 2));
      
      const { data: insertData, error: insertError } = await supabase
        .from('notifications')
        .insert([testRecord])
        .select();
      
      if (insertError) {
        console.error('❌ [DISCOVER] Insert test failed:', insertError);
      } else {
        console.log('✅ [DISCOVER] Insert test successful!');
        console.log('📊 [DISCOVER] Inserted record structure:');
        if (insertData && insertData.length > 0) {
          const columns = Object.keys(insertData[0]);
          columns.forEach(col => {
            console.log(`   - ${col}: ${insertData[0][col]}`);
          });
        }
      }
    }
    
    console.log('\n🎯 [DISCOVER] Discovery complete!');
    
  } catch (error) {
    console.error('❌ [DISCOVER] Discovery failed:', error);
  }
}

// Run the discovery
discoverNotificationsColumns(); 