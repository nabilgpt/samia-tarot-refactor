-- =====================================================
-- SUPABASE STORAGE BUCKET POLICIES
-- =====================================================
-- Run this in your Supabase SQL Editor after creating the main schema

-- Create storage buckets (if not already created)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('profile-pictures', 'profile-pictures', true),
  ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PROFILE PICTURES BUCKET POLICIES
-- =====================================================

-- Allow users to upload their own profile pictures
CREATE POLICY "Users can upload their own profile pictures" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-pictures' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-pictures' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-pictures' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Profile pictures are publicly viewable
CREATE POLICY "Profile pictures are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-pictures');

-- =====================================================
-- CHAT FILES BUCKET POLICIES
-- =====================================================

-- Allow authenticated users to upload chat files
CREATE POLICY "Users can upload chat files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-files' AND 
    auth.uid() IS NOT NULL
  );

-- Users can view chat files they have access to
CREATE POLICY "Users can view chat files they have access to" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-files' AND 
    auth.uid() IS NOT NULL AND
    (
      -- File belongs to the user
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- User is involved in the booking (either as client or reader)
      EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.id::text = (storage.foldername(name))[2] AND
        (b.user_id = auth.uid() OR b.reader_id = auth.uid())
      )
    )
  );

-- Users can delete their own chat files
CREATE POLICY "Users can delete their own chat files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- HELPER FUNCTIONS FOR FILE MANAGEMENT
-- =====================================================

-- Function to get file URL
CREATE OR REPLACE FUNCTION get_file_url(bucket_name text, file_path text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN bucket_name = 'profile-pictures' THEN 
      'https://uusefmlielktdcltzwzt.supabase.co/storage/v1/object/public/' || bucket_name || '/' || file_path
    ELSE 
      'https://uusefmlielktdcltzwzt.supabase.co/storage/v1/object/sign/' || bucket_name || '/' || file_path
  END;
$$;

-- Function to clean up old profile pictures
CREATE OR REPLACE FUNCTION cleanup_old_profile_pictures()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete profile pictures older than 30 days that are not referenced in profiles
  DELETE FROM storage.objects 
  WHERE bucket_id = 'profile-pictures' 
    AND created_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE avatar_url LIKE '%' || name || '%'
    );
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "Users can upload their own profile pictures" ON storage.objects IS 'Allow users to upload profile pictures to their own folder';
COMMENT ON POLICY "Profile pictures are publicly viewable" ON storage.objects IS 'Profile pictures are public for display purposes';
COMMENT ON POLICY "Users can upload chat files" ON storage.objects IS 'Allow authenticated users to upload files in chat conversations';
COMMENT ON POLICY "Users can view chat files they have access to" ON storage.objects IS 'Users can only view files from their own conversations'; 