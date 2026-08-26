-- Dogwood Land Development
-- Client short names, human-facing project numbers,
-- invoice identifiers, and invoice delivery state.

-- ============================================================
-- CLIENT SHORT NAMES
-- ============================================================

alter table public.clients
    add column short_name text;

update public.clients
set short_name = case name
    when 'BNTR Enterprises' then 'BNTR'
    when 'ABC test' then 'ABC'
    when 'Lewis Custom Homes' then 'LCH'
    else short_name
end;

alter table public.clients
    add constraint clients_short_name_not_blank
    check (
        short_name is null
        or length(trim(short_name)) > 0
    );

create unique index clients_short_name_unique_ci
    on public.clients (lower(trim(short_name)))
    where short_name is not null;


-- ============================================================
-- EXISTING PROJECT NUMBERS
-- ============================================================

update public.projects
set project_number = 'DLD-BNTR-001'
where id = '82346f78-9e22-4fba-9298-2880eaba7569';

update public.projects
set project_number = 'DLD-BNTR-002'
where id = '91ffa7be-f03b-4a38-9e7e-8d1615959cca';

create unique index projects_project_number_unique
    on public.projects (lower(project_number))
    where project_number is not null;


-- ============================================================
-- INVOICE IDENTIFIERS + DELIVERY STATE
-- ============================================================

alter table public.invoices
    add column invoice_identifier text,
    add column sent_at timestamptz;

update public.invoices
set invoice_identifier = 'DLD-BNTR-002'
where id = '996cc42a-0fb7-4e1b-9e80-c43a5321d04d';

create unique index invoices_invoice_identifier_unique
    on public.invoices (lower(invoice_identifier))
    where invoice_identifier is not null;
