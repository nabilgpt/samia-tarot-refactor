-- ============================================================================
-- ADMIN AUDIT LOGS TABLE - SAMIA TAROT
-- Complete audit trail for all admin actions
-- ============================================================================

-- Create admin_audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  action_type VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_ids TEXT[] NOT NULL DEFAULT '{}',
  old_data JSONB,
  new_data JSONB,
  bulk_operation_id UUID,
  can_undo BOOLEAN DEFAULT true,
  undone_at TIMESTAMP WITH TIME ZONE,
  undone_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type ON admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_table_name ON admin_audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_expires_at ON admin_audit_logs(expires_at);

-- Enable Row Level Security
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "admin_audit_logs_insert_policy" ON admin_audit_logs;
DROP POLICY IF EXISTS "admin_audit_logs_select_policy" ON admin_audit_logs;
DROP POLICY IF EXISTS "admin_audit_logs_service_role_policy" ON admin_audit_logs;

-- Policy for admins to insert their own audit logs
CREATE POLICY "admin_audit_logs_insert_policy" ON admin_audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy for admins to view audit logs
CREATE POLICY "admin_audit_logs_select_policy" ON admin_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin', 'monitor')
    )
  );

-- Service role policy for backend operations
CREATE POLICY "admin_audit_logs_service_role_policy" ON admin_audit_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON admin_audit_logs TO service_role;
GRANT SELECT, INSERT ON admin_audit_logs TO authenticated;

-- Function to clean up expired audit logs
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM admin_audit_logs 
  WHERE expires_at < NOW()
  AND can_undo = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up expired logs (optional - requires pg_cron extension)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_expired_audit_logs();');

DO $$
BEGIN
  RAISE NOTICE '✅ Admin audit logs table created successfully';
  RAISE NOTICE '📋 Table: admin_audit_logs';
  RAISE NOTICE '🔐 RLS policies enabled';
  RAISE NOTICE '📊 Indexes created for performance';
  RAISE NOTICE '🧹 Cleanup function created: cleanup_expired_audit_logs()';
END $$; 