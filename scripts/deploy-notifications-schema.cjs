const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deployNotificationsSchema() {
  try {
    console.log('🚀 [DEPLOY] Starting notifications schema deployment...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/12-notifications-system.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 [DEPLOY] SQL file read successfully');
    console.log('📊 [DEPLOY] File size:', sqlContent.length, 'characters');
    
    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log('📋 [DEPLOY] Found', statements.length, 'SQL statements');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim().length === 0) continue;
      
      console.log(`⚡ [DEPLOY] Executing statement ${i + 1}/${statements.length}`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });
        
        if (error) {
          // Try direct query if RPC fails
          const { error: queryError } = await supabase
            .from('dual')
            .select('*')
            .limit(0);
          
          if (queryError) {
            console.log(`⚠️  [DEPLOY] RPC not available, using direct execution`);
            
            // For direct execution, we'll need to use a different approach
            const { error: directError } = await supabase
              .query(statement + ';');
              
            if (directError) {
              console.error(`❌ [DEPLOY] Statement ${i + 1} failed:`, directError);
              throw directError;
            }
          }
        }
        
        console.log(`✅ [DEPLOY] Statement ${i + 1} executed successfully`);
        
      } catch (statementError) {
        console.error(`❌ [DEPLOY] Statement ${i + 1} failed:`, statementError);
        console.error('Statement:', statement.substring(0, 100) + '...');
        throw statementError;
      }
    }
    
    console.log('🎉 [DEPLOY] Notifications schema deployed successfully!');
    console.log('✅ [DEPLOY] Database is ready for notifications system');
    
  } catch (error) {
    console.error('❌ [DEPLOY] Schema deployment failed:', error);
    process.exit(1);
  }
}

// Run the deployment
deployNotificationsSchema(); 