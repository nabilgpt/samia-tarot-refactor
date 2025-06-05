import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixRLSPolicies() {
  try {
    console.log('🔧 Fixing RLS policies to include super_admin role...');
    
    // Read the SQL file
    const sqlContent = readFileSync('fix-super-admin-rls.sql', 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === '') {
        continue;
      }
      
      try {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}`);
        
        const { error } = await supabase.rpc('exec_sql', {
          query: statement
        });
        
        if (error) {
          console.warn(`⚠️  Warning on statement ${i + 1}:`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.warn(`⚠️  Error on statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log(`\n✅ RLS Policy Update Complete!`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⚠️  Warnings/Errors: ${errorCount}`);
    
    // Verify the super admin user
    console.log('\n🔍 Verifying super admin user...');
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('email', 'info@samiatarot.com')
      .single();
    
    if (userError) {
      console.error('❌ Error fetching user:', userError.message);
    } else {
      console.log('✅ Super admin user verified:', {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: user.role,
        isActive: user.is_active
      });
    }
    
    console.log('\n🚀 Next steps:');
    console.log('1. 🚪 Log out of your app completely');
    console.log('2. 🧹 Clear browser cache/cookies');
    console.log('3. 🔄 Refresh the page');
    console.log('4. 🔑 Log in with: info@samiatarot.com / 123456');
    console.log('5. 👑 You should now see the Super Admin Dashboard button!');
    console.log('6. 🔗 Try accessing /dashboard/super-admin directly');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the fix
fixRLSPolicies(); 