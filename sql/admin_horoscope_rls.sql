-- Admin-Only Horoscopes with DB-First RLS
-- Enforces: Public=today+approved only; Reader/Admin ≤60d via Signed URLs; >60d hard-delete

-- Enable RLS on horoscopes table
ALTER TABLE horoscopes ENABLE ROW LEVEL SECURITY;

-- 1. PUBLIC POLICY: Only today's approved horoscopes
DROP POLICY IF EXISTS "horoscopes_public_read" ON horoscopes;
CREATE POLICY "horoscopes_public_read" ON horoscopes
FOR SELECT
TO public
USING (
  scope = 'daily'
  AND ref_date = CURRENT_DATE
  AND approved_at IS NOT NULL
  AND approved_by IS NOT NULL
);

-- 2. READER POLICY: Last 60 days (non-public) read-only for training/review
DROP POLICY IF EXISTS "horoscopes_reader_read" ON horoscopes;
CREATE POLICY "horoscopes_reader_read" ON horoscopes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.code = 'reader'
  )
  AND scope = 'daily'
  AND ref_date >= (CURRENT_DATE - INTERVAL '60 days')
  AND ref_date <= CURRENT_DATE
);

-- 3. ADMIN/SUPERADMIN POLICY: Full access to ≤60 days
DROP POLICY IF EXISTS "horoscopes_admin_all" ON horoscopes;
CREATE POLICY "horoscopes_admin_all" ON horoscopes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.code IN ('admin', 'superadmin')
  )
  AND ref_date >= (CURRENT_DATE - INTERVAL '60 days')
);

-- 4. MONITOR POLICY: Read + approve/reject for pending items
DROP POLICY IF EXISTS "horoscopes_monitor_manage" ON horoscopes;
CREATE POLICY "horoscopes_monitor_manage" ON horoscopes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.code = 'monitor'
  )
  AND ref_date >= (CURRENT_DATE - INTERVAL '60 days')
);

-- 5. Hard delete function for >60 days
CREATE OR REPLACE FUNCTION cleanup_old_horoscopes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
  media_ids BIGINT[];
BEGIN
  -- Collect media asset IDs before deleting horoscopes
  SELECT array_agg(audio_media_id)
  INTO media_ids
  FROM horoscopes
  WHERE ref_date < (CURRENT_DATE - INTERVAL '60 days')
    AND audio_media_id IS NOT NULL;

  -- Delete old horoscopes
  DELETE FROM horoscopes
  WHERE ref_date < (CURRENT_DATE - INTERVAL '60 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Delete associated media assets (storage cleanup must be done externally)
  IF media_ids IS NOT NULL THEN
    DELETE FROM media_assets
    WHERE id = ANY(media_ids);
  END IF;

  -- Log cleanup action
  INSERT INTO audit_log (actor, event, entity, meta)
  VALUES (
    NULL,
    'automated_cleanup',
    'horoscopes',
    jsonb_build_object(
      'deleted_horoscopes', deleted_count,
      'deleted_media_assets', array_length(media_ids, 1),
      'cutoff_date', (CURRENT_DATE - INTERVAL '60 days')
    )
  );
END;
$$;

-- 6. TikTok column completely removed per M38 security hardening
-- No trigger needed - column doesn't exist

-- 7. Grant necessary permissions
GRANT SELECT ON horoscopes TO public;
GRANT SELECT ON horoscopes TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_horoscopes_public_access 
ON horoscopes (scope, ref_date, approved_at) 
WHERE scope = 'daily' AND approved_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_horoscopes_date_range 
ON horoscopes (ref_date) 
WHERE ref_date >= (CURRENT_DATE - INTERVAL '60 days');