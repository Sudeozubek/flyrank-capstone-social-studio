-- Campaign output language (captions + image briefs). Null => English in application code.
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS brand_language text;
