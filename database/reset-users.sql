-- =============================================================================
-- RESET USERS SQL SCRIPT - SAMIA TAROT
-- Drop all existing users and insert new ones with bcrypt-hashed passwords
-- =============================================================================

-- STEP 1: Drop all existing users
DELETE FROM profiles;

-- STEP 2: Insert new users with bcrypt-hashed passwords (12 salt rounds)
-- Note: These are pre-generated bcrypt hashes for the passwords specified

INSERT INTO profiles (
    email, 
    role, 
    encrypted_password, 
    full_name, 
    is_active, 
    created_at, 
    updated_at
) VALUES 
    (
        'superadmin@samiatarot.com', 
        'super_admin', 
        '$2a$12$qR75QXSFIaoC0Tg809uHS.06zfwX1eZkooRsIVfmj3Ohlcdj/pi5m', -- SuperAdmin!2024
        'Super Administrator', 
        true, 
        NOW(), 
        NOW()
    ),
    (
        'admin@samiatarot.com', 
        'admin', 
        '$2a$12$LjW991wAsVnAQfiX2IxXMuEOQeWPWcDC.HRSwzVJCeF0MfB9BKNL.', -- Admin!2024
        'System Administrator', 
        true, 
        NOW(), 
        NOW()
    ),
    (
        'monitor@samiatarot.com', 
        'monitor', 
        '$2a$12$4YTYW1Xem2hgFFO.hH07ne7unhug7Hqb/rsIWnS/c0eLYZXdmzwpO', -- Monitor!2024
        'System Monitor', 
        true, 
        NOW(), 
        NOW()
    ),
    (
        'reader@samiatarot.com', 
        'reader', 
        '$2a$12$55BKZhgroslE4B9P89skCOuIh9.Vo2doO.sbAI/EqIZr9brxs7kza', -- Reader!2024
        'Tarot Reader', 
        true, 
        NOW(), 
        NOW()
    ),
    (
        'client@samiatarot.com', 
        'client', 
        '$2a$12$vgQAGdgFqptKRMiHCqtJreuaqRuQaF1tt8hXa3EVwi8nWZH3ON6yG', -- Client!2024
        'Test Client', 
        true, 
        NOW(), 
        NOW()
    );

-- STEP 3: Verify insertion
SELECT 
    email, 
    role, 
    full_name,
    encrypted_password IS NOT NULL as has_password,
    is_active,
    created_at
FROM profiles 
ORDER BY email;

-- Display final count
SELECT COUNT(*) as total_users FROM profiles; 