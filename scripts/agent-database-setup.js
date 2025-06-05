#!/usr/bin/env node

/**
 * 🤖 SMART AGENT - Direct Database Setup
 * Creates tables directly using Supabase client operations
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createDecksData() {
  console.log('🤖 Agent: Creating tarot decks data...');
  
  const decksData = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Moroccan Tarot',
      name_ar: 'الكارطة المغربية',
      description: 'Traditional Moroccan tarot deck with cultural symbolism',
      description_ar: 'مجموعة التاروت المغربية التقليدية مع الرمزية الثقافية',
      total_cards: 78,
      deck_type: 'moroccan',
      is_default: true,
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Rider Waite',
      name_ar: 'رايدر وايت',
      description: 'Classic Rider Waite tarot deck',
      description_ar: 'مجموعة رايدر وايت الكلاسيكية',
      total_cards: 78,
      deck_type: 'rider_waite',
      is_default: false,
      is_active: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Marseille Tarot',
      name_ar: 'تاروت مارسيليا',
      description: 'Traditional French Marseille tarot',
      description_ar: 'التاروت الفرنسي التقليدي مارسيليا',
      total_cards: 78,
      deck_type: 'marseille',
      is_default: false,
      is_active: true
    }
  ];

  // Try to insert/upsert decks data
  const { data, error } = await supabase
    .from('tarot_decks')
    .upsert(decksData, { onConflict: 'id' })
    .select();

  if (error) {
    console.log('❌ Decks creation failed:', error.message);
    return false;
  } else {
    console.log('✅ Tarot decks created:', data?.length || 0, 'records');
    return true;
  }
}

async function createSpreadsData() {
  console.log('🤖 Agent: Creating tarot spreads data...');
  
  const spreadsData = [
    {
      id: '660e8400-e29b-41d4-a716-446655440000',
      name: 'Three Card Spread',
      name_ar: 'انتشار الثلاث ورق',
      description: 'Simple past, present, future reading',
      description_ar: 'قراءة بسيطة للماضي والحاضر والمستقبل',
      card_count: 3,
      positions: [
        {
          position: 1,
          name: 'Past',
          name_ar: 'الماضي',
          meaning: 'What influences from the past',
          meaning_ar: 'التأثيرات من الماضي',
          x: 20,
          y: 50
        },
        {
          position: 2,
          name: 'Present',
          name_ar: 'الحاضر',
          meaning: 'Current situation',
          meaning_ar: 'الوضع الحالي',
          x: 50,
          y: 50
        },
        {
          position: 3,
          name: 'Future',
          name_ar: 'المستقبل',
          meaning: 'What is to come',
          meaning_ar: 'ما سيأتي',
          x: 80,
          y: 50
        }
      ],
      difficulty_level: 'beginner',
      category: 'general',
      deck_id: '550e8400-e29b-41d4-a716-446655440000', // Moroccan deck
      is_active: true,
      is_custom: false,
      approval_status: 'approved'
    },
    {
      id: '660e8400-e29b-41d4-a716-446655440001',
      name: 'Love Spread',
      name_ar: 'انتشار الحب',
      description: 'Five-card spread focused on love and relationships',
      description_ar: 'انتشار خمس ورق يركز على الحب والعلاقات',
      card_count: 5,
      positions: [
        {
          position: 1,
          name: 'You',
          name_ar: 'أنت',
          meaning: 'Your current state in love',
          meaning_ar: 'حالتك الحالية في الحب',
          x: 25,
          y: 60
        },
        {
          position: 2,
          name: 'Your Partner',
          name_ar: 'شريكك',
          meaning: 'Your partners state',
          meaning_ar: 'حالة شريكك',
          x: 75,
          y: 60
        },
        {
          position: 3,
          name: 'The Relationship',
          name_ar: 'العلاقة',
          meaning: 'The relationship dynamic',
          meaning_ar: 'ديناميكية العلاقة',
          x: 50,
          y: 30
        },
        {
          position: 4,
          name: 'Challenges',
          name_ar: 'التحديات',
          meaning: 'What challenges you face',
          meaning_ar: 'التحديات التي تواجهها',
          x: 25,
          y: 80
        },
        {
          position: 5,
          name: 'Outcome',
          name_ar: 'النتيجة',
          meaning: 'Where the relationship is heading',
          meaning_ar: 'إلى أين تتجه العلاقة',
          x: 75,
          y: 80
        }
      ],
      difficulty_level: 'intermediate',
      category: 'love',
      deck_id: '550e8400-e29b-41d4-a716-446655440000',
      is_active: true,
      is_custom: false,
      approval_status: 'approved'
    }
  ];

  const { data, error } = await supabase
    .from('tarot_spreads')
    .upsert(spreadsData, { onConflict: 'id' })
    .select();

  if (error) {
    console.log('❌ Spreads creation failed:', error.message);
    return false;
  } else {
    console.log('✅ Tarot spreads created:', data?.length || 0, 'records');
    return true;
  }
}

async function testDatabaseAccess() {
  console.log('🤖 Agent: Testing database access...\n');

  // Test 1: Check if tables exist
  console.log('1. Testing table access...');
  
  const { data: decksTest, error: decksError } = await supabase
    .from('tarot_decks')
    .select('*')
    .limit(1);
  
  const { data: spreadsTest, error: spreadsError } = await supabase
    .from('tarot_spreads')
    .select('*')
    .limit(1);

  if (decksError?.code === '42P01') {
    console.log('❌ Tables do not exist. Need manual SQL setup in Supabase Dashboard.');
    return false;
  }

  if (decksError) {
    console.log('❌ Database access issue:', decksError.message);
    return false;
  }

  console.log('✅ Database tables accessible');

  // Test 2: Check data
  const { data: allDecks } = await supabase.from('tarot_decks').select('*');
  const { data: allSpreads } = await supabase.from('tarot_spreads').select('*');

  console.log(`📊 Current data: ${allDecks?.length || 0} decks, ${allSpreads?.length || 0} spreads`);

  return true;
}

async function runAgentSetup() {
  console.log('🤖 SMART AGENT STARTING...\n');
  console.log('🎯 Goal: Setup Enhanced Tarot Spread System automatically\n');

  try {
    // Step 1: Test database access
    const canAccess = await testDatabaseAccess();
    
    if (!canAccess) {
      console.log('\n🚨 AGENT DIAGNOSIS:');
      console.log('Tables not found in database. This requires SQL setup in Supabase Dashboard.');
      console.log('\n🤖 AGENT DECISION: Switching to guided setup mode...');
      
      console.log('\n📋 AGENT INSTRUCTIONS FOR HUMAN:');
      console.log('1. Go to: https://supabase.com/dashboard/project/uuseflmielktdcltzwzt');
      console.log('2. Click: SQL Editor → New Query');
      console.log('3. Copy & paste: database/enhanced-tarot-spread-system.sql');
      console.log('4. Click: RUN');
      console.log('5. Copy & paste: database/tarot-spread-rls-policies.sql');
      console.log('6. Click: RUN');
      console.log('7. Run: node scripts/agent-database-setup.js');
      
      return;
    }

    // Step 2: Create sample data
    console.log('\n🤖 Agent: Database accessible. Creating sample data...\n');
    
    const decksSuccess = await createDecksData();
    const spreadsSuccess = await createSpreadsData();

    // Step 3: Final test
    console.log('\n🤖 Agent: Running final verification...\n');
    
    const { data: finalDecks } = await supabase.from('tarot_decks').select('*');
    const { data: finalSpreads } = await supabase.from('tarot_spreads').select('*');
    
    // Test relationship query
    const { data: relationshipTest, error: joinError } = await supabase
      .from('tarot_spreads')
      .select('*, deck:tarot_decks(*)')
      .limit(1);

    console.log('📊 FINAL RESULTS:');
    console.log(`✅ Tarot Decks: ${finalDecks?.length || 0} records`);
    console.log(`✅ Tarot Spreads: ${finalSpreads?.length || 0} records`);
    console.log(`${joinError ? '❌' : '✅'} Relationship queries: ${joinError ? 'Failed' : 'Working'}`);

    if ((finalDecks?.length || 0) > 0 && (finalSpreads?.length || 0) > 0 && !joinError) {
      console.log('\n🎉 AGENT SUCCESS!');
      console.log('🌐 Enhanced Tarot Spread System is ready!');
      console.log('🚀 Your React app should work without database errors now.');
      
      console.log('\n🧪 Test your app:');
      console.log('1. Go to: http://localhost:3000');
      console.log('2. Navigate to Reader Dashboard');
      console.log('3. Check browser console for errors');
      console.log('4. Try tarot spread features');
    } else {
      console.log('\n⚠️  AGENT PARTIAL SUCCESS');
      console.log('Some data was created but there may be issues.');
      console.log('Run: node scripts/test-database.js for detailed testing');
    }

  } catch (error) {
    console.error('💥 AGENT ERROR:', error);
    console.log('\n🔄 AGENT FALLBACK: Manual setup may be required');
  }
}

// Run the smart agent
runAgentSetup(); 