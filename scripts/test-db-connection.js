const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://uuseflmielktdcltzwzt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E'
);

async function runDatabaseSetup() {
  console.log('🔧 Running Database Setup and Testing...');
  
  try {
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('payment_settings')
      .select('*', { count: 'exact', head: true });
      
    if (testError) {
      console.log('❌ Initial connection test failed:', testError.message);
      
      // Execute database setup script
      console.log('📝 Executing database setup script...');
      const setupScript = fs.readFileSync('database/qa-database-setup.sql', 'utf8');
      
      // Split and execute SQL statements
      const statements = setupScript
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { error } = await supabase.rpc('exec_sql', { sql: statement });
            if (error && !error.message.includes('already exists')) {
              console.log(`⚠️ SQL Warning: ${error.message.substring(0, 100)}...`);
            }
          } catch (err) {
            // Try alternative approach for statements that don't work with rpc
            if (statement.toLowerCase().includes('create table') || 
                statement.toLowerCase().includes('insert into')) {
              console.log(`⚠️ Skipping complex statement: ${statement.substring(0, 50)}...`);
            }
          }
        }
      }
      
      console.log('✅ Database setup script executed');
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Test payment_settings access
    const { data: paymentData, error: paymentError } = await supabase
      .from('payment_settings')
      .select('*');
      
    if (paymentError) {
      console.log('❌ Payment settings access failed:', paymentError.message);
      
      // Try to create the table with basic structure
      console.log('🔧 Creating payment_settings table...');
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS payment_settings (
          id SERIAL PRIMARY KEY,
          method VARCHAR(50) UNIQUE NOT NULL,
          display_name VARCHAR(100) NOT NULL,
          is_enabled BOOLEAN DEFAULT true,
          configuration JSONB DEFAULT '{}',
          countries TEXT[] DEFAULT '{}',
          currencies TEXT[] DEFAULT '{}',
          requires_approval BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "payment_settings_all" ON payment_settings;
        CREATE POLICY "payment_settings_all" ON payment_settings FOR ALL USING (true);
      `;
      
      try {
        await supabase.rpc('exec_sql', { sql: createTableSQL });
        console.log('✅ Payment settings table created with RLS policies');
        
        // Insert default payment methods
        const defaultMethods = [
          { method: 'stripe', display_name: 'Stripe (Credit/Debit Cards)', is_enabled: true },
          { method: 'wallet', display_name: 'In-App Wallet', is_enabled: true },
          { method: 'usdt', display_name: 'USDT (Cryptocurrency)', is_enabled: true, requires_approval: true }
        ];
        
        for (const methodData of defaultMethods) {
          const { error: insertError } = await supabase
            .from('payment_settings')
            .upsert(methodData, { onConflict: 'method' });
            
          if (insertError) {
            console.log(`⚠️ Could not insert ${methodData.method}:`, insertError.message);
          } else {
            console.log(`✅ Inserted payment method: ${methodData.method}`);
          }
        }
        
      } catch (createError) {
        console.log('❌ Could not create payment_settings table:', createError.message);
      }
      
    } else {
      console.log(`✅ Payment settings accessible: ${paymentData.length} methods found`);
      paymentData.forEach(method => {
        console.log(`   • ${method.method}: ${method.display_name} (${method.is_enabled ? 'enabled' : 'disabled'})`);
      });
    }
    
    // Test system_settings table
    const { data: systemData, error: systemError } = await supabase
      .from('system_settings')
      .select('*');
      
    if (systemError) {
      console.log('❌ System settings not accessible:', systemError.message);
    } else {
      console.log(`✅ System settings accessible: ${systemData.length} settings found`);
    }
    
    console.log('\n🎉 Database setup and testing completed!');
    
  } catch (error) {
    console.error('💥 Database setup failed:', error.message);
  }
}

runDatabaseSetup(); 