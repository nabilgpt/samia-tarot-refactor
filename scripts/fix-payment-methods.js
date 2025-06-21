const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uuseflmielktdcltzwzt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E'
);

async function fixPaymentMethods() {
  console.log('🔧 Fixing payment methods display names...');
  
  const updates = [
    { method: 'stripe', display_name: 'Stripe (Credit/Debit Cards)', is_enabled: true },
    { method: 'wallet', display_name: 'In-App Wallet', is_enabled: true },
    { method: 'usdt', display_name: 'USDT (Cryptocurrency)', is_enabled: true },
    { method: 'apple_pay', display_name: 'Apple Pay', is_enabled: true },
    { method: 'google_pay', display_name: 'Google Pay', is_enabled: true },
    { method: 'square', display_name: 'Square', is_enabled: true },
    { method: 'western_union', display_name: 'Western Union', is_enabled: true },
    { method: 'moneygram', display_name: 'MoneyGram', is_enabled: true },
    { method: 'ria', display_name: 'Ria Money Transfer', is_enabled: true },
    { method: 'omt', display_name: 'OMT (Oman)', is_enabled: true },
    { method: 'whish', display_name: 'Whish Money (Lebanon)', is_enabled: true },
    { method: 'bob', display_name: 'BOB Finance (Lebanon)', is_enabled: true }
  ];
  
  for (const update of updates) {
    const { error } = await supabase
      .from('payment_settings')
      .update({ 
        display_name: update.display_name,
        is_enabled: update.is_enabled 
      })
      .eq('method', update.method);
      
    if (error) {
      console.log(`❌ Error updating ${update.method}:`, error.message);
    } else {
      console.log(`✅ Updated ${update.method}: ${update.display_name}`);
    }
  }
  
  // Verify the updates
  console.log('\n📊 Verifying payment methods...');
  const { data, error } = await supabase
    .from('payment_settings')
    .select('method, display_name, is_enabled')
    .order('method');
    
  if (error) {
    console.log('❌ Error fetching payment methods:', error.message);
  } else {
    console.log(`✅ Found ${data.length} payment methods:`);
    data.forEach(method => {
      console.log(`   • ${method.method}: ${method.display_name} (${method.is_enabled ? 'enabled' : 'disabled'})`);
    });
  }
  
  console.log('\n🎉 Payment methods update completed!');
}

fixPaymentMethods(); 