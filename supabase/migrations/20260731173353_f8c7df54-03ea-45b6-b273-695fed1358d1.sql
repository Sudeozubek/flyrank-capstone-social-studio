CREATE OR REPLACE FUNCTION public.claim_due_entries(p_limit integer DEFAULT 5, p_lease_seconds integer DEFAULT 120)
RETURNS SETOF public.social_post_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.social_post_entries e
     SET status = 'publishing',
         lease_until = now() + make_interval(secs => p_lease_seconds),
         attempts = e.attempts + 1,
         updated_at = now()
   WHERE e.id IN (
     SELECT c.id FROM public.social_post_entries c
      WHERE c.scheduled_for IS NOT NULL
        AND c.scheduled_for <= now()
        AND (c.next_attempt_at IS NULL OR c.next_attempt_at <= now())
        AND (
          c.status = 'queued'
          OR (c.status = 'publishing' AND c.lease_until IS NOT NULL AND c.lease_until < now())
        )
      ORDER BY c.scheduled_for
      FOR UPDATE SKIP LOCKED
      LIMIT p_limit
   )
   RETURNING e.*;
END; $$;

REVOKE EXECUTE ON FUNCTION public.claim_due_entries(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_entries(integer, integer) TO service_role;