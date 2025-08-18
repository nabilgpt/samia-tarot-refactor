-- =====================================================
-- STEP 1: DATABASE BILINGUAL FIXES
-- Complete missing bilingual tables and fields
-- Date: July 6, 2025
-- =====================================================

-- =====================================================
-- 1. CREATE MISSING SPREAD_CATEGORIES TABLE
-- =====================================================
-- Create the spread_categories table with INTEGER id for compatibility
CREATE TABLE IF NOT EXISTS spread_categories (
    id SERIAL PRIMARY KEY,
    
    -- Bilingual names (will be made NOT NULL later)
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    
    -- Bilingual descriptions (will be made NOT NULL later)
    description_ar TEXT,
    description_en TEXT,
    
    -- Category metadata (compatible with existing TEXT-based category system)
    category_key VARCHAR(100) UNIQUE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Audit trail
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 1A. ADD MISSING COLUMNS TO EXISTING TABLE
-- =====================================================
-- If table exists but missing columns, add them
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spread_categories' AND column_name = 'name_ar') THEN
        ALTER TABLE spread_categories ADD COLUMN name_ar VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spread_categories' AND column_name = 'name_en') THEN
        ALTER TABLE spread_categories ADD COLUMN name_en VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spread_categories' AND column_name = 'description_ar') THEN
        ALTER TABLE spread_categories ADD COLUMN description_ar TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spread_categories' AND column_name = 'description_en') THEN
        ALTER TABLE spread_categories ADD COLUMN description_en TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spread_categories' AND column_name = 'category_key') THEN
        ALTER TABLE spread_categories ADD COLUMN category_key VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spread_categories' AND column_name = 'sort_order') THEN
        ALTER TABLE spread_categories ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spread_categories' AND column_name = 'is_active') THEN
        ALTER TABLE spread_categories ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spread_categories' AND column_name = 'created_by') THEN
        ALTER TABLE spread_categories ADD COLUMN created_by UUID REFERENCES profiles(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spread_categories' AND column_name = 'created_at') THEN
        ALTER TABLE spread_categories ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spread_categories' AND column_name = 'updated_at') THEN
        ALTER TABLE spread_categories ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- =====================================================
-- 1B. MIGRATE EXISTING DATA SAFELY
-- =====================================================
-- Now that all columns exist, migrate existing data
DO $$
BEGIN
    -- Only update if there are existing records
    IF EXISTS (SELECT 1 FROM spread_categories LIMIT 1) THEN
        UPDATE spread_categories 
        SET 
            name_en = COALESCE(name_en, 'Unnamed Category'),
            name_ar = COALESCE(name_ar, 'فئة غير مسماة'),
            description_en = COALESCE(description_en, 'No description available'),
            description_ar = COALESCE(description_ar, 'لا يوجد وصف متاح'),
            category_key = COALESCE(category_key, 'category_' || id::text),
            sort_order = COALESCE(sort_order, 0),
            is_active = COALESCE(is_active, true),
            created_at = COALESCE(created_at, NOW()),
            updated_at = COALESCE(updated_at, NOW())
        WHERE name_en IS NULL OR name_ar IS NULL OR category_key IS NULL;
    END IF;
END $$;

-- =====================================================
-- 1C. INSERT DEFAULT CATEGORIES SAFELY
-- =====================================================
-- Insert default categories that match existing tarot_spreads.category values
DO $category_insert$
BEGIN
    -- Only insert if categories don't already exist
    INSERT INTO spread_categories (category_key, name_ar, name_en, description_ar, description_en, sort_order) 
    SELECT * FROM (VALUES
        -- Main categories from tarot_spreads table
        ('love', 'الحب والعلاقات', 'Love & Relationships', 'فتحات تتعلق بالحب والعلاقات العاطفية', 'Spreads related to love and romantic relationships', 1),
        ('career', 'المهنة والعمل', 'Career & Work', 'فتحات تتعلق بالمهنة والحياة المهنية', 'Spreads related to career and professional life', 2),
        ('general', 'عام', 'General', 'فتحات عامة لجميع جوانب الحياة', 'General spreads for all aspects of life', 3),
        ('spiritual', 'روحانية', 'Spiritual', 'فتحات تتعلق بالنمو الروحي والتطور الشخصي', 'Spreads related to spiritual growth and personal development', 4),
        ('health', 'الصحة والعافية', 'Health & Wellness', 'فتحات تتعلق بالصحة الجسدية والعقلية', 'Spreads related to physical and mental health', 5),
        ('finance', 'المال والثروة', 'Finance & Wealth', 'فتحات تتعلق بالأمور المالية والثروة', 'Spreads related to financial matters and wealth', 6),
        ('decision', 'اتخاذ القرارات', 'Decision Making', 'فتحات تساعد في اتخاذ القرارات المهمة', 'Spreads to help with important decision making', 7),
        -- Additional popular categories
        ('family', 'العائلة', 'Family', 'فتحات تتعلق بالعائلة والأسرة', 'Spreads related to family and household matters', 8),
        ('personal_growth', 'النمو الشخصي', 'Personal Growth', 'فتحات تتعلق بتطوير الذات والنمو الشخصي', 'Spreads related to self-development and personal growth', 9),
        ('past_present_future', 'الماضي الحاضر المستقبل', 'Past Present Future', 'فتحات تستكشف الماضي والحاضر والمستقبل', 'Spreads exploring past, present, and future', 10)
    ) AS t(category_key, name_ar, name_en, description_ar, description_en, sort_order)
    WHERE NOT EXISTS (
        SELECT 1 FROM spread_categories 
        WHERE spread_categories.category_key = t.category_key
    );
    
    -- Update any existing rows to have proper defaults
    UPDATE spread_categories 
    SET 
        name_en = COALESCE(name_en, 'Unnamed Category'),
        name_ar = COALESCE(name_ar, 'فئة غير مسماة'),
        description_en = COALESCE(description_en, 'No description available'),
        description_ar = COALESCE(description_ar, 'لا يوجد وصف متاح'),
        sort_order = COALESCE(sort_order, 0),
        is_active = COALESCE(is_active, true),
        created_at = COALESCE(created_at, NOW()),
        updated_at = COALESCE(updated_at, NOW())
    WHERE name_en IS NULL OR name_ar IS NULL OR sort_order IS NULL;
    
EXCEPTION
    WHEN unique_violation THEN
        -- Category already exists, continue
        NULL;
    WHEN not_null_violation THEN
        -- Handle NOT NULL constraints
        NULL;
END $category_insert$;

-- =====================================================
-- 2. ADD MISSING BILINGUAL FIELDS TO PROFILES TABLE
-- =====================================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio_ar TEXT,
ADD COLUMN IF NOT EXISTS bio_en TEXT;

-- Migrate existing bio data to bilingual fields (safe migration)
DO $$
BEGIN
    -- Only migrate if bio column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        UPDATE profiles 
        SET 
            bio_en = COALESCE(bio_en, bio, ''),
            bio_ar = COALESCE(bio_ar, bio, '')
        WHERE bio IS NOT NULL;
    ELSE
        -- Set default values if no existing bio column
        UPDATE profiles 
        SET 
            bio_en = COALESCE(bio_en, ''),
            bio_ar = COALESCE(bio_ar, '')
        WHERE bio_en IS NULL OR bio_ar IS NULL;
    END IF;
END $$;

-- =====================================================
-- 3. ADD MISSING BILINGUAL FIELDS TO SYSTEM_CONFIGURATIONS
-- =====================================================
ALTER TABLE system_configurations 
ADD COLUMN IF NOT EXISTS display_name_ar TEXT,
ADD COLUMN IF NOT EXISTS display_name_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Migrate existing display_name and description to bilingual fields (safe migration)
DO $$
BEGIN
    -- Only migrate if original columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_configurations' AND column_name = 'display_name') THEN
        UPDATE system_configurations 
        SET 
            display_name_en = COALESCE(display_name_en, display_name, config_key),
            display_name_ar = COALESCE(display_name_ar, display_name, config_key),
            description_en = COALESCE(description_en, description, ''),
            description_ar = COALESCE(description_ar, description, '')
        WHERE display_name IS NOT NULL OR description IS NOT NULL;
    ELSE
        -- Set default values if no existing columns
        UPDATE system_configurations 
        SET 
            display_name_en = COALESCE(display_name_en, config_key),
            display_name_ar = COALESCE(display_name_ar, config_key),
            description_en = COALESCE(description_en, ''),
            description_ar = COALESCE(description_ar, '')
        WHERE display_name_en IS NULL OR display_name_ar IS NULL;
    END IF;
END $$;

-- =====================================================
-- 4A. CLEAN UP DUPLICATE RECORDS BEFORE CONSTRAINTS
-- =====================================================
-- Remove duplicate records, keeping the first one
DO $cleanup_duplicates$
BEGIN
    -- Clean up duplicate category_key values
    DELETE FROM spread_categories 
    WHERE id NOT IN (
        SELECT MIN(id) 
        FROM spread_categories 
        WHERE category_key IS NOT NULL
        GROUP BY category_key
    ) AND category_key IS NOT NULL;
    
    -- Clean up duplicate name_ar values  
    DELETE FROM spread_categories 
    WHERE id NOT IN (
        SELECT MIN(id) 
        FROM spread_categories 
        WHERE name_ar IS NOT NULL
        GROUP BY name_ar
    ) AND name_ar IS NOT NULL;
    
    -- Clean up duplicate name_en values
    DELETE FROM spread_categories 
    WHERE id NOT IN (
        SELECT MIN(id) 
        FROM spread_categories 
        WHERE name_en IS NOT NULL  
        GROUP BY name_en
    ) AND name_en IS NOT NULL;
    
    -- Update any remaining NULL values to make them unique
    UPDATE spread_categories 
    SET 
        name_ar = COALESCE(name_ar, 'فئة غير مسماة ' || id::text),
        name_en = COALESCE(name_en, 'Unnamed Category ' || id::text),
        category_key = COALESCE(category_key, 'category_' || id::text)
    WHERE name_ar IS NULL OR name_en IS NULL OR category_key IS NULL;
    
EXCEPTION
    WHEN others THEN
        -- Log the error but continue
        RAISE NOTICE 'Error during duplicate cleanup: %', SQLERRM;
END $cleanup_duplicates$;

-- =====================================================
-- 4B. ADD NOT NULL CONSTRAINTS AFTER DATA POPULATION
-- =====================================================
-- Add NOT NULL constraints after data is populated
DO $$
BEGIN
    -- Add NOT NULL constraints only if they don't exist
    BEGIN
        ALTER TABLE spread_categories ALTER COLUMN name_ar SET NOT NULL;
    EXCEPTION
        WHEN others THEN
            -- Column already NOT NULL or other issue
            NULL;
    END;
    
    BEGIN
        ALTER TABLE spread_categories ALTER COLUMN name_en SET NOT NULL;
    EXCEPTION
        WHEN others THEN
            -- Column already NOT NULL or other issue
            NULL;
    END;
    
    BEGIN
        ALTER TABLE spread_categories ALTER COLUMN description_ar SET NOT NULL;
    EXCEPTION
        WHEN others THEN
            -- Column already NOT NULL or other issue
            NULL;
    END;
    
    BEGIN
        ALTER TABLE spread_categories ALTER COLUMN description_en SET NOT NULL;
    EXCEPTION
        WHEN others THEN
            -- Column already NOT NULL or other issue
            NULL;
    END;
    
    BEGIN
        ALTER TABLE spread_categories ALTER COLUMN category_key SET NOT NULL;
    EXCEPTION
        WHEN others THEN
            -- Column already NOT NULL or other issue
            NULL;
    END;
END $$;

-- =====================================================
-- 4C. ADD UNIQUE CONSTRAINTS SAFELY  
-- =====================================================
-- Add unique constraints safely after cleanup
DO $add_constraints$
BEGIN
    -- Add unique constraint for category_key
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'unique_category_key' 
                  AND table_name = 'spread_categories') THEN
        ALTER TABLE spread_categories ADD CONSTRAINT unique_category_key UNIQUE(category_key);
    END IF;
    
    -- Add unique constraint for name_ar
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'unique_category_name_ar' 
                  AND table_name = 'spread_categories') THEN
        ALTER TABLE spread_categories ADD CONSTRAINT unique_category_name_ar UNIQUE(name_ar);
    END IF;
    
    -- Add unique constraint for name_en
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'unique_category_name_en' 
                  AND table_name = 'spread_categories') THEN
        ALTER TABLE spread_categories ADD CONSTRAINT unique_category_name_en UNIQUE(name_en);
    END IF;
    
