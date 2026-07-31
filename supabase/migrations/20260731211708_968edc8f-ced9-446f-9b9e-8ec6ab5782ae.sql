-- Webhook events are written exclusively by trusted server-side code (service role).
-- Make that explicit at the privilege level so no API-facing role can write.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.webhook_events FROM authenticated;
REVOKE ALL ON public.webhook_events FROM anon;
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events FORCE ROW LEVEL SECURITY;

-- Explicit deny policies so intent is documented and any future grant cannot open writes.
DROP POLICY IF EXISTS "no client inserts" ON public.webhook_events;
CREATE POLICY "no client inserts" ON public.webhook_events
  FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS "no client updates" ON public.webhook_events;
CREATE POLICY "no client updates" ON public.webhook_events
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no client deletes" ON public.webhook_events;
CREATE POLICY "no client deletes" ON public.webhook_events
  FOR DELETE TO authenticated, anon USING (false);