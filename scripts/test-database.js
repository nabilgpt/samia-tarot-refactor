import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uuseflmielktdcltzwzt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw'
);

async function testDatabase() {
  console.log('🧪 Testing database setup...\n');

  // Test tarot_decks
  console.log('1. Testing tarot_decks...');
  const { data: decks, error: decksError } = await supabase
    .from('tarot_decks')
    .select('*')
    .limit(3);
  
  if (decksError) {
    console.log('❌ tarot_decks:', decksError.message);
  } else {
    console.log(`✅ tarot_decks: ${decks?.length || 0} records found`);
  }

  // Test tarot_spreads
  console.log('\n2. Testing tarot_spreads...');
  const { data: spreads, error: spreadsError } = await supabase
    .from('tarot_spreads')
    .select('*')
    .limit(3);
  
  if (spreadsError) {
    console.log('❌ tarot_spreads:', spreadsError.message);
  } else {
    console.log(`✅ tarot_spreads: ${spreads?.length || 0} records found`);
  }

  // Test with join
  console.log('\n3. Testing relationship query...');
  const { data: spreadsWithDecks, error: joinError } = await supabase
    .from('tarot_spreads')
    .select('*, deck:tarot_decks(*)')
    .limit(1);
  
  if (joinError) {
    console.log('❌ Join query:', joinError.message);
  } else {
    console.log('✅ Join query: Success');
  }

  console.log('\n📊 Test Results:');
  if (!decksError && !spreadsError && !joinError) {
    console.log('🎉 ALL TESTS PASSED! Database is ready.');
    console.log('🌐 Your app should work without errors now.');
  } else {
    console.log('⚠️  Some tests failed. Please run the database setup.');
    console.log('📋 See: QUICK_DATABASE_SETUP.md');
  }
}

testDatabase(); 