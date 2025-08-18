const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseSchema() {
  try {
    console.log('🔍 [CHECK] Checking database schema...');
    
    // Check if profiles table exists and its structure
    console.log('\n📋 [CHECK] Checking profiles table...');
    const { data: profilesInfo, error: profilesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')
      .order('ordinal_position');
    
    if (profilesError) {
      console.error('❌ [CHECK] Error checking profiles table:', profilesError);
    } else if (profilesInfo && profilesInfo.length > 0) {
      console.log('✅ [CHECK] Profiles table exists with columns:');
      profilesInfo.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('❌ [CHECK] Profiles table does not exist!');
    }
    
    // Check if notifications table exists
    console.log('\n📋 [CHECK] Checking notifications table...');
    const { data: notificationsInfo, error: notificationsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'notifications')
      .order('ordinal_position');
    
    if (notificationsError) {
      console.error('❌ [CHECK] Error checking notifications table:', notificationsError);
    } else if (notificationsInfo && notificationsInfo.length > 0) {
      console.log('✅ [CHECK] Notifications table exists with columns:');
      notificationsInfo.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('❌ [CHECK] Notifications table does not exist!');
    }
    
    // Check all tables in public schema
    console.log('\n📋 [CHECK] All tables in public schema:');
    const { data: allTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tablesError) {
      console.error('❌ [CHECK] Error getting tables:', tablesError);
    } else if (allTables && allTables.length > 0) {
      console.log('✅ [CHECK] Found tables:');
      allTables.forEach(table => {
        console.log(`   - ${table.table_name} (${table.table_type})`);
      });
    } else {
      console.log('❌ [CHECK] No tables found in public schema!');
    }
    
    // Check if functions exist
    console.log('\n📋 [CHECK] Checking notification functions...');
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .like('routine_name', '%notification%')
      .order('routine_name');
    
    if (functionsError) {
      console.error('❌ [CHECK] Error checking functions:', functionsError);
    } else if (functions && functions.length > 0) {
      console.log('✅ [CHECK] Found notification functions:');
      functions.forEach(func => {
        console.log(`   - ${func.routine_name} (${func.routine_type})`);
      });
    } else {
      console.log('❌ [CHECK] No notification functions found!');
    }
    
    console.log('\n🎯 [CHECK] Schema check complete!');
    
  } catch (error) {
    console.error('❌ [CHECK] Schema check failed:', error);
  }
}

// Run the check
checkDatabaseSchema(); 