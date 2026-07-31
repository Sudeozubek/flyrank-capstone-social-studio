-- FlyRank — tüm şema (kendi Supabase projenizde SQL Editor'de çalıştırın)

-- ===== supabase/migrations/20260731173239_b02adb5b-085a-4655-9bdc-0ba694236182.sql =====
-- ============ helper: updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ enums ============
CREATE TYPE public.platform AS ENUM ('instagram','x');
CREATE TYPE public.post_source AS ENUM ('paste','markdown','pdf','docx','seed');
CREATE TYPE public.campaign_status AS ENUM ('draft','scheduled','publishing','completed','failed');
CREATE TYPE public.entry_status AS ENUM ('queued','publishing','published','failed');

-- ============ profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ blog_posts ============
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  source public.post_source NOT NULL DEFAULT 'paste',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX blog_posts_user_created_idx ON public.blog_posts (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own blog posts" ON public.blog_posts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ campaigns ============
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX campaigns_user_created_idx ON public.campaigns (user_id, created_at DESC);
CREATE INDEX campaigns_scheduled_idx ON public.campaigns (scheduled_for);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ social_post_entries ============
CREATE TABLE public.social_post_entries (
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
CREATE INDEX social_post_entries_due_idx ON public.social_post_entries (status, scheduled_for);
CREATE INDEX social_post_entries_campaign_idx ON public.social_post_entries (campaign_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_post_entries TO authenticated;
GRANT ALL ON public.social_post_entries TO service_role;
ALTER TABLE public.social_post_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entries" ON public.social_post_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER social_post_entries_updated_at BEFORE UPDATE ON public.social_post_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ platform_credentials (ciphertext only) ============
CREATE TABLE public.platform_credentials (
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
CREATE POLICY "own credentials" ON public.platform_credentials FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER platform_credentials_updated_at BEFORE UPDATE ON public.platform_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ publish_attempts ============
CREATE TABLE public.publish_attempts (
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
CREATE INDEX publish_attempts_entry_idx ON public.publish_attempts (entry_id, created_at DESC);
GRANT SELECT, INSERT ON public.publish_attempts TO authenticated;
GRANT ALL ON public.publish_attempts TO service_role;
ALTER TABLE public.publish_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts read" ON public.publish_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "own attempts write" ON public.publish_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ webhook_events ============
CREATE TABLE public.webhook_events (
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
CREATE INDEX webhook_events_user_idx ON public.webhook_events (user_id, received_at DESC);
CREATE INDEX webhook_events_entry_idx ON public.webhook_events (entry_id, received_at DESC);
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own webhook events" ON public.webhook_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- ===== supabase/migrations/20260731173247_d74c470b-fa3a-41b4-9a51-eed7b1d8bcb1.sql =====
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- ===== supabase/migrations/20260731173325_fc377cd1-6534-40fe-b68b-faeaf2de4918.sql =====
CREATE POLICY "own campaign images read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'campaign-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own campaign images insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'campaign-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own campaign images update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'campaign-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own campaign images delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'campaign-images' AND (storage.foldername(name))[1] = auth.uid()::text);
-- ===== supabase/migrations/20260731173353_f8c7df54-03ea-45b6-b273-695fed1358d1.sql =====
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
