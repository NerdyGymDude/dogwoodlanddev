-- Dogwood Land Development
-- Stage privileges for authenticated users.
--
-- RLS policies control which rows authenticated users may access.
-- These grants allow the authenticated Postgres role to reach
-- the tables so those RLS policies can actually be evaluated.

grant select, insert, update, delete
	on table public.clients
	to authenticated;

grant select, insert, update, delete
	on table public.client_contacts
	to authenticated;

grant usage
	on type public.client_contact_type
	to authenticated;
