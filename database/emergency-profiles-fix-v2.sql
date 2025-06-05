-- =====================================================
-- EMERGENCY PROFILES TABLE FIX - VERSION 2
-- 🚨 يحل مشكلة: infinite recursion detected in policy
-- 🔧 مُحدث لحل مشكلة ON CONFLICT
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
DROP POLICY IF EXISTS "view_own_profile" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "view_active_readers" ON profiles;

-- STEP 2: التأكد من وجود constraint الأدوار الصحيح
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));

-- STEP 3: إضافة unique constraint على email إذا لم يكن موجود
DO $$
BEGIN
    -- محاولة إضافة unique constraint على email
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_unique'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
    END IF;
EXCEPTION 
    WHEN others THEN
        -- إذا فشل، نتجاهل الخطأ ونكمل
        NULL;
END $$;

-- STEP 4: إنشاء RLS policies بسيطة وواضحة بدون recursion

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

-- STEP 5: إضافة policy منفصلة للسوبر أدمن بدون recursion
-- نستخدم hardcoded email بدلاً من قراءة من نفس الجدول لمنع recursion
CREATE POLICY "super_admin_access" ON profiles
  FOR ALL USING (
    (SELECT auth.email()) = 'info@samiatarot.com'
  );

-- STEP 6: التعامل مع السوبر أدمن بطريقة آمنة
DO $$
BEGIN
    -- محاولة تحديث السوبر أدمن إذا كان موجود
    UPDATE profiles 
    SET 
        role = 'super_admin',
        is_active = true,
        updated_at = NOW()
    WHERE email = 'info@samiatarot.com';
    
    -- إذا لم يكن موجود، إنشاؤه
    IF NOT FOUND THEN
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
        );
    END IF;
    
EXCEPTION 
    WHEN others THEN
        -- في حالة وجود خطأ، نحاول الإدراج المباشر
        BEGIN
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
            );
        EXCEPTION 
            WHEN others THEN
                -- إذا فشل كل شيء، نتجاهل
                NULL;
        END;
END $$;

-- STEP 7: إزالة أي duplicates للسوبر أدمن
DELETE FROM profiles a USING profiles b 
WHERE a.email = b.email 
  AND a.email = 'info@samiatarot.com'
  AND a.id > b.id;

-- STEP 8: التحقق من النتيجة
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

-- STEP 9: عرض جميع RLS policies الجديدة للتأكد
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

-- STEP 10: اختبار بسيط للتأكد من عمل النظام
SELECT 
  'Profiles Summary' as check_type,
  role,
  COUNT(*) as user_count,
  STRING_AGG(email, ', ') as emails
FROM profiles 
GROUP BY role
ORDER BY role;

-- =====================================================
-- ملاحظات مهمة:
-- 1. هذا الحل يستخدم auth.email() بدلاً من قراءة من جدول profiles
-- 2. يمنع infinite recursion لأنه لا يقرأ من نفس الجدول
-- 3. السوبر أدمن سيحصل على صلاحية كاملة
-- 4. باقي المستخدمين سيحصلون على الصلاحيات العادية
-- 5. يستخدم DO blocks للتعامل مع الأخطاء المحتملة
-- ===================================================== 