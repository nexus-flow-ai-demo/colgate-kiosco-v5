-- Create p3_demo_participantes table
CREATE TABLE IF NOT EXISTS public.p3_demo_participantes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  cedula text NOT NULL DEFAULT ''::text,
  telefono text NOT NULL,
  estatus text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p3_demo_participantes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Permitir inserts publicos" ON public.p3_demo_participantes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura publica" ON public.p3_demo_participantes FOR SELECT USING (true);
CREATE POLICY "Permitir updates publicos" ON public.p3_demo_participantes FOR UPDATE USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.p3_demo_participantes;