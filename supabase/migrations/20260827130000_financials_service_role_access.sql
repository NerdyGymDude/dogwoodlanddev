-- Dogwood Land Development
-- Trusted server access required by Project Financials.
--
-- service_role is the server-side Supabase role.
-- It is separate from human application roles such as super_user.

-- Read-only reference data needed by trusted financial endpoints.
grant select
on table public.projects
to service_role;

grant select
on table public.clients
to service_role;

grant select
on table public.client_contacts
to service_role;

-- Trusted financial endpoints need to read and maintain
-- the project's current financial tasks.
grant select, insert, update, delete
on table public.project_billing_tasks
to service_role;


-- Dogwood currently treats all four internal mail/login identities
-- as full active administrators.
update public.profiles
set
    role = 'super_user',
    is_active = true
where lower(email) in (
    'branch@dogwoodlanddev.com',
    'office@dogwoodlanddev.com',
    'accounting@dogwoodlanddev.com',
    'permitting@dogwoodlanddev.com'
);