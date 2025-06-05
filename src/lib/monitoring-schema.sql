-- Monitoring System Database Schema for SAMIA TAROT
-- Permanent recording and AI surveillance system

-- Call Recordings Table
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  reader_id UUID NOT NULL REFERENCES auth.users(id),
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  recording_url TEXT,
  storage_path TEXT,
  file_size BIGINT DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  call_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  call_end_time TIMESTAMP WITH TIME ZONE,
  auto_recorded BOOLEAN DEFAULT true,
  client_requested_recording BOOLEAN DEFAULT false,
  client_stopped_recording BOOLEAN DEFAULT false,
  ai_monitored BOOLEAN DEFAULT true,
  ai_alerted BOOLEAN DEFAULT false,
  monitor_flagged BOOLEAN DEFAULT false,
  monitor_notes TEXT,
  flagged_by UUID REFERENCES auth.users(id),
  flagged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_tag TEXT CHECK (session_tag IN ('safe', 'needs_review', 'suspicious', 'critical')),
  ai_emotions JSONB DEFAULT '{}',
  behavior_patterns TEXT[] DEFAULT '{}',
  confidence_score DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  emergency_flagged BOOLEAN DEFAULT false,
  auto_paused BOOLEAN DEFAULT false,
  pause_reason TEXT
);

-- Chat Monitoring Table
CREATE TABLE IF NOT EXISTS chat_monitoring (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  reader_id UUID NOT NULL REFERENCES auth.users(id),
  message_content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'voice', 'image', 'file')),
  voice_message_url TEXT,
  ai_analyzed BOOLEAN DEFAULT false,
  ai_risk_score INTEGER DEFAULT 0 CHECK (ai_risk_score >= 0 AND ai_risk_score <= 100),
  ai_flags JSONB DEFAULT '[]'::jsonb,
  ai_alerted BOOLEAN DEFAULT false,
  monitor_reviewed BOOLEAN DEFAULT false,
  monitor_flagged BOOLEAN DEFAULT false,
  monitor_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_tag TEXT CHECK (session_tag IN ('safe', 'needs_review', 'suspicious', 'critical')),
  ai_emotions JSONB DEFAULT '{}',
  behavior_patterns TEXT[] DEFAULT '{}',
  confidence_score DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0)
);

-- AI Monitoring Alerts Table
CREATE TABLE IF NOT EXISTS ai_monitoring_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('call_violation', 'chat_violation', 'voice_message_violation')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  call_recording_id UUID REFERENCES call_recordings(id),
  chat_monitoring_id UUID REFERENCES chat_monitoring(id),
  client_id UUID NOT NULL REFERENCES auth.users(id),
  reader_id UUID NOT NULL REFERENCES auth.users(id),
  violation_details JSONB NOT NULL,
  ai_confidence DECIMAL(5,2) DEFAULT 0.0 CHECK (ai_confidence >= 0.0 AND ai_confidence <= 100.0),
  auto_action_taken TEXT,
  human_reviewed BOOLEAN DEFAULT false,
  human_action_taken TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  human_feedback TEXT CHECK (human_feedback IN ('accurate', 'false_positive')),
  feedback_provided_by UUID REFERENCES profiles(id),
  feedback_provided_at TIMESTAMP WITH TIME ZONE,
  escalation_actions TEXT[] DEFAULT '{}',
  auto_generated BOOLEAN DEFAULT true
);

