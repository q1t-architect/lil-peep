-- =============================================================================
-- Neighborly MVP — Storage Buckets & RLS Policies
-- Migration: 002_storage_buckets.sql
-- =============================================================================
-- Execute in: Supabase Dashboard → SQL Editor
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Drop existing policies (idempotent re-run)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "avatars_read_all"       ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload_own"     ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"     ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"     ON storage.objects;
DROP POLICY IF EXISTS "listing_photos_read_all"  ON storage.objects;
DROP POLICY IF EXISTS "listing_photos_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "listing_photos_update_own" ON storage.objects;
DROP POLICY IF EXISTS "listing_photos_delete_own" ON storage.objects;

-- ---------------------------------------------------------------------------
-- 1. Bucket: avatars (public, 2MB, jpeg/png/webp)
--    Path: {user_id}/avatar.{ext}
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public           = EXCLUDED.public,
  file_size_limit  = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Avatars: anyone can read
CREATE POLICY "avatars_read_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Avatars: only the owner can upload (first path segment = user_id)
CREATE POLICY "avatars_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars: only the owner can update
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars: only the owner can delete
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 2. Bucket: listing-photos (public, 5MB, jpeg/png/webp)
--    Path: {user_id}/{listing_id}/{index}.{ext}
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public           = EXCLUDED.public,
  file_size_limit  = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Listing photos: anyone can read
CREATE POLICY "listing_photos_read_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-photos');

-- Listing photos: only the owner can upload (first path segment = user_id)
CREATE POLICY "listing_photos_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Listing photos: only the owner can update
CREATE POLICY "listing_photos_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Listing photos: only the owner can delete
CREATE POLICY "listing_photos_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
