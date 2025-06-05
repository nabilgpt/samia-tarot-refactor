-- =====================================================
-- CRITICAL PRODUCTION RLS POLICIES
-- Enhanced Tarot Spread System
-- =====================================================

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "Users can view approved spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Readers can create custom spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Creators can update own spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Admins can manage all spreads" ON tarot_spreads;
DROP POLICY IF EXISTS "Users can view active decks" ON tarot_decks;
DROP POLICY IF EXISTS "Admins can manage decks" ON tarot_decks;
DROP POLICY IF EXISTS "Readers can manage service assignments" ON spread_service_assignments;
DROP POLICY IF EXISTS "Admins can view approval logs" ON spread_approval_logs;
DROP POLICY IF EXISTS "Clients can manage spread selections" ON client_spread_selections;
DROP POLICY IF EXISTS "Users can view own notifications" ON reader_spread_notifications;

-- =====================================================
-- 1. TAROT_DECKS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE tarot_decks ENABLE ROW LEVEL SECURITY;

-- Policy: All users can view active decks
CREATE POLICY "users_view_active_decks" ON tarot_decks
  FOR SELECT USING (
    is_active = true
  );

-- Policy: Admins can manage all decks
CREATE POLICY "admins_manage_decks" ON tarot_decks
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- =====================================================
-- 2. TAROT_SPREADS TABLE 
-- =====================================================

-- Enable RLS
ALTER TABLE tarot_spreads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view approved spreads + own spreads
CREATE POLICY "users_view_spreads" ON tarot_spreads
  FOR SELECT USING (
    (approval_status = 'approved' AND is_active = true) OR
    created_by = auth.uid() OR
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- Policy: Readers can create custom spreads
CREATE POLICY "readers_create_spreads" ON tarot_spreads
  FOR INSERT WITH CHECK (
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('reader', 'admin', 'super_admin')
      AND is_active = true
    )
    AND created_by = auth.uid()
  );

-- Policy: Creators can update own pending spreads, admins all
CREATE POLICY "update_own_spreads" ON tarot_spreads
  FOR UPDATE USING (
    (created_by = auth.uid() AND approval_status = 'pending') OR
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- Policy: Creators can delete own pending spreads, admins all
CREATE POLICY "delete_own_spreads" ON tarot_spreads
  FOR DELETE USING (
    (created_by = auth.uid() AND approval_status = 'pending') OR
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- =====================================================
-- 3. SPREAD_SERVICE_ASSIGNMENTS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE spread_service_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Readers can view own assignments, admins all
CREATE POLICY "view_service_assignments" ON spread_service_assignments
  FOR SELECT USING (
    reader_id = auth.uid() OR
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- Policy: Readers can create own assignments, admins all
CREATE POLICY "create_service_assignments" ON spread_service_assignments
  FOR INSERT WITH CHECK (
    (
      reader_id = auth.uid() AND
      EXISTS(
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('reader', 'admin', 'super_admin')
        AND is_active = true
      )
    ) OR
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- Policy: Readers can update own assignments, admins all
CREATE POLICY "update_service_assignments" ON spread_service_assignments
  FOR UPDATE USING (
    reader_id = auth.uid() OR
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- Policy: Readers can delete own assignments, admins all  
CREATE POLICY "delete_service_assignments" ON spread_service_assignments
  FOR DELETE USING (
    reader_id = auth.uid() OR
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- =====================================================
-- 4. SPREAD_APPROVAL_LOGS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE spread_approval_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all logs, readers can view logs for their spreads
CREATE POLICY "view_approval_logs" ON spread_approval_logs
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    ) OR
    EXISTS(
      SELECT 1 FROM tarot_spreads ts 
      WHERE ts.id = spread_approval_logs.spread_id 
      AND ts.created_by = auth.uid()
    )
  );

-- Policy: System can insert logs (performed by triggers)
CREATE POLICY "system_insert_logs" ON spread_approval_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 5. CLIENT_SPREAD_SELECTIONS TABLE  
-- =====================================================

-- Enable RLS
ALTER TABLE client_spread_selections ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can view own selections, readers/admins can view related selections
CREATE POLICY "view_spread_selections" ON client_spread_selections
  FOR SELECT USING (
    client_id = auth.uid() OR
    EXISTS(
      SELECT 1 FROM bookings b
      WHERE b.id = client_spread_selections.booking_id
      AND b.reader_id = auth.uid()
    ) OR
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- Policy: Clients can create own selections
CREATE POLICY "create_spread_selections" ON client_spread_selections
  FOR INSERT WITH CHECK (
    client_id = auth.uid() AND
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'client'
      AND is_active = true
    )
  );

-- Policy: Clients can update own selections, readers/admins related ones
CREATE POLICY "update_spread_selections" ON client_spread_selections
  FOR UPDATE USING (
    client_id = auth.uid() OR
    EXISTS(
      SELECT 1 FROM bookings b
      WHERE b.id = client_spread_selections.booking_id
      AND b.reader_id = auth.uid()
    ) OR
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- Policy: Clients can delete own selections
CREATE POLICY "delete_spread_selections" ON client_spread_selections
  FOR DELETE USING (
    client_id = auth.uid() OR
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- =====================================================
-- 6. READER_SPREAD_NOTIFICATIONS TABLE
-- =====================================================

-- Enable RLS  
ALTER TABLE reader_spread_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notifications addressed to them
CREATE POLICY "view_own_notifications" ON reader_spread_notifications
  FOR SELECT USING (
    reader_id = auth.uid() OR
    admin_id = auth.uid() OR
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- Policy: System can insert notifications (performed by triggers)
CREATE POLICY "system_insert_notifications" ON reader_spread_notifications
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "update_own_notifications" ON reader_spread_notifications
  FOR UPDATE USING (
    reader_id = auth.uid() OR
    admin_id = auth.uid()
  );

-- Policy: Users can delete their own notifications
CREATE POLICY "delete_own_notifications" ON reader_spread_notifications  
  FOR DELETE USING (
    reader_id = auth.uid() OR
    admin_id = auth.uid() OR
    EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN (
  'tarot_decks', 
  'tarot_spreads', 
  'spread_service_assignments',
  'spread_approval_logs',
  'client_spread_selections', 
  'reader_spread_notifications'
)
AND schemaname = 'public';

-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN (
  'tarot_decks', 
  'tarot_spreads', 
  'spread_service_assignments',
  'spread_approval_logs',
  'client_spread_selections', 
  'reader_spread_notifications'
)
ORDER BY tablename, policyname;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE tarot_decks IS 'Tarot card decks with RLS: Read-only for all, admin-writable';
COMMENT ON TABLE tarot_spreads IS 'Tarot spreads with RLS: Approved visible to all, own spreads to creators, admin-manageable';  
COMMENT ON TABLE spread_service_assignments IS 'Service assignments with RLS: Own assignments to readers, all to admins';
COMMENT ON TABLE spread_approval_logs IS 'Approval logs with RLS: Own spread logs to readers, all to admins';
COMMENT ON TABLE client_spread_selections IS 'Client selections with RLS: Own selections to clients, related to readers/admins';
COMMENT ON TABLE reader_spread_notifications IS 'Notifications with RLS: Own notifications to recipients, all to admins'; 