-- Create the migrations table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.migrations IS 'Tracks which database migrations have been applied to prevent re-running them.'; 