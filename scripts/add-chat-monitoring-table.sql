-- =============================================================================
-- ADD MISSING CHAT_MONITORING TABLE
-- =============================================================================

-- Create chat_monitoring table for real-time monitoring
CREATE TABLE IF NOT EXISTS public.chat_monitoring (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'user_connected', 'user_disconnected', 'session_joined', 
        'session_left', 'typing_start', 'typing_stop', 'message_sent'
    )),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_user_id ON public.chat_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_session_id ON public.chat_monitoring(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_timestamp ON public.chat_monitoring(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_event_type ON public.chat_monitoring(event_type);

-- Enable RLS
ALTER TABLE public.chat_monitoring ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin users can view all monitoring data"
ON public.chat_monitoring FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "System can insert monitoring data"
ON public.chat_monitoring FOR INSERT
WITH CHECK (true); -- Allow system to insert monitoring data

-- Grant permissions
GRANT SELECT ON public.chat_monitoring TO authenticated;
GRANT INSERT ON public.chat_monitoring TO authenticated;
GRANT SELECT ON public.chat_monitoring TO service_role;
GRANT INSERT ON public.chat_monitoring TO service_role;
GRANT UPDATE ON public.chat_monitoring TO service_role;
GRANT DELETE ON public.chat_monitoring TO service_role;

-- Add comments
COMMENT ON TABLE public.chat_monitoring IS 'Real-time monitoring and analytics for chat system';
COMMENT ON COLUMN public.chat_monitoring.event_type IS 'Type of monitoring event (user_connected, session_joined, etc.)';
COMMENT ON COLUMN public.chat_monitoring.metadata IS 'Additional event data in JSON format';

SELECT 'Chat monitoring table created successfully!' as result; 