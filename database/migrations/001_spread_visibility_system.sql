-- ==========================================
-- SPREAD VISIBILITY SYSTEM MIGRATION
-- ==========================================
-- Implements Public/Targeted spread visibility with RLS enforcement
-- Version: 1.0.0
-- Date: 2025-08-17

BEGIN;

-- ===========================================
-- 1. CREATE SPREAD VISIBILITY TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS tarot.spreads_visibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spread_id UUID NOT NULL REFERENCES tarot_spreads(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT true,
    targeted_readers UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_spread_visibility UNIQUE (spread_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spreads_visibility_spread_id ON tarot.spreads_visibility(spread_id);
CREATE INDEX IF NOT EXISTS idx_spreads_visibility_public ON tarot.spreads_visibility(is_public);
CREATE INDEX IF NOT EXISTS idx_spreads_visibility_readers ON tarot.spreads_visibility USING GIN(targeted_readers);

-- ===========================================
-- 2. SPREAD VISIBILITY AUDIT TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS tarot.spreads_visibility_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spread_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'accessed')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    reader_id UUID, -- For access auditing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spreads_visibility_audit_spread_id ON tarot.spreads_visibility_audit(spread_id);
CREATE INDEX IF NOT EXISTS idx_spreads_visibility_audit_created_at ON tarot.spreads_visibility_audit(created_at);

-- ===========================================
-- 3. INITIALIZE EXISTING SPREADS
-- ===========================================

-- Insert visibility records for existing spreads
INSERT INTO tarot.spreads_visibility (spread_id, is_public, targeted_readers)
SELECT 
    id as spread_id,
    COALESCE(is_public, true) as is_public,
    '{}' as targeted_readers
FROM tarot_spreads 
WHERE id NOT IN (SELECT spread_id FROM tarot.spreads_visibility)
ON CONFLICT (spread_id) DO NOTHING;

-- ===========================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on spreads_visibility table
ALTER TABLE tarot.spreads_visibility ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can see all visibility settings
CREATE POLICY spreads_visibility_admin_all 
ON tarot.spreads_visibility
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
    )
);

-- Policy: Readers can only see visibility settings for spreads they can access
CREATE POLICY spreads_visibility_reader_read 
ON tarot.spreads_visibility
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'reader'
    )
    AND (
        is_public = true 
        OR auth.uid() = ANY(targeted_readers)
    )
);

-- ===========================================
-- 5. ENHANCED RLS FOR TAROT_SPREADS
-- ===========================================

-- Drop existing spread policies to recreate with visibility logic
DROP POLICY IF EXISTS "Readers can view spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Admins can manage spreads" ON tarot_spreads;

-- Enhanced policy: Readers can only view spreads they have access to
CREATE POLICY spreads_reader_access
ON tarot_spreads
FOR SELECT
TO authenticated
USING (
    -- Admin/Super Admin can see all
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin', 'monitor')
    )
    OR 
    -- Readers can only see public spreads or targeted ones
    (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'reader'
        )
        AND
        (
            -- Check if spread is public or reader is targeted
            EXISTS (
                SELECT 1 FROM tarot.spreads_visibility sv
                WHERE sv.spread_id = tarot_spreads.id
                AND (
                    sv.is_public = true 
                    OR auth.uid() = ANY(sv.targeted_readers)
                )
            )
            -- Fallback for spreads without visibility record (treat as public)
            OR NOT EXISTS (
                SELECT 1 FROM tarot.spreads_visibility sv
                WHERE sv.spread_id = tarot_spreads.id
            )
        )
    )
    OR
    -- Creator can always see their own spreads
    created_by = auth.uid()
);

-- Policy: Admin and spread creators can manage spreads
CREATE POLICY spreads_admin_manage
ON tarot_spreads
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
    )
    OR created_by = auth.uid()
);

-- ===========================================
-- 6. TRIGGERS FOR AUDIT AND MAINTENANCE
-- ===========================================

