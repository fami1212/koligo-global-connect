-- Create favorites table for users to save trips
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, trip_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites" 
ON public.favorites 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can create their own favorites
CREATE POLICY "Users can create own favorites" 
ON public.favorites 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites" 
ON public.favorites 
FOR DELETE 
USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_trip_id ON public.favorites(trip_id);