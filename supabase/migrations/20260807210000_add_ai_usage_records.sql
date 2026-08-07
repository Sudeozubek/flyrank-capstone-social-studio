-- Persist AI spend per user so dashboard totals survive refresh / re-login.

CREATE TABLE IF NOT EXISTS public.ai_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_usd NUMERIC(14, 8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_records_user_created_idx
  ON public.ai_usage_records (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.ai_usage_records TO authenticated;
GRANT ALL ON public.ai_usage_records TO service_role;

ALTER TABLE public.ai_usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own ai usage read" ON public.ai_usage_records;
CREATE POLICY "own ai usage read" ON public.ai_usage_records
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own ai usage insert" ON public.ai_usage_records;
CREATE POLICY "own ai usage insert" ON public.ai_usage_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
