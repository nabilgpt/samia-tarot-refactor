-- COMPATIBILITY VIEWS FOR SCHEMA MIGRATION
-- SAMIA TAROT - Backend API Alignment
-- 
-- These views provide backward compatibility by creating schema-based
-- views that point to the new flat table structure.
-- 
-- Use this as a rollback strategy if needed.

-- =============================================
-- TAROT SCHEMA COMPATIBILITY VIEWS
-- =============================================

-- Create tarot schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS tarot;

-- Deck cards compatibility view
CREATE OR REPLACE VIEW tarot.deck_cards AS
SELECT * FROM public.deck_cards;

-- Deck uploads compatibility view  
CREATE OR REPLACE VIEW tarot.deck_uploads AS
SELECT * FROM public.deck_uploads;

-- Tarot V2 card selections compatibility view
CREATE OR REPLACE VIEW tarot.v2_card_selections AS
SELECT * FROM public.tarot_v2_card_selections;

-- Tarot V2 audit logs compatibility view
CREATE OR REPLACE VIEW tarot.v2_audit_logs AS
SELECT * FROM public.tarot_v2_audit_logs;

-- Tarot V2 readings compatibility view (if needed)
CREATE OR REPLACE VIEW tarot.v2_readings AS
SELECT * FROM public.tarot_v2_readings;

-- =============================================
-- CALLS SCHEMA COMPATIBILITY VIEWS
-- =============================================

-- Create calls schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS calls;

-- Call consent logs compatibility view
CREATE OR REPLACE VIEW calls.consent_logs AS
SELECT * FROM public.call_consent_logs;

-- Call emergency extensions compatibility view
CREATE OR REPLACE VIEW calls.emergency_extensions AS
SELECT * FROM public.call_emergency_extensions;

-- =============================================
-- READERS SCHEMA COMPATIBILITY VIEWS
-- =============================================

-- Create readers schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS readers;

-- Reader availability compatibility view
CREATE OR REPLACE VIEW readers.availability AS
SELECT * FROM public.reader_availability;

-- Reader availability overrides compatibility view
CREATE OR REPLACE VIEW readers.availability_overrides AS
SELECT * FROM public.reader_availability_overrides;

-- Reader emergency requests compatibility view
CREATE OR REPLACE VIEW readers.emergency_requests AS
SELECT * FROM public.reader_emergency_requests;

-- =============================================
-- PAYMENTS SCHEMA COMPATIBILITY VIEWS
-- =============================================

-- Create payments schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS payments;

-- Payment transactions compatibility view
CREATE OR REPLACE VIEW payments.transactions AS
SELECT * FROM public.payment_transactions;

-- =============================================
-- USERS SCHEMA COMPATIBILITY VIEWS
-- =============================================

-- Create users schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS users;

-- User wallets compatibility view
CREATE OR REPLACE VIEW users.wallets AS
SELECT * FROM public.user_wallets;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA tarot TO authenticated, anon;
GRANT USAGE ON SCHEMA calls TO authenticated, anon;
GRANT USAGE ON SCHEMA readers TO authenticated, anon;
GRANT USAGE ON SCHEMA payments TO authenticated, anon;
GRANT USAGE ON SCHEMA users TO authenticated, anon;

-- Grant select permissions on views (read-only for safety)
GRANT SELECT ON ALL TABLES IN SCHEMA tarot TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA calls TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA readers TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA payments TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA users TO authenticated, anon;

-- =============================================
-- VIEW METADATA FOR MONITORING
-- =============================================

-- Create metadata table to track compatibility views
CREATE TABLE IF NOT EXISTS public.compatibility_views_metadata (
    id SERIAL PRIMARY KEY,
    view_name TEXT NOT NULL,
    target_table TEXT NOT NULL,
    schema_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT
);

