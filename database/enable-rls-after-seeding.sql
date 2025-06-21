-- ===============================================
-- RE-ENABLE RLS AFTER SEEDING - Run After Seeding
-- ===============================================

-- Re-enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'RLS re-enabled. Database is now secure again.' as message; 