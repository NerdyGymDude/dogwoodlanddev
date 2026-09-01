-- Dogwood Land Development
-- Project Financials backend foundation.
--
-- Project is the financial source of truth.
--
-- Current project totals are DERIVED:
--   Total Project Invoice = SUM(project_billing_tasks.task_total)
--   Amount Paid to Date   = SUM(project_payments.amount)
--   Amount Due            = SUM(project_billing_tasks.billed_amount)
--
-- Amount Paid to Date does NOT reduce Amount Due.
--
-- Existing invoices / invoice_task_lines remain untouched for
-- backward compatibility until application code is migrated.

alter table public.project_billing_tasks
    drop constraint if exists project_billing_tasks_task_total_check;

alter table public.project_billing_tasks
    add constraint project_billing_tasks_task_total_check
    check (task_total >= 0);

alter table public.project_billing_tasks
    add column if not exists billed_amount numeric(14,2)
    not null
    default 0;

alter table public.project_billing_tasks
    add constraint project_billing_tasks_billed_amount_check
    check (
        billed_amount >= 0
        and billed_amount <= task_total
    );

comment on column public.project_billing_tasks.task_total is
    'Full current value of the financial task. Displayed in the application as Amount.';

comment on column public.project_billing_tasks.billed_amount is
    'Current dollar amount Branch wants billed for this task. Amount Due is the sum of current billed_amount values and does not subtract payments.';

create table public.project_payments (
    id uuid primary key default gen_random_uuid(),

    project_id uuid not null
        references public.projects(id)
        on delete restrict,

    payment_method text not null
        check (
            payment_method in (
                'stripe',
                'paper_check'
            )
        ),

    amount numeric(14,2) not null
        check (amount > 0),

    currency text not null default 'usd'
        check (currency = 'usd'),

    payment_date date not null,

    stripe_completed_at timestamptz,

    stripe_payment_intent_id text,
    stripe_checkout_session_id text,
    stripe_charge_id text,
    stripe_event_id text,

    check_number text,
    check_file_path text,

    created_by uuid
        references auth.users(id)
        on delete set null,

    created_at timestamptz not null default now(),

    constraint project_payments_paper_check_fields_check
        check (
            payment_method <> 'paper_check'
            or (
                check_number is not null
                and length(trim(check_number)) > 0
            )
        ),

    constraint project_payments_check_file_method_check
        check (
            check_file_path is null
            or payment_method = 'paper_check'
        ),

    constraint project_payments_stripe_completed_method_check
        check (
            stripe_completed_at is null
            or payment_method = 'stripe'
        )
);

create index project_payments_project_date_idx
    on public.project_payments (
        project_id,
        payment_date desc
    );

create unique index project_payments_stripe_payment_intent_unique
    on public.project_payments (stripe_payment_intent_id)
    where stripe_payment_intent_id is not null;

create unique index project_payments_stripe_checkout_session_unique
    on public.project_payments (stripe_checkout_session_id)
    where stripe_checkout_session_id is not null;

create unique index project_payments_stripe_charge_unique
    on public.project_payments (stripe_charge_id)
    where stripe_charge_id is not null;

create unique index project_payments_stripe_event_unique
    on public.project_payments (stripe_event_id)
    where stripe_event_id is not null;

alter table public.project_payments
    enable row level security;

create policy "Active staff can read project payments"
    on public.project_payments
    for select
    to authenticated
    using ((select public.is_active_staff()));

create policy "Active staff can create paper check payments"
    on public.project_payments
    for insert
    to authenticated
    with check (
        (select public.is_active_staff())
        and payment_method = 'paper_check'
        and (
            created_by is null
            or created_by = (select auth.uid())
        )
    );

create policy "Active staff can update paper check payments"
    on public.project_payments
    for update
    to authenticated
    using (
        (select public.is_active_staff())
        and payment_method = 'paper_check'
    )
    with check (
        (select public.is_active_staff())
        and payment_method = 'paper_check'
    );

grant select, insert, update
    on table public.project_payments
    to authenticated;

grant select, insert, update, delete
    on table public.project_payments
    to service_role;

create table public.financial_documents (
    id uuid primary key default gen_random_uuid(),

    project_id uuid not null
        references public.projects(id)
        on delete restrict,

    document_type text not null
        check (
            document_type in (
                'invoice',
                'receipt'
            )
        ),

    total_project_invoice numeric(14,2) not null
        check (total_project_invoice >= 0),

    amount_paid_to_date numeric(14,2) not null
        check (amount_paid_to_date >= 0),

    amount_due numeric(14,2) not null
        check (
            amount_due >= 0
            and amount_due <= total_project_invoice
        ),

    recipient_contact_ids uuid[] not null default '{}',

    pdf_storage_path text,

    source_payment_id uuid
        references public.project_payments(id)
        on delete restrict,

    created_by uuid
        references auth.users(id)
        on delete set null,

    created_at timestamptz not null default now(),
    sent_at timestamptz,

    constraint financial_documents_source_payment_check
        check (
            (
                document_type = 'invoice'
                and source_payment_id is null
            )
            or
            (
                document_type = 'receipt'
                and source_payment_id is not null
            )
        )
);

create index financial_documents_project_created_idx
    on public.financial_documents (
        project_id,
        created_at desc
    );

create index financial_documents_source_payment_idx
    on public.financial_documents (source_payment_id)
    where source_payment_id is not null;

create unique index financial_documents_one_receipt_per_payment_idx
    on public.financial_documents (source_payment_id)
    where
        document_type = 'receipt'
        and source_payment_id is not null;

alter table public.financial_documents
    enable row level security;

create policy "Active staff can read financial documents"
    on public.financial_documents
    for select
    to authenticated
    using ((select public.is_active_staff()));

grant select
    on table public.financial_documents
    to authenticated;

grant select, insert, update, delete
    on table public.financial_documents
    to service_role;

create table public.financial_document_lines (
    id uuid primary key default gen_random_uuid(),

    financial_document_id uuid not null
        references public.financial_documents(id)
        on delete cascade,

    project_billing_task_id uuid
        references public.project_billing_tasks(id)
        on delete set null,

    description text not null
        check (length(trim(description)) > 0),

    task_total numeric(14,2) not null
        check (task_total >= 0),

    billed_amount numeric(14,2) not null
        check (
            billed_amount >= 0
            and billed_amount <= task_total
        ),

    display_order integer not null default 0
        check (display_order >= 0),

    created_at timestamptz not null default now()
);

create index financial_document_lines_document_order_idx
    on public.financial_document_lines (
        financial_document_id,
        display_order
    );

create index financial_document_lines_project_task_idx
    on public.financial_document_lines (
        project_billing_task_id
    );

alter table public.financial_document_lines
    enable row level security;

create policy "Active staff can read financial document lines"
    on public.financial_document_lines
    for select
    to authenticated
    using ((select public.is_active_staff()));

grant select
    on table public.financial_document_lines
    to authenticated;

grant select, insert, update, delete
    on table public.financial_document_lines
    to service_role;
