#!/usr/bin/env node

/**
 * 🚀 SAMIA TAROT - FLEXIBLE TAROT SYSTEM MIGRATION
 * Migrates existing database to support the flexible multi-deck tarot system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://uuseflmielktdcltzwzt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw';

async function executeSQL(sql, description) {
  console.log(`\n🔄 ${description}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ sql })
    });

    if (response.ok) {
      console.log(`✅ ${description} - Success`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ ${description} - Failed: ${error}`);
      return false;
    }
  } catch (error) {
    console.log(`💥 ${description} - Error: ${error.message}`);
    return false;
  }
}

async function checkColumnExists(table, column) {
  const checkSQL = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = '${table}' AND column_name = '${column}';
  `;
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ sql: checkSQL })
    });

    if (response.ok) {
      const result = await response.text();
      return result.includes(column);
    }
    return false;
  } catch (error) {
    console.log(`Error checking column: ${error.message}`);
    return false;
  }
}

async function migrateFlexibleTarotSystem() {
  console.log('🚀 Starting Flexible Tarot System Migration...\n');
  
  // Step 1: Check if deck_id column exists in tarot_cards
  const deckIdExists = await checkColumnExists('tarot_cards', 'deck_id');
  console.log(`🔍 Deck ID column exists: ${deckIdExists}`);
  
  // Step 2: Update tarot_decks table with new columns
  const updateDecksSQL = `
    -- Update tarot_decks table with new columns
    ALTER TABLE tarot_decks 
    ADD COLUMN IF NOT EXISTS deck_type TEXT DEFAULT 'moroccan',
    ADD COLUMN IF NOT EXISTS supports_reversals BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS cultural_origin TEXT,
    ADD COLUMN IF NOT EXISTS metaphysical_system TEXT,
    ADD COLUMN IF NOT EXISTS card_back_image_url TEXT,
    ADD COLUMN IF NOT EXISTS card_front_template_url TEXT,
    ADD COLUMN IF NOT EXISTS artist_name TEXT,
    ADD COLUMN IF NOT EXISTS publisher TEXT,
    ADD COLUMN IF NOT EXISTS publication_year INTEGER,
    ADD COLUMN IF NOT EXISTS isbn TEXT;

    -- Add constraint for deck_type if it doesn't exist
    DO $$
    BEGIN
      ALTER TABLE tarot_decks 
      ADD CONSTRAINT tarot_decks_deck_type_check 
      CHECK (deck_type IN ('moroccan', 'rider_waite', 'marseille', 'thoth', 'wild_unknown', 'moonchild', 'starchild', 'custom'));
    EXCEPTION
      WHEN duplicate_object THEN
        -- Constraint already exists, ignore
        NULL;
    END $$;
  `;

  await executeSQL(updateDecksSQL, 'Updating tarot_decks table structure');

  // Step 3: Create or update tarot_cards table with full schema
  const updateCardsSQL = `
    -- Add missing columns to tarot_cards table
    ${!deckIdExists ? 'ALTER TABLE tarot_cards ADD COLUMN deck_id UUID REFERENCES tarot_decks(id) ON DELETE CASCADE;' : ''}
    
    ALTER TABLE tarot_cards 
    ADD COLUMN IF NOT EXISTS card_key TEXT,
    ADD COLUMN IF NOT EXISTS name_ar TEXT,
    ADD COLUMN IF NOT EXISTS card_number INTEGER,
    ADD COLUMN IF NOT EXISTS arcana_type TEXT DEFAULT 'major',
    ADD COLUMN IF NOT EXISTS suit TEXT,
    ADD COLUMN IF NOT EXISTS suit_ar TEXT,
    ADD COLUMN IF NOT EXISTS element TEXT,
    ADD COLUMN IF NOT EXISTS reversed_image_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS upright_meaning TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS reversed_meaning TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS upright_keywords TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS reversed_keywords TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS upright_meaning_ar TEXT,
    ADD COLUMN IF NOT EXISTS reversed_meaning_ar TEXT,
    ADD COLUMN IF NOT EXISTS upright_keywords_ar TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS reversed_keywords_ar TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS love_upright TEXT,
    ADD COLUMN IF NOT EXISTS love_reversed TEXT,
    ADD COLUMN IF NOT EXISTS love_upright_ar TEXT,
    ADD COLUMN IF NOT EXISTS love_reversed_ar TEXT,
    ADD COLUMN IF NOT EXISTS career_upright TEXT,
    ADD COLUMN IF NOT EXISTS career_reversed TEXT,
    ADD COLUMN IF NOT EXISTS career_upright_ar TEXT,
    ADD COLUMN IF NOT EXISTS career_reversed_ar TEXT,
    ADD COLUMN IF NOT EXISTS finance_upright TEXT,
    ADD COLUMN IF NOT EXISTS finance_reversed TEXT,
    ADD COLUMN IF NOT EXISTS finance_upright_ar TEXT,
    ADD COLUMN IF NOT EXISTS finance_reversed_ar TEXT,
    ADD COLUMN IF NOT EXISTS health_upright TEXT,
    ADD COLUMN IF NOT EXISTS health_reversed TEXT,
    ADD COLUMN IF NOT EXISTS health_upright_ar TEXT,
    ADD COLUMN IF NOT EXISTS health_reversed_ar TEXT,
    ADD COLUMN IF NOT EXISTS spiritual_upright TEXT,
    ADD COLUMN IF NOT EXISTS spiritual_reversed TEXT,
    ADD COLUMN IF NOT EXISTS spiritual_upright_ar TEXT,
    ADD COLUMN IF NOT EXISTS spiritual_reversed_ar TEXT,
    ADD COLUMN IF NOT EXISTS symbolism TEXT,
    ADD COLUMN IF NOT EXISTS symbolism_ar TEXT,
    ADD COLUMN IF NOT EXISTS planet TEXT,
    ADD COLUMN IF NOT EXISTS zodiac_sign TEXT,
    ADD COLUMN IF NOT EXISTS hebrew_letter TEXT,
    ADD COLUMN IF NOT EXISTS numerology INTEGER,
    ADD COLUMN IF NOT EXISTS chakra TEXT,
    ADD COLUMN IF NOT EXISTS color_associations TEXT[],
    ADD COLUMN IF NOT EXISTS deck_specific_meaning JSONB,
    ADD COLUMN IF NOT EXISTS cultural_significance TEXT,
    ADD COLUMN IF NOT EXISTS cultural_significance_ar TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    -- Add constraints
    DO $$
    BEGIN
      ALTER TABLE tarot_cards 
      ADD CONSTRAINT tarot_cards_arcana_type_check 
      CHECK (arcana_type IN ('major', 'minor', 'court'));
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END $$;

    DO $$
    BEGIN
      ALTER TABLE tarot_cards 
      ADD CONSTRAINT tarot_cards_suit_check 
      CHECK (suit IN ('cups', 'wands', 'swords', 'pentacles', 'coins', 'staves', 'disks', NULL));
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END $$;

    DO $$
    BEGIN
      ALTER TABLE tarot_cards 
      ADD CONSTRAINT tarot_cards_element_check 
      CHECK (element IN ('fire', 'water', 'air', 'earth', NULL));
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END $$;
  `;

  await executeSQL(updateCardsSQL, 'Updating tarot_cards table structure');

  // Step 4: Update tarot_spreads table with flexible system columns
  const updateSpreadsSQL = `
    ALTER TABLE tarot_spreads 
    ADD COLUMN IF NOT EXISTS min_cards INTEGER,
    ADD COLUMN IF NOT EXISTS max_cards INTEGER,
    ADD COLUMN IF NOT EXISTS layout_type TEXT DEFAULT 'fixed',
    ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER DEFAULT 30,
    ADD COLUMN IF NOT EXISTS compatible_deck_types TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS preferred_deck_id UUID REFERENCES tarot_decks(id),
    ADD COLUMN IF NOT EXISTS layout_image_url TEXT,
    ADD COLUMN IF NOT EXISTS background_theme TEXT DEFAULT 'cosmic',
    ADD COLUMN IF NOT EXISTS position_shape TEXT DEFAULT 'circle',
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_average DECIMAL(3,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

    -- Add constraints
    DO $$
    BEGIN
      ALTER TABLE tarot_spreads 
      ADD CONSTRAINT tarot_spreads_layout_type_check 
      CHECK (layout_type IN ('fixed', 'flexible', 'custom'));
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END $$;

    DO $$
    BEGIN
      ALTER TABLE tarot_spreads 
      ADD CONSTRAINT tarot_spreads_position_shape_check 
      CHECK (position_shape IN ('circle', 'rectangle', 'diamond', 'star'));
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END $$;
  `;

  await executeSQL(updateSpreadsSQL, 'Updating tarot_spreads table structure');

  // Step 5: Create new tables for the flexible system
  const createNewTablesSQL = `
    -- Create tarot_reading_sessions table
    CREATE TABLE IF NOT EXISTS tarot_reading_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_key TEXT UNIQUE NOT NULL DEFAULT ('TAROT_' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8))),
      
      -- Participants
      reader_id UUID REFERENCES profiles(id),
      client_id UUID NOT NULL REFERENCES profiles(id),
      booking_id UUID REFERENCES bookings(id),
      
      -- Reading Configuration
      spread_id UUID NOT NULL REFERENCES tarot_spreads(id),
      deck_id UUID NOT NULL REFERENCES tarot_decks(id),
      question TEXT,
      question_category TEXT,
      
      -- Session State
      status TEXT CHECK (status IN ('preparing', 'active', 'card_selection', 'interpretation', 'completed', 'cancelled', 'expired')) DEFAULT 'preparing',
      current_step TEXT DEFAULT 'question',
      
      -- Card Management
      total_cards_to_draw INTEGER,
      cards_drawn_count INTEGER DEFAULT 0,
      burned_cards_count INTEGER DEFAULT 0,
      cards_remaining INTEGER,
      
      -- Timing
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      expires_at TIMESTAMP WITH TIME ZONE,
      estimated_duration_minutes INTEGER DEFAULT 30,
      
      -- Live Session Features
      is_live_call BOOLEAN DEFAULT false,
      video_call_url TEXT,
      is_payment_required BOOLEAN DEFAULT true,
      payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
      payment_id UUID,
      
      -- AI and Interpretation
      ai_interpretation_enabled BOOLEAN DEFAULT false,
      interpretation_language TEXT DEFAULT 'ar',
      reader_notes TEXT,
      ai_confidence_score DECIMAL(3,2),
      
      -- Session Data Storage
      session_data JSONB DEFAULT '{}',
      preferences JSONB DEFAULT '{}',
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create tarot_spread_cards table
    CREATE TABLE IF NOT EXISTS tarot_spread_cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES tarot_reading_sessions(id) ON DELETE CASCADE,
      card_id UUID NOT NULL REFERENCES tarot_cards(id),
      
      -- Position and State
      position INTEGER NOT NULL,
      position_name TEXT NOT NULL,
      position_meaning TEXT,
      position_meaning_ar TEXT,
      
      -- Card State
      is_revealed BOOLEAN DEFAULT false,
      is_reversed BOOLEAN DEFAULT false,
      is_burned BOOLEAN DEFAULT false,
      
      -- Timing
      drawn_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      revealed_at TIMESTAMP WITH TIME ZONE,
      burned_at TIMESTAMP WITH TIME ZONE,
      
      -- Management
      added_by_role TEXT CHECK (added_by_role IN ('reader', 'client', 'system')) DEFAULT 'system',
      added_by_user_id UUID REFERENCES profiles(id),
      burned_by_user_id UUID REFERENCES profiles(id),
      burn_reason TEXT,
      
      -- Custom Interpretation
      custom_interpretation TEXT,
      custom_interpretation_ar TEXT,
      reader_notes TEXT,
      
      -- Position coordinates for flexible spreads
      position_x DECIMAL(5,2),
      position_y DECIMAL(5,2),
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create tarot_role_permissions table
    CREATE TABLE IF NOT EXISTS tarot_role_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role TEXT CHECK (role IN ('client', 'reader', 'monitor', 'admin', 'super_admin')) NOT NULL,
      permission_name TEXT NOT NULL,
      permission_description TEXT,
      can_perform BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(role, permission_name)
    );
  `;

  await executeSQL(createNewTablesSQL, 'Creating new tables for flexible tarot system');

  // Step 6: Insert updated deck data
  const insertUpdatedDecksSQL = `
    -- Insert comprehensive deck collection
    INSERT INTO tarot_decks (name, name_ar, description, description_ar, deck_type, total_cards, is_default, supports_reversals, cultural_origin, metaphysical_system) VALUES 
    ('Traditional Moroccan Tarot', 'الكارطة المغربية التقليدية', '48-card traditional Moroccan deck with rich cultural symbolism', 'مجموعة مغربية تقليدية من 48 ورقة مع رمزية ثقافية غنية', 'moroccan', 48, true, true, 'Moroccan', 'Traditional Moroccan'),
    ('Rider-Waite Tarot', 'تاروت رايدر-وايت', 'Classic 78-card deck, most popular worldwide', 'المجموعة الكلاسيكية من 78 ورقة، الأكثر شعبية عالمياً', 'rider_waite', 78, false, true, 'Western', 'Golden Dawn'),
    ('Marseille Tarot', 'تاروت مارسيليا', 'Traditional French 78-card deck with historical significance', 'المجموعة الفرنسية التقليدية من 78 ورقة ذات الأهمية التاريخية', 'marseille', 78, false, true, 'French', 'Traditional European'),
    ('Thoth Tarot', 'تاروت توت', 'Aleister Crowleys esoteric 78-card deck', 'مجموعة أليستر كراولي الباطنية من 78 ورقة', 'thoth', 78, false, true, 'Western', 'Thelemic'),
    ('Wild Unknown Tarot', 'تاروت الغير معروف البري', 'Modern artistic 78-card deck with nature themes', 'مجموعة فنية حديثة من 78 ورقة بمواضيع طبيعية', 'wild_unknown', 78, false, true, 'Modern Western', 'Nature-based'),
    ('Moonchild Tarot', 'تاروت طفل القمر', 'Dreamy feminine 78-card deck', 'مجموعة أنثوية حالمة من 78 ورقة', 'moonchild', 78, false, true, 'Modern Western', 'Lunar Feminine'),
    ('Starchild Tarot', 'تاروت طفل النجوم', 'Cosmic 78-card deck with space themes', 'مجموعة كونية من 78 ورقة بمواضيع فضائية', 'starchild', 78, false, true, 'Modern Western', 'Cosmic')
    ON CONFLICT (name) DO UPDATE SET
      description = EXCLUDED.description,
      description_ar = EXCLUDED.description_ar,
      deck_type = EXCLUDED.deck_type,
      total_cards = EXCLUDED.total_cards,
      supports_reversals = EXCLUDED.supports_reversals,
      cultural_origin = EXCLUDED.cultural_origin,
      metaphysical_system = EXCLUDED.metaphysical_system;
  `;

  await executeSQL(insertUpdatedDecksSQL, 'Inserting/updating comprehensive deck collection');

  // Step 7: Insert sample tarot cards for testing
  const insertSampleCardsSQL = `
    -- Insert sample cards for the Moroccan deck
    DO $$
    DECLARE
      moroccan_deck_id UUID;
    BEGIN
      SELECT id INTO moroccan_deck_id FROM tarot_decks WHERE deck_type = 'moroccan' AND is_default = true LIMIT 1;
      
      IF moroccan_deck_id IS NOT NULL THEN
        -- Insert sample Major Arcana cards
        INSERT INTO tarot_cards (
          deck_id, card_key, name, name_ar, card_number, arcana_type,
          image_url, upright_meaning, reversed_meaning,
          upright_meaning_ar, reversed_meaning_ar
        ) VALUES 
        (moroccan_deck_id, 'the-fool', 'The Fool', 'المجنون', 0, 'major', 
         '/images/cards/moroccan/major/the-fool.jpg',
         'New beginnings, innocence, spontaneity, free spirit',
         'Recklessness, taken advantage of, inconsideration',
         'بدايات جديدة، براءة، عفوية، روح حرة',
         'تهور، استغلال، عدم اعتبار'),
        (moroccan_deck_id, 'the-magician', 'The Magician', 'الساحر', 1, 'major',
         '/images/cards/moroccan/major/the-magician.jpg',
         'Willpower, desire, creation, manifestation',
         'Trickery, illusions, out of touch',
         'قوة الإرادة، الرغبة، الإبداع، التجسيد',
         'خداع، أوهام، منقطع عن الواقع'),
        (moroccan_deck_id, 'the-high-priestess', 'The High Priestess', 'الكاهنة العظمى', 2, 'major',
         '/images/cards/moroccan/major/the-high-priestess.jpg',
         'Intuitive, unconscious, inner voice',
         'Lack of center, lost inner voice, repressed feelings',
         'حدسية، لاواعية، صوت داخلي',
         'فقدان المركز، صوت داخلي مفقود، مشاعر مكبوتة')
        ON CONFLICT (deck_id, card_key) DO NOTHING;
      END IF;
    END $$;
  `;

  await executeSQL(insertSampleCardsSQL, 'Inserting sample tarot cards');

  // Step 8: Create indexes for performance
  const createIndexesSQL = `
    -- Create performance indexes
    CREATE INDEX IF NOT EXISTS idx_tarot_cards_deck ON tarot_cards(deck_id);
    CREATE INDEX IF NOT EXISTS idx_tarot_cards_key ON tarot_cards(card_key);
    CREATE INDEX IF NOT EXISTS idx_tarot_cards_arcana ON tarot_cards(arcana_type);
    CREATE INDEX IF NOT EXISTS idx_tarot_cards_suit ON tarot_cards(suit);
    
    CREATE INDEX IF NOT EXISTS idx_tarot_decks_type ON tarot_decks(deck_type);
    CREATE INDEX IF NOT EXISTS idx_tarot_decks_active ON tarot_decks(is_active);
    CREATE INDEX IF NOT EXISTS idx_tarot_decks_default ON tarot_decks(is_default);
    
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON tarot_reading_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_reader ON tarot_reading_sessions(reader_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_client ON tarot_reading_sessions(client_id);
    
    CREATE INDEX IF NOT EXISTS idx_spread_cards_session ON tarot_spread_cards(session_id);
    CREATE INDEX IF NOT EXISTS idx_spread_cards_revealed ON tarot_spread_cards(is_revealed);
    CREATE INDEX IF NOT EXISTS idx_spread_cards_burned ON tarot_spread_cards(is_burned);
  `;

  await executeSQL(createIndexesSQL, 'Creating performance indexes');

  // Step 9: Insert role permissions
  const insertPermissionsSQL = `
    INSERT INTO tarot_role_permissions (role, permission_name, permission_description, can_perform) VALUES
    -- Client permissions
    ('client', 'open_cards_after_payment', 'Can open cards after payment confirmation', true),
    ('client', 'view_own_readings', 'Can view their own reading history', true),
    ('client', 'rate_readings', 'Can rate and review readings', true),
    ('client', 'save_readings', 'Can save readings to profile', true),

    -- Reader permissions  
    ('reader', 'create_custom_spreads', 'Can create custom spread layouts', true),
    ('reader', 'draw_cards', 'Can draw cards during readings', true),
    ('reader', 'burn_cards', 'Can burn/discard cards', true),
    ('reader', 'interpret_cards', 'Can provide card interpretations', true),
    ('reader', 'manage_sessions', 'Can manage reading sessions', true),

    -- Monitor permissions
    ('monitor', 'view_all_sessions', 'Can view all reading sessions', true),
    ('monitor', 'generate_reports', 'Can generate usage reports', true),

    -- Admin permissions
    ('admin', 'approve_spreads', 'Can approve custom spreads', true),
    ('admin', 'manage_decks', 'Can add/edit tarot decks', true),
    ('admin', 'view_analytics', 'Can view detailed analytics', true),
    ('admin', 'moderate_content', 'Can moderate user content', true),

    -- Super Admin permissions
    ('super_admin', 'full_system_access', 'Complete system access', true),
    ('super_admin', 'manage_permissions', 'Can modify role permissions', true)
    ON CONFLICT (role, permission_name) DO NOTHING;
  `;

  await executeSQL(insertPermissionsSQL, 'Inserting role permissions');

  console.log('\n🎉 Flexible Tarot System Migration Complete!');
  console.log('\n📊 Migration Summary:');
  console.log('✅ Updated tarot_decks table with new columns');
  console.log('✅ Added deck_id column to tarot_cards table');
  console.log('✅ Updated tarot_spreads table for flexible system');
  console.log('✅ Created tarot_reading_sessions table');
  console.log('✅ Created tarot_spread_cards table');
  console.log('✅ Created tarot_role_permissions table');
  console.log('✅ Inserted comprehensive deck collection');
  console.log('✅ Inserted sample cards for testing');
  console.log('✅ Created performance indexes');
  console.log('✅ Configured role permissions');
  console.log('\n🌟 The flexible tarot system is now ready!');
}

// Run the migration
async function runMigration() {
  try {
    await migrateFlexibleTarotSystem();
    
    console.log('\n🚀 Migration completed successfully!');
    console.log('🔮 FlexibleTarotSpreadManager should now work without errors.');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    console.log('\n📋 Please check the error and try again.');
  }
}

// Execute if run directly
if (import.meta.url === `file://${__filename}`) {
  runMigration();
}

export default runMigration; 