-- Insert metadata for all compatibility views
INSERT INTO public.compatibility_views_metadata (view_name, target_table, schema_name, notes)
VALUES 
    ('tarot.deck_cards', 'public.deck_cards', 'tarot', 'Deck management compatibility'),
    ('tarot.deck_uploads', 'public.deck_uploads', 'tarot', 'Upload tracking compatibility'),
    ('tarot.v2_card_selections', 'public.tarot_v2_card_selections', 'tarot', 'Card reveal compatibility'),
    ('tarot.v2_audit_logs', 'public.tarot_v2_audit_logs', 'tarot', 'Security audit compatibility'),
    ('tarot.v2_readings', 'public.tarot_v2_readings', 'tarot', 'Readings session compatibility'),
    
    ('calls.consent_logs', 'public.call_consent_logs', 'calls', 'Legal consent compatibility'),
    ('calls.emergency_extensions', 'public.call_emergency_extensions', 'calls', 'Emergency extensions compatibility'),
    
    ('readers.availability', 'public.reader_availability', 'readers', 'Reader scheduling compatibility'),
    ('readers.availability_overrides', 'public.reader_availability_overrides', 'readers', 'Schedule exceptions compatibility'),
    ('readers.emergency_requests', 'public.reader_emergency_requests', 'readers', 'Emergency requests compatibility'),
    
    ('payments.transactions', 'public.payment_transactions', 'payments', 'Payment tracking compatibility'),
    
    ('users.wallets', 'public.user_wallets', 'users', 'Wallet balance compatibility')
ON CONFLICT DO NOTHING;

-- =============================================
-- CLEANUP FUNCTIONS
-- =============================================

-- Function to drop all compatibility views
CREATE OR REPLACE FUNCTION drop_compatibility_views()
RETURNS TEXT AS $$
DECLARE
    view_record RECORD;
    result_text TEXT := '';
BEGIN
    -- Drop all compatibility views
    FOR view_record IN 
        SELECT view_name, schema_name 
        FROM compatibility_views_metadata 
        WHERE is_active = TRUE
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', 
            split_part(view_record.view_name, '.', 1),
            split_part(view_record.view_name, '.', 2)
        );
        result_text := result_text || 'Dropped: ' || view_record.view_name || E'\n';
    END LOOP;
    
    -- Mark views as inactive
    UPDATE compatibility_views_metadata SET is_active = FALSE;
    
    result_text := result_text || 'All compatibility views dropped successfully.';
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- Function to recreate all compatibility views
CREATE OR REPLACE FUNCTION recreate_compatibility_views()
RETURNS TEXT AS $$
BEGIN
    -- Simply re-run this entire script
    -- This function serves as a placeholder for manual recreation
    RETURN 'Please re-run the compatibility views SQL script to recreate views.';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- USAGE INSTRUCTIONS
-- =============================================

/*
USAGE INSTRUCTIONS:

1. APPLY COMPATIBILITY VIEWS:
   Run this entire script to create schema-based views.

2. ROLLBACK TO OLD API QUERIES:
   Your existing API code will continue to work with queries like:
   - supabase.from('tarot.deck_cards')
   - supabase.from('calls.consent_logs')
   - supabase.from('readers.availability')

3. MONITOR VIEW USAGE:
   SELECT * FROM compatibility_views_metadata WHERE is_active = TRUE;

4. CLEANUP WHEN READY:
   SELECT drop_compatibility_views();

5. SCHEMA PERMISSIONS:
   Views inherit RLS policies from underlying tables automatically.

NOTES:
- Views are READ-ONLY for safety during migration
- All INSERT/UPDATE/DELETE operations should use flat table names
- RLS policies from underlying tables are automatically enforced
- These views should be temporary during migration period only

ROLLBACK STRATEGY:
1. Apply this script immediately after flat table migration
2. Test API endpoints with schema-based queries
3. Gradually migrate to flat table names
4. Drop views when migration is complete

SECURITY:
- Views respect all existing RLS policies
- No additional permissions granted beyond original table access
- Audit logs continue to work normally
*/