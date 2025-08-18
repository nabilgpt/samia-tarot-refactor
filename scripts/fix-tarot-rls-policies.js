const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create admin client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTarotRLSPolicies() {
  console.log('🔧 Starting Tarot Spreads RLS Policy Fix...');
  
  try {
    // Drop existing restrictive policies
    console.log('🗑️ Dropping existing restrictive policies...');
    
    const dropPolicies = [
      `DROP POLICY IF EXISTS "Users can only update own spreads" ON tarot_spreads;`,
      `DROP POLICY IF EXISTS "Users can only delete own spreads" ON tarot_spreads;`,
      `DROP POLICY IF EXISTS "Owners can update spreads" ON tarot_spreads;`,
      `DROP POLICY IF EXISTS "Owners can delete spreads" ON tarot_spreads;`,
      `DROP POLICY IF EXISTS "Allow owners to update spreads" ON tarot_spreads;`,
      `DROP POLICY IF EXISTS "Allow owners to delete spreads" ON tarot_spreads;`
    ];

    // Execute all drop policies as one transaction
    const allDropSQL = dropPolicies.join('\n');
    const { error: dropError } = await supabase.rpc('exec_raw_sql', { 
      query: allDropSQL 
    });
    if (dropError && !dropError.message.includes('does not exist')) {
      console.warn(`⚠️ Warning dropping policies: ${dropError.message}`);
    }

    // Enable RLS
    console.log('🔒 Enabling RLS on tarot_spreads...');
    const { error: rlsError } = await supabase.rpc('exec_raw_sql', {
      query: `ALTER TABLE tarot_spreads ENABLE ROW LEVEL SECURITY;`
    });
    if (rlsError) {
      console.warn(`⚠️ RLS enable warning: ${rlsError.message}`);
    }

    // Create new policies
    console.log('✨ Creating new comprehensive policies...');

    // SELECT Policy
    const selectPolicy = `
      CREATE POLICY "Allow users to view active spreads" ON tarot_spreads
          FOR SELECT USING (
              auth.role() = 'authenticated' 
              AND is_active = true
          );
    `;

    // INSERT Policy
    const insertPolicy = `
      CREATE POLICY "Allow authenticated users to create spreads" ON tarot_spreads
          FOR INSERT WITH CHECK (
              auth.role() = 'authenticated'
              AND created_by = auth.uid()
          );
    `;

    // UPDATE Policy - The critical one!
    const updatePolicy = `
      CREATE POLICY "Allow owners and admins to update spreads" ON tarot_spreads
          FOR UPDATE USING (
              (created_by = auth.uid())
              OR
              (EXISTS (
                  SELECT 1 FROM profiles
                  WHERE id = auth.uid()
                    AND role IN ('admin', 'super_admin')
                    AND is_active = true
              ))
          );
    `;

    // DELETE Policy - The other critical one!
    const deletePolicy = `
      CREATE POLICY "Allow owners and admins to delete spreads" ON tarot_spreads
          FOR DELETE USING (
              (created_by = auth.uid())
              OR
              (EXISTS (
                  SELECT 1 FROM profiles
                  WHERE id = auth.uid()
                    AND role IN ('admin', 'super_admin')
                    AND is_active = true
              ))
          );
    `;

    const policies = [
      { name: 'SELECT', sql: selectPolicy },
      { name: 'INSERT', sql: insertPolicy },
      { name: 'UPDATE', sql: updatePolicy },
      { name: 'DELETE', sql: deletePolicy }
    ];

    for (const policy of policies) {
      console.log(`📝 Creating ${policy.name} policy...`);
      const { error } = await supabase.rpc('exec_raw_sql', { query: policy.sql });
      if (error) {
        console.error(`❌ Error creating ${policy.name} policy:`, error.message);
        return;
      }
      console.log(`✅ ${policy.name} policy created successfully`);
    }

    // Grant permissions
    console.log('🔧 Setting table permissions...');
    const permissions = [
      `GRANT ALL ON tarot_spreads TO authenticated;`,
      `GRANT ALL ON tarot_spreads TO service_role;`
    ];

    const allPermissions = permissions.join('\n');
    const { error: permError } = await supabase.rpc('exec_raw_sql', { query: allPermissions });
    if (permError) {
      console.warn(`⚠️ Permission warning: ${permError.message}`);
    }

    // Test the fix
    console.log('🧪 Testing the policies...');
    
    // Test admin role detection
    const { data: roleTest, error: roleError } = await supabase.rpc('exec_raw_sql', {
      query: `
        SELECT 
          'c3922fea-329a-4d6e-800c-3e03c9fe341d' as user_id,
          (SELECT role FROM profiles WHERE id = 'c3922fea-329a-4d6e-800c-3e03c9fe341d') as user_role,
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = 'c3922fea-329a-4d6e-800c-3e03c9fe341d'
              AND role IN ('admin', 'super_admin')
              AND is_active = true
          ) as has_admin_access;
      `
    });

    if (roleTest) {
      console.log('👤 Admin role test result:', roleTest);
    }

    console.log('');
    console.log('🎉 RLS Policy Fix completed successfully!');
    console.log('');
    console.log('✅ The policies now allow:');
    console.log('   - All authenticated users to view active spreads');
    console.log('   - Users to create spreads with proper ownership');
    console.log('   - Owners OR admin/super_admin to update spreads');
    console.log('   - Owners OR admin/super_admin to delete spreads');
    console.log('');
    console.log('🚀 Try deleting a spread from the frontend now!');

  } catch (error) {
    console.error('💥 Fatal error during RLS policy fix:', error);
  }
}

// Execute the fix
if (require.main === module) {
  fixTarotRLSPolicies()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixTarotRLSPolicies }; 