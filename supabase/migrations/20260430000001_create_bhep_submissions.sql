create table if not exists public.bhep_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_date date not null,
  link text not null,
  created_at timestamptz not null default now()
);
