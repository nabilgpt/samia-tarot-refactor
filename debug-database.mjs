import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugDatabase() {
  try {
    console.log('🔍 Debugging database state...');
    
    // Check all profiles with email containing samiatarot
    console.log('\n📋 All profiles with samiatarot email:');
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, is_active')
      .ilike('email', '%samiatarot%');
    
    if (allProfilesError) {
      console.error('❌ Error fetching profiles:', allProfilesError.message);
    } else {
      console.log('Found profiles:', allProfiles);
    }
    
    // Check specific email
    console.log('\n📋 Profile with exact email info@samiatarot.com:');
    const { data: exactProfile, error: exactError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'info@samiatarot.com');
    
    if (exactError) {
      console.error('❌ Error fetching exact profile:', exactError.message);
    } else {
      console.log('Exact profile:', exactProfile);
    }
    
    // Check the latest created user ID that might be causing the duplicate
    console.log('\n📋 Recent auth users:');
    const recentUsers = [
      '9867a417-7667-4bdf-8ef2-e738ded6c424', // From previous attempt
      // Add any other IDs we've seen
    ];
    
    for (const userId of recentUsers) {
      console.log(`\nChecking user ID: ${userId}`);
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);
      
      if (userError) {
        console.log(`❌ Error for ${userId}:`, userError.message);
      } else {
        console.log(`Profile for ${userId}:`, userProfile);
      }
    }
    
    // Let's clean up any orphaned data
    console.log('\n🧹 Cleaning up...');
    
    // Delete any profiles with samiatarot email
    const { error: cleanupError } = await supabase
      .from('profiles')
      .delete()
      .ilike('email', '%samiatarot%');
    
    if (cleanupError) {
      console.warn('⚠️  Warning cleaning up:', cleanupError.message);
    } else {
      console.log('✅ Cleaned up all samiatarot profiles');
    }
    
    // Try to delete the specific user IDs that might be causing issues
    for (const userId of recentUsers) {
      console.log(`🗑️  Deleting user ID: ${userId}`);
      
      // Delete profile first
      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (deleteProfileError) {
        console.warn(`⚠️  Warning deleting profile ${userId}:`, deleteProfileError.message);
      }
      
      // Delete auth user
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
      
      if (deleteAuthError) {
        console.warn(`⚠️  Warning deleting auth user ${userId}:`, deleteAuthError.message);
      } else {
        console.log(`✅ Deleted auth user ${userId}`);
      }
    }
    
    // Final verification
    console.log('\n✅ Final verification - checking if database is clean:');
    const { data: finalCheck, error: finalError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', '%samiatarot%');
    
    if (finalError) {
      console.error('❌ Error in final check:', finalError.message);
    } else {
      console.log('Remaining samiatarot profiles:', finalCheck);
      if (finalCheck.length === 0) {
        console.log('🎉 Database is clean! Ready to create fresh super admin.');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the debug
debugDatabase(); 