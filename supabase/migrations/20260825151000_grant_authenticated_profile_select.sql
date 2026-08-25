-- Dogwood Land Development
-- Allow authenticated users to SELECT from profiles.
-- Existing RLS still restricts users to their own profile row.

grant select
    on table public.profiles
    to authenticated;
