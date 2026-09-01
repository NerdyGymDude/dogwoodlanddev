-- Dogwood Land Development
-- Phase 1 project task-based invoicing.

alter table public.invoices drop constraint invoices_status_check;
alter table public.invoices add constraint invoices_status_check check (status in (
    'draft', 'not_billed', 'billed_not_paid', 'billed_partial_payment',
    'billed_paid', 'updated_resend_required'
));
alter table public.invoices alter column status set default 'draft';

create table public.project_billing_tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    description text not null check (length(trim(description)) > 0),
    task_total numeric(14,2) not null check (task_total > 0),
    display_order integer not null default 0 check (display_order >= 0),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.invoice_task_lines (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    project_billing_task_id uuid references public.project_billing_tasks(id) on delete set null,
    included boolean not null default false,
    description text not null check (length(trim(description)) > 0),
    task_total numeric(14,2) not null check (task_total > 0),
    previously_billed_percentage numeric(7,4) not null default 0 check (previously_billed_percentage between 0 and 100),
    bill_now_percentage numeric(7,4) not null default 0 check (bill_now_percentage between 0 and 100),
    current_due numeric(14,2) not null default 0 check (current_due >= 0),
    display_order integer not null default 0 check (display_order >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (invoice_id, project_billing_task_id),
    check (previously_billed_percentage + bill_now_percentage <= 100),
    check ((included and bill_now_percentage > 0 and current_due = round(task_total * bill_now_percentage / 100, 2))
        or (not included and bill_now_percentage = 0 and current_due = 0))
);

create index project_billing_tasks_project_order_idx on public.project_billing_tasks (project_id, display_order);
create index invoice_task_lines_invoice_order_idx on public.invoice_task_lines (invoice_id, display_order);
create index invoice_task_lines_project_task_idx on public.invoice_task_lines (project_billing_task_id);

alter table public.project_billing_tasks enable row level security;
alter table public.invoice_task_lines enable row level security;

create policy "Active staff can read project billing tasks" on public.project_billing_tasks for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can create project billing tasks" on public.project_billing_tasks for insert to authenticated with check ((select public.is_active_staff()) and (created_by is null or created_by = (select auth.uid())));
create policy "Active staff can update project billing tasks" on public.project_billing_tasks for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()));
create policy "Active staff can delete project billing tasks" on public.project_billing_tasks for delete to authenticated using ((select public.is_active_staff()));
create policy "Active staff can read invoice task lines" on public.invoice_task_lines for select to authenticated using ((select public.is_active_staff()));
create policy "Active staff can create invoice task lines" on public.invoice_task_lines for insert to authenticated with check ((select public.is_active_staff()));
create policy "Active staff can update invoice task lines" on public.invoice_task_lines for update to authenticated using ((select public.is_active_staff())) with check ((select public.is_active_staff()));
create policy "Active staff can delete invoice task lines" on public.invoice_task_lines for delete to authenticated using ((select public.is_active_staff()));

grant select, insert, update, delete on public.project_billing_tasks, public.invoice_task_lines to authenticated;
create trigger project_billing_tasks_set_updated_at before update on public.project_billing_tasks for each row execute procedure public.set_updated_at();
create trigger invoice_task_lines_set_updated_at before update on public.invoice_task_lines for each row execute procedure public.set_updated_at();

comment on table public.project_billing_tasks is 'Reusable billing scope and contract totals belonging to a project.';
comment on table public.invoice_task_lines is 'Invoice snapshots of project billing tasks and percentage calculations.';
