begin;

-- 1. Replace any legacy "admin" role in profiles with "super-admin".
update public.profiles
set role = 'super-admin'
where role = 'admin';

-- 2. Make every row in admins table a super-admin row.
update public.admins
set is_super_admin = true
where coalesce(is_super_admin, false) = false;

-- 3. Keep tables aligned: every profile marked as super-admin should have an admins row.
insert into public.admins (id, is_super_admin)
select p.id, true
from public.profiles p
left join public.admins a on a.id = p.id
where p.role = 'super-admin'
  and a.id is null;

commit;

-- Verification queries.
select role, count(*) as total
from public.profiles
group by role
order by role;

select is_super_admin, count(*) as total
from public.admins
group by is_super_admin
order by is_super_admin;
