import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function refreshUserProfile() {
  try {
    console.log('🔄 Force refreshing user profile...');
    
    // Get current user data
    const { data: user, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'info@samiatarot.com')
      .single();

    if (fetchError) {
      console.error('❌ Error fetching user:', fetchError.message);
      return;
    }

    console.log('✅ Current user profile:', {
      id: user.id,
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });

    if (user.role === 'super_admin') {
      console.log('🎉 CONFIRMED: User is already a super_admin!');
      console.log('\n🔧 To fix authentication issues:');
      console.log('1. 🚪 Log out completely from the app');
      console.log('2. 🧹 Clear browser cache/cookies for localhost:3000');
      console.log('3. 🔄 Refresh the page');
      console.log('4. 🔑 Log in again with: info@samiatarot.com / 123456');
      console.log('5. 👑 Check homepage for Super Admin Dashboard button');
      
      console.log('\n🌐 Or try opening in incognito/private browsing mode');
    } else {
      console.log('❌ User role is not super_admin, updating...');
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: 'super_admin',
          updated_at: new Date().toISOString()
        })
        .eq('email', 'info@samiatarot.com');

      if (updateError) {
        console.error('❌ Failed to update role:', updateError.message);
      } else {
        console.log('✅ Role updated to super_admin');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the refresh
refreshUserProfile(); 