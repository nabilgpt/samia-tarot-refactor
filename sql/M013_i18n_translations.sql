-- M013_i18n_translations.sql
-- i18n System Fields Translation (as per Backend Core Spec)
-- Machine translations via n8n → Google Translation v3
-- Admin overrides flip is_machine=false

CREATE TABLE IF NOT EXISTS content_translations (
  id BIGSERIAL PRIMARY KEY,

  entity_table TEXT NOT NULL,
  entity_id BIGINT NOT NULL,
  field TEXT NOT NULL,

  locale TEXT NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  value TEXT NOT NULL,

  is_machine BOOLEAN DEFAULT TRUE,
  source TEXT,

  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One translation per entity/field/locale
  CONSTRAINT unique_translation UNIQUE (entity_table, entity_id, field, locale)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_content_translations_lookup
  ON content_translations(entity_table, entity_id, field);

CREATE INDEX IF NOT EXISTS idx_content_translations_locale
  ON content_translations(locale);

CREATE INDEX IF NOT EXISTS idx_content_translations_machine
  ON content_translations(is_machine) WHERE is_machine = TRUE;

-- RLS Policies
ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;

-- Everyone can read translations
CREATE POLICY content_translations_select_all ON content_translations
  FOR SELECT USING (TRUE);

-- Only admins can insert machine translations
CREATE POLICY content_translations_insert_admin ON content_translations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

-- Only admins can update (override machine translations)
CREATE POLICY content_translations_update_admin ON content_translations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

-- Function to get translated value with fallback
CREATE OR REPLACE FUNCTION get_translation(
  p_entity_table TEXT,
  p_entity_id BIGINT,
  p_field TEXT,
  p_locale TEXT,
  p_fallback_locale TEXT DEFAULT 'en'
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_value TEXT;
BEGIN
  -- Try requested locale
  SELECT value INTO v_value
  FROM content_translations
  WHERE entity_table = p_entity_table
    AND entity_id = p_entity_id
    AND field = p_field
    AND locale = p_locale
  LIMIT 1;

  IF v_value IS NOT NULL THEN
    RETURN v_value;
  END IF;

  -- Fallback to default locale
  SELECT value INTO v_value
  FROM content_translations
  WHERE entity_table = p_entity_table
    AND entity_id = p_entity_id
    AND field = p_field
    AND locale = p_fallback_locale
  LIMIT 1;

  RETURN v_value;
END;
$$;

COMMENT ON TABLE content_translations IS 'System fields translation storage with machine/admin override support';
COMMENT ON FUNCTION get_translation IS 'Get translated value with fallback to default locale';