CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('nfl-sync') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nfl-sync');

SELECT cron.schedule(
  'nfl-sync',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--383ed09b-f9ad-498a-a5e6-dead0317428d-dev.lovable.app/api/public/nfl-sync',
    headers := '{"Content-Type": "application/json", "x-sync-secret": "d2bfee412c1389302ca6a7dcd72bb16895124bd85c7a00aa"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);