-- ===============================================
-- MISSING TABLES AND COLUMNS FIX
-- ===============================================

-- Add missing reader_availability table
CREATE TABLE IF NOT EXISTS reader_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT false,
  emergency_available BOOLEAN DEFAULT false,
  status_message VARCHAR(200),
  auto_accept_emergency BOOLEAN DEFAULT false,
  max_concurrent_calls INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to services table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='status') THEN
    ALTER TABLE services ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
END $$;

-- Add missing columns to ai_models table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='status') THEN
    ALTER TABLE ai_models ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
END $$;

-- Add missing columns to profiles table for better admin support
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='password_hash') THEN
    ALTER TABLE profiles ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;

-- Create wallet_transactions table if missing
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL, -- 'credit', 'debit', 'transfer'
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID, -- booking_id, payment_id, etc.
  reference_type VARCHAR(20), -- 'booking', 'payment', 'refund', etc.
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_participants table if missing
CREATE TABLE IF NOT EXISTS call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'client', 'reader', 'admin', 'monitor'
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  is_silent BOOLEAN DEFAULT false,
  audio_enabled BOOLEAN DEFAULT true,
  video_enabled BOOLEAN DEFAULT false,
  screen_sharing BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_recordings table if missing
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
  recording_type VARCHAR(20) DEFAULT 'audio', -- 'audio', 'video', 'screen'
  file_url VARCHAR(500),
  file_size BIGINT,
  duration INTEGER, -- in seconds
  format VARCHAR(10), -- 'mp4', 'mp3', 'webm'
  quality VARCHAR(20), -- 'low', 'medium', 'high'
  encryption_key VARCHAR(255),
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create call_notifications table if missing
CREATE TABLE IF NOT EXISTS call_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type VARCHAR(30) NOT NULL, -- 'incoming_call', 'call_started', 'call_ended', 'emergency_call'
  title VARCHAR(100) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  is_emergency BOOLEAN DEFAULT false,
  is_siren BOOLEAN DEFAULT false, -- for emergency alerts
  action_url VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create ai_prompts table if missing
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  prompt_type VARCHAR(30) NOT NULL, -- 'tarot_reading', 'quick_insight', 'voice_response'
  category VARCHAR(20), -- 'general', 'love', 'career', 'spiritual', 'emergency'
  title VARCHAR(100) NOT NULL,
  prompt_text TEXT NOT NULL,
  variables TEXT[], -- array of variable names like ['cards', 'question', 'spread_type']
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 0.95,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_enrollments table if missing
CREATE TABLE IF NOT EXISTS user_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  current_lesson_id UUID,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'enrolled', -- 'enrolled', 'active', 'completed', 'dropped'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create learning_progress table if missing
CREATE TABLE IF NOT EXISTS learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES user_enrollments(id) ON DELETE CASCADE,
  content_id UUID REFERENCES course_content(id) ON DELETE CASCADE,
  progress_type VARCHAR(20) NOT NULL, -- 'lesson', 'quiz', 'assessment', 'video'
  status VARCHAR(20) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'failed'
  score DECIMAL(5,2), -- for quizzes and assessments
  time_spent INTEGER DEFAULT 0, -- in minutes
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_feedback table if missing
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  feedback_type VARCHAR(20) NOT NULL, -- 'rating', 'comment', 'improvement'
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  improvement_suggestion TEXT,
  was_accurate BOOLEAN,
  was_helpful BOOLEAN,
  response_time_rating INTEGER CHECK (response_time_rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_analytics table if missing
CREATE TABLE IF NOT EXISTS ai_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  average_response_time DECIMAL(6,3), -- in seconds
  average_confidence_score DECIMAL(3,2),
  total_tokens_used INTEGER DEFAULT 0,
  total_cost DECIMAL(10,4) DEFAULT 0.00,
  user_satisfaction DECIMAL(3,2), -- average rating
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(model_id, date)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reader_availability_reader_id ON reader_availability(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_availability_status ON reader_availability(is_available, emergency_available);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_call_participants_session_id ON call_participants(call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_participant_id ON call_participants(participant_id);

CREATE INDEX IF NOT EXISTS idx_call_notifications_recipient_id ON call_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_call_notifications_is_read ON call_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_call_notifications_is_emergency ON call_notifications(is_emergency);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_model_id ON ai_prompts(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON ai_prompts(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_is_active ON ai_prompts(is_active);

CREATE INDEX IF NOT EXISTS idx_user_enrollments_user_id ON user_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_learning_path_id ON user_enrollments(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_status ON user_enrollments(status);

CREATE INDEX IF NOT EXISTS idx_learning_progress_enrollment_id ON learning_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_content_id ON learning_progress(content_id);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_session_id ON ai_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON ai_feedback(rating);

CREATE INDEX IF NOT EXISTS idx_ai_analytics_model_id ON ai_analytics(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_date ON ai_analytics(date);

-- Add RLS policies for security
ALTER TABLE reader_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reader_availability
CREATE POLICY "Readers can view and update their own availability" ON reader_availability
  FOR ALL USING (auth.uid() = reader_id);

CREATE POLICY "Admins can view all reader availability" ON reader_availability
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'monitor')
    )
  );

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can view their own wallet transactions" ON wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wallets 
      WHERE id = wallet_id 
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for call_participants
CREATE POLICY "Users can view calls they participate in" ON call_participants
  FOR SELECT USING (participant_id = auth.uid());

-- RLS Policies for call_notifications
CREATE POLICY "Users can view their own notifications" ON call_notifications
  FOR ALL USING (recipient_id = auth.uid());

-- RLS Policies for ai_feedback
CREATE POLICY "Users can manage their own AI feedback" ON ai_feedback
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for user_enrollments
CREATE POLICY "Users can view their own enrollments" ON user_enrollments
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for learning_progress
CREATE POLICY "Users can view their own learning progress" ON learning_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_enrollments 
      WHERE id = enrollment_id 
      AND user_id = auth.uid()
    )
  );

-- Create useful database functions
CREATE OR REPLACE FUNCTION get_table_columns(table_name TEXT)
RETURNS TABLE(column_name TEXT, data_type TEXT, is_nullable TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT
  FROM information_schema.columns c
  WHERE c.table_name = get_table_columns.table_name
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to execute SQL (for data integrity checks)
CREATE OR REPLACE FUNCTION execute_sql(sql TEXT)
RETURNS TABLE(result JSONB) AS $$
DECLARE
  rec RECORD;
BEGIN
  -- This is a simplified version - in production, add proper security checks
  FOR rec IN EXECUTE sql LOOP
    RETURN NEXT row_to_json(rec)::JSONB;
  END LOOP;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Missing tables and columns have been created successfully!';
  RAISE NOTICE 'Please run the seed data script to populate initial data.';
END $$; 