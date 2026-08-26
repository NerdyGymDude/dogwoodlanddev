-- Dogwood Land Development
-- Invoice persistence foundation.

create table public.invoices (
    id uuid primary key default gen_random_uuid(),

    client_id uuid not null references public.clients(id) on delete restrict,
    project_id uuid references public.projects(id) on delete set null,

    subject text not null,

    invoice_date date not null,
    due_date date,

    status text not null default 'not_billed'
        check (
            status in (
                'not_billed',
                'billed_not_paid',
                'billed_partial_payment',
                'billed_paid'
            )
        ),

    amount numeric(14,2) not null default 0
        check (amount >= 0),

    amount_paid numeric(14,2) not null default 0
        check (amount_paid >= 0),

    recipient_contact_ids uuid[] not null default '{}',

    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    check (amount_paid <= amount)
);

create index invoices_client_id_idx
    on public.invoices (client_id);

create index invoices_project_id_idx
    on public.invoices (project_id);

create index invoices_status_idx
    on public.invoices (status);

create index invoices_due_date_idx
    on public.invoices (due_date);

alter table public.invoices enable row level security;

create policy "Active staff can read invoices"
    on public.invoices for select
    to authenticated
    using ((select public.is_active_staff()));

create policy "Active staff can create invoices"
    on public.invoices for insert
    to authenticated
    with check (
        (select public.is_active_staff())
        and (
            created_by is null
            or created_by = (select auth.uid())
        )
    );

create policy "Active staff can update invoices"
    on public.invoices for update
    to authenticated
    using ((select public.is_active_staff()))
    with check ((select public.is_active_staff()));

create policy "Active staff can delete invoices"
    on public.invoices for delete
    to authenticated
    using ((select public.is_active_staff()));

grant select, insert, update, delete
    on table public.invoices
    to authenticated;

create trigger invoices_set_updated_at
    before update on public.invoices
    for each row execute procedure public.set_updated_at();

comment on table public.invoices is
    'Dogwood client invoices and payment status records.';