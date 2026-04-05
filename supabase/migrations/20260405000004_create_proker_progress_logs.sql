    -- Multiple dated progress logs per proker
    CREATE TABLE IF NOT EXISTS public.proker_progress_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proker_id UUID NOT NULL REFERENCES public.prokers(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    progress INTEGER NOT NULL CHECK (progress IN (0, 25, 50, 75, 100)),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    ALTER TABLE public.proker_progress_logs ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Anyone can view progress logs" ON public.proker_progress_logs FOR SELECT USING (true);
    CREATE POLICY "Anyone can create progress logs" ON public.proker_progress_logs FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can update progress logs" ON public.proker_progress_logs FOR UPDATE USING (true);
    CREATE POLICY "Anyone can delete progress logs" ON public.proker_progress_logs FOR DELETE USING (true);

    CREATE INDEX IF NOT EXISTS idx_proker_progress_logs_proker_date
    ON public.proker_progress_logs (proker_id, log_date DESC, created_at DESC);
