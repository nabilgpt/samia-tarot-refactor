-- Complete Chat System Fix
-- SAMIA TAROT - Unified Chat System Final Implementation
-- This script creates all missing components in the correct order

-- Step 1: Create the audit function first
CREATE OR REPLACE FUNCTION log_chat_audit()
RETURNS TRIGGER AS $$
DECLARE
    audit_user_id UUID;
    old_data JSONB;
    new_data JSONB;
    action_type TEXT;
BEGIN
    -- Get the current user ID from auth context
    audit_user_id := auth.uid();
    
    -- Determine the action type
    IF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data := row_to_json(OLD)::jsonb;
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        old_data := row_to_json(OLD)::jsonb;
        new_data := row_to_json(NEW)::jsonb;
    ELSIF TG_OP = 'INSERT' THEN
        action_type := 'INSERT';
        old_data := NULL;
        new_data := row_to_json(NEW)::jsonb;
    END IF;

    -- Insert audit log entry
    INSERT INTO public.chat_audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        ip_address,
        metadata
    ) VALUES (
        audit_user_id,
        action_type,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        old_data,
        new_data,
        inet_client_addr(),
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'timestamp', NOW(),
            'session_info', current_setting('application_name', true)
        )
    );

    -- Return the appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on function
GRANT EXECUTE ON FUNCTION log_chat_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION log_chat_audit() TO service_role;

-- Step 2: Create chat_monitoring table
CREATE TABLE IF NOT EXISTS public.chat_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'user_joined', 'user_left', 'typing_start', 'typing_stop', 
        'user_online', 'user_offline', 'message_delivered', 'message_read'
    )),
    event_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_session_id ON public.chat_monitoring(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_user_id ON public.chat_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_event_type ON public.chat_monitoring(event_type);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_created_at ON public.chat_monitoring(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_monitoring_session_user ON public.chat_monitoring(session_id, user_id);

-- Step 4: Enable RLS
ALTER TABLE public.chat_monitoring ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
DROP POLICY IF EXISTS chat_monitoring_participant_access ON public.chat_monitoring;
CREATE POLICY chat_monitoring_participant_access ON public.chat_monitoring
    FOR ALL
    TO authenticated
    USING (
        session_id IN (
            SELECT id FROM public.chat_sessions 
            WHERE auth.uid() = ANY(participants)
        )
    );

DROP POLICY IF EXISTS chat_monitoring_admin_access ON public.chat_monitoring;
CREATE POLICY chat_monitoring_admin_access ON public.chat_monitoring
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Step 6: Add audit trigger (now that function exists)
DROP TRIGGER IF EXISTS chat_monitoring_audit_trigger ON public.chat_monitoring;
CREATE TRIGGER chat_monitoring_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.chat_monitoring
    FOR EACH ROW EXECUTE FUNCTION log_chat_audit();

-- Step 7: Grant permissions
GRANT ALL ON public.chat_monitoring TO authenticated;
GRANT ALL ON public.chat_monitoring TO service_role;

-- Step 8: Add audit triggers to existing tables if they don't exist
DROP TRIGGER IF EXISTS chat_sessions_audit_trigger ON public.chat_sessions;
CREATE TRIGGER chat_sessions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.chat_sessions
    FOR EACH ROW EXECUTE FUNCTION log_chat_audit();

DROP TRIGGER IF EXISTS chat_messages_audit_trigger ON public.chat_messages;
CREATE TRIGGER chat_messages_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION log_chat_audit();

-- Add comments
COMMENT ON FUNCTION log_chat_audit() IS 'Audit trigger function for chat system operations';
COMMENT ON TABLE public.chat_monitoring IS 'Real-time chat monitoring events and user presence tracking';

-- Final verification query
SELECT 
    'chat_sessions' as table_name,
    COUNT(*) as row_count,
    'Created' as status
FROM public.chat_sessions
UNION ALL
SELECT 
    'chat_messages' as table_name,
    COUNT(*) as row_count,
    'Created' as status
FROM public.chat_messages
UNION ALL
SELECT 
    'chat_audit_logs' as table_name,
    COUNT(*) as row_count,
    'Created' as status
FROM public.chat_audit_logs
UNION ALL
SELECT 
    'chat_monitoring' as table_name,
    COUNT(*) as row_count,
    'Created' as status
FROM public.chat_monitoring; 