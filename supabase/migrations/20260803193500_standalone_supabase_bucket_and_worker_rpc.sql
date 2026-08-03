-- Standalone Supabase migration (post Lovable Cloud).
--
-- 1. Create the private `campaign-images` storage bucket. Lovable Cloud
--    provisioned this automatically; a standalone project must create it
--    explicitly or every image upload fails with "Bucket not found".
--
-- 2. Fix claim_due_entries permissions + tenant scoping. The in-app worker
--    tick (src/lib/flyrank.functions.ts → tickWorker) calls this RPC with the
--    authenticated user's client, so `authenticated` needs EXECUTE. Because
--    the function is SECURITY DEFINER (bypasses RLS), it now filters by
--    auth.uid() so a signed-in caller can only claim their own entries;
--    service-role callers (auth.uid() IS NULL) still claim across tenants.

-- ============ 1. storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-images', 'campaign-images', false)
ON CONFLICT (id) DO NOTHING;

-- ============ 2. worker RPC ============
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
      WHERE (auth.uid() IS NULL OR c.user_id = auth.uid())
        AND c.scheduled_for IS NOT NULL
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

REVOKE EXECUTE ON FUNCTION public.claim_due_entries(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_due_entries(integer, integer) TO authenticated, service_role;
