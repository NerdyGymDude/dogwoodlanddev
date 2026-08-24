create table if not exists public.zoho_mailboxes (
    id uuid primary key default gen_random_uuid(),

    email_address text not null unique,
    display_name text not null,

    zoho_account_id text,

    refresh_token text,
    access_token text,
    access_token_expires_at timestamptz,

    scopes text[] not null default '{}',

    is_active boolean not null default true,
    connected_at timestamptz,
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

alter table public.zoho_mailboxes enable row level security;

revoke all on table public.zoho_mailboxes from anon;
revoke all on table public.zoho_mailboxes from authenticated;

insert into public.zoho_mailboxes (
    email_address,
    display_name
)
values
    ('branch@dogwoodlanddev.com', 'Branch'),
    ('office@dogwoodlanddev.com', 'Office'),
    ('accounting@dogwoodlanddev.com', 'Accounting'),
    ('permitting@dogwoodlanddev.com', 'Permitting')
on conflict (email_address) do nothing;
