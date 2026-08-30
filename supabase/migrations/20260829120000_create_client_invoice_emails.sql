create table public.client_invoice_emails (
	id uuid primary key default gen_random_uuid(),
	client_id uuid not null references public.clients(id) on delete cascade,
	email text not null,
	created_at timestamptz not null default now(),
	constraint client_invoice_emails_unique unique (client_id, email)
);

create index client_invoice_emails_client_id_idx
	on public.client_invoice_emails (client_id);

alter table public.client_invoice_emails enable row level security;

create policy "Active staff can read client invoice emails"
	on public.client_invoice_emails for select to authenticated
	using ((select public.is_active_staff()));

create policy "Active staff can create client invoice emails"
	on public.client_invoice_emails for insert to authenticated
	with check ((select public.is_active_staff()));

grant select, insert on table public.client_invoice_emails to authenticated;

comment on table public.client_invoice_emails is
	'Reusable third-party billing addresses saved from invoice sends.';
