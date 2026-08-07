-- Add LinkedIn as a supported publishing platform (idempotent).

DO $$ BEGIN
  ALTER TYPE public.platform ADD VALUE 'linkedin';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
