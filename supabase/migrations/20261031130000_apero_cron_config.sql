-- Al toegepast op 31 okt 2026 (via MCP), hier vastgelegd.
insert into apero_app_config(key,value) values
  ('ADMIN_KEY_FRANK', encode(extensions.gen_random_bytes(24),'hex')),
  ('TICKET_ACCENT','#C45F38'),('TICKET_INK','#231B13'),('TICKET_BG','#F4EAD6')
on conflict (key) do nothing;
-- RESEND_API_KEY is uit app_config (NvdW) gekopieerd; MOLLIE_API_KEY komt uit de
-- omgeving van het project (gedeeld met NvdW). Eigen sleutels: zet ze in apero_app_config.

select cron.schedule('apero-cleanup-expired','*/10 * * * *', $$select net.http_post(url := 'https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/apero/cleanup-expired', headers := jsonb_build_object('Content-Type','application/json','x-internal-key',(select value from apero_app_config where key='INTERNAL_KEY')), body := '{}'::jsonb);$$);
select cron.schedule('apero-daily-backup','15 3 * * *', $$select net.http_post(url := 'https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/apero/backup', headers := jsonb_build_object('Content-Type','application/json','x-internal-key',(select value from apero_app_config where key='INTERNAL_KEY')), body := '{}'::jsonb);$$);
