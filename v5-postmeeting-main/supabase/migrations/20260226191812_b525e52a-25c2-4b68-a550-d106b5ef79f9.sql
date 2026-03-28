
ALTER TABLE public.participantes
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS instagram,
  ADD COLUMN IF NOT EXISTS cedula text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS estatus text NOT NULL DEFAULT 'pending';
