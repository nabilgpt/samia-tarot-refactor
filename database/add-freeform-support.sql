-- =====================================================
-- SAMIA TAROT - FREEFORM SPREAD EDITOR DATABASE MIGRATION
-- Add complete freeform positioning support + missing assignment fields
-- =====================================================

-- Add ALL freeform positioning fields to spread_cards table
ALTER TABLE spread_cards 
ADD COLUMN IF NOT EXISTS position_x INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS position_y INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS rotation REAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS position_description TEXT,
ADD COLUMN IF NOT EXISTS layout_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS assignment_mode TEXT DEFAULT 'auto' CHECK (assignment_mode IN ('auto', 'manual'));

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

-- Add performance indexes for freeform queries
CREATE INDEX IF NOT EXISTS idx_spread_cards_position_xy ON spread_cards(position_x, position_y);
CREATE INDEX IF NOT EXISTS idx_spread_cards_visibility ON spread_cards(is_visible);
CREATE INDEX IF NOT EXISTS idx_spread_cards_z_index ON spread_cards(z_index);
CREATE INDEX IF NOT EXISTS idx_spread_cards_assigned_by ON spread_cards(assigned_by);
CREATE INDEX IF NOT EXISTS idx_spread_cards_assignment_mode ON spread_cards(assignment_mode);

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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_spread_card_position ON spread_cards;
CREATE TRIGGER trigger_validate_spread_card_position
  BEFORE INSERT OR UPDATE ON spread_cards
  FOR EACH ROW EXECUTE FUNCTION validate_spread_card_position();

-- Add RLS policies for new columns
CREATE POLICY "Users can view spread cards they have access to" ON spread_cards FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM spreads s 
    WHERE s.id = spread_cards.spread_id 
    AND (s.status = 'approved' OR s.creator_id = auth.uid())
  )
);

CREATE POLICY "Users can update spread cards they created" ON spread_cards FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM spreads s 
    WHERE s.id = spread_cards.spread_id 
    AND s.creator_id = auth.uid()
  )
);

-- Grant permissions for new columns
GRANT SELECT, INSERT, UPDATE ON spread_cards TO authenticated;
GRANT USAGE ON SEQUENCE spread_cards_id_seq TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN spread_cards.position_x IS 'X coordinate for freeform positioning (0-2000)';
COMMENT ON COLUMN spread_cards.position_y IS 'Y coordinate for freeform positioning (0-2000)';
COMMENT ON COLUMN spread_cards.width IS 'Card width in pixels for freeform mode (20-200)';
COMMENT ON COLUMN spread_cards.height IS 'Card height in pixels for freeform mode (30-300)';
COMMENT ON COLUMN spread_cards.rotation IS 'Card rotation in degrees (0-359)';
COMMENT ON COLUMN spread_cards.z_index IS 'Layering order for overlapping cards';
COMMENT ON COLUMN spread_cards.is_visible IS 'Whether the card position is visible';
COMMENT ON COLUMN spread_cards.position_description IS 'Optional description for the position';
COMMENT ON COLUMN spread_cards.layout_metadata IS 'Additional layout configuration as JSON';
COMMENT ON COLUMN spread_cards.assigned_by IS 'User who assigned the card to this position';
COMMENT ON COLUMN spread_cards.assigned_at IS 'Timestamp when the card was assigned';
COMMENT ON COLUMN spread_cards.assignment_mode IS 'How the card was assigned (auto/manual)';

-- Update table comment
COMMENT ON TABLE spread_cards IS 'Cards assigned to positions in spreads with freeform positioning support';

-- Log the migration
INSERT INTO spread_audit_log (
    spread_id, 
    action, 
    performed_by, 
    notes, 
    metadata
) 
SELECT 
    NULL,
    'schema_update',
    auth.uid(),
    'Added freeform support to spread_cards table',
    '{"migration": "add-freeform-support", "version": "1.0", "timestamp": "' || NOW() || '"}'::jsonb
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()); 