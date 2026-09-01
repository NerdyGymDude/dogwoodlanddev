-- Dogwood Land Development
-- Allow full-invoice paper-check payments to remain unallocated.
--
-- Partial payments will still require a task in application/server logic.
-- Full payments that exactly equal the current project Amount Due may use
-- project_billing_task_id = null.
--
-- task_total values are never changed by this behavior.

alter table public.project_payments
    drop constraint if exists project_payments_paper_check_fields_check;

alter table public.project_payments
    add constraint project_payments_paper_check_fields_check
    check (
        payment_method <> 'paper_check'
        or (
            check_number is not null
            and length(trim(check_number)) > 0
        )
    );

comment on column public.project_payments.project_billing_task_id is
    'Optional task allocation. Required by application logic for partial payments. May be null for a full project payment that exactly equals the current Amount Due.';