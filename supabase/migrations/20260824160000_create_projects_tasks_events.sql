-- Dogwood Land Development
-- Stage core workflow:
-- Clients -> Projects -> Tasks / Calendar Events

create table public.projects (
	id uuid primary key default gen_random_uuid(),

	client_id uuid references public.clients(id) on delete set null,

	name text not null,
	project_number text,
	project_type text,

	status text not null default 'new'
		check (status in ('new', 'active', 'pending', 'completed', 'canceled', 'draft')),

	phase text not null default 'New',

	description text,
	notes text,

	address text,
	city text,
	state text,
	zip text,

	start_date date,
	target_completion_date date,

	budget numeric(14,2) not null default 0,

	assigned_to text,
	client_visible boolean not null default false,

	created_by uuid references auth.users(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.tasks (
	id uuid primary key default gen_random_uuid(),

	client_id uuid references public.clients(id) on delete set null,
	project_id uuid references public.projects(id) on delete cascade,

	title text not null,
	description text,
	notes text,

	due_date date,

	priority text not null default 'normal'
		check (priority in ('low', 'normal', 'high', 'urgent')),

	status text not null default 'new',

	assigned_to text,
	client_visible boolean not null default false,

	created_by uuid references auth.users(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.calendar_events (
	id uuid primary key default gen_random_uuid(),

	client_id uuid references public.clients(id) on delete set null,
	project_id uuid references public.projects(id) on delete cascade,

	title text not null,
	description text,
	notes text,

	event_type text,
	location text,

	start_date date not null,
	start_time time,
	end_date date,
	end_time time,

	status text not null default 'new',
	assigned_to text,

	client_visible boolean not null default false,

	created_by uuid references auth.users(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index projects_client_id_idx
	on public.projects (client_id);

create index projects_status_idx
	on public.projects (status);

create index tasks_project_id_idx
	on public.tasks (project_id);

create index tasks_client_id_idx
	on public.tasks (client_id);

create index tasks_due_date_idx
	on public.tasks (due_date);

create index calendar_events_project_id_idx
	on public.calendar_events (project_id);

create index calendar_events_client_id_idx
	on public.calendar_events (client_id);

create index calendar_events_start_date_idx
	on public.calendar_events (start_date);

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;

-- ============================================================
-- STAGE RLS
-- Any authenticated Stage user may manage Stage records.
-- ============================================================

create policy "Authenticated users can read projects"
	on public.projects for select
	to authenticated using (true);

create policy "Authenticated users can create projects"
	on public.projects for insert
	to authenticated
	with check (
		created_by is null
		or created_by = (select auth.uid())
	);

create policy "Authenticated users can update projects"
	on public.projects for update
	to authenticated
	using (true)
	with check (true);

create policy "Authenticated users can delete projects"
	on public.projects for delete
	to authenticated using (true);


create policy "Authenticated users can read tasks"
	on public.tasks for select
	to authenticated using (true);

create policy "Authenticated users can create tasks"
	on public.tasks for insert
	to authenticated
	with check (
		created_by is null
		or created_by = (select auth.uid())
	);

create policy "Authenticated users can update tasks"
	on public.tasks for update
	to authenticated
	using (true)
	with check (true);

create policy "Authenticated users can delete tasks"
	on public.tasks for delete
	to authenticated using (true);


create policy "Authenticated users can read calendar events"
	on public.calendar_events for select
	to authenticated using (true);

create policy "Authenticated users can create calendar events"
	on public.calendar_events for insert
	to authenticated
	with check (
		created_by is null
		or created_by = (select auth.uid())
	);

create policy "Authenticated users can update calendar events"
	on public.calendar_events for update
	to authenticated
	using (true)
	with check (true);

create policy "Authenticated users can delete calendar events"
	on public.calendar_events for delete
	to authenticated using (true);

-- PostgreSQL privileges required before RLS can be evaluated.

grant select, insert, update, delete
	on table public.projects
	to authenticated;

grant select, insert, update, delete
	on table public.tasks
	to authenticated;

grant select, insert, update, delete
	on table public.calendar_events
	to authenticated;

-- Reuse public.set_updated_at() from the initial profile migration.

create trigger projects_set_updated_at
	before update on public.projects
	for each row execute procedure public.set_updated_at();

create trigger tasks_set_updated_at
	before update on public.tasks
	for each row execute procedure public.set_updated_at();

create trigger calendar_events_set_updated_at
	before update on public.calendar_events
	for each row execute procedure public.set_updated_at();
