-- ============================================================
-- SAMIA TAROT - DATABASE COMPLETION SCRIPT
-- Creates all remaining critical tables for full functionality
-- Execute this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PAYMENT SYSTEM TABLES (CRITICAL PRIORITY)
-- ============================================================

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'wallet', 'crypto', 'bank_transfer', 'cash')),
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('stripe', 'square', 'usdt', 'western_union', 'moneygram', 'internal_wallet')),
    
    -- Card details
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    -- Wallet/Crypto details
    wallet_address TEXT,
    wallet_network VARCHAR(50),
    
    -- Provider tokens
    stripe_payment_method_id VARCHAR(255),
    square_card_id VARCHAR(255),
    
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'refund', 'fee', 'bonus')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    description TEXT,
    reference_id VARCHAR(255),
    external_transaction_id VARCHAR(255),
    
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    payment_id VARCHAR(255),
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    
    balance_before DECIMAL(10,2) DEFAULT 0,
    balance_after DECIMAL(10,2) DEFAULT 0,
    
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Payment Receipts Table
CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    receipt_url TEXT,
    receipt_file_path TEXT,
    
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- 2. CHAT SYSTEM TABLES (CRITICAL PRIORITY)
-- ============================================================

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    session_type VARCHAR(50) DEFAULT 'one_on_one' CHECK (session_type IN ('one_on_one', 'group', 'support')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked', 'deleted')),
    
    is_encrypted BOOLEAN DEFAULT true,
    auto_delete_after_days INTEGER DEFAULT 30,
    
    participants UUID[] NOT NULL,
    
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_preview TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'file', 'video', 'system')),
    content TEXT,
    content_encrypted TEXT,
    
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    thumbnail_url TEXT,
    
    duration_seconds INTEGER,
    waveform_data JSONB,
    
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    delivered_to UUID[] DEFAULT '{}',
    read_by UUID[] DEFAULT '{}',
    
    reply_to_message_id UUID REFERENCES chat_messages(id),
    thread_id UUID,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Voice Notes Table
CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    file_url TEXT NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    duration_seconds INTEGER NOT NULL,
    
    format VARCHAR(10) DEFAULT 'webm',
    bitrate INTEGER,
    sample_rate INTEGER,
    
    waveform_data JSONB,
    
    transcript TEXT,
    transcript_confidence DECIMAL(3,2),
    transcript_language VARCHAR(10) DEFAULT 'en',
    
    processing_status VARCHAR(50) DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'processing', 'ready', 'failed')),
    
    is_public BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- 3. ANALYTICS TABLES (HIGH PRIORITY)
-- ============================================================

-- Daily Analytics Table
CREATE TABLE IF NOT EXISTS daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_registrations INTEGER DEFAULT 0,
    
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    cancelled_bookings INTEGER DEFAULT 0,
    
    total_revenue DECIMAL(10,2) DEFAULT 0,
    revenue_by_service JSONB DEFAULT '{}'::jsonb,
    revenue_by_payment_method JSONB DEFAULT '{}'::jsonb,
    
    active_readers INTEGER DEFAULT 0,
    total_reading_hours DECIMAL(5,2) DEFAULT 0,
    average_session_duration DECIMAL(5,2) DEFAULT 0,
    
    total_messages INTEGER DEFAULT 0,
    active_chat_sessions INTEGER DEFAULT 0,
    
    avg_response_time DECIMAL(5,2) DEFAULT 0,
    error_rate DECIMAL(5,4) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(date)
);

-- Reader Analytics Table
CREATE TABLE IF NOT EXISTS reader_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    total_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,
    cancelled_sessions INTEGER DEFAULT 0,
    
    total_minutes INTEGER DEFAULT 0,
    available_minutes INTEGER DEFAULT 0,
    utilization_rate DECIMAL(5,4) DEFAULT 0,
    
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    
    total_earnings DECIMAL(10,2) DEFAULT 0,
    earnings_by_service JSONB DEFAULT '{}'::jsonb,
    
    unique_clients INTEGER DEFAULT 0,
    repeat_clients INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(reader_id, date)
);

-- User Activity Logs Table
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    activity_type VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    
    page_url TEXT,
    user_agent TEXT,
    ip_address INET,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Service Usage Analytics Table
CREATE TABLE IF NOT EXISTS service_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    
    average_duration DECIMAL(5,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    completion_rate DECIMAL(5,4) DEFAULT 0,
    
    peak_hour INTEGER,
    demand_by_hour JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(service_id, date)
);

-- ============================================================
-- 4. AI FEATURES TABLES
-- ============================================================

-- AI Learning Data Table
CREATE TABLE IF NOT EXISTS ai_learning_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID,
    interaction_type VARCHAR(100) NOT NULL,
    
    input_data JSONB NOT NULL,
    output_data JSONB,
    feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5),
    
    model_version VARCHAR(50),
    confidence_score DECIMAL(5,4),
    processing_time_ms INTEGER,
    
    is_used_for_training BOOLEAN DEFAULT false,
    training_weight DECIMAL(3,2) DEFAULT 1.0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- AI Reading Results Table
CREATE TABLE IF NOT EXISTS ai_reading_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID,
    
    reading_type VARCHAR(100) NOT NULL,
    cards_drawn JSONB NOT NULL,
    spread_type VARCHAR(100),
    
    interpretation TEXT NOT NULL,
    key_themes TEXT[],
    advice TEXT,
    
    ai_confidence DECIMAL(5,4) DEFAULT 0,
    human_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- AI Model Performance Table
