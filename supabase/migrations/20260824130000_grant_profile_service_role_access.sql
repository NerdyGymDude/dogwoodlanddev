-- Dogwood Land Development
-- Allow trusted server-side provisioning code using the Supabase
-- service/secret role to manage application profiles.

grant select, insert, update
	on table public.profiles
	to service_role;
