-- M019_rls_policies.sql
-- Common indexes and policies for core tables (as per Backend Core Spec)

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON profiles(whatsapp) WHERE whatsapp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_zodiac_sun ON profiles(zodiac_sun) WHERE zodiac_sun IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_reader ON orders(assigned_reader) WHERE assigned_reader IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_assets_owner_id ON media_assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_kind ON media_assets(kind);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets(created_at DESC);

-- Ensure RLS is enabled on core tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Roles: everyone can read
DROP POLICY IF EXISTS roles_select_all ON roles;
CREATE POLICY roles_select_all ON roles
  FOR SELECT USING (TRUE);

-- Profiles: users see own, staff see based on role
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role_id IN (SELECT id FROM roles WHERE code IN ('monitor', 'admin', 'superadmin'))
    )
  );

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

-- Services: everyone can read active services
DROP POLICY IF EXISTS services_select_all ON services;
CREATE POLICY services_select_all ON services
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS services_manage_admin ON services;
CREATE POLICY services_manage_admin ON services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

-- Orders: users see own, readers see assigned, admins see all
DROP POLICY IF EXISTS orders_select_own ON orders;
CREATE POLICY orders_select_own ON orders
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = assigned_reader
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('monitor', 'admin', 'superadmin'))
    )
  );

DROP POLICY IF EXISTS orders_insert_client ON orders;
CREATE POLICY orders_insert_client ON orders
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id = (SELECT id FROM roles WHERE code = 'client')
    )
  );

DROP POLICY IF EXISTS orders_update_own ON orders;
CREATE POLICY orders_update_own ON orders
  FOR UPDATE USING (
    auth.uid() = user_id
    OR auth.uid() = assigned_reader
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

-- Media assets: users see own, staff see related to their orders
DROP POLICY IF EXISTS media_assets_select_own ON media_assets;
CREATE POLICY media_assets_select_own ON media_assets
  FOR SELECT USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM orders
      WHERE (input_media_id = media_assets.id OR output_media_id = media_assets.id)
      AND (auth.uid() = user_id OR auth.uid() = assigned_reader)
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('monitor', 'admin', 'superadmin'))
    )
  );

DROP POLICY IF EXISTS media_assets_insert_own ON media_assets;
CREATE POLICY media_assets_insert_own ON media_assets
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('reader', 'admin', 'superadmin'))
    )
  );

COMMENT ON POLICY roles_select_all ON roles IS 'Everyone can read roles';
COMMENT ON POLICY profiles_select_own ON profiles IS 'Users see own profile, staff see based on role';
COMMENT ON POLICY services_select_all ON services IS 'Everyone can read services';
COMMENT ON POLICY orders_select_own ON orders IS 'Users see own orders, readers see assigned, admins see all';
COMMENT ON POLICY media_assets_select_own ON media_assets IS 'Users see own media, staff see related to orders';