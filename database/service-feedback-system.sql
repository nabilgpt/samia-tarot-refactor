-- ============================================================
-- ADMIN-MODERATED SERVICE FEEDBACK SYSTEM
-- SAMIA TAROT Platform - Private Comments & Ratings System
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. SERVICE FEEDBACK TABLE (MAIN TABLE)
-- ============================================================
CREATE TABLE IF NOT EXISTS service_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Service/Session identification
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('tarot_reading', 'call_session', 'chat_session', 'astrology', 'palm_reading', 'spiritual_guidance')),
    session_id UUID, -- Links to reading_sessions, call_sessions, or booking_id
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Participants
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Original feedback (NEVER changes - always visible to client)
    original_rating INTEGER NOT NULL CHECK (original_rating BETWEEN 1 AND 5),
    original_comment TEXT,
    
    -- Admin-moderated content (visible to public/reader if approved)
    moderated_rating INTEGER CHECK (moderated_rating BETWEEN 1 AND 5),
    moderated_comment TEXT,
    
    -- Moderation status and workflow
    moderation_status VARCHAR(30) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'edited', 'deleted', 'rejected')),
    is_visible_to_reader BOOLEAN DEFAULT FALSE,
    is_visible_to_public BOOLEAN DEFAULT FALSE,
    
    -- Admin moderation details
    moderated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderation_reason TEXT,
    admin_notes TEXT,
    
    -- Metadata
    is_anonymous BOOLEAN DEFAULT FALSE,
    client_ip INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. FEEDBACK MODERATION LOG (AUDIT TRAIL)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_moderation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    feedback_id UUID NOT NULL REFERENCES service_feedback(id) ON DELETE CASCADE,
    
    -- Action details
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN ('submitted', 'approved', 'edited', 'deleted', 'rejected', 'restored')),
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    
    -- Content changes (for edit actions)
    previous_rating INTEGER,
    new_rating INTEGER,
    previous_comment TEXT,
    new_comment TEXT,
    
    -- Admin details
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    admin_reason TEXT,
    admin_notes TEXT,
    
    -- Client visibility (CRITICAL: client never sees admin actions)
    client_notified BOOLEAN DEFAULT FALSE, -- Always FALSE for admin actions
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. FEEDBACK PROMPTS & TRIGGERS
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    service_type VARCHAR(50) NOT NULL,
    prompt_type VARCHAR(30) DEFAULT 'post_service' CHECK (prompt_type IN ('post_service', 'mid_service', 'follow_up')),
    
    -- Prompt content (multilingual)
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    message_en TEXT NOT NULL,
    message_ar TEXT NOT NULL,
    
    -- Display settings
    is_required BOOLEAN DEFAULT TRUE,
    show_rating BOOLEAN DEFAULT TRUE,
    show_comment BOOLEAN DEFAULT TRUE,
    allow_anonymous BOOLEAN DEFAULT TRUE,
    
    -- Timing
    trigger_delay_seconds INTEGER DEFAULT 0,
    auto_dismiss_seconds INTEGER DEFAULT 300,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. READER FEEDBACK AGGREGATION (AUTO-CALCULATED)
-- ============================================================
CREATE TABLE IF NOT EXISTS reader_feedback_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Approved feedback only (visible stats)
    total_approved_feedback INTEGER DEFAULT 0,
    average_approved_rating DECIMAL(3,2) DEFAULT 0.00,
    
    -- Rating distribution (approved only)
    rating_5_count INTEGER DEFAULT 0,
    rating_4_count INTEGER DEFAULT 0,
    rating_3_count INTEGER DEFAULT 0,
    rating_2_count INTEGER DEFAULT 0,
    rating_1_count INTEGER DEFAULT 0,
    
    -- Service type breakdown
    tarot_reading_count INTEGER DEFAULT 0,
    call_session_count INTEGER DEFAULT 0,
    chat_session_count INTEGER DEFAULT 0,
    
    -- Timestamps
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(reader_id)
);

-- ============================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================

-- Main feedback table indexes
CREATE INDEX IF NOT EXISTS idx_service_feedback_client_id ON service_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_service_feedback_reader_id ON service_feedback(reader_id);
CREATE INDEX IF NOT EXISTS idx_service_feedback_booking_id ON service_feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_service_feedback_moderation_status ON service_feedback(moderation_status);
CREATE INDEX IF NOT EXISTS idx_service_feedback_visibility ON service_feedback(is_visible_to_reader, is_visible_to_public);
CREATE INDEX IF NOT EXISTS idx_service_feedback_created_at ON service_feedback(created_at);

