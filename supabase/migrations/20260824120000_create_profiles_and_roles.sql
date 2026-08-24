-- Dogwood Land Development
-- Initial application user profiles and roles.
--
-- Supabase Auth remains responsible for authentication.
-- public.profiles stores Dogwood-specific user information and authorization role.

create type public.app_role as enum (
	'super_user',
	'admin',
	'accounting',
	'user',
	'client'
);

create table public.profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	email text not null,
	full_name text,
	role public.app_role not null default 'client',
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index profiles_email_lower_idx
	on public.profiles (lower(email));

alter table public.profiles enable row level security;

-- Users may read their own profile.
create policy "Users can read own profile"
	on public.profiles
	for select
	to authenticated
	using ((select auth.uid()) = id);

-- Create a Dogwood profile whenever a Supabase Auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	insert into public.profiles (
		id,
		email,
		full_name
	)
	values (
		new.id,
		coalesce(new.email, ''),
		coalesce(
			new.raw_user_meta_data ->> 'full_name',
			new.raw_user_meta_data ->> 'name'
		)
	);

	return new;
end;
$$;

create trigger on_auth_user_created
	after insert on auth.users
	for each row execute procedure public.handle_new_user();

-- Keep updated_at accurate.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create trigger profiles_set_updated_at
	before update on public.profiles
	for each row execute procedure public.set_updated_at();

comment on table public.profiles is
	'Dogwood application profiles linked one-to-one with Supabase Auth users.';

comment on column public.profiles.role is
	'Application authorization role. New users default to client and must be explicitly elevated.';
