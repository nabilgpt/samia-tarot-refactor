-- M015_auth_profiles.sql
-- Auth & Profiles with mandatory signup fields (as per Backend Core Spec)
-- Mandatory: first/last name, gender, marital status, email, WhatsApp (E.164),
-- country, time zone/city, DOB, language

-- Extend profiles table if not complete
DO $$ BEGIN
  -- Add gender if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gender TEXT
      CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
  END IF;

  -- Add marital_status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'marital_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN marital_status TEXT
      CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'prefer_not_to_say'));
  END IF;

  -- Add whatsapp if missing (E.164 format)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'whatsapp'
  ) THEN
    ALTER TABLE profiles ADD COLUMN whatsapp TEXT
      CHECK (whatsapp ~ '^\+[1-9]\d{1,14}$');
  END IF;

  -- Add time_zone if missing (default Asia/Riyadh)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'time_zone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN time_zone TEXT DEFAULT 'Asia/Riyadh';
  END IF;

  -- Add city if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'city'
  ) THEN
    ALTER TABLE profiles ADD COLUMN city TEXT;
  END IF;

  -- Add language if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN language TEXT DEFAULT 'en'
      CHECK (language IN ('en', 'ar', 'fr'));
  END IF;

  -- Add zodiac_sun if missing (computed from DOB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'zodiac_sun'
  ) THEN
    ALTER TABLE profiles ADD COLUMN zodiac_sun TEXT
      CHECK (zodiac_sun IN (
        'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
        'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
      ));
  END IF;

  -- Add whatsapp_verified if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'whatsapp_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_verified BOOLEAN DEFAULT FALSE;
  END IF;

END $$;

-- Function to compute zodiac sign from DOB (tropical)
CREATE OR REPLACE FUNCTION compute_zodiac_sign(dob DATE)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  month INT := EXTRACT(MONTH FROM dob);
  day INT := EXTRACT(DAY FROM dob);
BEGIN
  IF (month = 3 AND day >= 21) OR (month = 4 AND day <= 19) THEN RETURN 'aries';
  ELSIF (month = 4 AND day >= 20) OR (month = 5 AND day <= 20) THEN RETURN 'taurus';
  ELSIF (month = 5 AND day >= 21) OR (month = 6 AND day <= 20) THEN RETURN 'gemini';
  ELSIF (month = 6 AND day >= 21) OR (month = 7 AND day <= 22) THEN RETURN 'cancer';
  ELSIF (month = 7 AND day >= 23) OR (month = 8 AND day <= 22) THEN RETURN 'leo';
  ELSIF (month = 8 AND day >= 23) OR (month = 9 AND day <= 22) THEN RETURN 'virgo';
  ELSIF (month = 9 AND day >= 23) OR (month = 10 AND day <= 22) THEN RETURN 'libra';
  ELSIF (month = 10 AND day >= 23) OR (month = 11 AND day <= 21) THEN RETURN 'scorpio';
  ELSIF (month = 11 AND day >= 22) OR (month = 12 AND day <= 21) THEN RETURN 'sagittarius';
  ELSIF (month = 12 AND day >= 22) OR (month = 1 AND day <= 19) THEN RETURN 'capricorn';
  ELSIF (month = 1 AND day >= 20) OR (month = 2 AND day <= 18) THEN RETURN 'aquarius';
  ELSIF (month = 2 AND day >= 19) OR (month = 3 AND day <= 20) THEN RETURN 'pisces';
  ELSE RETURN NULL;
  END IF;
END;
$$;

-- Trigger to auto-compute zodiac_sun from dob
CREATE OR REPLACE FUNCTION update_zodiac_sun()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.dob IS NOT NULL THEN
    NEW.zodiac_sun := compute_zodiac_sign(NEW.dob);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_zodiac_sun ON profiles;
CREATE TRIGGER trigger_update_zodiac_sun
  BEFORE INSERT OR UPDATE OF dob ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_zodiac_sun();

-- Update existing profiles
UPDATE profiles
SET zodiac_sun = compute_zodiac_sign(dob)
WHERE dob IS NOT NULL AND zodiac_sun IS NULL;

COMMENT ON COLUMN profiles.zodiac_sun IS 'Auto-computed from dob (tropical zodiac)';
COMMENT ON COLUMN profiles.time_zone IS 'Default: Asia/Riyadh';
COMMENT ON COLUMN profiles.whatsapp IS 'E.164 format (e.g., +966501234567)';
COMMENT ON FUNCTION compute_zodiac_sign IS 'Compute tropical zodiac sign from date of birth';