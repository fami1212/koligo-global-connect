-- Add new fields to profiles for GP registration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS id_type TEXT,
ADD COLUMN IF NOT EXISTS id_validity_date DATE;

-- Add new fields to trips for enhanced trip information
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS last_deposit_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ticket_proof_url TEXT;

-- Create index on profiles for verification status
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles(is_verified);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.business_name IS 'Business name for GP/traveler accounts';
COMMENT ON COLUMN public.profiles.id_type IS 'Type of identity document (passport, national_id, driver_license)';
COMMENT ON COLUMN public.profiles.id_validity_date IS 'Validity date of the identity document';
COMMENT ON COLUMN public.trips.delivery_address IS 'Pickup address at destination country';
COMMENT ON COLUMN public.trips.last_deposit_date IS 'Last date for package deposit';
COMMENT ON COLUMN public.trips.ticket_proof_url IS 'URL to uploaded ticket proof document';