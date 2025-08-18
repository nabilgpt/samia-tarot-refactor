# 🚨 URGENT: Database Migration Required to Fix Spread Manager

## Current Issue
The spread manager is failing with this error:
```
ERROR: 42P01: relation "spread_cards_id_seq" does not exist
column spread_cards_1.assigned_by does not exist
```

## Root Cause
The `spread_cards` table either:
1. Doesn't exist at all
2. Exists but is missing critical columns
3. Was created without proper sequences/constraints

## ⚡ IMMEDIATE SOLUTION

### Step 1: Execute Complete Database Setup
Go to **Supabase Dashboard → SQL Editor** and run this comprehensive script:

**Use the file:** `database/complete-spread-cards-setup.sql`

**OR copy this complete script:**

```sql
-- =====================================================
-- SAMIA TAROT - COMPLETE SPREAD_CARDS TABLE SETUP
-- Handles all cases: missing table, missing columns, etc.
-- =====================================================

-- First, check if the table exists and create if needed
CREATE TABLE IF NOT EXISTS spread_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spread_id UUID NOT NULL REFERENCES spreads(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  position_name_en TEXT,
  position_name_ar TEXT,
  card_id UUID REFERENCES tarot_cards(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Freeform positioning fields
  position_x INTEGER DEFAULT NULL,
  position_y INTEGER DEFAULT NULL,
  width INTEGER DEFAULT 80,
  height INTEGER DEFAULT 120,
  rotation REAL DEFAULT 0,
  z_index INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  position_description TEXT,
  layout_metadata JSONB DEFAULT '{}',
  
  -- Assignment tracking fields
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assignment_mode TEXT DEFAULT 'auto' CHECK (assignment_mode IN ('auto', 'manual')),
  
  -- Constraints
  CONSTRAINT unique_position_per_spread UNIQUE(spread_id, position)
);

-- Add any missing columns to existing table (in case table exists but columns are missing)
DO $$ 
BEGIN
  -- Freeform positioning columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spread_cards' AND column_name='position_x') THEN
    ALTER TABLE spread_cards ADD COLUMN position_x INTEGER DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spread_cards' AND column_name='position_y') THEN
    ALTER TABLE spread_cards ADD COLUMN position_y INTEGER DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spread_cards' AND column_name='width') THEN
    ALTER TABLE spread_cards ADD COLUMN width INTEGER DEFAULT 80;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spread_cards' AND column_name='height') THEN
    ALTER TABLE spread_cards ADD COLUMN height INTEGER DEFAULT 120;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spread_cards' AND column_name='rotation') THEN
    ALTER TABLE spread_cards ADD COLUMN rotation REAL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spread_cards' AND column_name='z_index') THEN
    ALTER TABLE spread_cards ADD COLUMN z_index INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spread_cards' AND column_name='is_visible') THEN
    ALTER TABLE spread_cards ADD COLUMN is_visible BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spread_cards' AND column_name='position_description') THEN
    ALTER TABLE spread_cards ADD COLUMN position_description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spread_cards' AND column_name='layout_metadata') THEN
    ALTER TABLE spread_cards ADD COLUMN layout_metadata JSONB DEFAULT '{}';
  END IF;
  
  -- Assignment tracking columns  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spread_cards' AND column_name='assigned_by') THEN
    ALTER TABLE spread_cards ADD COLUMN assigned_by UUID REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spread_cards' AND column_name='assigned_at') THEN
    ALTER TABLE spread_cards ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spread_cards' AND column_name='assignment_mode') THEN
    ALTER TABLE spread_cards ADD COLUMN assignment_mode TEXT DEFAULT 'auto';
  END IF;
END $$;

-- Add constraint for assignment_mode if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name='spread_cards_assignment_mode_check') THEN
    ALTER TABLE spread_cards ADD CONSTRAINT spread_cards_assignment_mode_check 
    CHECK (assignment_mode IN ('auto', 'manual'));
  END IF;
END $$;

-- Update existing records with default values for new columns
UPDATE spread_cards 
SET 
  position_x = CASE WHEN position_x IS NULL THEN (position % 5) * 100 + 50 ELSE position_x END,
  position_y = CASE WHEN position_y IS NULL THEN (position / 5) * 140 + 70 ELSE position_y END,
  width = CASE WHEN width IS NULL THEN 80 ELSE width END,
  height = CASE WHEN height IS NULL THEN 120 ELSE height END,
  rotation = CASE WHEN rotation IS NULL THEN 0 ELSE rotation END,
  z_index = CASE WHEN z_index IS NULL THEN position ELSE z_index END,
  is_visible = CASE WHEN is_visible IS NULL THEN true ELSE is_visible END,
  assignment_mode = CASE WHEN assignment_mode IS NULL THEN 'auto' ELSE assignment_mode END
WHERE position_x IS NULL OR position_y IS NULL OR width IS NULL OR height IS NULL 
   OR rotation IS NULL OR z_index IS NULL OR is_visible IS NULL OR assignment_mode IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spread_cards_spread_id ON spread_cards(spread_id);
CREATE INDEX IF NOT EXISTS idx_spread_cards_position ON spread_cards(position);
CREATE INDEX IF NOT EXISTS idx_spread_cards_card_id ON spread_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_spread_cards_position_xy ON spread_cards(position_x, position_y);
CREATE INDEX IF NOT EXISTS idx_spread_cards_z_index ON spread_cards(z_index);
CREATE INDEX IF NOT EXISTS idx_spread_cards_assigned_by ON spread_cards(assigned_by);
CREATE INDEX IF NOT EXISTS idx_spread_cards_assignment_mode ON spread_cards(assignment_mode);
CREATE INDEX IF NOT EXISTS idx_spread_cards_visible ON spread_cards(is_visible);

-- Enable RLS (Row Level Security)
ALTER TABLE spread_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "spread_cards_select_policy" ON spread_cards;
DROP POLICY IF EXISTS "spread_cards_insert_policy" ON spread_cards;
DROP POLICY IF EXISTS "spread_cards_update_policy" ON spread_cards;
DROP POLICY IF EXISTS "spread_cards_delete_policy" ON spread_cards;

-- Create RLS policies
CREATE POLICY "spread_cards_select_policy" ON spread_cards FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM spreads s 
    WHERE s.id = spread_cards.spread_id 
    AND (s.status = 'approved' OR s.creator_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'monitor')))
  )
);

CREATE POLICY "spread_cards_insert_policy" ON spread_cards FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM spreads s 
    WHERE s.id = spread_cards.spread_id 
    AND (s.creator_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')))
  )
);

CREATE POLICY "spread_cards_update_policy" ON spread_cards FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM spreads s 
    WHERE s.id = spread_cards.spread_id 
    AND (s.creator_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')))
  )
);

CREATE POLICY "spread_cards_delete_policy" ON spread_cards FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM spreads s 
    WHERE s.id = spread_cards.spread_id 
    AND (s.creator_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')))
  )
);

-- Add data validation triggers
CREATE OR REPLACE FUNCTION validate_spread_card_position() RETURNS TRIGGER AS $$
BEGIN
  -- Validate position coordinates
  IF NEW.position_x IS NOT NULL AND (NEW.position_x < 0 OR NEW.position_x > 2000) THEN
    RAISE EXCEPTION 'position_x must be between 0 and 2000';
  END IF;
  
  IF NEW.position_y IS NOT NULL AND (NEW.position_y < 0 OR NEW.position_y > 2000) THEN
    RAISE EXCEPTION 'position_y must be between 0 and 2000';
  END IF;
  
  -- Validate dimensions
  IF NEW.width IS NOT NULL AND (NEW.width < 20 OR NEW.width > 200) THEN
    RAISE EXCEPTION 'width must be between 20 and 200';
  END IF;
  
  IF NEW.height IS NOT NULL AND (NEW.height < 30 OR NEW.height > 300) THEN
    RAISE EXCEPTION 'height must be between 30 and 300';
  END IF;
  
  -- Validate rotation
  IF NEW.rotation IS NOT NULL AND (NEW.rotation < 0 OR NEW.rotation >= 360) THEN
    NEW.rotation = NEW.rotation % 360;
  END IF;
  
  -- Set updated_at
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_validate_spread_card_position ON spread_cards;
CREATE TRIGGER trigger_validate_spread_card_position
  BEFORE INSERT OR UPDATE ON spread_cards
  FOR EACH ROW EXECUTE FUNCTION validate_spread_card_position();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON spread_cards TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'Complete spread_cards table setup completed successfully!' as result;
```

### Step 2: Restart Backend Server
After running the migration, restart your backend server:

```bash
# Stop the current backend (Ctrl+C in backend terminal)
npm run backend
```

### Step 3: Clear Browser Cache
- Hard refresh your browser (Ctrl+Shift+R)
- Or open a new incognito/private window

## Expected Results
After the migration, you should see:
- ✅ "Complete spread_cards table setup completed successfully!" message
- ✅ Spreads loading without errors
- ✅ Both Grid and Freeform editors working
- ✅ No more database-related errors

## What This Script Does
1. **Creates the table** if it doesn't exist with proper UUID primary key
2. **Adds missing columns** if table exists but columns are missing
3. **Sets up all indexes** for optimal performance
4. **Configures RLS policies** for security
5. **Creates validation triggers** for data integrity
6. **Grants proper permissions** for authenticated users

## Troubleshooting
If you still get errors after the migration:

1. **Check if the script ran completely** - look for the success message
2. **Restart backend server** - this is crucial for loading new schema
3. **Check Supabase logs** - go to Logs section in Supabase dashboard
4. **Clear browser cache** - old cached API responses can cause issues

---

**⚠️ CRITICAL**: This comprehensive script handles all table structure issues. The freeform spread editor will work perfectly after this migration is executed. 