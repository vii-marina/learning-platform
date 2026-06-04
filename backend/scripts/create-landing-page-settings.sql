create table if not exists public.landing_page_settings (
  id text primary key default 'default',
  course_id uuid references public.courses(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint landing_page_settings_singleton check (id = 'default')
);

alter table public.landing_page_settings enable row level security;

drop policy if exists "Service role can manage landing settings" on public.landing_page_settings;
create policy "Service role can manage landing settings"
  on public.landing_page_settings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into public.landing_page_settings (id)
values ('default')
on conflict (id) do nothing;