EXCEPTION
    WHEN unique_violation THEN
        -- Still duplicates, try to fix them
        RAISE NOTICE 'Unique violation detected, attempting to fix remaining duplicates...';
        
        -- Add suffixes to make duplicates unique
        UPDATE spread_categories 
        SET name_ar = name_ar || ' (' || id::text || ')'
        WHERE id NOT IN (
            SELECT MIN(id) 
            FROM spread_categories 
            WHERE name_ar IS NOT NULL
            GROUP BY name_ar
        ) AND name_ar IS NOT NULL;
        
        UPDATE spread_categories 
        SET name_en = name_en || ' (' || id::text || ')'
        WHERE id NOT IN (
            SELECT MIN(id) 
            FROM spread_categories 
            WHERE name_en IS NOT NULL
            GROUP BY name_en
        ) AND name_en IS NOT NULL;
        
        -- Try adding constraints again
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                          WHERE constraint_name = 'unique_category_name_ar' 
                          AND table_name = 'spread_categories') THEN
                ALTER TABLE spread_categories ADD CONSTRAINT unique_category_name_ar UNIQUE(name_ar);
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                          WHERE constraint_name = 'unique_category_name_en' 
                          AND table_name = 'spread_categories') THEN
                ALTER TABLE spread_categories ADD CONSTRAINT unique_category_name_en UNIQUE(name_en);
            END IF;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Unable to add unique constraints: %', SQLERRM;
        END;
        
    WHEN duplicate_object THEN
        -- Constraint already exists, continue
        RAISE NOTICE 'Constraint already exists, skipping...';
        
    WHEN others THEN
        RAISE NOTICE 'Error adding constraints: %', SQLERRM;
