-- M018_daily_zodiac.sql
-- Daily Zodiac Service with KSA day boundary (as per Backend Core Spec)

CREATE TABLE IF NOT EXISTS daily_zodiac (
  id BIGSERIAL PRIMARY KEY,

  date_key DATE NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ar')),
  sign TEXT NOT NULL CHECK (sign IN (
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  )),

  text_content TEXT NOT NULL,

  audio_url TEXT,
  audio_format TEXT CHECK (audio_format IN ('mp3', 'ogg')),
  audio_duration_sec INT,

  archived BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_daily_zodiac UNIQUE (date_key, lang, sign)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_zodiac_date_key ON daily_zodiac(date_key);
CREATE INDEX IF NOT EXISTS idx_daily_zodiac_lookup ON daily_zodiac(date_key, lang, sign) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_daily_zodiac_archived ON daily_zodiac(archived) WHERE archived = FALSE;

-- RLS Policies
ALTER TABLE daily_zodiac ENABLE ROW LEVEL SECURITY;

-- Clients see only their own sign, not archived, today only
CREATE POLICY daily_zodiac_select_client ON daily_zodiac
  FOR SELECT USING (
    -- Clients
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role_id = (SELECT id FROM roles WHERE code = 'client')
        AND zodiac_sun = daily_zodiac.sign
      )
      AND archived = FALSE
      AND date_key = (NOW() AT TIME ZONE 'Asia/Riyadh')::DATE
    )
    -- Staff see all (last 60 days)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('reader', 'monitor', 'admin', 'superadmin'))
      AND date_key >= (NOW() AT TIME ZONE 'Asia/Riyadh')::DATE - INTERVAL '60 days'
    )
  );

-- Only admins can insert/update
CREATE POLICY daily_zodiac_insert_admin ON daily_zodiac
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

CREATE POLICY daily_zodiac_update_admin ON daily_zodiac
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_id IN (SELECT id FROM roles WHERE code IN ('admin', 'superadmin'))
    )
  );

-- Function to get KSA date
CREATE OR REPLACE FUNCTION get_ksa_date()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
  SELECT (NOW() AT TIME ZONE 'Asia/Riyadh')::DATE;
$$;

-- Function to get seconds until next KSA midnight
CREATE OR REPLACE FUNCTION seconds_until_next_ksa_midnight()
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_now TIMESTAMPTZ;
  v_next_midnight TIMESTAMPTZ;
BEGIN
  v_now := NOW() AT TIME ZONE 'Asia/Riyadh';
  v_next_midnight := (date_trunc('day', v_now) + INTERVAL '1 day') AT TIME ZONE 'Asia/Riyadh';
  RETURN EXTRACT(EPOCH FROM (v_next_midnight - v_now))::INT;
END;
$$;

-- Function to get today's zodiac for user
CREATE OR REPLACE FUNCTION get_today_zodiac(p_user_id UUID, p_lang TEXT DEFAULT 'en')
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_sign TEXT;
  v_zodiac JSONB;
BEGIN
  -- Get user's zodiac sign
  SELECT zodiac_sun INTO v_sign
  FROM profiles
  WHERE id = p_user_id;

  IF v_sign IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get today's zodiac
  SELECT jsonb_build_object(
    'id', id,
    'date', date_key,
    'sign', sign,
    'text', text_content,
    'audio_url', audio_url,
    'audio_format', audio_format,
    'audio_duration_sec', audio_duration_sec
  )
  INTO v_zodiac
  FROM daily_zodiac
  WHERE date_key = get_ksa_date()
    AND lang = p_lang
    AND sign = v_sign
    AND archived = FALSE
  LIMIT 1;

  RETURN v_zodiac;
END;
$$;

-- Cleanup function (purge > 60 days)
CREATE OR REPLACE FUNCTION cleanup_old_zodiac()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INT;
BEGIN
  WITH deleted AS (
    DELETE FROM daily_zodiac
    WHERE date_key < (NOW() AT TIME ZONE 'Asia/Riyadh')::DATE - INTERVAL '60 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;

  RETURN v_deleted;
END;
$$;

COMMENT ON TABLE daily_zodiac IS 'Daily zodiac content with KSA day boundary (Asia/Riyadh)';
COMMENT ON FUNCTION get_ksa_date IS 'Get current date in Asia/Riyadh timezone';
COMMENT ON FUNCTION seconds_until_next_ksa_midnight IS 'TTL calculation for signed URLs';
COMMENT ON FUNCTION get_today_zodiac IS 'Get today zodiac for user (own sign only)';
COMMENT ON FUNCTION cleanup_old_zodiac IS 'Purge zodiac entries older than 60 days';