-- Monitor Activity Logs Table
CREATE TABLE IF NOT EXISTS monitor_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id UUID NOT NULL REFERENCES auth.users(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call_watched', 'call_stopped', 'user_banned', 'content_flagged', 'alert_reviewed')),
  target_booking_id UUID REFERENCES bookings(id),
  target_user_id UUID REFERENCES auth.users(id),
  call_recording_id UUID REFERENCES call_recordings(id),
  chat_monitoring_id UUID REFERENCES chat_monitoring(id),
  ai_alert_id UUID REFERENCES ai_monitoring_alerts(id),
  action_details JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Monitoring Settings Table
CREATE TABLE IF NOT EXISTS monitoring_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session logs for comprehensive audit trail
CREATE TABLE IF NOT EXISTS session_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  alert_id UUID REFERENCES ai_monitoring_alerts(id),
  session_type TEXT CHECK (session_type IN ('call', 'chat')),
  user_id UUID REFERENCES profiles(id),
  reader_id UUID REFERENCES profiles(id),
  booking_id UUID REFERENCES bookings(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('session_start', 'session_end', 'ai_analysis', 'escalation', 'human_intervention', 'ai_feedback')),
  event_data JSONB NOT NULL DEFAULT '{}',
  ai_tag TEXT CHECK (ai_tag IN ('safe', 'needs_review', 'suspicious', 'critical', 'reviewed', 'feedback')),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI training feedback for improving detection accuracy
CREATE TABLE IF NOT EXISTS ai_training_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES ai_monitoring_alerts(id) NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('accurate', 'false_positive')),
  reviewer_id UUID REFERENCES profiles(id) NOT NULL,
  notes TEXT,
  original_risk_score INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Critical escalation logs for immediate tracking
CREATE TABLE IF NOT EXISTS critical_escalation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  escalation_level TEXT NOT NULL CHECK (escalation_level IN ('low', 'medium', 'high', 'critical')),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  actions_taken TEXT[] DEFAULT '{}',
  reason TEXT,
  auto_generated BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI incident logs for pattern analysis
CREATE TABLE IF NOT EXISTS ai_incident_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID,
  chat_id UUID,
  incident_type TEXT NOT NULL,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  violation_details JSONB DEFAULT '{}',
  patterns_detected TEXT[] DEFAULT '{}',
  emotions_detected JSONB DEFAULT '{}',
  confidence_score DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI escalation logs for tracking automated responses
CREATE TABLE IF NOT EXISTS ai_escalation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID,
  chat_id UUID,
  escalation_level TEXT NOT NULL CHECK (escalation_level IN ('none', 'low', 'moderate', 'high', 'critical')),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  actions_taken TEXT[] DEFAULT '{}',
  escalation_data JSONB DEFAULT '{}',
  human_reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_recordings_booking_id ON call_recordings(booking_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_client_id ON call_recordings(client_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_reader_id ON call_recordings(reader_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_call_start_time ON call_recordings(call_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_call_recordings_ai_alerted ON call_recordings(ai_alerted);
CREATE INDEX IF NOT EXISTS idx_call_recordings_monitor_flagged ON call_recordings(monitor_flagged);

CREATE INDEX IF NOT EXISTS idx_chat_monitoring_booking_id ON chat_monitoring(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_message_id ON chat_monitoring(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_client_id ON chat_monitoring(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_ai_risk_score ON chat_monitoring(ai_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_ai_alerted ON chat_monitoring(ai_alerted);

CREATE INDEX IF NOT EXISTS idx_ai_alerts_severity ON ai_monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_resolved ON ai_monitoring_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_created_at ON ai_monitoring_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monitor_logs_monitor_id ON monitor_activity_logs(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_logs_activity_type ON monitor_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_monitor_logs_created_at ON monitor_activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_logs_session_id ON session_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_event_type ON session_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_session_logs_ai_tag ON session_logs(ai_tag);
CREATE INDEX IF NOT EXISTS idx_session_logs_created_at ON session_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_session_logs_risk_score ON session_logs(risk_score);

CREATE INDEX IF NOT EXISTS idx_ai_training_feedback_alert_id ON ai_training_feedback(alert_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_feedback_feedback_type ON ai_training_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_ai_training_feedback_timestamp ON ai_training_feedback(timestamp);

CREATE INDEX IF NOT EXISTS idx_critical_escalation_logs_session_id ON critical_escalation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_critical_escalation_logs_escalation_level ON critical_escalation_logs(escalation_level);
CREATE INDEX IF NOT EXISTS idx_critical_escalation_logs_resolved ON critical_escalation_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_critical_escalation_logs_timestamp ON critical_escalation_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_ai_incident_logs_incident_type ON ai_incident_logs(incident_type);
CREATE INDEX IF NOT EXISTS idx_ai_incident_logs_risk_score ON ai_incident_logs(risk_score);
CREATE INDEX IF NOT EXISTS idx_ai_incident_logs_timestamp ON ai_incident_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_ai_escalation_logs_escalation_level ON ai_escalation_logs(escalation_level);
CREATE INDEX IF NOT EXISTS idx_ai_escalation_logs_human_reviewed ON ai_escalation_logs(human_reviewed);
CREATE INDEX IF NOT EXISTS idx_ai_escalation_logs_timestamp ON ai_escalation_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_chat_monitoring_session_tag ON chat_monitoring(session_tag);
CREATE INDEX IF NOT EXISTS idx_call_recordings_session_tag ON call_recordings(session_tag);
CREATE INDEX IF NOT EXISTS idx_call_recordings_emergency_flagged ON call_recordings(emergency_flagged);

-- Enable RLS
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_escalation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_incident_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_escalation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_recordings
CREATE POLICY "Admins can view all call recordings" ON call_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Monitors can view all call recordings" ON call_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('monitor', 'admin')
    )
  );

CREATE POLICY "Readers can view their own call recordings" ON call_recordings
  FOR SELECT USING (
    reader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('monitor', 'admin')
    )
  );

CREATE POLICY "System can insert call recordings" ON call_recordings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins and monitors can update call recordings" ON call_recordings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('monitor', 'admin')
    )
  );

CREATE POLICY "Only admins can delete call recordings" ON call_recordings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for chat_monitoring
CREATE POLICY "Admins and monitors can view all chat monitoring" ON chat_monitoring
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('monitor', 'admin')
    )
  );

CREATE POLICY "Readers can view their own chat monitoring" ON chat_monitoring
  FOR SELECT USING (
    reader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('monitor', 'admin')
    )
  );

CREATE POLICY "System can insert chat monitoring" ON chat_monitoring
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins and monitors can update chat monitoring" ON chat_monitoring
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('monitor', 'admin')
    )
  );

