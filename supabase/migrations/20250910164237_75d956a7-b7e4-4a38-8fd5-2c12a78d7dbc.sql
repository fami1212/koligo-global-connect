-- Ajouter les nouveaux champs à la table trips pour l'adresse de collecte et l'heure limite
ALTER TABLE public.trips 
ADD COLUMN pickup_address TEXT,
ADD COLUMN pickup_time_limit TIME NOT NULL DEFAULT '18:00:00';

-- Fonction pour désactiver automatiquement les trajets expirés
CREATE OR REPLACE FUNCTION public.deactivate_expired_trips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Désactiver les trajets dont l'heure limite de récupération est dépassée
  UPDATE public.trips 
  SET is_active = false, status = 'expired'
  WHERE is_active = true 
    AND DATE(departure_date) = CURRENT_DATE 
    AND EXTRACT(HOUR FROM NOW()) > EXTRACT(HOUR FROM pickup_time_limit)
    AND EXTRACT(MINUTE FROM NOW()) > EXTRACT(MINUTE FROM pickup_time_limit);
    
  -- Désactiver les trajets dont la date de départ est passée
  UPDATE public.trips 
  SET is_active = false, status = 'expired'
  WHERE is_active = true 
    AND departure_date < NOW();
END;
$$;