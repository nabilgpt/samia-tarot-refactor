-- =====================================================
-- CLEANUP PROFILES DATA
-- تنظيف بيانات الـ profiles بعد الإصلاح
-- =====================================================

-- 1. إزالة duplicate super_admins (نبقي واحد فقط)
DELETE FROM profiles 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM profiles 
    WHERE role = 'super_admin'
);

-- 2. التأكد من وجود super_admin واحد فقط مع البيانات الصحيحة
UPDATE profiles 
SET 
    email = 'info@samiatarot.com',
    first_name = 'Mohamad Nabil',
    last_name = 'Zein',
    is_active = true,
    updated_at = NOW()
WHERE role = 'super_admin';

-- 3. التحقق من النتيجة النهائية
SELECT 
    'Final Profiles Status' as status,
    role,
    COUNT(*) as count,
    STRING_AGG(COALESCE(email, 'NO_EMAIL'), ', ') as emails
FROM profiles 
GROUP BY role
ORDER BY role;

-- 4. عرض السوبر أدمن بالتفصيل
SELECT 
    'Super Admin Details' as status,
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at
FROM profiles 
WHERE role = 'super_admin'; 