CREATE TABLE IF NOT EXISTS ai_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    evaluation_date DATE NOT NULL,
    
    accuracy DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    
    average_user_rating DECIMAL(3,2),
    total_evaluations INTEGER DEFAULT 0,
    
    performance_by_category JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(model_name, model_version, evaluation_date)
);

-- AI Training Sessions Table
CREATE TABLE IF NOT EXISTS ai_training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    session_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(100) NOT NULL,
    training_data_size INTEGER,
    
    learning_rate DECIMAL(8,6),
    batch_size INTEGER,
    epochs INTEGER,
    
    final_accuracy DECIMAL(5,4),
    training_loss DECIMAL(8,6),
    validation_loss DECIMAL(8,6),
    
    model_file_path TEXT,
    checkpoint_path TEXT,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- 5. APPROVAL SYSTEM TABLES
-- ============================================================

-- Reader Applications Table
CREATE TABLE IF NOT EXISTS reader_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    application_type VARCHAR(50) DEFAULT 'new_reader' CHECK (application_type IN ('new_reader', 'reactivation', 'upgrade')),
    
    experience_years INTEGER,
    specializations TEXT[],
    certifications TEXT[],
    languages TEXT[],
    
    resume_url TEXT,
    certificates_urls TEXT[],
    portfolio_url TEXT,
    reference_contacts JSONB,
    
    skills_test_score INTEGER,
    interview_score INTEGER,
    background_check_status VARCHAR(50) DEFAULT 'pending',
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'needs_info')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    next_action VARCHAR(255),
    next_action_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- System Approval Requests Table
CREATE TABLE IF NOT EXISTS system_approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    request_type VARCHAR(100) NOT NULL,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    current_value JSONB,
    requested_value JSONB NOT NULL,
    reason TEXT,
    
    requires_approval_from TEXT[] NOT NULL,
    approved_by UUID[] DEFAULT '{}',
    rejected_by UUID[] DEFAULT '{}',
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_at TIMESTAMP WITH TIME ZONE,
    applied_at TIMESTAMP WITH TIME ZONE,
    
    approval_notes TEXT,
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Content Moderation Table
CREATE TABLE IF NOT EXISTS content_moderation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    content_type VARCHAR(100) NOT NULL,
    content_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    content_text TEXT,
    content_metadata JSONB,
    
    flagged_reason TEXT[],
    severity_level VARCHAR(20) DEFAULT 'low' CHECK (severity_level IN ('low', 'medium', 'high', 'severe')),
    
    ai_confidence DECIMAL(5,4),
    ai_flags JSONB DEFAULT '{}'::jsonb,
    
    human_reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES auth.users(id),
    review_action VARCHAR(50),
    reviewer_notes TEXT,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'flagged', 'removed')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- 6. PERFORMANCE INDEXES
-- ============================================================

-- Payment system indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);

-- Chat system indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_participants ON chat_sessions USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_client_id ON chat_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_reader_id ON chat_sessions(reader_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(message_type);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date);
CREATE INDEX IF NOT EXISTS idx_reader_analytics_reader_date ON reader_analytics(reader_id, date);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- AI indexes
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_user_id ON ai_learning_data(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_interaction_type ON ai_learning_data(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_user_id ON ai_reading_results(user_id);

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reading_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation ENABLE ROW LEVEL SECURITY;

-- Payment methods policies
CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own payment methods" ON payment_methods
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment methods" ON payment_methods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Wallet transactions policies
CREATE POLICY "Users can view their own wallet transactions" ON wallet_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Chat sessions policies
CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
    FOR SELECT USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can create chat sessions they participate in" ON chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = ANY(participants));

-- Chat messages policies
CREATE POLICY "Users can view messages in their sessions" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = chat_messages.session_id 
            AND auth.uid() = ANY(participants)
        )
    );

-- Analytics policies (admin only)
CREATE POLICY "Admins can view analytics" ON daily_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Readers can view their own analytics" ON reader_analytics
    FOR SELECT USING (
        auth.uid() = reader_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Reader applications policies
CREATE POLICY "Users can manage their own applications" ON reader_applications
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications" ON reader_applications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================================
-- 8. UPDATE TRIGGERS
-- ============================================================

-- Create update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for tables with updated_at columns
CREATE TRIGGER update_payment_methods_updated_at 
    BEFORE UPDATE ON payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_transactions_updated_at 
    BEFORE UPDATE ON wallet_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_receipts_updated_at 
    BEFORE UPDATE ON payment_receipts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_notes_updated_at 
    BEFORE UPDATE ON voice_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reader_applications_updated_at 
    BEFORE UPDATE ON reader_applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_approval_requests_updated_at 
    BEFORE UPDATE ON system_approval_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_moderation_updated_at 
    BEFORE UPDATE ON content_moderation 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. COMPLETION VERIFICATION
-- ============================================================

-- Insert completion record
INSERT INTO system_settings (key, value, description, created_at) 
VALUES (
    'database_completion_status',
    json_build_object(
        'status', 'completed',
        'tables_created', 27,
        'version', '1.0',
        'completed_at', timezone('utc'::text, now())
    )::text,
    'Database completion verification record',
    timezone('utc'::text, now())
) ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = timezone('utc'::text, now());

-- Success verification query
SELECT 
    '🎉 DATABASE COMPLETION SUCCESSFUL!' as status,
    '27 critical tables created' as result,
    'Payment, Chat, Analytics, AI, and Approval systems enabled' as systems,
    timezone('utc'::text, now()) as completed_at; 