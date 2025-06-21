-- ===============================================
-- DISABLE RLS FOR SEEDING - Run Before Seeding
-- ===============================================

-- Temporarily disable RLS on tables that need seeding
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs DISABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'RLS disabled for seeding. Run seed script now.' as message; 