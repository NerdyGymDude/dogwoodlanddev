-- Dogwood Land Development
-- Stage client and client-contact foundation.
--
-- Stage policy:
-- Any authenticated Dogwood user may manage Stage records.
-- Production authorization can be tightened later without changing
-- the underlying client/contact data model.

create type public.client_contact_type as enum (
	'primary',
	'secondary',
	'tertiary'
);

create table public.clients (
	id uuid primary key default gen_random_uuid(),

	name text not null,
	status text not null default 'new'
		check (status in ('new', 'active', 'pending', 'completed', 'canceled')),

	address text,
	city text,
	state text,
	zip text,

	notes text,

	created_by uuid references auth.users(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.client_contacts (
	id uuid primary key default gen_random_uuid(),

	client_id uuid not null
		references public.clients(id)
		on delete cascade,

	contact_type public.client_contact_type not null,

	name text,
	phone text,
	email text,

	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),

	constraint client_contacts_one_type_per_client
		unique (client_id, contact_type)
);

create index clients_name_idx
	on public.clients (name);

create index clients_status_idx
	on public.clients (status);

create index client_contacts_client_id_idx
	on public.client_contacts (client_id);

alter table public.clients enable row level security;
alter table public.client_contacts enable row level security;

-- ============================================================
-- STAGE RLS
-- ============================================================

create policy "Authenticated users can read clients"
	on public.clients
	for select
	to authenticated
	using (true);

create policy "Authenticated users can create clients"
	on public.clients
	for insert
	to authenticated
	with check (
		created_by is null
		or created_by = (select auth.uid())
	);

create policy "Authenticated users can update clients"
	on public.clients
	for update
	to authenticated
	using (true)
	with check (true);

create policy "Authenticated users can delete clients"
	on public.clients
	for delete
	to authenticated
	using (true);

create policy "Authenticated users can read client contacts"
	on public.client_contacts
	for select
	to authenticated
	using (true);

create policy "Authenticated users can create client contacts"
	on public.client_contacts
	for insert
	to authenticated
	with check (true);

create policy "Authenticated users can update client contacts"
	on public.client_contacts
	for update
	to authenticated
	using (true)
	with check (true);

create policy "Authenticated users can delete client contacts"
	on public.client_contacts
	for delete
	to authenticated
	using (true);

-- ============================================================
-- UPDATED_AT
-- Reuse public.set_updated_at() from the profiles migration.
-- ============================================================

create trigger clients_set_updated_at
	before update on public.clients
	for each row execute procedure public.set_updated_at();

create trigger client_contacts_set_updated_at
	before update on public.client_contacts
	for each row execute procedure public.set_updated_at();

comment on table public.clients is
	'Dogwood Stage client records.';

comment on table public.client_contacts is
	'Up to one primary, secondary, and tertiary contact per Dogwood client.';
