import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkReaderAuth() {
  console.log('🔍 Checking for reader@samiatarot.com account...\n');
  
  try {
    // Check auth.users table
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log('❌ Error accessing auth.users:', error.message);
      return;
    }
    
    const readerUser = users.users.find(user => user.email === 'reader@samiatarot.com');
    
    if (readerUser) {
      console.log('✅ Found reader user in auth.users:');
      console.log('📧 Email:', readerUser.email);
      console.log('🆔 User ID:', readerUser.id);
      console.log('📅 Created:', new Date(readerUser.created_at).toLocaleString());
      console.log('✉️  Email confirmed:', readerUser.email_confirmed_at ? 'Yes ✅' : 'No ❌');
      console.log('🔓 Last sign in:', readerUser.last_sign_in_at ? new Date(readerUser.last_sign_in_at).toLocaleString() : 'Never');
      
      // Check profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'reader@samiatarot.com')
        .single();
      
      if (profileError) {
        console.log('⚠️  Warning - Profile not found:', profileError.message);
      } else {
        console.log('\n👤 Profile information:');
        console.log('🏷️  Name:', profile.first_name, profile.last_name);
        console.log('🎭 Role:', profile.role);
        console.log('🟢 Active:', profile.is_active ? 'Yes' : 'No');
      }
      
      console.log('\n🔑 AUTHENTICATION INFO:');
      console.log('📧 Email: reader@samiatarot.com');
      console.log('🔒 Password: The password was likely set when this account was created.');
      console.log('💡 Common test passwords to try:');
      console.log('   - 123456');
      console.log('   - password');
      console.log('   - reader123');
      console.log('   - samiatarot');
      
    } else {
      console.log('❌ Reader user NOT found in auth.users table');
      console.log('\n📋 Available users:');
      users.users.forEach(user => {
        console.log(`- ${user.email} (${user.id})`);
      });
      
      console.log('\n🛠️  Need to create the reader account? Here\'s how:');
      console.log('1. Use Supabase Dashboard Auth section');
      console.log('2. Or run a script to create the account');
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkReaderAuth(); 