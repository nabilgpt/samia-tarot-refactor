-- =====================================================
-- إنشاء العلاقة بين profiles و auth.users من الصفر
-- =====================================================
-- هذا الـ script بينشئ الـ foreign key relationship الصحيحة

-- الخطوة 1: شيّك structure الجداول الحالية
SELECT 
    'Current profiles table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- الخطوة 2: شيّك auth.users structure
SELECT 
    'Current auth.users table structure:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth' 
  AND table_name = 'users'
  AND column_name IN ('id', 'email', 'created_at')
ORDER BY ordinal_position;

-- الخطوة 3: شيّك الـ foreign keys الموجودة حالياً
SELECT 
    'Current foreign keys on profiles:' as info,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
  AND contype = 'f'
ORDER BY conname;

-- الخطوة 4: تأكد من وجود profiles.id كـ UUID
-- إذا مافي، اعمله
DO $$
BEGIN
    -- تأكد إن profiles.id موجود كـ UUID primary key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'id'
          AND data_type = 'uuid'
    ) THEN
        -- إذا مافي عمود id، اعمله
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id UUID;
        
        -- اعمله primary key إذا مامعمول
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
        
        RAISE NOTICE 'Added id column as UUID primary key to profiles table';
    END IF;
END $$;

-- الخطوة 5: إنشاء الـ foreign key relationship
-- profiles.id -> auth.users.id
DO $$
BEGIN
    -- امحي أي foreign keys قديمة (للأمان)
    DROP CONSTRAINT IF EXISTS profiles_id_fkey ON public.profiles;
    DROP CONSTRAINT IF EXISTS profiles_user_id_fkey ON public.profiles;
    DROP CONSTRAINT IF EXISTS profiles_auth_user_id_fkey ON public.profiles;
    
    -- اعمل الـ foreign key الصحيح
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Created foreign key: profiles.id -> auth.users.id';
EXCEPTION 
    WHEN others THEN
        RAISE NOTICE 'Error creating foreign key: %', SQLERRM;
END $$;

-- الخطوة 6: اعمل indexes للـ performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- الخطوة 7: تأكد من الـ permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- الخطوة 8: جرّب الـ relationship
SELECT 
    'Testing the relationship:' as test_info,
    p.id,
    p.first_name,
    p.last_name,
    p.role,
    u.email,
    u.created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
LIMIT 3;

-- الخطوة 9: عرض الـ foreign key الجديد
SELECT 
    'Final foreign key created:' as result,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
  AND contype = 'f'
  AND conname = 'profiles_id_fkey';

-- الخطوة 10: معلومات مهمة للـ developer
SELECT 
    'Instructions for React/JS code:' as instructions,
    'Use this syntax in your Supabase queries:' as note,
    '.select("*, auth_users!profiles_id_fkey(email, created_at, last_sign_in_at)")' as correct_syntax;

-- تحقق نهائي من نجاح العملية
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'public.profiles'::regclass 
              AND contype = 'f' 
              AND conname = 'profiles_id_fkey'
        ) THEN '✅ SUCCESS: Foreign key relationship created successfully!'
        ELSE '❌ FAILED: Foreign key was not created'
    END as final_status; 