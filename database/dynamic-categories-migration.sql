-- ============================================================================
-- SAMIA TAROT - DYNAMIC SECRET CATEGORIES MIGRATION
-- Implement dynamic category/subcategory management for system secrets
-- ============================================================================
-- Date: July 23, 2025
-- Purpose: Replace hardcoded categories with dynamic database-driven system
-- Security: Maintains all existing data and constraints
-- Version: 2.0 - Bulletproof Edition
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CREATE DEDICATED CATEGORY TABLES
-- ============================================================================

-- Secret categories table (main categories)
CREATE TABLE IF NOT EXISTS secret_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category identification
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name_en VARCHAR(200) NOT NULL,
    display_name_ar VARCHAR(200),
    
    -- Visual and organizational
    icon VARCHAR(100), -- Icon name/emoji for UI
    color VARCHAR(20) DEFAULT '#6B46C1', -- Hex color for UI theming
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    description_en TEXT,
    description_ar TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System categories cannot be deleted
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Secret subcategories table
CREATE TABLE IF NOT EXISTS secret_subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationship to parent category
    category_id UUID NOT NULL REFERENCES secret_categories(id) ON DELETE CASCADE,
    
    -- Subcategory identification  
    name VARCHAR(100) NOT NULL,
    display_name_en VARCHAR(200) NOT NULL,
    display_name_ar VARCHAR(200),
    
    -- Visual and organizational
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    description_en TEXT,
    description_ar TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique subcategory names within each category
    UNIQUE(category_id, name)
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_secret_categories_name ON secret_categories(name);
CREATE INDEX IF NOT EXISTS idx_secret_categories_active ON secret_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_secret_categories_sort ON secret_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_secret_categories_system ON secret_categories(is_system);

-- Subcategories indexes
CREATE INDEX IF NOT EXISTS idx_secret_subcategories_category ON secret_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_secret_subcategories_name ON secret_subcategories(name);
CREATE INDEX IF NOT EXISTS idx_secret_subcategories_active ON secret_subcategories(is_active);
CREATE INDEX IF NOT EXISTS idx_secret_subcategories_sort ON secret_subcategories(sort_order);

-- ============================================================================
-- 3. INSERT DEFAULT CATEGORIES AND SUBCATEGORIES
-- ============================================================================

