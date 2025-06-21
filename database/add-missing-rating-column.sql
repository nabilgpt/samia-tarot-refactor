-- ===============================================
-- ADD MISSING RATING COLUMN TO PROFILES
-- ===============================================

-- Add rating column to profiles table for readers
DO $$
BEGIN
  -- Add rating column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='rating') THEN
    ALTER TABLE profiles ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00;
    -- Add constraint to ensure rating is between 0 and 5
    ALTER TABLE profiles ADD CONSTRAINT profiles_rating_check CHECK (rating >= 0 AND rating <= 5);
  END IF;
END $$;

-- Update existing reader profiles with default rating
UPDATE profiles SET rating = 0.00 WHERE rating IS NULL AND role IN ('reader', 'admin', 'super_admin');

-- Create index for better performance on rating queries
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating) WHERE role = 'reader';

-- Success message
SELECT 'Rating column added to profiles table successfully!' as message; 