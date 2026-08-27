-- Dogwood Land Development
-- Add task allocation and optional memo to project payments.
--
-- Paper checks are project-level payments that must now identify
-- the financial task they apply to.
--
-- This allocation is historical/reference data only.
-- It does NOT reduce billed_amount automatically.

alter table public.project_payments
    add column if not exists project_billing_task_id uuid
        references public.project_billing_tasks(id)
        on delete restrict;

alter table public.project_payments
    add column if not exists memo text;

create index if not exists project_payments_project_task_idx
    on public.project_payments (project_billing_task_id);

-- Paper checks must be tied to a task.
alter table public.project_payments
    drop constraint if exists project_payments_paper_check_fields_check;

alter table public.project_payments
    add constraint project_payments_paper_check_fields_check
    check (
        payment_method <> 'paper_check'
        or (
            check_number is not null
            and length(trim(check_number)) > 0
            and project_billing_task_id is not null
        )
    );

-- Ensure a selected task belongs to the same project as the payment.
create or replace function public.validate_project_payment_task()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.project_billing_task_id is null then
        return new;
    end if;

    if not exists (
        select 1
        from public.project_billing_tasks pbt
        where pbt.id = new.project_billing_task_id
          and pbt.project_id = new.project_id
    ) then
        raise exception 'Payment task must belong to the same project';
    end if;

    return new;
end;
$$;

drop trigger if exists validate_project_payment_task_trigger
    on public.project_payments;

create trigger validate_project_payment_task_trigger
before insert or update
on public.project_payments
for each row
execute function public.validate_project_payment_task();

comment on column public.project_payments.project_billing_task_id is
    'Financial task this payment applies to. Required for paper checks. Does not automatically change billed_amount.';

comment on column public.project_payments.memo is
    'Optional memo/reference note for the payment.';