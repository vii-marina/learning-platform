begin;

alter table public.lessons
  add column if not exists is_locked boolean;

update public.lessons
set is_locked = false
where is_locked is null;

alter table public.lessons
  alter column is_locked set default false;

alter table public.lessons
  alter column is_locked set not null;

comment on column public.lessons.is_locked is
  'Legacy compatibility column kept for older publish triggers. The current app does not use this field directly.';

commit;
