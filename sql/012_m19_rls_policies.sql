-- M19: RLS Policies for Calls & Emergency tables
-- Enforce row-level security matching route guards exactly

-- Enable RLS on calls tables
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;  
ALTER TABLE siren_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS calls_policy_select ON calls;
DROP POLICY IF EXISTS calls_policy_insert ON calls;
DROP POLICY IF EXISTS calls_policy_update ON calls;
DROP POLICY IF EXISTS calls_policy_delete ON calls;

DROP POLICY IF EXISTS call_recordings_policy_select ON call_recordings;
DROP POLICY IF EXISTS call_recordings_policy_insert ON call_recordings;
DROP POLICY IF EXISTS call_recordings_policy_update ON call_recordings;
DROP POLICY IF EXISTS call_recordings_policy_delete ON call_recordings;

DROP POLICY IF EXISTS siren_alerts_policy_select ON siren_alerts;
DROP POLICY IF EXISTS siren_alerts_policy_insert ON siren_alerts;
DROP POLICY IF EXISTS siren_alerts_policy_update ON siren_alerts;
DROP POLICY IF EXISTS siren_alerts_policy_delete ON siren_alerts;

-- CALLS table RLS policies
-- Monitor/Admin/Superadmin have full access
-- Client can access calls for their orders
-- Reader can access calls for their assigned orders

CREATE POLICY calls_policy_select ON calls
FOR SELECT USING (
  -- Get current user role
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
  OR
  -- Client can see their own order calls
  (public.get_user_role(current_setting('app.current_user_id', true)) = 'client' 
   AND EXISTS (
     SELECT 1 FROM orders o 
     WHERE o.id = calls.order_id 
     AND o.user_id::text = current_setting('app.current_user_id', true)
   ))
  OR
  -- Reader can see assigned order calls
  (public.get_user_role(current_setting('app.current_user_id', true)) = 'reader'
   AND EXISTS (
     SELECT 1 FROM orders o
     WHERE o.id = calls.order_id
     AND o.assigned_reader::text = current_setting('app.current_user_id', true)
   ))
);

CREATE POLICY calls_policy_insert ON calls
FOR INSERT WITH CHECK (
  -- Only client/reader/admin can create calls
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('client', 'reader', 'admin', 'superadmin')
  AND
  -- Must be for orders they can access
  (public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
   OR
   EXISTS (
     SELECT 1 FROM orders o
     WHERE o.id = calls.order_id
     AND (
       (o.user_id::text = current_setting('app.current_user_id', true)) -- client owns order
       OR 
       (o.assigned_reader::text = current_setting('app.current_user_id', true)) -- reader assigned
     )
   ))
);

CREATE POLICY calls_policy_update ON calls
FOR UPDATE USING (
  -- Monitor/Admin/Superadmin can update any call
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
  OR
  -- Participants can update their calls (for recording controls, etc.)
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = calls.order_id
    AND (
      o.user_id::text = current_setting('app.current_user_id', true) -- client
      OR 
      o.assigned_reader::text = current_setting('app.current_user_id', true) -- reader
    )
  )
);

CREATE POLICY calls_policy_delete ON calls
FOR DELETE USING (
  -- Only superadmin can delete calls
  public.get_user_role(current_setting('app.current_user_id', true)) = 'superadmin'
);

-- CALL_RECORDINGS table RLS policies  
-- Same access pattern as calls table

CREATE POLICY call_recordings_policy_select ON call_recordings
FOR SELECT USING (
  -- Monitor/Admin/Superadmin full access
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
  OR
  -- Access if user can access the parent call
  EXISTS (
    SELECT 1 FROM calls c
    JOIN orders o ON o.id = c.order_id
    WHERE c.id = call_recordings.call_id
    AND (
      (public.get_user_role(current_setting('app.current_user_id', true)) = 'client' 
       AND o.user_id::text = current_setting('app.current_user_id', true))
      OR
      (public.get_user_role(current_setting('app.current_user_id', true)) = 'reader'
       AND o.assigned_reader::text = current_setting('app.current_user_id', true))
    )
  )
);

