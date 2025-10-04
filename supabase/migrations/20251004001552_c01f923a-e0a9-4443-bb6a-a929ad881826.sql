-- Fix migration: CREATE POLICY doesn't support IF NOT EXISTS; use DO blocks

-- 1) Storage policies for message-images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'public_read_message_images'
  ) THEN
    CREATE POLICY public_read_message_images
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'message-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'auth_upload_message_images'
  ) THEN
    CREATE POLICY auth_upload_message_images
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'message-images' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'owner_update_message_images'
  ) THEN
    CREATE POLICY owner_update_message_images
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'message-images' AND auth.uid() = owner);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'owner_delete_message_images'
  ) THEN
    CREATE POLICY owner_delete_message_images
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'message-images' AND auth.uid() = owner);
  END IF;
END $$;


-- 2) Reviews -> keep profiles.rating and profiles.total_reviews in sync
CREATE OR REPLACE FUNCTION public.refresh_profile_reviews()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target uuid;
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    target := NEW.reviewee_id;
  ELSE
    target := OLD.reviewee_id;
  END IF;

  UPDATE public.profiles p
  SET total_reviews = COALESCE(stats.cnt, 0),
      rating = COALESCE(ROUND(stats.avg_rating::numeric, 2), 0)
  FROM (
    SELECT reviewee_id, COUNT(*) AS cnt, AVG(rating)::float AS avg_rating
    FROM public.reviews
    WHERE reviewee_id = target
    GROUP BY reviewee_id
  ) stats
  WHERE p.user_id = target;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_profile_reviews_insert ON public.reviews;
DROP TRIGGER IF EXISTS trg_refresh_profile_reviews_update ON public.reviews;
DROP TRIGGER IF EXISTS trg_refresh_profile_reviews_delete ON public.reviews;

CREATE TRIGGER trg_refresh_profile_reviews_insert
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_profile_reviews();

CREATE TRIGGER trg_refresh_profile_reviews_update
AFTER UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_profile_reviews();

CREATE TRIGGER trg_refresh_profile_reviews_delete
AFTER DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_profile_reviews();


-- 3) Allow senders to delete their own shipments when the linked trip is past/complete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'shipments' AND policyname = 'senders_can_delete_past_shipments'
  ) THEN
    CREATE POLICY senders_can_delete_past_shipments
    ON public.shipments
    FOR DELETE
    TO authenticated
    USING (
      sender_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.trips t ON t.id = a.trip_id
        WHERE a.shipment_id = shipments.id
          AND (
            (t.arrival_date IS NOT NULL AND t.arrival_date < now())
            OR t.status = 'completed'
            OR t.is_active = false
          )
      )
    );
  END IF;
END $$;