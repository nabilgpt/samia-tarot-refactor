-- 999_seed_test_accounts.sql
-- Create test accounts for each role in SAMIA-TAROT platform
-- Apply via: python migrate.py up (add this file to MIGRATIONS list)

-- Insert test user profiles for each role
-- Note: In production, users would be created via auth.users first, then profiles
-- For development, we'll create UUID placeholders that can be linked later

INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  role_id,
  email_verified,
  created_at
) VALUES
-- Superadmin account
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'sa@samiatarot.com',
  'Super',
  'Admin',
  (SELECT id FROM roles WHERE code = 'superadmin'),
  true,
  now()
),
-- Admin account
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'admin@samiatarot.com',
  'Platform',
  'Admin',
  (SELECT id FROM roles WHERE code = 'admin'),
  true,
  now()
),
-- Reader account
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'reader@samiatarot.com',
  'Spiritual',
  'Reader',
  (SELECT id FROM roles WHERE code = 'reader'),
  true,
  now()
),
-- Monitor account
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'monitor@samiatarot.com',
  'Content',
  'Monitor',
  (SELECT id FROM roles WHERE code = 'monitor'),
  true,
  now()
),
-- Client account
(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'client@samiatarot.com',
  'Test',
  'Client',
  (SELECT id FROM roles WHERE code = 'client'),
  true,
  now()
)
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role_id = EXCLUDED.role_id,
  email_verified = EXCLUDED.email_verified,
  updated_at = now();

-- Verification: Show created accounts
-- Uncomment for debugging:
-- SELECT p.email, p.first_name, p.last_name, r.code as role, r.label
-- FROM profiles p
-- JOIN roles r ON p.role_id = r.id
-- WHERE p.email LIKE '%@samiatarot.com'
-- ORDER BY r.id;