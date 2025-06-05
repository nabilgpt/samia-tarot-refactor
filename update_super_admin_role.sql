-- =====================================================
-- UPDATE USER ROLE TO SUPER ADMIN
-- =====================================================
-- Email: info@samiatarot.com  
-- Role: super_admin
-- =====================================================

-- Update the user role to super_admin
UPDATE profiles 
SET role = 'super_admin',
    updated_at = NOW()
WHERE email = 'info@samiatarot.com';

-- Verify the update
SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at 
FROM profiles 
WHERE email = 'info@samiatarot.com';

-- Optional: Check if the role constraint allows super_admin
-- If this fails, we need to update the constraint first
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%role%';

-- If the constraint needs to be updated, run these commands:
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
-- CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin')); 