-- RLS Policies for ai_monitoring_alerts
CREATE POLICY "Admins and monitors can view all AI alerts" ON ai_monitoring_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('monitor', 'admin')
    )
  );

CREATE POLICY "System can insert AI alerts" ON ai_monitoring_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins and monitors can update AI alerts" ON ai_monitoring_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('monitor', 'admin')
    )
  );

-- RLS Policies for monitor_activity_logs
CREATE POLICY "Admins can view all monitor activity logs" ON monitor_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Monitors can view their own activity logs" ON monitor_activity_logs
  FOR SELECT USING (
    monitor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Monitors can insert their own activity logs" ON monitor_activity_logs
  FOR INSERT WITH CHECK (
    monitor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('monitor', 'admin')
    )
  );

-- RLS Policies for monitoring_settings
CREATE POLICY "Admins can manage monitoring settings" ON monitoring_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for session_logs
CREATE POLICY "Users can view their own session logs" ON session_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    reader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor')
    )
  );

CREATE POLICY "System can insert session logs" ON session_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for ai_training_feedback
CREATE POLICY "Admins and monitors can view AI feedback" ON ai_training_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor')
    )
  );

CREATE POLICY "Admins and monitors can insert AI feedback" ON ai_training_feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor')
    )
  );

-- RLS Policies for critical_escalation_logs
CREATE POLICY "Admins and monitors can view critical escalations" ON critical_escalation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor')
    )
  );

CREATE POLICY "System can insert critical escalations" ON critical_escalation_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins and monitors can update critical escalations" ON critical_escalation_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor')
    )
  );

-- RLS Policies for ai_incident_logs
CREATE POLICY "Admins and monitors can view AI incidents" ON ai_incident_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor')
    )
  );

CREATE POLICY "System can insert AI incidents" ON ai_incident_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for ai_escalation_logs
CREATE POLICY "Admins and monitors can view AI escalations" ON ai_escalation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor')
    )
  );

CREATE POLICY "System can insert AI escalations" ON ai_escalation_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins and monitors can update AI escalations" ON ai_escalation_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor')
    )
  );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_monitoring_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_recordings_updated_at
  BEFORE UPDATE ON call_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_updated_at();

CREATE TRIGGER update_chat_monitoring_updated_at
  BEFORE UPDATE ON chat_monitoring
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_updated_at();

CREATE TRIGGER update_ai_alerts_updated_at
  BEFORE UPDATE ON ai_monitoring_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_updated_at();