-- Moderation log indexes
CREATE INDEX IF NOT EXISTS idx_feedback_moderation_log_feedback_id ON feedback_moderation_log(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_moderation_log_admin_id ON feedback_moderation_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_feedback_moderation_log_action_type ON feedback_moderation_log(action_type);

-- Stats table indexes
CREATE INDEX IF NOT EXISTS idx_reader_feedback_stats_reader_id ON reader_feedback_stats(reader_id);

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE service_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_moderation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_feedback_stats ENABLE ROW LEVEL SECURITY;

-- Service Feedback Policies
-- Clients can ONLY see their own original feedback (never admin changes)
CREATE POLICY "clients_view_own_original_feedback" ON service_feedback 
    FOR SELECT USING (
        auth.uid() = client_id
    );

-- Readers can ONLY see approved feedback about them
CREATE POLICY "readers_view_approved_feedback" ON service_feedback 
    FOR SELECT USING (
        auth.uid() = reader_id AND 
        moderation_status = 'approved' AND 
        is_visible_to_reader = TRUE
    );

-- Admins can see all feedback
CREATE POLICY "admins_view_all_feedback" ON service_feedback 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Clients can create feedback for their completed services
CREATE POLICY "clients_create_feedback" ON service_feedback 
    FOR INSERT WITH CHECK (
        auth.uid() = client_id AND
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id AND 
            user_id = auth.uid() AND 
            status = 'completed'
        )
    );

-- Only clients can update their own feedback (before admin moderation)
CREATE POLICY "clients_update_own_pending_feedback" ON service_feedback 
    FOR UPDATE USING (
        auth.uid() = client_id AND 
        moderation_status = 'pending'
    );

-- Moderation Log Policies
-- Only admins can view moderation logs
CREATE POLICY "admins_view_moderation_logs" ON feedback_moderation_log 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- System can create moderation logs
CREATE POLICY "system_create_moderation_logs" ON feedback_moderation_log 
    FOR INSERT WITH CHECK (TRUE);

-- Feedback Prompts Policies
-- Everyone can view active prompts
CREATE POLICY "view_active_prompts" ON feedback_prompts 
    FOR SELECT USING (is_active = TRUE);

-- Only admins can manage prompts
CREATE POLICY "admins_manage_prompts" ON feedback_prompts 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Reader Stats Policies
-- Readers can view their own stats
CREATE POLICY "readers_view_own_stats" ON reader_feedback_stats 
    FOR SELECT USING (auth.uid() = reader_id);

-- Everyone can view reader stats (public information)
CREATE POLICY "public_view_reader_stats" ON reader_feedback_stats 
    FOR SELECT USING (TRUE);

-- Only system can update stats
CREATE POLICY "system_update_reader_stats" ON reader_feedback_stats 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- ============================================================
-- 7. TRIGGERS AND FUNCTIONS
-- ============================================================

-- Function to update reader stats when feedback is approved
CREATE OR REPLACE FUNCTION update_reader_feedback_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update stats for approved feedback
    IF NEW.moderation_status = 'approved' AND NEW.is_visible_to_reader = TRUE THEN
        INSERT INTO reader_feedback_stats (reader_id)
        VALUES (NEW.reader_id)
        ON CONFLICT (reader_id) DO NOTHING;
        
        -- Recalculate stats
        UPDATE reader_feedback_stats SET
            total_approved_feedback = (
                SELECT COUNT(*) FROM service_feedback 
                WHERE reader_id = NEW.reader_id 
                AND moderation_status = 'approved' 
                AND is_visible_to_reader = TRUE
            ),
            average_approved_rating = (
                SELECT COALESCE(AVG(moderated_rating), 0) FROM service_feedback 
                WHERE reader_id = NEW.reader_id 
                AND moderation_status = 'approved' 
                AND is_visible_to_reader = TRUE
            ),
            rating_5_count = (
                SELECT COUNT(*) FROM service_feedback 
                WHERE reader_id = NEW.reader_id 
                AND moderation_status = 'approved' 
                AND is_visible_to_reader = TRUE 
                AND moderated_rating = 5
            ),
            rating_4_count = (
                SELECT COUNT(*) FROM service_feedback 
                WHERE reader_id = NEW.reader_id 
                AND moderation_status = 'approved' 
                AND is_visible_to_reader = TRUE 
                AND moderated_rating = 4
            ),
            rating_3_count = (
                SELECT COUNT(*) FROM service_feedback 
                WHERE reader_id = NEW.reader_id 
                AND moderation_status = 'approved' 
                AND is_visible_to_reader = TRUE 
                AND moderated_rating = 3
            ),
            rating_2_count = (
                SELECT COUNT(*) FROM service_feedback 
                WHERE reader_id = NEW.reader_id 
                AND moderation_status = 'approved' 
                AND is_visible_to_reader = TRUE 
                AND moderated_rating = 2
            ),
            rating_1_count = (
                SELECT COUNT(*) FROM service_feedback 
                WHERE reader_id = NEW.reader_id 
                AND moderation_status = 'approved' 
                AND is_visible_to_reader = TRUE 
                AND moderated_rating = 1
            ),
            last_calculated_at = NOW(),
            updated_at = NOW()
        WHERE reader_id = NEW.reader_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats
