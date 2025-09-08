-- Fix security issue: Set search_path for the existing function
CREATE OR REPLACE FUNCTION public.update_trip_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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