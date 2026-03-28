
CREATE TABLE public.participantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT NOT NULL,
  instagram TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserts publicos en participantes" ON public.participantes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir lectura publica de participantes" ON public.participantes
  FOR SELECT USING (true);