-- Insert default categories (bilingual, system categories)
INSERT INTO secret_categories (name, display_name_en, display_name_ar, icon, color, sort_order, description_en, description_ar, is_system) VALUES
('infrastructure', 'Infrastructure', 'البنية التحتية', '🏗️', '#3B82F6', 1, 'Core infrastructure settings (Database, Storage, CDN)', 'إعدادات البنية التحتية الأساسية (قاعدة البيانات، التخزين، CDN)', true),
('ai_services', 'AI Services', 'خدمات الذكي الاصطناعي', '🤖', '#8B5CF6', 2, 'AI and machine learning service configurations', 'تكوينات خدمات الذكاء الاصطناعي والتعلم الآلي', true),
('payments', 'Payment Systems', 'أنظمة الدفع', '💳', '#10B981', 3, 'Payment processing and gateway configurations', 'معالجة المدفوعات وتكوينات البوابات', true),
('communications', 'Communications', 'الاتصالات', '📧', '#F59E0B', 4, 'Email, SMS, and communication service settings', 'البريد الإلكتروني والرسائل النصية وإعدادات خدمات الاتصال', true),
('security', 'Security & Auth', 'الأمان والمصادقة', '🔒', '#EF4444', 5, 'Security, authentication, and encryption settings', 'الأمان والمصادقة وإعدادات التشفير', true),
('integrations', 'Third-party Integrations', 'التكاملات الخارجية', '🔗', '#06B6D4', 6, 'External API and service integrations', 'واجهات برمجة التطبيقات الخارجية وتكاملات الخدمات', true),
('analytics', 'Analytics & Monitoring', 'التحليلات والمراقبة', '📊', '#8B5CF6', 7, 'Analytics, monitoring, and tracking services', 'خدمات التحليلات والمراقبة والتتبع', true),
('storage', 'Storage & Backup', 'التخزين والنسخ الاحتياطي', '🗄️', '#6B7280', 8, 'File storage, backup, and archive services', 'تخزين الملفات والنسخ الاحتياطي وخدمات الأرشفة', true),
('system', 'System Settings', 'إعدادات النظام', '⚙️', '#6B7280', 9, 'General system and application settings', 'الإعدادات العامة للنظام والتطبيق', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default subcategories with proper category relationships
DO $$
DECLARE
    infra_id UUID;
    ai_id UUID;
    payments_id UUID;
    comms_id UUID;
    security_id UUID;
    integrations_id UUID;
    analytics_id UUID;
    storage_id UUID;
    system_id UUID;
BEGIN
    -- Get category IDs (with error handling)
    SELECT id INTO infra_id FROM secret_categories WHERE name = 'infrastructure';
    SELECT id INTO ai_id FROM secret_categories WHERE name = 'ai_services';
    SELECT id INTO payments_id FROM secret_categories WHERE name = 'payments';
    SELECT id INTO comms_id FROM secret_categories WHERE name = 'communications';
    SELECT id INTO security_id FROM secret_categories WHERE name = 'security';
    SELECT id INTO integrations_id FROM secret_categories WHERE name = 'integrations';
    SELECT id INTO analytics_id FROM secret_categories WHERE name = 'analytics';
    SELECT id INTO storage_id FROM secret_categories WHERE name = 'storage';
    SELECT id INTO system_id FROM secret_categories WHERE name = 'system';

    -- Validate that we found all categories
    IF infra_id IS NULL OR ai_id IS NULL OR payments_id IS NULL OR 
       comms_id IS NULL OR security_id IS NULL OR integrations_id IS NULL OR
       analytics_id IS NULL OR storage_id IS NULL OR system_id IS NULL THEN
        RAISE EXCEPTION 'One or more required categories not found. Migration cannot continue.';
    END IF;

    -- Infrastructure subcategories
    INSERT INTO secret_subcategories (category_id, name, display_name_en, display_name_ar, icon, sort_order, is_system) VALUES
    (infra_id, 'database', 'Database', 'قاعدة البيانات', '🗃️', 1, true),
    (infra_id, 'cdn', 'CDN & Storage', 'CDN والتخزين', '🌐', 2, true),
    (infra_id, 'hosting', 'Hosting & Servers', 'الاستضافة والخوادم', '🖥️', 3, true)
    ON CONFLICT (category_id, name) DO NOTHING;

    -- AI Services subcategories
    INSERT INTO secret_subcategories (category_id, name, display_name_en, display_name_ar, icon, sort_order, is_system) VALUES
    (ai_id, 'openai', 'OpenAI Services', 'خدمات OpenAI', '🧠', 1, true),
    (ai_id, 'anthropic', 'Anthropic Claude', 'Anthropic Claude', '🤖', 2, true),
    (ai_id, 'google_ai', 'Google AI', 'Google AI', '🔍', 3, true),
    (ai_id, 'elevenlabs', 'ElevenLabs TTS', 'ElevenLabs TTS', '🔊', 4, true),
    (ai_id, 'azure_ai', 'Azure AI', 'Azure AI', '☁️', 5, true)
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Payment subcategories
    INSERT INTO secret_subcategories (category_id, name, display_name_en, display_name_ar, icon, sort_order, is_system) VALUES
    (payments_id, 'stripe', 'Stripe', 'Stripe', '💳', 1, true),
    (payments_id, 'paypal', 'PayPal', 'PayPal', '🅿️', 2, true),
    (payments_id, 'crypto', 'Cryptocurrency', 'العملات المشفرة', '₿', 3, true)
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Communications subcategories
    INSERT INTO secret_subcategories (category_id, name, display_name_en, display_name_ar, icon, sort_order, is_system) VALUES
    (comms_id, 'email', 'Email Services', 'خدمات البريد الإلكتروني', '📧', 1, true),
    (comms_id, 'sms', 'SMS Services', 'خدمات الرسائل النصية', '📱', 2, true),
    (comms_id, 'push', 'Push Notifications', 'الإشعارات المباشرة', '🔔', 3, true)
    ON CONFLICT (category_id, name) DO NOTHING;

    -- Security subcategories
    INSERT INTO secret_subcategories (category_id, name, display_name_en, display_name_ar, icon, sort_order, is_system) VALUES
    (security_id, 'auth', 'Authentication', 'المصادقة', '🔐', 1, true),
    (security_id, 'encryption', 'Encryption Keys', 'مفاتيح التشفير', '🔑', 2, true),
    (security_id, 'certificates', 'SSL Certificates', 'شهادات SSL', '📜', 3, true)
    ON CONFLICT (category_id, name) DO NOTHING;

    RAISE NOTICE 'Default categories and subcategories inserted successfully';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error inserting default categories/subcategories: %', SQLERRM;
END $$;

-- ============================================================================
-- 4. ADD FOREIGN KEY COLUMNS TO SYSTEM_SECRETS TABLE
-- ============================================================================

-- Add new foreign key columns (if they don't exist)
DO $$
BEGIN
    -- Check and add secret_category_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_secrets' 
        AND column_name = 'secret_category_id'
    ) THEN
        ALTER TABLE system_secrets ADD COLUMN secret_category_id UUID REFERENCES secret_categories(id);
        RAISE NOTICE 'Added secret_category_id column to system_secrets table';
    END IF;

    -- Check and add secret_subcategory_id column  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_secrets' 
        AND column_name = 'secret_subcategory_id'
    ) THEN
        ALTER TABLE system_secrets ADD COLUMN secret_subcategory_id UUID REFERENCES secret_subcategories(id);
        RAISE NOTICE 'Added secret_subcategory_id column to system_secrets table';
    END IF;
