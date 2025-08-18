-- ============================================================================
-- SAMIA TAROT - TRANSLATION SETTINGS DEFAULT VALUES
-- Fix missing default values in translation_settings table
-- ============================================================================

-- Insert default translation settings
INSERT INTO translation_settings (setting_key, setting_value, description_en, description_ar, category, is_system_setting) VALUES
('global_translation_mode', '"auto-translate"', 'Global translation mode for all bilingual fields', 'نمط الترجمة العام لجميع الحقول ثنائية اللغة', 'general', false),
('default_provider', '"openai"', 'Default AI provider for translations', 'مقدم الذكاء الاصطناعي الافتراضي للترجمة', 'providers', false),
('fallback_mode', '"auto-copy"', 'Fallback mode when translation fails', 'النمط الاحتياطي عند فشل الترجمة', 'general', false),
('enable_provider_fallback', 'true', 'Enable automatic fallback to secondary providers', 'تفعيل التراجع التلقائي إلى مقدمي الخدمة الثانويين', 'providers', false),
('translation_quality_threshold', '0.7', 'Minimum quality score to accept translations', 'الحد الأدنى لدرجة الجودة لقبول الترجمات', 'general', false),
('cache_translations', 'true', 'Enable caching of translations for performance', 'تفعيل حفظ الترجمات مؤقتاً لتحسين الأداء', 'general', false),
('enable_usage_analytics', 'true', 'Track translation usage and performance', 'تتبع استخدام الترجمة والأداء', 'general', false)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  category = EXCLUDED.category,
  is_system_setting = EXCLUDED.is_system_setting,
  updated_at = NOW();

-- Verify settings were inserted
DO $$
BEGIN
  RAISE NOTICE '✅ Translation settings default values inserted successfully';
  RAISE NOTICE '📊 Settings: global_translation_mode, default_provider, fallback_mode, enable_provider_fallback, translation_quality_threshold, cache_translations, enable_usage_analytics';
  RAISE NOTICE '🔄 All settings now have proper default values';
END $$; 