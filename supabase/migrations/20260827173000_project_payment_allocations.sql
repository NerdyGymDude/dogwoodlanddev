-- Dogwood Land Development
-- Add payment allocations so one payment can be applied
-- across one or more project financial tasks.
--
-- project_payments remains the source of actual money received.
-- project_payment_allocations records where that payment was applied.

create table public.project_payment_allocations (
    id uuid primary key default gen_random_uuid(),

    payment_id uuid not null
        references public.project_payments(id)
        on delete cascade,

    project_billing_task_id uuid not null
        references public.project_billing_tasks(id)
        on delete restrict,

    amount numeric(14,2) not null
        check (amount > 0),

    created_at timestamptz not null default now(),

    constraint project_payment_allocations_payment_task_unique
        unique (payment_id, project_billing_task_id)
);

create index project_payment_allocations_payment_idx
    on public.project_payment_allocations (payment_id);

create index project_payment_allocations_task_idx
    on public.project_payment_allocations (project_billing_task_id);

alter table public.project_payment_allocations
    enable row level security;

create policy "Active staff can read payment allocations"
    on public.project_payment_allocations
    for select
    to authenticated
    using ((select public.is_active_staff()));

grant select
    on table public.project_payment_allocations
    to authenticated;

grant select, insert, update, delete
    on table public.project_payment_allocations
    to service_role;

comment on table public.project_payment_allocations is
    'Task-level allocation of project payments. A single payment may be split across multiple financial tasks.';

comment on column public.project_payment_allocations.amount is
    'Portion of the payment applied to this financial task.';