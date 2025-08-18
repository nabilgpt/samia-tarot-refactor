-- =================================================
-- SAMIA TAROT: Fix Missing updated_at Field in Spreads Table
-- =================================================
-- This script safely adds the updated_at field and auto-update trigger
-- Can be run multiple times without issues (IF NOT EXISTS protection)
-- =================================================

-- 1. Add updated_at column if missing (safe operation)
ALTER TABLE spreads
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION set_spread_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop existing trigger if it exists (ignore errors)
DROP TRIGGER IF EXISTS set_spread_updated_at_trigger ON spreads;

-- 4. Create trigger that fires on UPDATE
CREATE TRIGGER set_spread_updated_at_trigger
BEFORE UPDATE ON spreads
FOR EACH ROW
EXECUTE FUNCTION set_spread_updated_at();

-- 5. Update existing records to have proper updated_at values
UPDATE spreads 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- =================================================
-- VERIFICATION QUERIES (Optional - run to check)
-- =================================================

-- Check if column exists and has proper values
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'spreads' AND column_name = 'updated_at';

-- Check if trigger exists
-- SELECT trigger_name FROM information_schema.triggers 
-- WHERE event_object_table = 'spreads' AND trigger_name = 'set_spread_updated_at_trigger';

-- =================================================
-- COMPLETION MESSAGE
-- =================================================
SELECT 'spreads table updated_at field setup completed successfully!' as status; 