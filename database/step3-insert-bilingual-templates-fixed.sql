-- SAMIA TAROT: Step 3 - Insert Bilingual Notification Templates (FIXED)
-- This script populates notification_templates with comprehensive Arabic/English content
-- Includes ALL required columns: title_template, body_template, title_en, message_en, title_ar, message_ar
-- Safe to run multiple times (uses ON CONFLICT DO UPDATE)

-- ============================================================================
-- STEP 3: INSERT BILINGUAL NOTIFICATION TEMPLATES (FIXED VERSION)
-- ============================================================================

DO $$
DECLARE
    table_exists boolean;
BEGIN
    -- Check if notification_templates table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notification_templates'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'notification_templates table does not exist, cannot insert templates';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Inserting comprehensive bilingual notification templates (FIXED VERSION)...';
    
    -- ========================================================================
    -- INSERT BILINGUAL NOTIFICATION TEMPLATES WITH ALL REQUIRED COLUMNS
    -- ========================================================================
    
    -- 1. APPROVAL PENDING
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en, 
        title_ar, message_ar
    ) VALUES (
        'approval_pending',
        'approval_pending', 
        'admin', 
        'high', 
        true,
        'New Approval Required',
        'A new item requires your approval. Please review and take action.',
        'New Approval Required',
        'A new item requires your approval. Please review and take action.',
        'موافقة جديدة مطلوبة',
        'هناك عنصر جديد يتطلب موافقتك. يرجى المراجعة واتخاذ الإجراء المناسب.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 2. NEW REVIEW
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'review_new',
        'review_new',
        'feedback',
        'medium',
        true,
        'New Review Received',
        'You have received a new review for your services. Check your dashboard to see the feedback.',
        'New Review Received',
        'You have received a new review for your services. Check your dashboard to see the feedback.',
        'مراجعة جديدة',
        'لقد تلقيت مراجعة جديدة لخدماتك. تحقق من لوحة التحكم لرؤية التعليقات.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 3. NEW BOOKING
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'booking_new',
        'booking_new',
        'booking',
        'high',
        true,
        'New Booking Request',
        'You have a new booking request. Please confirm your availability and respond promptly.',
        'New Booking Request',
        'You have a new booking request. Please confirm your availability and respond promptly.',
        'طلب حجز جديد',
        'لديك طلب حجز جديد. يرجى تأكيد توفرك والرد بسرعة.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 4. PAYMENT RECEIVED
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'payment_received',
        'payment_received',
        'payment',
        'medium',
        true,
        'Payment Received',
        'Your payment has been successfully processed. Thank you for your business!',
        'Payment Received',
        'Your payment has been successfully processed. Thank you for your business!',
        'تم استلام الدفع',
        'تم معالجة دفعتك بنجاح. شكراً لك على ثقتك!'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 5. SYSTEM ANNOUNCEMENT
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'system_announcement',
        'system_announcement',
        'system',
        'medium',
        true,
        'System Announcement',
        'Important system update or announcement. Please read the details carefully.',
        'System Announcement',
        'Important system update or announcement. Please read the details carefully.',
        'إعلان النظام',
        'تحديث مهم للنظام أو إعلان. يرجى قراءة التفاصيل بعناية.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 6. READER ASSIGNED
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'reader_assigned',
        'reader_assigned',
        'assignment',
        'high',
        true,
        'Reader Assigned',
        'A reader has been assigned to your session. You will be contacted shortly.',
        'Reader Assigned',
        'A reader has been assigned to your session. You will be contacted shortly.',
        'تم تعيين قارئ',
        'تم تعيين قارئ لجلستك. سيتم التواصل معك قريباً.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 7. DECK CREATED
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'deck_created',
        'deck_created',
        'tarot',
        'low',
        true,
        'New Tarot Deck Created',
        'A new tarot deck has been added to the system and is now available for readings.',
        'New Tarot Deck Created',
        'A new tarot deck has been added to the system and is now available for readings.',
        'تم إنشاء مجموعة بطاقات جديدة',
        'تم إضافة مجموعة بطاقات تاروت جديدة للنظام وهي متاحة الآن للقراءات.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 8. USER REGISTERED
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'user_registered',
        'user_registered',
        'user',
        'low',
        true,
        'New User Registration',
        'A new user has registered on the platform. Welcome them to the SAMIA TAROT community.',
        'New User Registration',
        'A new user has registered on the platform. Welcome them to the SAMIA TAROT community.',
        'تسجيل مستخدم جديد',
        'انضم مستخدم جديد إلى المنصة. مرحباً به في مجتمع سامية تاروت.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 9. SECURITY ALERT
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'security_alert',
        'security_alert',
        'security',
        'critical',
        true,
        'Security Alert',
        'Security alert: Unusual activity detected on your account. Please review immediately.',
        'Security Alert',
        'Security alert: Unusual activity detected on your account. Please review immediately.',
        'تنبيه أمني',
        'تنبيه أمني: تم اكتشاف نشاط غير معتاد في حسابك. يرجى المراجعة فوراً.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 10. TEST NOTIFICATION
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'test',
        'test',
        'system',
        'low',
        true,
        'Test Notification',
        'This is a test notification to verify the system is working correctly.',
        'Test Notification',
        'This is a test notification to verify the system is working correctly.',
        'إشعار تجريبي',
        'هذا إشعار تجريبي للتحقق من أن النظام يعمل بشكل صحيح.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 11. WELCOME MESSAGE
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'welcome',
        'welcome',
        'user',
        'medium',
        true,
        'Welcome to SAMIA TAROT',
        'Welcome to SAMIA TAROT! We are excited to have you join our mystical community. Explore your destiny with our expert readers.',
        'Welcome to SAMIA TAROT',
        'Welcome to SAMIA TAROT! We are excited to have you join our mystical community. Explore your destiny with our expert readers.',
        'أهلاً بك في سامية تاروت',
        'أهلاً بك في سامية تاروت! نحن متحمسون لانضمامك إلى مجتمعنا الروحاني. اكتشف مصيرك مع قرائنا الخبراء.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 12. MAINTENANCE NOTICE
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'maintenance',
        'maintenance',
        'system',
        'high',
        true,
        'Scheduled Maintenance',
        'Scheduled system maintenance will occur soon. Some features may be temporarily unavailable.',
        'Scheduled Maintenance',
        'Scheduled system maintenance will occur soon. Some features may be temporarily unavailable.',
        'صيانة مجدولة',
        'ستتم صيانة مجدولة للنظام قريباً. قد تكون بعض الميزات غير متاحة مؤقتاً.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 13. SESSION STARTED
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'session_started',
        'session_started',
        'session',
        'high',
        true,
        'Reading Session Started',
        'Your tarot reading session has begun. Your reader is ready to guide you through your spiritual journey.',
        'Reading Session Started',
        'Your tarot reading session has begun. Your reader is ready to guide you through your spiritual journey.',
        'بدأت جلسة القراءة',
        'بدأت جلسة قراءة التاروت الخاصة بك. قارئك مستعد لإرشادك في رحلتك الروحية.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 14. SESSION COMPLETED
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'session_completed',
        'session_completed',
        'session',
        'medium',
        true,
        'Reading Session Completed',
        'Your tarot reading session has been completed. We hope you found the insights valuable.',
        'Reading Session Completed',
        'Your tarot reading session has been completed. We hope you found the insights valuable.',
        'انتهت جلسة القراءة',
        'انتهت جلسة قراءة التاروت الخاصة بك. نأمل أن تكون قد وجدت البصائر قيمة.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    -- 15. REFUND PROCESSED
    INSERT INTO notification_templates (
        name, type, category, priority, is_active,
        title_template, body_template,
        title_en, message_en,
        title_ar, message_ar
    ) VALUES (
        'refund_processed',
        'refund_processed',
        'payment',
        'medium',
        true,
        'Refund Processed',
        'Your refund has been processed successfully. The amount will appear in your account within 3-5 business days.',
        'Refund Processed',
        'Your refund has been processed successfully. The amount will appear in your account within 3-5 business days.',
        'تم معالجة الاسترداد',
        'تم معالجة استردادك بنجاح. سيظهر المبلغ في حسابك خلال 3-5 أيام عمل.'
    ) ON CONFLICT (name) DO UPDATE SET
        title_template = EXCLUDED.title_template,
        body_template = EXCLUDED.body_template,
        title_en = EXCLUDED.title_en,
        message_en = EXCLUDED.message_en,
        title_ar = EXCLUDED.title_ar,
        message_ar = EXCLUDED.message_ar,
        updated_at = NOW();
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 3 COMPLETED SUCCESSFULLY (FIXED)';
    RAISE NOTICE 'Inserted 15 comprehensive bilingual templates with ALL required columns:';
    RAISE NOTICE '- title_template, body_template (legacy compatibility)';
    RAISE NOTICE '- title_en, message_en (English)';
    RAISE NOTICE '- title_ar, message_ar (Arabic)';
    RAISE NOTICE '';
    RAISE NOTICE 'Templates installed:';
    RAISE NOTICE '- approval_pending (موافقة جديدة مطلوبة)';
    RAISE NOTICE '- review_new (مراجعة جديدة)';
    RAISE NOTICE '- booking_new (طلب حجز جديد)';
    RAISE NOTICE '- payment_received (تم استلام الدفع)';
    RAISE NOTICE '- system_announcement (إعلان النظام)';
    RAISE NOTICE '- reader_assigned (تم تعيين قارئ)';
    RAISE NOTICE '- deck_created (تم إنشاء مجموعة بطاقات)';
    RAISE NOTICE '- user_registered (تسجيل مستخدم جديد)';
    RAISE NOTICE '- security_alert (تنبيه أمني)';
    RAISE NOTICE '- test (إشعار تجريبي)';
    RAISE NOTICE '- welcome (أهلاً بك في سامية تاروت)';
    RAISE NOTICE '- maintenance (صيانة مجدولة)';
    RAISE NOTICE '- session_started (بدأت جلسة القراءة)';
    RAISE NOTICE '- session_completed (انتهت جلسة القراءة)';
    RAISE NOTICE '- refund_processed (تم معالجة الاسترداد)';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for Step 4: Helper Functions';
    RAISE NOTICE '========================================';
    
END $$; 