END $$;

-- Create indexes for the new foreign key columns
CREATE INDEX IF NOT EXISTS idx_system_secrets_category_id ON system_secrets(secret_category_id);
CREATE INDEX IF NOT EXISTS idx_system_secrets_subcategory_id ON system_secrets(secret_subcategory_id);

-- ============================================================================
-- 5. MIGRATE EXISTING DATA - BULLETPROOF VERSION
-- ============================================================================

-- Function to safely migrate existing string categories to foreign keys
CREATE OR REPLACE FUNCTION migrate_secret_categories()
RETURNS INTEGER AS $$
DECLARE
    secret_record RECORD;
    target_category_id UUID;
    target_subcategory_id UUID;
    migrated_count INTEGER := 0;
    error_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    -- Count total records to migrate
    SELECT COUNT(*) INTO total_count 
    FROM system_secrets 
    WHERE secret_category_id IS NULL;
    
    RAISE NOTICE 'Starting migration of % system secrets records', total_count;

    -- Migrate existing secrets to use foreign keys
    FOR secret_record IN 
        SELECT id, secret_category, secret_subcategory 
        FROM system_secrets 
        WHERE secret_category_id IS NULL
    LOOP
        -- Reset variables for each iteration
        target_category_id := NULL;
        target_subcategory_id := NULL;

        BEGIN
            -- Find matching category by name
            IF secret_record.secret_category IS NOT NULL THEN
                SELECT sc.id INTO target_category_id 
                FROM secret_categories sc
                WHERE sc.name = secret_record.secret_category 
                LIMIT 1;
                
                -- If no exact match, try case-insensitive match
                IF target_category_id IS NULL THEN
                    SELECT sc.id INTO target_category_id 
                    FROM secret_categories sc
                    WHERE LOWER(sc.name) = LOWER(secret_record.secret_category) 
                    LIMIT 1;
                END IF;
            END IF;

            -- Find matching subcategory (if exists and we found a category)
            IF secret_record.secret_subcategory IS NOT NULL AND target_category_id IS NOT NULL THEN
                SELECT ss.id INTO target_subcategory_id 
                FROM secret_subcategories ss
                WHERE ss.category_id = target_category_id 
                AND ss.name = secret_record.secret_subcategory 
                LIMIT 1;
                
                -- If no exact match, try case-insensitive match
                IF target_subcategory_id IS NULL THEN
                    SELECT ss.id INTO target_subcategory_id 
                    FROM secret_subcategories ss
                    WHERE ss.category_id = target_category_id 
                    AND LOWER(ss.name) = LOWER(secret_record.secret_subcategory) 
                    LIMIT 1;
                END IF;
            END IF;

            -- Update the secret with foreign key references
            IF target_category_id IS NOT NULL THEN
                UPDATE system_secrets 
                SET 
                    secret_category_id = target_category_id,
                    secret_subcategory_id = target_subcategory_id,
                    updated_at = NOW()
                WHERE id = secret_record.id;
                
                migrated_count := migrated_count + 1;
                
                -- Log successful migration
                RAISE NOTICE 'Migrated secret ID %, category: % -> %, subcategory: % -> %', 
                    secret_record.id, 
                    secret_record.secret_category, 
                    target_category_id,
                    secret_record.secret_subcategory,
                    COALESCE(target_subcategory_id::text, 'NULL');
            ELSE
                error_count := error_count + 1;
                RAISE WARNING 'Could not find matching category for secret ID %, category: %, subcategory: %', 
                    secret_record.id, 
                    secret_record.secret_category,
                    secret_record.secret_subcategory;
            END IF;

        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE WARNING 'Error migrating secret ID %: %', secret_record.id, SQLERRM;
        END;
    END LOOP;

    -- Summary report
    RAISE NOTICE 'Migration completed: % migrated, % errors, % total', 
        migrated_count, error_count, total_count;

    RETURN migrated_count;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fatal error in migrate_secret_categories(): %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration with error handling
