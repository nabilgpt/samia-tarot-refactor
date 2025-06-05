const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function updateUserToSuperAdmin() {
  try {
    console.log('🔄 Updating user role to super_admin...');
    
    // First, let's check if the user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('email', 'info@samiatarot.com')
      .single();

    if (fetchError) {
      console.error('❌ Error fetching user:', fetchError.message);
      return;
    }

    if (!existingUser) {
      console.error('❌ User not found with email: info@samiatarot.com');
      return;
    }

    console.log('✅ User found:', {
      id: existingUser.id,
      email: existingUser.email,
      name: `${existingUser.first_name} ${existingUser.last_name}`,
      currentRole: existingUser.role,
      isActive: existingUser.is_active
    });

    // Update the user role to super_admin
    let { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: 'super_admin',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'info@samiatarot.com')
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating user role:', updateError.message);
      
      // If it's a constraint error, try to fix the constraint first
      if (updateError.message.includes('check constraint') || updateError.message.includes('profiles_role_check')) {
        console.log('🔧 Attempting to fix role constraint...');
        
        // This might require running raw SQL - let's try a different approach
        const { error: constraintError } = await supabase.rpc('exec_sql', {
          query: `
            ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
            ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
            CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));
          `
        });

        if (constraintError) {
          console.error('❌ Could not fix constraint. Please run this SQL manually in Supabase Dashboard:');
          console.log(`
            ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
            ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
            CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));
            
            UPDATE profiles 
            SET role = 'super_admin', updated_at = NOW()
            WHERE email = 'info@samiatarot.com';
          `);
          return;
        }

        // Try the update again
        const { data: retryUpdate, error: retryError } = await supabase
          .from('profiles')
          .update({ 
            role: 'super_admin',
            updated_at: new Date().toISOString()
          })
          .eq('email', 'info@samiatarot.com')
          .select()
          .single();

        if (retryError) {
          console.error('❌ Still failed after constraint fix:', retryError.message);
          return;
        }

        updatedUser = retryUpdate;
      } else {
        return;
      }
    }

    console.log('🎉 SUCCESS! User role updated to super_admin');
    console.log('✅ Updated user:', {
      id: updatedUser.id,
      email: updatedUser.email,
      name: `${updatedUser.first_name} ${updatedUser.last_name}`,
      newRole: updatedUser.role,
      updatedAt: updatedUser.updated_at
    });

    console.log('\n🚀 Next steps:');
    console.log('1. Log out of your app');
    console.log('2. Log in with info@samiatarot.com / 123456');
    console.log('3. Visit the homepage to see the Super Admin Dashboard button!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the update
updateUserToSuperAdmin(); 