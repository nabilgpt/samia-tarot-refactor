-- M19: Calls & Emergency - Enhanced call lifecycle with Twilio integration
-- Extends existing calls table with recording controls and emergency features

-- Add M19 columns to existing calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_sid text; -- Twilio CallSid
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_sid text; -- Twilio RecordingSid  
ALTER TABLE calls ADD COLUMN IF NOT EXISTS duration_sec integer;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS ended_reason text; -- monitor_drop, completed, failed, etc
ALTER TABLE calls ADD COLUMN IF NOT EXISTS initiated_by uuid REFERENCES profiles(id);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS sip_or_pstn text DEFAULT 'pstn';
ALTER TABLE calls ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_status text DEFAULT 'stopped';
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_url text; -- Twilio recording URL
ALTER TABLE calls ADD COLUMN IF NOT EXISTS siren_triggered boolean DEFAULT false;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS siren_reason text;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS webhook_events jsonb DEFAULT '[]'::jsonb; -- Twilio webhook history

-- Add constraints
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_recording_status_check;
ALTER TABLE calls ADD CONSTRAINT calls_recording_status_check 
  CHECK (recording_status IN ('stopped', 'recording', 'paused'));

-- Update status constraint to include M19 statuses
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_status_check;
ALTER TABLE calls ADD CONSTRAINT calls_status_check 
  CHECK (status IN ('scheduled', 'initiating', 'ringing', 'in_progress', 'completed', 'failed', 'dropped_by_monitor', 'dropped_by_reader', 'dropped_by_client', 'no_answer', 'busy', 'canceled'));

-- Add ended_reason constraint
ALTER TABLE calls ADD CONSTRAINT calls_ended_reason_check
  CHECK (ended_reason IN ('completed', 'monitor_drop', 'reader_drop', 'client_drop', 'failed', 'no_answer', 'busy', 'timeout', 'network_error'));

-- Add sip_or_pstn constraint
ALTER TABLE calls ADD CONSTRAINT calls_sip_or_pstn_check
  CHECK (sip_or_pstn IN ('pstn', 'sip'));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_calls_order_id ON calls(order_id);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_twilio_call_sid ON calls(call_sid);
CREATE INDEX IF NOT EXISTS idx_calls_recording_sid ON calls(recording_sid);
CREATE INDEX IF NOT EXISTS idx_calls_initiated_by ON calls(initiated_by);

-- Create call_recordings table for detailed recording management
CREATE TABLE IF NOT EXISTS call_recordings (
  id bigserial PRIMARY KEY,
  call_id bigint NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  recording_sid text NOT NULL, -- Twilio RecordingSid
  status text NOT NULL DEFAULT 'in_progress', -- in_progress, completed, failed
  duration_sec integer,
  file_size_bytes bigint,
  storage_key text, -- Supabase Storage path
  twilio_url text, -- Original Twilio recording URL
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT call_recordings_status_check 
    CHECK (status IN ('in_progress', 'completed', 'failed', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_call_recordings_call_id ON call_recordings(call_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_recording_sid ON call_recordings(recording_sid);
CREATE INDEX IF NOT EXISTS idx_call_recordings_status ON call_recordings(status);

-- Create siren_alerts table for emergency escalation
CREATE TABLE IF NOT EXISTS siren_alerts (
  id bigserial PRIMARY KEY,
  call_id bigint NOT NULL REFERENCES calls(id),
  triggered_by uuid REFERENCES profiles(id),
  alert_type text NOT NULL, -- emergency, quality_issue, technical_problem
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active, acknowledged, resolved
  acknowledged_by uuid REFERENCES profiles(id),
  acknowledged_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),  
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT siren_alerts_alert_type_check
    CHECK (alert_type IN ('emergency', 'quality_issue', 'technical_problem', 'inappropriate_behavior')),
  CONSTRAINT siren_alerts_status_check
    CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_alarm'))
);

CREATE INDEX IF NOT EXISTS idx_siren_alerts_call_id ON siren_alerts(call_id);
CREATE INDEX IF NOT EXISTS idx_siren_alerts_status ON siren_alerts(status);
CREATE INDEX IF NOT EXISTS idx_siren_alerts_created_at ON siren_alerts(created_at);

-- Functions for call management

-- Calculate call duration when call ends
CREATE OR REPLACE FUNCTION update_call_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    NEW.duration_sec := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_call_duration ON calls;
CREATE TRIGGER trigger_update_call_duration
  BEFORE UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_call_duration();

-- Update timestamp trigger for call_recordings
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_call_recordings_updated_at ON call_recordings;
CREATE TRIGGER trigger_call_recordings_updated_at
  BEFORE UPDATE ON call_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS Policies will be added after table creation

COMMENT ON TABLE calls IS 'M19: Enhanced call lifecycle with Twilio integration, recording controls, and emergency features';
COMMENT ON TABLE call_recordings IS 'M19: Detailed call recording management with Supabase Storage integration';
COMMENT ON TABLE siren_alerts IS 'M19: Emergency alert system for call monitoring and escalation';