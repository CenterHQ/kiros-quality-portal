-- ============================================
-- MARKETING MEDIA STORAGE BUCKET
-- ============================================

-- Create the marketing-media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-media',
  'marketing-media',
  true,  -- Public so Meta/Instagram can access media URLs for publishing
  52428800,  -- 50MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: marketing roles can upload/read, public can read (needed for Instagram publishing)
CREATE POLICY "marketing_media_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'marketing-media'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns')
  );

CREATE POLICY "marketing_media_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'marketing-media');

CREATE POLICY "marketing_media_public_read" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'marketing-media');

CREATE POLICY "marketing_media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'marketing-media'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns')
  );
