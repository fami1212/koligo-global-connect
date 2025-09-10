-- Créer une edge function pour désactiver automatiquement les trajets expirés
-- Puis programmer un cron job pour l'exécuter régulièrement

-- Activer les extensions nécessaires
SELECT cron.schedule(
  'deactivate-expired-trips',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$
  SELECT public.deactivate_expired_trips();
  $$
);