-- Function to create visibility record for new spreads
CREATE OR REPLACE FUNCTION create_spread_visibility()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tarot.spreads_visibility (spread_id, is_public, targeted_readers)
    VALUES (NEW.id, COALESCE(NEW.is_public, true), '{}')
    ON CONFLICT (spread_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create visibility records
DROP TRIGGER IF EXISTS trigger_create_spread_visibility ON tarot_spreads;
CREATE TRIGGER trigger_create_spread_visibility
    AFTER INSERT ON tarot_spreads
    FOR EACH ROW
    EXECUTE FUNCTION create_spread_visibility();

-- Function to audit visibility changes
CREATE OR REPLACE FUNCTION audit_spread_visibility_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO tarot.spreads_visibility_audit (
            spread_id, action, new_values, changed_by
        ) VALUES (
            NEW.spread_id, 'created', 
            jsonb_build_object(
                'is_public', NEW.is_public,
                'targeted_readers', NEW.targeted_readers
            ),
            auth.uid()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO tarot.spreads_visibility_audit (
            spread_id, action, old_values, new_values, changed_by
        ) VALUES (
            NEW.spread_id, 'updated',
            jsonb_build_object(
                'is_public', OLD.is_public,
                'targeted_readers', OLD.targeted_readers
            ),
            jsonb_build_object(
                'is_public', NEW.is_public,
                'targeted_readers', NEW.targeted_readers
            ),
            auth.uid()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO tarot.spreads_visibility_audit (
            spread_id, action, old_values, changed_by
        ) VALUES (
            OLD.spread_id, 'deleted',
            jsonb_build_object(
                'is_public', OLD.is_public,
                'targeted_readers', OLD.targeted_readers
            ),
            auth.uid()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auditing
DROP TRIGGER IF EXISTS trigger_audit_spread_visibility ON tarot.spreads_visibility;
CREATE TRIGGER trigger_audit_spread_visibility
    AFTER INSERT OR UPDATE OR DELETE ON tarot.spreads_visibility
    FOR EACH ROW
    EXECUTE FUNCTION audit_spread_visibility_changes();

-- ===========================================
-- 7. HELPER FUNCTIONS
-- ===========================================

-- Function to check if reader can access spread
CREATE OR REPLACE FUNCTION can_reader_access_spread(spread_uuid UUID, reader_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN := false;
BEGIN
    -- Check if spread is public or reader is targeted
    SELECT 
        CASE 
            WHEN sv.is_public = true THEN true
            WHEN reader_uuid = ANY(sv.targeted_readers) THEN true
            ELSE false
        END
    INTO has_access
    FROM tarot.spreads_visibility sv
    WHERE sv.spread_id = spread_uuid;
    
    -- If no visibility record exists, treat as public (backwards compatibility)
    IF NOT FOUND THEN
        has_access := true;
    END IF;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get accessible spreads for reader
CREATE OR REPLACE FUNCTION get_accessible_spreads_for_reader(reader_uuid UUID)
RETURNS TABLE(spread_id UUID, name TEXT, description TEXT, is_public BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.name,
        ts.description,
        COALESCE(sv.is_public, true) as is_public
    FROM tarot_spreads ts
    LEFT JOIN tarot.spreads_visibility sv ON sv.spread_id = ts.id
    WHERE ts.is_active = true
    AND (
        COALESCE(sv.is_public, true) = true 
        OR reader_uuid = ANY(COALESCE(sv.targeted_readers, '{}'))
    )
    ORDER BY ts.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 8. GRANTS AND PERMISSIONS
-- ===========================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tarot.spreads_visibility TO authenticated;
GRANT SELECT, INSERT ON tarot.spreads_visibility_audit TO authenticated;
GRANT USAGE ON SCHEMA tarot TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION can_reader_access_spread(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_accessible_spreads_for_reader(UUID) TO authenticated;

COMMIT;

-- ===========================================
-- VERIFICATION QUERIES (FOR TESTING)
-- ===========================================

-- Verify the migration
SELECT 
    'spreads_visibility table' as component,
    COUNT(*) as records
FROM tarot.spreads_visibility

UNION ALL

SELECT 
    'tarot_spreads with visibility' as component,
    COUNT(*) as records
FROM tarot_spreads ts
INNER JOIN tarot.spreads_visibility sv ON sv.spread_id = ts.id

UNION ALL

SELECT 
    'RLS policies on spreads_visibility' as component,
    COUNT(*) as records
FROM pg_policies 
WHERE tablename = 'spreads_visibility'

UNION ALL

SELECT 
    'RLS policies on tarot_spreads' as component,
    COUNT(*) as records
FROM pg_policies 
WHERE tablename = 'tarot_spreads';

-- Example usage queries (commented out for production)
-- SELECT * FROM get_accessible_spreads_for_reader('reader-uuid-here');
-- SELECT can_reader_access_spread('spread-uuid-here', 'reader-uuid-here');