-- =====================================================
-- EMERGENCY PROFILES TABLE FIX
-- 🚨 يحل مشكلة: infinite recursion detected in policy
-- =====================================================

-- STEP 1: إزالة جميع RLS policies الموجودة لمنع التضارب
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "public_readers_viewable" ON profiles;
DROP POLICY IF EXISTS "super_admin_full_access" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable by all" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Readers can view client profiles" ON profiles;
DROP POLICY IF EXISTS "Monitors can view all profiles" ON profiles;
DROP POLICY IF EXISTS "users_view_own" ON profiles;
DROP POLICY IF EXISTS "users_update_own" ON profiles;
DROP POLICY IF EXISTS "public_readers" ON profiles;
DROP POLICY IF EXISTS "super_admin_access" ON profiles;
DROP POLICY IF EXISTS "allow_own_profile_view" ON profiles;
DROP POLICY IF EXISTS "allow_own_profile_update" ON profiles;
DROP POLICY IF EXISTS "allow_public_readers" ON profiles;
DROP POLICY IF EXISTS "allow_super_admin_all" ON profiles;
DROP POLICY IF EXISTS "user_own_profile_view" ON profiles;
DROP POLICY IF EXISTS "user_own_profile_update" ON profiles;
DROP POLICY IF EXISTS "public_reader_view" ON profiles;
DROP POLICY IF EXISTS "user_profile_view" ON profiles;
DROP POLICY IF EXISTS "user_profile_update" ON profiles;
DROP POLICY IF EXISTS "reader_public_view" ON profiles;
DROP POLICY IF EXISTS "super_admin_all_access" ON profiles;
DROP POLICY IF EXISTS "profile_own_view" ON profiles;
DROP POLICY IF EXISTS "profile_own_update" ON profiles;
DROP POLICY IF EXISTS "profile_reader_public" ON profiles;
DROP POLICY IF EXISTS "profile_super_admin_access" ON profiles;
DROP POLICY IF EXISTS "emergency_allow_all_select" ON profiles;
DROP POLICY IF EXISTS "emergency_allow_all_insert" ON profiles;
DROP POLICY IF EXISTS "emergency_allow_all_update" ON profiles;

-- STEP 2: التأكد من وجود constraint الأدوار الصحيح
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));

-- STEP 3: إنشاء RLS policies بسيطة وواضحة بدون recursion

-- السماح للمستخدمين برؤية ملفهم الشخصي فقط
CREATE POLICY "view_own_profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

-- السماح للمستخدمين بتحديث ملفهم الشخصي فقط
CREATE POLICY "update_own_profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- السماح للمستخدمين بإنشاء ملفهم الشخصي فقط
CREATE POLICY "insert_own_profile" ON profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- السماح للجميع برؤية القراء النشطين (للقائمة العامة)
CREATE POLICY "view_active_readers" ON profiles 
  FOR SELECT USING (role = 'reader' AND is_active = true);

-- STEP 4: إضافة policy منفصلة للسوبر أدمن بدون recursion
-- نستخدم hardcoded email بدلاً من قراءة من نفس الجدول لمنع recursion
CREATE POLICY "super_admin_access" ON profiles
  FOR ALL USING (
    (SELECT auth.email()) = 'info@samiatarot.com'
  );

-- STEP 5: التأكد من وجود السوبر أدمن
INSERT INTO profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_active, 
  created_at, 
  updated_at
)
VALUES (
  gen_random_uuid(),
  'info@samiatarot.com',
  'Mohamad Nabil',
  'Zein',
  'super_admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- STEP 6: إزالة أي duplicates للسوبر أدمن
DELETE FROM profiles a USING profiles b 
WHERE a.email = b.email 
  AND a.email = 'info@samiatarot.com'
  AND a.id > b.id;

-- STEP 7: التحقق من النتيجة
SELECT 
  'Super Admin Status' as check_type,
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_active,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'info@samiatarot.com';

-- STEP 8: عرض جميع RLS policies الجديدة للتأكد
SELECT 
  'Current RLS Policies' as check_type,
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY policyname;

-- =====================================================
-- ملاحظات مهمة:
-- 1. هذا الحل يستخدم auth.email() بدلاً من قراءة من جدول profiles
-- 2. يمنع infinite recursion لأنه لا يقرأ من نفس الجدول
-- 3. السوبر أدمن سيحصل على صلاحية كاملة
-- 4. باقي المستخدمين سيحصلون على الصلاحيات العادية
-- ===================================================== 