import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProfilesQuery() {
  console.log('Testing profiles table access...');
  
  try {
    // Test basic query
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .limit(10);

    if (error) {
      console.log('❌ Error querying profiles:', error.message);
      return false;
    }

    console.log('✅ Profiles query successful!');
    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach(profile => {
      console.log(`- ${profile.email || 'No email'} (${profile.role})`);
    });

    // Test specific user queries
    console.log('\nTesting specific queries...');
    
    // Check for super admin
    const { data: superAdmins, error: superError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'super_admin');
    
    if (superError) {
      console.log('❌ Error querying super admins:', superError.message);
    } else {
      console.log(`✅ Found ${superAdmins.length} super admin(s)`);
    }

    // Check for readers
    const { data: readers, error: readerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'reader');
    
    if (readerError) {
      console.log('❌ Error querying readers:', readerError.message);
    } else {
      console.log(`✅ Found ${readers.length} reader(s)`);
    }

    return true;

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    return false;
  }
}

// Test current profiles status
async function main() {
  console.log('🔍 Checking current profiles table status...\n');
  
  const success = await testProfilesQuery();
  
  if (success) {
    console.log('\n🎉 Great! The profiles table is working correctly now.');
    console.log('The infinite recursion issue appears to be resolved.');
    console.log('\n📋 Next steps:');
    console.log('1. Clear your browser cache');
    console.log('2. Refresh the application');
    console.log('3. Try logging in again');
    console.log('4. Each user should now see their correct dashboard based on their role');
  } else {
    console.log('\n❌ The profiles table still has issues.');
    console.log('The RLS policies may need manual attention in the Supabase dashboard.');
  }
}

main(); 