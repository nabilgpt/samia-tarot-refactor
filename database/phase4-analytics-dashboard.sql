-- Phase 4: Admin Analytics & Reporting Dashboard
-- SAMIA TAROT Platform Database Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- EVENT LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS event_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'user_signup', 'user_login', 'booking_created', 'booking_cancelled',
        'payment_completed', 'payment_failed', 'emergency_call', 'call_started',
        'call_ended', 'message_sent', 'reading_completed', 'profile_updated'
    )),
    event_category VARCHAR(30) NOT NULL CHECK (event_category IN (
        'auth', 'booking', 'payment', 'communication', 'reading', 'system'
    )),
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SURVEY RESPONSES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    call_session_id UUID REFERENCES call_sessions(id) ON DELETE SET NULL,
    survey_type VARCHAR(30) NOT NULL CHECK (survey_type IN (
        'post_reading', 'post_call', 'general_satisfaction', 'platform_feedback'
    )),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    questions_responses JSONB, -- Store structured Q&A
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ADMIN REPORTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admin_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
        'monthly_revenue', 'user_growth', 'booking_summary', 'quality_metrics',
        'emergency_incidents', 'custom_analytics'
    )),
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    report_data JSONB NOT NULL,
    file_url TEXT, -- For PDF/CSV exports
    status VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- REVENUE ANALYTICS VIEW
-- =============================================
CREATE OR REPLACE VIEW revenue_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    payment_method,
    service_type,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_amount,
    SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed_amount
FROM payments 
WHERE created_at >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY DATE_TRUNC('day', created_at), payment_method, service_type
ORDER BY date DESC;

-- =============================================
-- USER GROWTH ANALYTICS VIEW
-- =============================================
CREATE OR REPLACE VIEW user_growth_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    role,
    COUNT(*) as new_users,
    SUM(COUNT(*)) OVER (PARTITION BY role ORDER BY DATE_TRUNC('day', created_at)) as cumulative_users
FROM profiles 
WHERE created_at >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY DATE_TRUNC('day', created_at), role
ORDER BY date DESC;

-- =============================================
-- BOOKING ANALYTICS VIEW
-- =============================================
CREATE OR REPLACE VIEW booking_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    service_type,
    status,
    COUNT(*) as booking_count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_processing_hours
FROM bookings 
WHERE created_at >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY DATE_TRUNC('day', created_at), service_type, status
ORDER BY date DESC;

-- =============================================
-- EMERGENCY CALL ANALYTICS VIEW
-- =============================================
CREATE OR REPLACE VIEW emergency_analytics AS
SELECT 
    DATE_TRUNC('day', timestamp) as date,
    status,
    COUNT(*) as call_count,
    AVG(response_time) as avg_response_time,
    COUNT(CASE WHEN escalated_to IS NOT NULL THEN 1 END) as escalated_count
FROM emergency_call_logs 
WHERE timestamp >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY DATE_TRUNC('day', timestamp), status
ORDER BY date DESC;

-- =============================================
-- READER PERFORMANCE VIEW
-- =============================================
CREATE OR REPLACE VIEW reader_performance AS
SELECT 
    p.id as reader_id,
    CONCAT(p.first_name, ' ', p.last_name) as reader_name,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT cs.id) as total_calls,
    AVG(sr.rating) as avg_rating,
    COUNT(DISTINCT sr.id) as total_reviews,
    SUM(py.amount) as total_revenue,
    AVG(CASE WHEN cs.is_emergency THEN ecl.response_time END) as avg_emergency_response
FROM profiles p
LEFT JOIN bookings b ON p.id = b.reader_id
LEFT JOIN call_sessions cs ON p.id = cs.reader_id
LEFT JOIN survey_responses sr ON p.id = sr.reader_id
LEFT JOIN payments py ON b.id = py.booking_id
LEFT JOIN emergency_call_logs ecl ON p.id = ecl.reader_id
WHERE p.role = 'reader'
GROUP BY p.id, p.first_name, p.last_name;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_category ON event_logs(event_category);

CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_reader_id ON survey_responses(reader_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_rating ON survey_responses(rating);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created_at ON survey_responses(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_reports_report_type ON admin_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_admin_reports_created_at ON admin_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_reports_period ON admin_reports(report_period_start, report_period_end);

-- Performance indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_payments_created_at_method ON payments(created_at, payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_service_type_status ON payments(service_type, status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at_service ON bookings(created_at, service_type);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_role ON profiles(created_at, role);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_reports ENABLE ROW LEVEL SECURITY;

-- Event Logs Policies
CREATE POLICY "Admins can view all event logs" ON event_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'monitor')
        )
    );

CREATE POLICY "System can insert event logs" ON event_logs
    FOR INSERT WITH CHECK (TRUE);

-- Survey Responses Policies
CREATE POLICY "Users can view their own survey responses" ON survey_responses
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all survey responses" ON survey_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'monitor')
        )
    );

CREATE POLICY "Users can create survey responses" ON survey_responses
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin Reports Policies
CREATE POLICY "Admins can manage reports" ON admin_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =============================================
-- ANALYTICS FUNCTIONS
-- =============================================

-- Function to get revenue statistics
CREATE OR REPLACE FUNCTION get_revenue_stats(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE,
    payment_method_filter TEXT DEFAULT NULL,
    service_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_revenue DECIMAL,
    transaction_count BIGINT,
    avg_transaction DECIMAL,
    completed_revenue DECIMAL,
    failed_revenue DECIMAL,
    daily_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_stats AS (
        SELECT 
            ra.date,
            SUM(ra.total_amount) as day_total,
            SUM(ra.transaction_count) as day_count
        FROM revenue_analytics ra
        WHERE ra.date BETWEEN start_date AND end_date
        AND (payment_method_filter IS NULL OR ra.payment_method = payment_method_filter)
        AND (service_type_filter IS NULL OR ra.service_type = service_type_filter)
        GROUP BY ra.date
        ORDER BY ra.date
    )
    SELECT 
        COALESCE(SUM(ra.total_amount), 0) as total_revenue,
        COALESCE(SUM(ra.transaction_count), 0) as transaction_count,
        COALESCE(AVG(ra.avg_amount), 0) as avg_transaction,
        COALESCE(SUM(ra.completed_amount), 0) as completed_revenue,
        COALESCE(SUM(ra.failed_amount), 0) as failed_revenue,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'date', ds.date,
                    'revenue', ds.day_total,
                    'count', ds.day_count
                ) ORDER BY ds.date
            ), 
            '[]'::jsonb
        ) as daily_data
    FROM revenue_analytics ra
    LEFT JOIN daily_stats ds ON ra.date = ds.date
    WHERE ra.date BETWEEN start_date AND end_date
    AND (payment_method_filter IS NULL OR ra.payment_method = payment_method_filter)
    AND (service_type_filter IS NULL OR ra.service_type = service_type_filter);
END;
$$ LANGUAGE plpgsql;

