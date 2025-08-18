-- Create Chat Audit Function
-- SAMIA TAROT - Unified Chat System
-- This function logs all chat-related operations for audit purposes

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_chat_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION log_chat_audit() TO service_role;

-- Add comment
COMMENT ON FUNCTION log_chat_audit() IS 'Audit trigger function for chat system operations'; 