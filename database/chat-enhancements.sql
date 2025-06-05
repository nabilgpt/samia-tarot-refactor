-- =====================================================
-- PHASE 1: CHAT SYSTEM ENHANCEMENTS
-- =====================================================

-- Add new columns to messages table for enhanced chat features
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER, -- For voice notes
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true, -- For voice note moderation
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id);

-- Chat sessions table to track chat limits and status
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL UNIQUE,
  client_id UUID REFERENCES profiles(id) NOT NULL,
  reader_id UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('active', 'locked', 'completed')) DEFAULT 'active',
  locked_by UUID REFERENCES profiles(id),
  locked_at TIMESTAMP WITH TIME ZONE,
  -- Client limits
  client_text_chars_used INTEGER DEFAULT 0,
  client_voice_seconds_used INTEGER DEFAULT 0,
  client_images_sent INTEGER DEFAULT 0,
  -- Reader limits
  reader_voice_notes_sent INTEGER DEFAULT 0,
  -- Service-specific limits
  max_text_chars INTEGER DEFAULT 10000,
  max_voice_seconds INTEGER DEFAULT 600, -- 10 minutes
  max_images INTEGER DEFAULT 10,
  max_reader_voice_notes INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voice note approvals table for admin moderation
CREATE TABLE IF NOT EXISTS voice_note_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) NOT NULL,
  reader_id UUID REFERENCES profiles(id) NOT NULL,
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat notifications table for real-time updates
CREATE TABLE IF NOT EXISTS chat_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT CHECK (type IN ('new_message', 'voice_approved', 'chat_locked', 'typing')) NOT NULL,
  message_id UUID REFERENCES messages(id),
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_approved ON messages(is_approved);
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON messages(flagged);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_booking ON chat_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_voice_approvals_status ON voice_note_approvals(status);
CREATE INDEX IF NOT EXISTS idx_voice_approvals_reader ON voice_note_approvals(reader_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_user ON chat_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_booking ON chat_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_read ON chat_notifications(is_read);

-- Function to create chat session when booking is confirmed
CREATE OR REPLACE FUNCTION create_chat_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create chat session for confirmed bookings with chat-enabled services
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    INSERT INTO chat_sessions (
      booking_id,
      client_id,
      reader_id,
      max_text_chars,
      max_voice_seconds,
      max_images,
      max_reader_voice_notes
    )
    SELECT 
      NEW.id,
      NEW.user_id,
      NEW.reader_id,
      CASE 
        WHEN s.type = 'call' AND s.name ILIKE '%candle%' THEN 50000 -- Candle readings get more
        ELSE 10000 
      END,
      CASE 
        WHEN s.type = 'call' AND s.name ILIKE '%candle%' THEN 600 -- 10 minutes
        ELSE 600 
      END,
      CASE 
        WHEN s.type = 'call' AND s.name ILIKE '%candle%' THEN 50 -- Candle readings get 50 images/videos
        ELSE 10 
      END,
      1 -- Reader can send 1 voice note
    FROM services s 
    WHERE s.id = NEW.service_id
    ON CONFLICT (booking_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create chat session
CREATE TRIGGER create_chat_session_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_session();

-- Function to update chat session limits when messages are sent
CREATE OR REPLACE FUNCTION update_chat_limits()
RETURNS TRIGGER AS $$
DECLARE
  session_record chat_sessions%ROWTYPE;
  sender_role TEXT;
BEGIN
  -- Get chat session
  SELECT * INTO session_record FROM chat_sessions WHERE booking_id = NEW.booking_id;
  
  -- Get sender role
  SELECT role INTO sender_role FROM profiles WHERE id = NEW.sender_id;
  
  IF session_record.status = 'locked' THEN
    RAISE EXCEPTION 'Chat session is locked';
  END IF;
  
  -- Update limits based on message type and sender
  IF sender_role = 'client' THEN
    CASE NEW.type
      WHEN 'text' THEN
        UPDATE chat_sessions 
        SET client_text_chars_used = client_text_chars_used + COALESCE(LENGTH(NEW.content), 0)
        WHERE booking_id = NEW.booking_id;
        
        -- Check limit
        IF session_record.client_text_chars_used + COALESCE(LENGTH(NEW.content), 0) > session_record.max_text_chars THEN
          RAISE EXCEPTION 'Text character limit exceeded';
        END IF;
        
      WHEN 'voice' THEN
        UPDATE chat_sessions 
        SET client_voice_seconds_used = client_voice_seconds_used + COALESCE(NEW.duration_seconds, 0)
        WHERE booking_id = NEW.booking_id;
        
        -- Check limit
        IF session_record.client_voice_seconds_used + COALESCE(NEW.duration_seconds, 0) > session_record.max_voice_seconds THEN
          RAISE EXCEPTION 'Voice time limit exceeded';
        END IF;
        
      WHEN 'image' THEN
        UPDATE chat_sessions 
        SET client_images_sent = client_images_sent + 1
        WHERE booking_id = NEW.booking_id;
        
        -- Check limit
        IF session_record.client_images_sent >= session_record.max_images THEN
          RAISE EXCEPTION 'Image limit exceeded';
        END IF;
    END CASE;
    
  ELSIF sender_role = 'reader' AND NEW.type = 'voice' THEN
    UPDATE chat_sessions 
    SET reader_voice_notes_sent = reader_voice_notes_sent + 1
    WHERE booking_id = NEW.booking_id;
    
    -- Check limit
    IF session_record.reader_voice_notes_sent >= session_record.max_reader_voice_notes THEN
      RAISE EXCEPTION 'Reader voice note limit exceeded';
    END IF;
    
    -- Reader voice notes need approval
    NEW.is_approved = false;
    
    -- Create approval request
    INSERT INTO voice_note_approvals (message_id, reader_id, booking_id)
    VALUES (NEW.id, NEW.sender_id, NEW.booking_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chat limits
CREATE TRIGGER update_chat_limits_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_limits();

-- Function to send chat notifications
CREATE OR REPLACE FUNCTION send_chat_notification()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  notification_type TEXT;
BEGIN
  -- Determine recipient and notification type
  IF TG_OP = 'INSERT' THEN
    -- New message notification
    SELECT CASE 
      WHEN NEW.sender_id = b.user_id THEN b.reader_id 
      ELSE b.user_id 
    END INTO recipient_id
    FROM bookings b WHERE b.id = NEW.booking_id;
    
    notification_type = 'new_message';
    
    -- Insert notification
    INSERT INTO chat_notifications (booking_id, user_id, type, message_id)
    VALUES (NEW.booking_id, recipient_id, notification_type, NEW.id);
    
  ELSIF TG_OP = 'UPDATE' AND OLD.is_approved = false AND NEW.is_approved = true THEN
    -- Voice note approved notification
    SELECT b.user_id INTO recipient_id
    FROM bookings b WHERE b.id = NEW.booking_id;
    
    notification_type = 'voice_approved';
    
    -- Insert notification
    INSERT INTO chat_notifications (booking_id, user_id, type, message_id)
    VALUES (NEW.booking_id, recipient_id, notification_type, NEW.id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for chat notifications
CREATE TRIGGER send_chat_notification_trigger
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION send_chat_notification();

-- Function to lock chat session
CREATE OR REPLACE FUNCTION lock_chat_session(p_booking_id UUID, p_locked_by UUID)
RETURNS BOOLEAN AS $$
DECLARE
  session_exists BOOLEAN;
BEGIN
  -- Check if session exists and is active
  SELECT EXISTS(
    SELECT 1 FROM chat_sessions 
    WHERE booking_id = p_booking_id AND status = 'active'
  ) INTO session_exists;
  
  IF NOT session_exists THEN
    RETURN false;
  END IF;
  
  -- Lock the session
  UPDATE chat_sessions 
  SET 
    status = 'locked',
    locked_by = p_locked_by,
    locked_at = NOW()
  WHERE booking_id = p_booking_id;
  
  -- Send notification to both users
  INSERT INTO chat_notifications (booking_id, user_id, type, data)
  SELECT 
    p_booking_id,
    unnest(ARRAY[b.user_id, b.reader_id]),
    'chat_locked',
    jsonb_build_object('locked_by', p_locked_by, 'locked_at', NOW())
  FROM bookings b 
  WHERE b.id = p_booking_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for new tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_note_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;

-- Chat sessions policies
CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
  FOR SELECT USING (
    client_id = auth.uid() OR 
    reader_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

CREATE POLICY "Only readers can update their chat sessions" ON chat_sessions
  FOR UPDATE USING (
    reader_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

-- Voice note approvals policies
CREATE POLICY "Readers can view their voice note approvals" ON voice_note_approvals
  FOR SELECT USING (
    reader_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

CREATE POLICY "Only admins can approve voice notes" ON voice_note_approvals
  FOR UPDATE USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

-- Chat notifications policies
CREATE POLICY "Users can view their own notifications" ON chat_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON chat_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Update messages table policies to include approval logic
DROP POLICY IF EXISTS "Users can view messages in their bookings" ON messages;
CREATE POLICY "Users can view messages in their bookings" ON messages
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM bookings b 
      WHERE b.id = booking_id 
      AND (b.user_id = auth.uid() OR b.reader_id = auth.uid())
    ) OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

-- Only show approved voice notes to clients
CREATE POLICY "Clients can only see approved voice notes" ON messages
  FOR SELECT USING (
    (type != 'voice' OR is_approved = true OR sender_id = auth.uid()) OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor', 'reader'))
  ); 