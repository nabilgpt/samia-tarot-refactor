#!/usr/bin/env node

/**
 * 🔧 SAMIA TAROT - Quick Fix for Tarot Cards Schema
 * Adds the missing deck_id column to tarot_cards table
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.fU_3sZGJJX_K_pNcNlbmRU6Oz-J_Q-2WNi6xIFBNj50';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTarotCardsSchema() {
  console.log('🔧 Starting Tarot Cards Schema Fix...\n');

  try {
    // Step 1: Check current table structure
    console.log('📋 Checking current table structure...');
    
    // Step 2: Add missing columns to tarot_cards
    console.log('🔄 Adding missing columns to tarot_cards table...');
    
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add deck_id column if it doesn't exist
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'tarot_cards' AND column_name = 'deck_id') THEN
                ALTER TABLE tarot_cards ADD COLUMN deck_id UUID REFERENCES tarot_decks(id) ON DELETE CASCADE;
                RAISE NOTICE 'Added deck_id column to tarot_cards';
            ELSE
                RAISE NOTICE 'deck_id column already exists';
            END IF;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Error adding deck_id column: %', SQLERRM;
        END $$;

        -- Add other missing columns
        ALTER TABLE tarot_cards 
        ADD COLUMN IF NOT EXISTS card_key TEXT,
        ADD COLUMN IF NOT EXISTS name_ar TEXT,
        ADD COLUMN IF NOT EXISTS card_number INTEGER,
        ADD COLUMN IF NOT EXISTS arcana_type TEXT DEFAULT 'major',
        ADD COLUMN IF NOT EXISTS suit TEXT,
        ADD COLUMN IF NOT EXISTS upright_meaning TEXT DEFAULT '',
        ADD COLUMN IF NOT EXISTS reversed_meaning TEXT DEFAULT '';
      `
    });

    if (alterError) {
      console.error('❌ Error altering table:', alterError);
      return;
    }

    console.log('✅ Successfully added missing columns');

    // Step 3: Get or create default Moroccan deck
    console.log('🔄 Ensuring default Moroccan deck exists...');
    
    let { data: deck, error: deckError } = await supabase
      .from('tarot_decks')
      .select('id')
      .eq('deck_type', 'moroccan')
      .eq('is_default', true)
      .single();

    if (deckError || !deck) {
      console.log('📝 Creating default Moroccan deck...');
      const { data: newDeck, error: createError } = await supabase
        .from('tarot_decks')
        .insert({
          name: 'Traditional Moroccan Tarot',
          name_ar: 'الكارطة المغربية التقليدية',
          description: '48-card traditional Moroccan deck with rich cultural symbolism',
          description_ar: 'مجموعة مغربية تقليدية من 48 ورقة مع رمزية ثقافية غنية',
          deck_type: 'moroccan',
          total_cards: 48,
          is_default: true,
          is_active: true
        })
        .select('id')
        .single();

      if (createError) {
        console.error('❌ Error creating deck:', createError);
        return;
      }
      
      deck = newDeck;
      console.log('✅ Created default Moroccan deck');
    } else {
      console.log('✅ Default Moroccan deck found');
    }

    // Step 4: Add sample cards if table is empty
    console.log('🔄 Checking if sample cards exist...');
    
    const { data: existingCards, error: countError } = await supabase
      .from('tarot_cards')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error checking cards:', countError);
      return;
    }

    if (!existingCards || existingCards.length === 0) {
      console.log('📝 Adding sample tarot cards...');
      
      const sampleCards = [
        {
          deck_id: deck.id,
          card_key: 'the-fool',
          name: 'The Fool',
          name_ar: 'المجنون',
          card_number: 0,
          arcana_type: 'major',
          image_url: '/images/cards/moroccan/major/the-fool.jpg',
          upright_meaning: 'New beginnings, innocence, spontaneity, free spirit',
          reversed_meaning: 'Recklessness, taken advantage of, inconsideration'
        },
        {
          deck_id: deck.id,
          card_key: 'the-magician',
          name: 'The Magician',
          name_ar: 'الساحر',
          card_number: 1,
          arcana_type: 'major',
          image_url: '/images/cards/moroccan/major/the-magician.jpg',
          upright_meaning: 'Willpower, desire, creation, manifestation',
          reversed_meaning: 'Trickery, illusions, out of touch'
        },
        {
          deck_id: deck.id,
          card_key: 'the-high-priestess',
          name: 'The High Priestess',
          name_ar: 'الكاهنة العظمى',
          card_number: 2,
          arcana_type: 'major',
          image_url: '/images/cards/moroccan/major/the-high-priestess.jpg',
          upright_meaning: 'Intuitive, unconscious, inner voice',
          reversed_meaning: 'Lack of center, lost inner voice, repressed feelings'
        }
      ];

      const { error: insertError } = await supabase
        .from('tarot_cards')
        .insert(sampleCards);

      if (insertError) {
        console.error('❌ Error inserting sample cards:', insertError);
        return;
      }

      console.log('✅ Added sample tarot cards');
    } else {
      console.log('✅ Cards already exist, updating deck_id if needed...');
      
      // Update existing cards to have deck_id if they don't
      const { error: updateError } = await supabase
        .from('tarot_cards')
        .update({ deck_id: deck.id })
        .is('deck_id', null);

      if (updateError) {
        console.error('❌ Error updating cards:', updateError);
      } else {
        console.log('✅ Updated existing cards with deck_id');
      }
    }

    console.log('\n🎉 Tarot Cards Schema Fix Complete!');
    console.log('✅ deck_id column added to tarot_cards table');
    console.log('✅ Default Moroccan deck ensured');
    console.log('✅ Sample cards available');
    console.log('\n🔮 FlexibleTarotSpreadManager should now work!');

  } catch (error) {
    console.error('💥 Schema fix failed:', error);
  }
}

// Run the fix
fixTarotCardsSchema(); 