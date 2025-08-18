const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deployNotificationsSchema() {
  try {
    console.log('🚀 [DEPLOY] Starting simplified notifications schema deployment...');
    
    // Check if notifications table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'notifications');
    
    if (tableError) {
      console.log('⚠️  [DEPLOY] Cannot check existing tables, proceeding anyway...');
    }
    
    if (tables && tables.length > 0) {
      console.log('✅ [DEPLOY] Notifications table already exists');
      return;
    }
    
    console.log('📋 [DEPLOY] Creating notifications system manually...');
    
    // Since we can't execute raw SQL, let's use a different approach
    // We'll manually insert the schema using Supabase's built-in functions
    
    // Create a simple notification entry to test
    const { error: insertError } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: 'c3922fea-329a-4d6e-800c-3e03c9fe341d',
          type: 'test',
          title: 'Test Notification',
          body: 'This is a test notification',
          metadata: { source: 'deployment_test' },
          priority: 'low',
          is_read: false
        }
      ]);
      
    if (insertError) {
      console.error('❌ [DEPLOY] Table does not exist, need to create schema manually');
      console.error('Error:', insertError);
      
      // Since we can't create the table via the client, let's output instructions
      console.log('');
      console.log('📋 [DEPLOY] MANUAL SETUP REQUIRED:');
      console.log('');
      console.log('Please run the following SQL manually in your Supabase SQL editor:');
      console.log('');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of database/12-notifications-system.sql');
      console.log('4. Click "Run" to execute the schema');
      console.log('');
      console.log('Once complete, restart your backend server and the notifications will work.');
      
      return;
    }
    
    console.log('✅ [DEPLOY] Test notification created successfully');
    console.log('🎉 [DEPLOY] Schema appears to be working!');
    
  } catch (error) {
    console.error('❌ [DEPLOY] Schema deployment failed:', error);
    
    // Output manual instructions
    console.log('');
    console.log('📋 [DEPLOY] MANUAL SETUP REQUIRED:');
    console.log('');
    console.log('Please run the following SQL manually in your Supabase SQL editor:');
    console.log('');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of database/12-notifications-system.sql');
    console.log('4. Click "Run" to execute the schema');
    console.log('');
    console.log('Once complete, restart your backend server and the notifications will work.');
  }
}

// Run the deployment
deployNotificationsSchema(); 