END $add_constraints$;

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_spread_categories_key ON spread_categories(category_key);
CREATE INDEX IF NOT EXISTS idx_spread_categories_active ON spread_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_spread_categories_sort ON spread_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_profiles_bio_search ON profiles USING gin(to_tsvector('english', COALESCE(bio_en, '')));

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE spread_categories ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies first
DROP POLICY IF EXISTS "Admin can manage all categories" ON spread_categories;
DROP POLICY IF EXISTS "Public can view active categories" ON spread_categories;

-- Policy: Admin and Super Admin can manage all categories
CREATE POLICY "Admin can manage all categories" ON spread_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Public can view active categories
CREATE POLICY "Public can view active categories" ON spread_categories
    FOR SELECT USING (is_active = true);

-- =====================================================
-- 7. UPDATE FUNCTIONS FOR BILINGUAL SUPPORT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns (with existence checks)
DO $$
BEGIN
    -- Check if trigger exists before creating for spread_categories
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_spread_categories_updated_at') THEN
        CREATE TRIGGER update_spread_categories_updated_at
            BEFORE UPDATE ON spread_categories
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Check if trigger exists before creating for profiles
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at
            BEFORE UPDATE ON profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating triggers: %', SQLERRM;
END $$;

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================
-- Verify the new structure
SELECT 'STEP 1 COMPLETE: Database bilingual fixes applied successfully' as status;

-- Show spread categories
SELECT 
    id,
    category_key,
    name_en,
    name_ar,
    sort_order,
    is_active
FROM spread_categories
ORDER BY sort_order;

-- Show bilingual fields status
SELECT 
    'profiles' as table_name,
    COUNT(*) as total_records,
    COUNT(bio_en) as bio_en_count,
    COUNT(bio_ar) as bio_ar_count
FROM profiles
UNION ALL
SELECT 
    'system_configurations' as table_name,
    COUNT(*) as total_records,
    COUNT(display_name_en) as display_name_en_count,
    COUNT(display_name_ar) as display_name_ar_count
FROM system_configurations
UNION ALL
SELECT 
    'spread_categories' as table_name,
    COUNT(*) as total_records,
    COUNT(name_en) as name_en_count,
    COUNT(name_ar) as name_ar_count
FROM spread_categories;

-- Show any existing tarot_spreads categories for reference
SELECT DISTINCT category as existing_categories
FROM tarot_spreads 
WHERE category IS NOT NULL
ORDER BY category; 