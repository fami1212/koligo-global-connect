-- Update profiles table to add verification status
ALTER TABLE public.profiles 
ADD COLUMN is_verified boolean DEFAULT false,
ADD COLUMN verification_requested_at timestamp with time zone,
ADD COLUMN verification_approved_at timestamp with time zone,
ADD COLUMN verification_approved_by uuid;

-- Update trips table to add status management
ALTER TABLE public.trips 
ADD COLUMN status text DEFAULT 'scheduled',
ADD COLUMN departure_actual timestamp with time zone,
ADD COLUMN arrival_actual timestamp with time zone;

-- Create function to auto-update trip status based on dates
CREATE OR REPLACE FUNCTION public.update_trip_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark trips as expired if departure date has passed and status is still scheduled
  UPDATE public.trips 
  SET status = 'expired', is_active = false
  WHERE departure_date < now() 
    AND status = 'scheduled' 
    AND is_active = true;
    
  -- Mark trips as in_transit if departure_actual is set but arrival_actual is not
  UPDATE public.trips 
  SET status = 'in_transit'
  WHERE departure_actual IS NOT NULL 
    AND arrival_actual IS NULL 
    AND status != 'completed';
    
  -- Mark trips as completed if arrival_actual is set
  UPDATE public.trips 
  SET status = 'completed', is_active = false
  WHERE arrival_actual IS NOT NULL 
    AND status != 'completed';
END;
$$;

-- Create index for better search performance with verification priority
CREATE INDEX idx_profiles_verified ON public.profiles(is_verified DESC, created_at);
CREATE INDEX idx_trips_search ON public.trips(is_active, departure_city, arrival_city, departure_date, traveler_id);
CREATE INDEX idx_shipments_search ON public.shipments(status, pickup_city, delivery_city, created_at, sender_id);