CREATE POLICY call_recordings_policy_insert ON call_recordings  
FOR INSERT WITH CHECK (
  -- System and authorized users can create recordings
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('reader', 'admin', 'superadmin')
  OR current_setting('app.current_user_id', true) = 'system'
);

CREATE POLICY call_recordings_policy_update ON call_recordings
FOR UPDATE USING (
  -- Monitor/Admin and system can update recordings
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
  OR current_setting('app.current_user_id', true) = 'system'
);

CREATE POLICY call_recordings_policy_delete ON call_recordings
FOR DELETE USING (
  -- Only admin+ can delete recordings
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('admin', 'superadmin')
);

-- SIREN_ALERTS table RLS policies
-- Participants can create alerts, Monitor+ can manage them

CREATE POLICY siren_alerts_policy_select ON siren_alerts
FOR SELECT USING (
  -- Monitor/Admin/Superadmin can see all alerts  
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
  OR
  -- Call participants can see alerts for their calls
  EXISTS (
    SELECT 1 FROM calls c
    JOIN orders o ON o.id = c.order_id  
    WHERE c.id = siren_alerts.call_id
    AND (
      o.user_id::text = current_setting('app.current_user_id', true) -- client
      OR
      o.assigned_reader::text = current_setting('app.current_user_id', true) -- reader
    )
  )
);

CREATE POLICY siren_alerts_policy_insert ON siren_alerts
FOR INSERT WITH CHECK (
  -- Call participants can create alerts
  EXISTS (
    SELECT 1 FROM calls c
    JOIN orders o ON o.id = c.order_id
    WHERE c.id = siren_alerts.call_id
    AND (
      o.user_id::text = current_setting('app.current_user_id', true) -- client can alert
      OR
      o.assigned_reader::text = current_setting('app.current_user_id', true) -- reader can alert
      OR
      public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
    )
  )
);

CREATE POLICY siren_alerts_policy_update ON siren_alerts
FOR UPDATE USING (
  -- Only Monitor+ can acknowledge/resolve alerts
  public.get_user_role(current_setting('app.current_user_id', true)) IN ('monitor', 'admin', 'superadmin')
);

CREATE POLICY siren_alerts_policy_delete ON siren_alerts
FOR DELETE USING (
  -- Only superadmin can delete alerts (for cleanup)
  public.get_user_role(current_setting('app.current_user_id', true)) = 'superadmin'
);

-- Add helpful functions for call access checking

-- Function to check if current user can access a specific call
CREATE OR REPLACE FUNCTION can_access_call_rls(call_id_param bigint) 
RETURNS boolean AS $$
DECLARE
  current_user_role text;
  current_user_id_val text;
BEGIN
  current_user_id_val := current_setting('app.current_user_id', true);
  current_user_role := public.get_user_role(current_user_id_val);
  
  -- Monitor/Admin/Superadmin always have access
  IF current_user_role IN ('monitor', 'admin', 'superadmin') THEN
    RETURN true;
  END IF;
  
  -- Check if user is involved in the order
  RETURN EXISTS (
    SELECT 1 FROM calls c
    JOIN orders o ON o.id = c.order_id
    WHERE c.id = call_id_param
    AND (
      (current_user_role = 'client' AND o.user_id::text = current_user_id_val)
      OR
      (current_user_role = 'reader' AND o.assigned_reader::text = current_user_id_val)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON calls TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON call_recordings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON siren_alerts TO anon, authenticated;

-- Only admin+ can delete
GRANT DELETE ON calls TO authenticated;
GRANT DELETE ON call_recordings TO authenticated;
GRANT DELETE ON siren_alerts TO authenticated;

COMMENT ON POLICY calls_policy_select ON calls IS 'M19: Allow access to calls based on order ownership/assignment and role hierarchy';
COMMENT ON POLICY call_recordings_policy_select ON call_recordings IS 'M19: Recording access follows call access pattern with signed URL discipline';
COMMENT ON POLICY siren_alerts_policy_select ON siren_alerts IS 'M19: Alert visibility for call participants and monitoring team';
COMMENT ON FUNCTION can_access_call_rls IS 'M19: RLS helper function to check call access permissions';