CREATE TRIGGER update_reader_stats_trigger
    AFTER UPDATE OF moderation_status ON service_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_reader_feedback_stats();

-- Function to log all moderation actions
CREATE OR REPLACE FUNCTION log_feedback_moderation()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the moderation action
    IF TG_OP = 'INSERT' THEN
        INSERT INTO feedback_moderation_log (
            feedback_id, action_type, new_status, new_rating, new_comment, admin_id
        ) VALUES (
            NEW.id, 'submitted', NEW.moderation_status, NEW.original_rating, NEW.original_comment, NEW.client_id
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if moderation fields changed
        IF OLD.moderation_status != NEW.moderation_status OR 
           OLD.moderated_rating != NEW.moderated_rating OR 
           OLD.moderated_comment != NEW.moderated_comment THEN
            
            INSERT INTO feedback_moderation_log (
                feedback_id, action_type, previous_status, new_status,
                previous_rating, new_rating, previous_comment, new_comment,
                admin_id, admin_reason, admin_notes
            ) VALUES (
                NEW.id, 
                CASE 
                    WHEN NEW.moderation_status = 'approved' THEN 'approved'
                    WHEN NEW.moderation_status = 'edited' THEN 'edited'
                    WHEN NEW.moderation_status = 'deleted' THEN 'deleted'
                    WHEN NEW.moderation_status = 'rejected' THEN 'rejected'
                    ELSE 'updated'
                END,
                OLD.moderation_status, NEW.moderation_status,
                OLD.moderated_rating, NEW.moderated_rating,
                OLD.moderated_comment, NEW.moderated_comment,
                NEW.moderated_by, NEW.moderation_reason, NEW.admin_notes
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to log moderation actions
CREATE TRIGGER log_moderation_trigger
    AFTER INSERT OR UPDATE ON service_feedback
    FOR EACH ROW
    EXECUTE FUNCTION log_feedback_moderation();

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION handle_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER feedback_updated_at_trigger
    BEFORE UPDATE ON service_feedback
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_updated_at();

-- ============================================================
-- 8. INSERT DEFAULT FEEDBACK PROMPTS
-- ============================================================

INSERT INTO feedback_prompts (service_type, title_en, title_ar, message_en, message_ar) VALUES
('tarot_reading', 'Rate Your Tarot Reading', 'قيم قراءة التاروت الخاصة بك', 'How was your tarot reading experience? Your feedback helps us improve our services.', 'كيف كانت تجربة قراءة التاروت؟ ملاحظاتك تساعدنا على تحسين خدماتنا.'),
('call_session', 'Rate Your Call Session', 'قيم جلسة المكالمة', 'Please rate your call session experience. Your feedback is valuable to us.', 'يرجى تقييم تجربة جلسة المكالمة. ملاحظاتك قيمة بالنسبة لنا.'),
('chat_session', 'Rate Your Chat Session', 'قيم جلسة المحادثة', 'How was your chat session? We appreciate your honest feedback.', 'كيف كانت جلسة المحادثة؟ نقدر ملاحظاتك الصادقة.'),
('astrology', 'Rate Your Astrology Reading', 'قيم قراءة علم التنجيم', 'Please share your thoughts about the astrology consultation.', 'يرجى مشاركة أفكارك حول استشارة علم التنجيم.'),
('palm_reading', 'Rate Your Palm Reading', 'قيم قراءة الكف', 'How was your palm reading experience? Your feedback matters.', 'كيف كانت تجربة قراءة الكف؟ ملاحظاتك مهمة.'),
('spiritual_guidance', 'Rate Your Spiritual Guidance', 'قيم الإرشاد الروحي', 'Please rate your spiritual guidance session.', 'يرجى تقييم جلسة الإرشاد الروحي.');

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
SELECT 'Admin-Moderated Service Feedback System created successfully!' as message;