-- Function to get user growth statistics
CREATE OR REPLACE FUNCTION get_user_growth_stats(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE,
    role_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_new_users BIGINT,
    total_active_users BIGINT,
    growth_rate DECIMAL,
    daily_signups JSONB,
    role_breakdown JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_signups AS (
        SELECT 
            uga.date,
            SUM(uga.new_users) as day_signups
        FROM user_growth_analytics uga
        WHERE uga.date BETWEEN start_date AND end_date
        AND (role_filter IS NULL OR uga.role = role_filter)
        GROUP BY uga.date
        ORDER BY uga.date
    ),
    role_stats AS (
        SELECT 
            uga.role,
            SUM(uga.new_users) as role_total
        FROM user_growth_analytics uga
        WHERE uga.date BETWEEN start_date AND end_date
        GROUP BY uga.role
    )
    SELECT 
        COALESCE(SUM(uga.new_users), 0) as total_new_users,
        (SELECT COUNT(*) FROM profiles WHERE is_active = TRUE)::BIGINT as total_active_users,
        CASE 
            WHEN LAG(SUM(uga.new_users)) OVER () > 0 
            THEN ((SUM(uga.new_users) - LAG(SUM(uga.new_users)) OVER ()) * 100.0 / LAG(SUM(uga.new_users)) OVER ())
            ELSE 0 
        END as growth_rate,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'date', ds.date,
                    'signups', ds.day_signups
                ) ORDER BY ds.date
            ) FROM daily_signups ds),
            '[]'::jsonb
        ) as daily_signups,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'role', rs.role,
                    'count', rs.role_total
                )
            ) FROM role_stats rs),
            '[]'::jsonb
        ) as role_breakdown
    FROM user_growth_analytics uga
    WHERE uga.date BETWEEN start_date AND end_date
    AND (role_filter IS NULL OR uga.role = role_filter);
END;
$$ LANGUAGE plpgsql;

-- Function to log events
CREATE OR REPLACE FUNCTION log_event(
    p_user_id UUID,
    p_event_type VARCHAR,
    p_event_category VARCHAR,
    p_event_data JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO event_logs (
        user_id,
        event_type,
        event_category,
        event_data,
        ip_address,
        user_agent,
        session_id
    ) VALUES (
        p_user_id,
        p_event_type,
        p_event_category,
        p_event_data,
        p_ip_address,
        p_user_agent,
        p_session_id
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate admin report
CREATE OR REPLACE FUNCTION generate_admin_report(
    p_report_type VARCHAR,
    p_start_date DATE,
    p_end_date DATE,
    p_generated_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_report_id UUID;
    v_report_data JSONB;
BEGIN
    -- Generate report data based on type
    CASE p_report_type
        WHEN 'monthly_revenue' THEN
            SELECT jsonb_build_object(
                'revenue_stats', (SELECT row_to_json(r) FROM get_revenue_stats(p_start_date, p_end_date) r),
                'payment_methods', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'method', payment_method,
                            'total', SUM(total_amount),
                            'count', SUM(transaction_count)
                        )
                    )
                    FROM revenue_analytics 
                    WHERE date BETWEEN p_start_date AND p_end_date
                    GROUP BY payment_method
                )
            ) INTO v_report_data;
        
        WHEN 'user_growth' THEN
            SELECT jsonb_build_object(
                'growth_stats', (SELECT row_to_json(u) FROM get_user_growth_stats(p_start_date, p_end_date) u),
                'active_users', (SELECT COUNT(*) FROM profiles WHERE is_active = TRUE),
                'total_users', (SELECT COUNT(*) FROM profiles)
            ) INTO v_report_data;
        
        ELSE
            v_report_data := '{"error": "Unknown report type"}'::jsonb;
    END CASE;
    
    -- Insert report record
    INSERT INTO admin_reports (
        report_type,
        report_period_start,
        report_period_end,
        generated_by,
        report_data,
        status
    ) VALUES (
        p_report_type,
        p_start_date,
        p_end_date,
        p_generated_by,
        v_report_data,
        'generated'
    ) RETURNING id INTO v_report_id;
    
    RETURN v_report_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE event_logs IS 'Comprehensive event logging for analytics and audit trails';
COMMENT ON TABLE survey_responses IS 'User feedback and satisfaction surveys';
COMMENT ON TABLE admin_reports IS 'Generated admin reports with cached data';
COMMENT ON VIEW revenue_analytics IS 'Aggregated revenue data for analytics dashboard';
COMMENT ON VIEW user_growth_analytics IS 'User growth and signup trends';
COMMENT ON VIEW booking_analytics IS 'Booking patterns and service utilization';
COMMENT ON VIEW emergency_analytics IS 'Emergency call statistics and response times';
COMMENT ON VIEW reader_performance IS 'Reader performance metrics and ratings'; 