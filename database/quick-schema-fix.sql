-- =================================================
-- QUICK SCHEMA FIX FOR STEP 3 DATABASE ISSUES
-- Fixes missing bilingual columns in tables
-- =================================================

-- Fix tarot_cards table - add missing bilingual columns
DO $$
BEGIN
    -- Add description_ar column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tarot_cards' 
        AND column_name = 'description_ar' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tarot_cards ADD COLUMN description_ar TEXT;
        RAISE NOTICE '✅ Added description_ar column to tarot_cards';
    ELSE
        RAISE NOTICE '⚠️ description_ar column already exists in tarot_cards';
    END IF;

    -- Add name_ar column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tarot_cards' 
        AND column_name = 'name_ar' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tarot_cards ADD COLUMN name_ar TEXT;
        RAISE NOTICE '✅ Added name_ar column to tarot_cards';
    ELSE
        RAISE NOTICE '⚠️ name_ar column already exists in tarot_cards';
    END IF;

    -- Add name_en column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tarot_cards' 
        AND column_name = 'name_en' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tarot_cards ADD COLUMN name_en TEXT;
        RAISE NOTICE '✅ Added name_en column to tarot_cards';
    ELSE
        RAISE NOTICE '⚠️ name_en column already exists in tarot_cards';
    END IF;

    -- Add description_en column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tarot_cards' 
        AND column_name = 'description_en' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tarot_cards ADD COLUMN description_en TEXT;
        RAISE NOTICE '✅ Added description_en column to tarot_cards';
    ELSE
        RAISE NOTICE '⚠️ description_en column already exists in tarot_cards';
    END IF;
END $$;

-- Fix spread_categories table - add missing name column and ensure bilingual columns exist
DO $$
BEGIN
    -- Add name column if it doesn't exist (for backward compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'spread_categories' 
        AND column_name = 'name' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.spread_categories ADD COLUMN name TEXT;
        RAISE NOTICE '✅ Added name column to spread_categories';
    ELSE
        RAISE NOTICE '⚠️ name column already exists in spread_categories';
    END IF;

    -- Add description column if it doesn't exist (for backward compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'spread_categories' 
        AND column_name = 'description' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.spread_categories ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Added description column to spread_categories';
    ELSE
        RAISE NOTICE '⚠️ description column already exists in spread_categories';
    END IF;
END $$;

-- Update existing data to populate the new columns
UPDATE public.tarot_cards 
SET 
    name_en = COALESCE(name_en, name),
    name_ar = COALESCE(name_ar, name),
    description_en = COALESCE(description_en, description),
    description_ar = COALESCE(description_ar, description)
WHERE name IS NOT NULL OR description IS NOT NULL;

UPDATE public.spread_categories 
SET 
    name = COALESCE(name, name_en, name_ar),
    description = COALESCE(description, description_en, description_ar)
WHERE name_en IS NOT NULL OR name_ar IS NOT NULL OR description_en IS NOT NULL OR description_ar IS NOT NULL;

-- Verify the fix
DO $$
DECLARE
    tarot_cards_count INTEGER;
    spread_categories_count INTEGER;
BEGIN
    -- Check tarot_cards
    SELECT COUNT(*) INTO tarot_cards_count
    FROM information_schema.columns 
    WHERE table_name = 'tarot_cards' 
    AND column_name IN ('name_ar', 'name_en', 'description_ar', 'description_en')
    AND table_schema = 'public';
    
    -- Check spread_categories
    SELECT COUNT(*) INTO spread_categories_count
    FROM information_schema.columns 
    WHERE table_name = 'spread_categories' 
    AND column_name IN ('name', 'description')
    AND table_schema = 'public';
    
    RAISE NOTICE '📊 Schema Fix Summary:';
    RAISE NOTICE '   🃏 Tarot Cards bilingual columns: %/4', tarot_cards_count;
    RAISE NOTICE '   📂 Spread Categories base columns: %/2', spread_categories_count;
    
    IF tarot_cards_count = 4 AND spread_categories_count = 2 THEN
        RAISE NOTICE '🎉 Schema fix completed successfully!';
    ELSE
        RAISE NOTICE '⚠️ Schema fix incomplete - manual review needed';
    END IF;
END $$; 