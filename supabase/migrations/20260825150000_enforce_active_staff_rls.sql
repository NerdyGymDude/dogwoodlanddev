-- Dogwood Land Development
-- Restrict business-wide Admin tables to active staff profiles.

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.profiles
		where id = (select auth.uid())
			and is_active = true
			and role in (
				'super_user'::public.app_role,
				'admin'::public.app_role,
				'accounting'::public.app_role,
				'user'::public.app_role
			)
	);
$$;

revoke all on function public.is_active_staff() from public;
grant execute on function public.is_active_staff() to authenticated, service_role;

drop policy if exists "Authenticated users can read clients" on public.clients;
drop policy if exists "Authenticated users can create clients" on public.clients;
drop policy if exists "Authenticated users can update clients" on public.clients;
drop policy if exists "Authenticated users can delete clients" on public.clients;

create policy "Active staff can read clients" on public.clients for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can create clients" on public.clients for insert to authenticated with check ((select public.is_active_staff()) and (created_by is null or created_by = (select auth.uid())));
create policy "Active staff can update clients" on public.clients for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()));
create policy "Active staff can delete clients" on public.clients for delete to authenticated using ((select public.is_active_staff()));

drop policy if exists "Authenticated users can read client contacts" on public.client_contacts;
drop policy if exists "Authenticated users can create client contacts" on public.client_contacts;
drop policy if exists "Authenticated users can update client contacts" on public.client_contacts;
drop policy if exists "Authenticated users can delete client contacts" on public.client_contacts;

create policy "Active staff can read client contacts" on public.client_contacts for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can create client contacts" on public.client_contacts for insert to authenticated with check ((select public.is_active_staff()));
create policy "Active staff can update client contacts" on public.client_contacts for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()));
create policy "Active staff can delete client contacts" on public.client_contacts for delete to authenticated using ((select public.is_active_staff()));

drop policy if exists "Authenticated users can read projects" on public.projects;
drop policy if exists "Authenticated users can create projects" on public.projects;
drop policy if exists "Authenticated users can update projects" on public.projects;
drop policy if exists "Authenticated users can delete projects" on public.projects;

create policy "Active staff can read projects" on public.projects for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can create projects" on public.projects for insert to authenticated with check ((select public.is_active_staff()) and (created_by is null or created_by = (select auth.uid())));
create policy "Active staff can update projects" on public.projects for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()));
create policy "Active staff can delete projects" on public.projects for delete to authenticated using ((select public.is_active_staff()));

drop policy if exists "Authenticated users can read tasks" on public.tasks;
drop policy if exists "Authenticated users can create tasks" on public.tasks;
drop policy if exists "Authenticated users can update tasks" on public.tasks;
drop policy if exists "Authenticated users can delete tasks" on public.tasks;

create policy "Active staff can read tasks" on public.tasks for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can create tasks" on public.tasks for insert to authenticated with check ((select public.is_active_staff()) and (created_by is null or created_by = (select auth.uid())));
create policy "Active staff can update tasks" on public.tasks for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()));
create policy "Active staff can delete tasks" on public.tasks for delete to authenticated using ((select public.is_active_staff()));

drop policy if exists "Authenticated users can read calendar events" on public.calendar_events;
drop policy if exists "Authenticated users can create calendar events" on public.calendar_events;
drop policy if exists "Authenticated users can update calendar events" on public.calendar_events;
drop policy if exists "Authenticated users can delete calendar events" on public.calendar_events;

create policy "Active staff can read calendar events" on public.calendar_events for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can create calendar events" on public.calendar_events for insert to authenticated with check ((select public.is_active_staff()) and (created_by is null or created_by = (select auth.uid())));
create policy "Active staff can update calendar events" on public.calendar_events for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()));
create policy "Active staff can delete calendar events" on public.calendar_events for delete to authenticated using ((select public.is_active_staff()));

comment on function public.is_active_staff() is 'True when the current authenticated user has an active Dogwood staff profile.';