DO $$
DECLARE
    migration_result INTEGER;
BEGIN
    SELECT migrate_secret_categories() INTO migration_result;
    RAISE NOTICE 'Migration function returned: % records migrated', migration_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END $$;

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE secret_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_subcategories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Super Admin Full Access - Categories" ON secret_categories;
DROP POLICY IF EXISTS "Admin Read Access - Categories" ON secret_categories;
DROP POLICY IF EXISTS "Super Admin Full Access - Subcategories" ON secret_subcategories;
DROP POLICY IF EXISTS "Admin Read Access - Subcategories" ON secret_subcategories;

-- RLS Policies - Super Admin and Admin access
CREATE POLICY "Super Admin Full Access - Categories" ON secret_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

CREATE POLICY "Admin Read Access - Categories" ON secret_categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "Super Admin Full Access - Subcategories" ON secret_subcategories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

CREATE POLICY "Admin Read Access - Subcategories" ON secret_subcategories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('super_admin', 'admin')
        )
    );

-- ============================================================================
-- 7. CREATE UPDATE TRIGGERS
-- ============================================================================

-- Update timestamp trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_category_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS trigger_update_category_timestamp ON secret_categories;
DROP TRIGGER IF EXISTS trigger_update_subcategory_timestamp ON secret_subcategories;

-- Apply triggers
CREATE TRIGGER trigger_update_category_timestamp
    BEFORE UPDATE ON secret_categories
    FOR EACH ROW EXECUTE FUNCTION update_category_timestamp();

CREATE TRIGGER trigger_update_subcategory_timestamp
    BEFORE UPDATE ON secret_subcategories
    FOR EACH ROW EXECUTE FUNCTION update_category_timestamp();

-- ============================================================================
-- 8. DATA VALIDATION AND CLEANUP
-- ============================================================================

