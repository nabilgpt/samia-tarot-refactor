-- =================================================
-- SAMIA TAROT DECK TYPES TABLE CREATION (FIXED VERSION)
-- Bilingual deck types management system
-- =================================================

-- Drop existing objects if they exist (clean slate approach)
DROP TRIGGER IF EXISTS trigger_deck_types_updated_at ON deck_types;
DROP FUNCTION IF EXISTS update_deck_types_updated_at();
DROP FUNCTION IF EXISTS get_deck_type_id(TEXT);
DROP FUNCTION IF EXISTS get_deck_type_name(UUID, TEXT);

-- Drop existing policies
DROP POLICY IF EXISTS "Admin and Super Admin can read all deck types" ON deck_types;
DROP POLICY IF EXISTS "Admin and Super Admin can insert deck types" ON deck_types;
DROP POLICY IF EXISTS "Admin and Super Admin can update deck types" ON deck_types;

-- Drop existing indexes
DROP INDEX IF EXISTS idx_deck_types_name_en;
DROP INDEX IF EXISTS idx_deck_types_name_ar;
DROP INDEX IF EXISTS idx_deck_types_active;
DROP INDEX IF EXISTS idx_deck_types_created_by;

-- Create deck_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS deck_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR(50) NOT NULL,
  name_ar VARCHAR(50) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Add unique constraints separately to avoid conflicts
DO $$
BEGIN
  -- Add unique constraint for name_en if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'deck_types_name_en_key'
  ) THEN
    ALTER TABLE deck_types ADD CONSTRAINT deck_types_name_en_key UNIQUE (name_en);
  END IF;
  
  -- Add unique constraint for name_ar if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'deck_types_name_ar_key'
  ) THEN
    ALTER TABLE deck_types ADD CONSTRAINT deck_types_name_ar_key UNIQUE (name_ar);
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_deck_types_name_en ON deck_types(name_en);
CREATE INDEX IF NOT EXISTS idx_deck_types_name_ar ON deck_types(name_ar);
CREATE INDEX IF NOT EXISTS idx_deck_types_active ON deck_types(is_active);
CREATE INDEX IF NOT EXISTS idx_deck_types_created_by ON deck_types(created_by);

-- Add RLS (Row Level Security) policies
ALTER TABLE deck_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with error handling
DO $$
BEGIN
  -- Check if profiles table exists before creating policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    
    -- Allow admins and super_admins to read all deck types
    CREATE POLICY "Admin and Super Admin can read all deck types"
    ON deck_types FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
        AND profiles.is_active = true
      )
    );

    -- Allow admins and super_admins to insert deck types
    CREATE POLICY "Admin and Super Admin can insert deck types"
    ON deck_types FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
        AND profiles.is_active = true
      )
    );

    -- Allow admins and super_admins to update deck types
    CREATE POLICY "Admin and Super Admin can update deck types"
    ON deck_types FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
        AND profiles.is_active = true
      )
    );
    
    RAISE NOTICE '✅ RLS policies created successfully';
  ELSE
    RAISE NOTICE '⚠️  Profiles table not found, skipping RLS policies';
  END IF;
END $$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deck_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deck_types_updated_at
  BEFORE UPDATE ON deck_types
  FOR EACH ROW
  EXECUTE FUNCTION update_deck_types_updated_at();

-- Insert default deck types with translations (with conflict handling)
INSERT INTO deck_types (name_en, name_ar, is_active) VALUES
  ('Rider-Waite', 'رايدر-وايت', true),
  ('Marseille', 'مرسيليا', true),
  ('Thoth', 'تحوت', true),
  ('Wild Unknown', 'المجهول البري', true),
  ('Moonchild', 'طفل القمر', true),
  ('Starchild', 'طفل النجوم', true),
  ('Moroccan', 'مغربي', true),
  ('Custom', 'مخصص', true),
  ('Traditional', 'تقليدي', true),
  ('Modern', 'حديث', true),
  ('Contemporary', 'معاصر', true),
  ('Classic', 'كلاسيكي', true)
ON CONFLICT (name_en) DO NOTHING;

-- Create helpful function to get deck type by name
CREATE OR REPLACE FUNCTION get_deck_type_id(deck_type_name TEXT)
RETURNS UUID AS $$
DECLARE
  type_id UUID;
BEGIN
  -- Try to find by English name first, then Arabic name
  SELECT id INTO type_id 
  FROM deck_types 
  WHERE (name_en = deck_type_name OR name_ar = deck_type_name)
  AND is_active = true
  LIMIT 1;
  
  RETURN type_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get deck type name in specified language
CREATE OR REPLACE FUNCTION get_deck_type_name(type_id UUID, lang TEXT DEFAULT 'en')
RETURNS TEXT AS $$
DECLARE
  type_name TEXT;
BEGIN
  IF lang = 'ar' THEN
    SELECT name_ar INTO type_name FROM deck_types WHERE id = type_id AND is_active = true;
  ELSE
    SELECT name_en INTO type_name FROM deck_types WHERE id = type_id AND is_active = true;
  END IF;
  
  RETURN COALESCE(type_name, '');
END;
$$ LANGUAGE plpgsql;

-- Add comments to the table
COMMENT ON TABLE deck_types IS 'Bilingual deck types for tarot card management system';
COMMENT ON COLUMN deck_types.name_en IS 'English name of the deck type';
COMMENT ON COLUMN deck_types.name_ar IS 'Arabic name of the deck type';
COMMENT ON COLUMN deck_types.created_by IS 'User who created this deck type';
COMMENT ON COLUMN deck_types.is_active IS 'Whether this deck type is active and available for use';

-- Final success message with count
DO $$
DECLARE
  type_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO type_count FROM deck_types WHERE is_active = true;
  RAISE NOTICE '✅ Deck Types table created successfully with % default types', type_count;
  RAISE NOTICE '🎯 Table structure: id, name_en, name_ar, created_by, created_at, updated_at, is_active';
  RAISE NOTICE '🔐 RLS policies: Admin/Super Admin access only';
  RAISE NOTICE '📚 Helper functions: get_deck_type_id(), get_deck_type_name()';
END $$; 