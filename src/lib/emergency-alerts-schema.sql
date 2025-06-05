-- Emergency Alerts Table for Admin Notifications
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('client', 'reader', 'monitor', 'admin')),
  message TEXT NOT NULL DEFAULT 'Emergency button triggered',
  location TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id ON emergency_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_created_at ON emergency_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_role ON emergency_alerts(role);

-- Enable RLS
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can insert their own emergency alerts
CREATE POLICY "Users can create their own emergency alerts" ON emergency_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own emergency alerts
CREATE POLICY "Users can view their own emergency alerts" ON emergency_alerts
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all emergency alerts
CREATE POLICY "Admins can view all emergency alerts" ON emergency_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admins can update all emergency alerts (mark as resolved)
CREATE POLICY "Admins can update all emergency alerts" ON emergency_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_emergency_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emergency_alerts_updated_at
  BEFORE UPDATE ON emergency_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_emergency_alerts_updated_at();

-- Create function to get user profile info for alerts
CREATE OR REPLACE FUNCTION get_emergency_alert_with_profile(alert_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', ea.id,
    'user_id', ea.user_id,
    'role', ea.role,
    'message', ea.message,
    'location', ea.location,
    'status', ea.status,
    'resolved_by', ea.resolved_by,
    'resolved_at', ea.resolved_at,
    'created_at', ea.created_at,
    'updated_at', ea.updated_at,
    'user_profile', json_build_object(
      'first_name', p.first_name,
      'last_name', p.last_name,
      'avatar_url', p.avatar_url,
      'role', p.role
    )
  ) INTO result
  FROM emergency_alerts ea
  LEFT JOIN profiles p ON ea.user_id = p.id
  WHERE ea.id = alert_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 