-- Fix: Make proof-photos bucket public so URLs work
UPDATE storage.buckets SET public = true WHERE id = 'proof-photos';

-- Add storage policy for proof-photos bucket if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Travelers can upload proof photos'
  ) THEN
    CREATE POLICY "Travelers can upload proof photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'proof-photos' AND auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view proof photos'
  ) THEN
    CREATE POLICY "Anyone can view proof photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'proof-photos');
  END IF;
END $$;