-- Create validation function to check data integrity
CREATE OR REPLACE FUNCTION validate_categories_migration()
RETURNS TABLE (
    validation_step TEXT,
    passed BOOLEAN,
    details TEXT
) AS $$
BEGIN
    -- Check 1: All categories created
    RETURN QUERY
    SELECT 
        'Categories Created'::TEXT,
        (SELECT COUNT(*) FROM secret_categories) >= 9,
        'Found ' || (SELECT COUNT(*) FROM secret_categories)::TEXT || ' categories';

    -- Check 2: All subcategories created  
    RETURN QUERY
    SELECT 
        'Subcategories Created'::TEXT,
        (SELECT COUNT(*) FROM secret_subcategories) >= 15,
        'Found ' || (SELECT COUNT(*) FROM secret_subcategories)::TEXT || ' subcategories';

    -- Check 3: Migration completed
    RETURN QUERY
    SELECT 
        'Secrets Migrated'::TEXT,
        (SELECT COUNT(*) FROM system_secrets WHERE secret_category_id IS NULL) = 0,
        'Unmigrated secrets: ' || (SELECT COUNT(*) FROM system_secrets WHERE secret_category_id IS NULL)::TEXT;

    -- Check 4: Foreign key integrity
    RETURN QUERY
    SELECT 
        'Foreign Key Integrity'::TEXT,
        NOT EXISTS (
            SELECT 1 FROM system_secrets s 
            LEFT JOIN secret_categories c ON s.secret_category_id = c.id 
            WHERE s.secret_category_id IS NOT NULL AND c.id IS NULL
        ),
        'Orphaned category references: ' || (
            SELECT COUNT(*) FROM system_secrets s 
            LEFT JOIN secret_categories c ON s.secret_category_id = c.id 
            WHERE s.secret_category_id IS NOT NULL AND c.id IS NULL
        )::TEXT;

    -- Check 5: Subcategory integrity
    RETURN QUERY
    SELECT 
        'Subcategory Integrity'::TEXT,
        NOT EXISTS (
            SELECT 1 FROM system_secrets s 
            LEFT JOIN secret_subcategories sc ON s.secret_subcategory_id = sc.id 
            WHERE s.secret_subcategory_id IS NOT NULL AND sc.id IS NULL
        ),
        'Orphaned subcategory references: ' || (
            SELECT COUNT(*) FROM system_secrets s 
            LEFT JOIN secret_subcategories sc ON s.secret_subcategory_id = sc.id 
            WHERE s.secret_subcategory_id IS NOT NULL AND sc.id IS NULL
        )::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. VERIFICATION AND FINAL REPORT
-- ============================================================================

-- Run validation
SELECT * FROM validate_categories_migration();

-- Show migration summary
SELECT 
    'Categories Created' as step,
    COUNT(*) as count
FROM secret_categories
UNION ALL
SELECT 
    'Subcategories Created' as step,
    COUNT(*) as count
FROM secret_subcategories
UNION ALL
SELECT 
    'Secrets Migrated' as step,
    COUNT(*) as count
FROM system_secrets 
WHERE secret_category_id IS NOT NULL
UNION ALL
SELECT 
    'Secrets Unmigrated' as step,
    COUNT(*) as count
FROM system_secrets 
WHERE secret_category_id IS NULL;

-- Show category hierarchy with counts
SELECT 
    c.name as category,
    c.display_name_en as category_display,
    COUNT(DISTINCT s.id) as subcategory_count,
    COUNT(DISTINCT sec.id) as secrets_count
FROM secret_categories c
LEFT JOIN secret_subcategories s ON c.id = s.category_id
LEFT JOIN system_secrets sec ON c.id = sec.secret_category_id
GROUP BY c.id, c.name, c.display_name_en, c.sort_order
ORDER BY c.sort_order;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'DYNAMIC CATEGORIES MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE 'Version: 2.0 - Bulletproof Edition';
    RAISE NOTICE 'Date: %', NOW();
    RAISE NOTICE '============================================================================';
END $$; 