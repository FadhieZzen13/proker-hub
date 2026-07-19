-- F4: Task assignment to member accounts (cross-user notifications).
-- 1. Keep the free-text PIC (backwards compatible) and add a members[] array so a
--    task can be tied to actual PPI UPM member accounts (for notifications).
ALTER TABLE public.lapak_tasks
  ADD COLUMN IF NOT EXISTS members JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Task assignments table — one row per (task, member) so we can notify the
--    assigned member when a task is created/updated and let them see "my tasks".
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.lapak_tasks(id) ON DELETE CASCADE,
  proker_id UUID NOT NULL,
  member_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (task_id, member_id)
);

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view task_assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Anyone can insert task_assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Anyone can update task_assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Anyone can delete task_assignments" ON public.task_assignments;
CREATE POLICY "Anyone can view task_assignments" ON public.task_assignments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert task_assignments" ON public.task_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update task_assignments" ON public.task_assignments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete task_assignments" ON public.task_assignments FOR DELETE USING (true);
