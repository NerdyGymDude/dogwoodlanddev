-- Allow unlimited contacts per client while ensuring that
-- no client can have more than one primary contact.

ALTER TABLE public.client_contacts
DROP CONSTRAINT IF EXISTS client_contacts_one_type_per_client;

CREATE UNIQUE INDEX client_contacts_one_primary_per_client
ON public.client_contacts (client_id)
WHERE contact_type = 'primary';