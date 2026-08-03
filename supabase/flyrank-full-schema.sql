-- ============================================================================
-- CampaignHub Studio (FlyRank capstone) — complete database schema
-- Target: standalone Supabase project (run in SQL Editor as-is).
--
-- Idempotent by design: safe to run on a fresh project AND safe to re-run on
-- a project that already has an earlier version of this schema (it upgrades
-- in place — adds missing columns, recreates policies/triggers/functions).
--
-- Contents, in dependency order:
--   1. helper function      set_updated_at()
--   2. enums                platform, post_source, campaign_status, entry_status
--   3. tables + RLS         profiles, blog_posts, campaigns, social_post_entries,
--                           platform_credentials, publish_attempts, webhook_events
--   4. auth trigger         handle_new_user() → profiles row per sign-up
--   5. storage              private bucket `campaign-images` + owner-scoped policies
--   6. worker RPC           claim_due_entries() — lease/claim with SKIP LOCKED
-- ============================================================================


-- ============ 1. helper: updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


-- ============ 2. enums (create-if-missing) ============
DO $$ BEGIN
  CREATE TYPE public.platform AS ENUM ('instagram','x');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.post_source AS ENUM ('paste','markdown','pdf','docx','seed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.campaign_status AS ENUM ('draft','scheduled','publishing','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.entry_status AS ENUM ('queued','publishing','published','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============ 3a. profiles ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own profile" ON public.profiles;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============ 4. auth trigger: profile per new user ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============ 3b. blog_posts ============
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  source public.post_source NOT NULL DEFAULT 'paste',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_posts_user_created_idx ON public.blog_posts (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own blog posts" ON public.blog_posts;
CREATE POLICY "own blog posts" ON public.blog_posts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============ 3c. campaigns ============
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  brand_name TEXT,
  brand_tone TEXT,
  brand_language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Upgrade path for databases created from the pre-brand schema.
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS brand_name TEXT,
  ADD COLUMN IF NOT EXISTS brand_tone TEXT,
  ADD COLUMN IF NOT EXISTS brand_language TEXT;
CREATE INDEX IF NOT EXISTS campaigns_user_created_idx ON public.campaigns (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaigns_scheduled_idx ON public.campaigns (scheduled_for);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own campaigns" ON public.campaigns;
CREATE POLICY "own campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS campaigns_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============ 3d. social_post_entries ============
-- UNIQUE (campaign_id, platform) makes idempotency a database invariant:
-- the repository upserts on this key, and a replay can never insert a twin row.
CREATE TABLE IF NOT EXISTS public.social_post_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  platform public.platform NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  image_path TEXT,
  image_width INTEGER,
  image_height INTEGER,
  status public.entry_status NOT NULL DEFAULT 'queued',
  scheduled_for TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  remote_id TEXT,
  error TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_post_entries_campaign_platform_key UNIQUE (campaign_id, platform),
  CONSTRAINT social_post_entries_idempotency_key_key UNIQUE (idempotency_key)
);
CREATE INDEX IF NOT EXISTS social_post_entries_due_idx ON public.social_post_entries (status, scheduled_for);
CREATE INDEX IF NOT EXISTS social_post_entries_campaign_idx ON public.social_post_entries (campaign_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_post_entries TO authenticated;
GRANT ALL ON public.social_post_entries TO service_role;
ALTER TABLE public.social_post_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own entries" ON public.social_post_entries;
CREATE POLICY "own entries" ON public.social_post_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS social_post_entries_updated_at ON public.social_post_entries;
CREATE TRIGGER social_post_entries_updated_at BEFORE UPDATE ON public.social_post_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============ 3e. platform_credentials (ciphertext only — no plaintext column) ============
CREATE TABLE IF NOT EXISTS public.platform_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.platform NOT NULL,
  access_token_ciphertext TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_credentials_user_platform_key UNIQUE (user_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_credentials TO authenticated;
GRANT ALL ON public.platform_credentials TO service_role;
ALTER TABLE public.platform_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own credentials" ON public.platform_credentials;
CREATE POLICY "own credentials" ON public.platform_credentials FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS platform_credentials_updated_at ON public.platform_credentials;
CREATE TRIGGER platform_credentials_updated_at BEFORE UPDATE ON public.platform_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============ 3f. publish_attempts (append-only audit log) ============
CREATE TABLE IF NOT EXISTS public.publish_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.social_post_entries(id) ON DELETE CASCADE,
  attempt_no INTEGER NOT NULL,
  http_status INTEGER,
  retry_after_sec INTEGER,
  outcome TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS publish_attempts_entry_idx ON public.publish_attempts (entry_id, created_at DESC);
GRANT SELECT, INSERT ON public.publish_attempts TO authenticated;
GRANT ALL ON public.publish_attempts TO service_role;
ALTER TABLE public.publish_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own attempts read" ON public.publish_attempts;
CREATE POLICY "own attempts read" ON public.publish_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own attempts write" ON public.publish_attempts;
CREATE POLICY "own attempts write" ON public.publish_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- ============ 3g. webhook_events (server-written, client-readable) ============
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES public.social_post_entries(id) ON DELETE CASCADE,
  platform public.platform,
  signature_valid BOOLEAN NOT NULL,
  http_status INTEGER NOT NULL,
  payload_digest TEXT NOT NULL,
  message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_events_user_idx ON public.webhook_events (user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS webhook_events_entry_idx ON public.webhook_events (entry_id, received_at DESC);

-- Written exclusively by trusted server-side code (service role); make that
-- explicit at the privilege level so no API-facing role can ever write.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.webhook_events FROM authenticated;
REVOKE ALL ON public.webhook_events FROM anon;
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own webhook events" ON public.webhook_events;
CREATE POLICY "own webhook events" ON public.webhook_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

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


-- ============ 5. storage: private bucket for rendered PNG variants ============
-- The app uploads to campaign-images/{userId}/{campaignId}/{platform}.png and
-- reads through short-lived signed URLs (see src/infrastructure/storage/).
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-images', 'campaign-images', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "own campaign images read" ON storage.objects;
CREATE POLICY "own campaign images read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'campaign-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "own campaign images insert" ON storage.objects;
CREATE POLICY "own campaign images insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'campaign-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "own campaign images update" ON storage.objects;
CREATE POLICY "own campaign images update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'campaign-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "own campaign images delete" ON storage.objects;
CREATE POLICY "own campaign images delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'campaign-images' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ============ 6. worker RPC: lease/claim due entries ============
-- FOR UPDATE SKIP LOCKED means concurrent workers never double-claim a row;
-- an expired lease (crashed worker) makes the row claimable again, and the
-- deterministic idempotency key collapses the replay into one remote post.
--
-- Tenant scoping: the function is SECURITY DEFINER (bypasses RLS), so it
-- filters explicitly — an authenticated caller (in-app worker tick) claims
-- only their own entries; a service-role caller (cron/background worker,
-- auth.uid() IS NULL) claims across all tenants.
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


-- ============ 7. refresh PostgREST schema cache ============
-- Without this, the API can keep answering "Could not find the table ... in
-- the schema cache" for a while after the tables are created.
NOTIFY pgrst, 'reload schema';