CREATE TRIGGER update_session_logs_updated_at
  BEFORE UPDATE ON session_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_updated_at();

CREATE TRIGGER update_ai_training_feedback_updated_at
  BEFORE UPDATE ON ai_training_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_updated_at();

CREATE TRIGGER update_critical_escalation_logs_updated_at
  BEFORE UPDATE ON critical_escalation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_updated_at();

-- Insert default monitoring settings
INSERT INTO monitoring_settings (setting_key, setting_value, description) VALUES
('ai_monitoring_enabled', 'true', 'Enable AI monitoring for all calls and chats'),
('auto_recording_enabled', 'true', 'Enable automatic recording of all calls'),
('ai_risk_threshold', '70', 'AI risk score threshold for alerts (0-100)'),
('retention_policy_days', '0', 'Data retention in days (0 = permanent)'),
('real_time_alerts_enabled', 'true', 'Enable real-time alerts to monitors and admins'),
('voice_message_monitoring', 'true', 'Enable AI monitoring of voice messages in chat')
ON CONFLICT (setting_key) DO NOTHING;

-- Functions for AI monitoring statistics
CREATE OR REPLACE FUNCTION get_ai_monitoring_stats(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_sessions', (
      SELECT COUNT(*) FROM session_logs 
      WHERE created_at BETWEEN start_date AND end_date
      AND event_type = 'session_start'
    ),
    'ai_alerts', (
      SELECT COUNT(*) FROM ai_monitoring_alerts 
      WHERE created_at BETWEEN start_date AND end_date
    ),
    'critical_escalations', (
      SELECT COUNT(*) FROM critical_escalation_logs 
      WHERE timestamp BETWEEN start_date AND end_date
      AND escalation_level = 'critical'
    ),
    'feedback_accuracy', (
      SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(
            (COUNT(*) FILTER (WHERE feedback_type = 'accurate')::DECIMAL / COUNT(*)) * 100, 2
          )
        END
      FROM ai_training_feedback 
      WHERE timestamp BETWEEN start_date AND end_date
    ),
    'session_tags', (
      SELECT json_object_agg(session_tag, count)
      FROM (
        SELECT 
          COALESCE(session_tag, 'untagged') as session_tag,
          COUNT(*) as count
        FROM (
          SELECT session_tag FROM call_recordings 
          WHERE call_start_time BETWEEN start_date AND end_date
          UNION ALL
          SELECT session_tag FROM chat_monitoring 
          WHERE created_at BETWEEN start_date AND end_date
        ) combined
        GROUP BY session_tag
      ) tag_counts
    ),
    'risk_distribution', (
      SELECT json_object_agg(risk_range, count)
      FROM (
        SELECT 
          CASE 
            WHEN risk_score >= 80 THEN 'critical'
            WHEN risk_score >= 60 THEN 'high'
            WHEN risk_score >= 30 THEN 'medium'
            ELSE 'low'
          END as risk_range,
          COUNT(*) as count
        FROM session_logs 
        WHERE created_at BETWEEN start_date AND end_date
        AND risk_score > 0
        GROUP BY risk_range
      ) risk_counts
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old logs (admin only)
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_logs(
  retention_days INTEGER DEFAULT 365
)
RETURNS JSON AS $$
DECLARE
  cutoff_date TIMESTAMP WITH TIME ZONE;
  deleted_counts JSON;
BEGIN
  -- Only allow admins to run this function
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  WITH deletions AS (
    DELETE FROM session_logs 
    WHERE created_at < cutoff_date 
    RETURNING 1
  ),
  session_count AS (
    SELECT COUNT(*) as count FROM deletions
  ),
  incident_deletions AS (
    DELETE FROM ai_incident_logs 
    WHERE timestamp < cutoff_date 
    RETURNING 1
  ),
  incident_count AS (
    SELECT COUNT(*) as count FROM incident_deletions
  )
  SELECT json_build_object(
    'session_logs_deleted', (SELECT count FROM session_count),
    'incident_logs_deleted', (SELECT count FROM incident_count),
    'cutoff_date', cutoff_date
  ) INTO deleted_counts;
  
  RETURN deleted_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 