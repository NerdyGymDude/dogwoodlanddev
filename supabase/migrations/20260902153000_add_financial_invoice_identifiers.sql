-- Add permanent invoice identifiers to the current financial_documents system.
--
-- Rules:
--   Invoice-DLD-{CLIENT_SHORT_NAME}-{###}
--   Sequence is per client across all projects.
--   Existing financial documents remain unchanged / NULL.
--   Receipts do not receive invoice identifiers.
--   Project numbering is not changed.
--   Numbers are allocated by PostgreSQL to avoid application-side race conditions.

ALTER TABLE public.financial_documents
ADD COLUMN IF NOT EXISTS invoice_identifier text;

-- Only populated invoice identifiers must be unique.
CREATE UNIQUE INDEX IF NOT EXISTS financial_documents_invoice_identifier_unique_ci
ON public.financial_documents (lower(invoice_identifier))
WHERE invoice_identifier IS NOT NULL;


-- Per-client counter.
--
-- This is intentionally separate from project numbering and allows invoice
-- numbers to continue increasing across every project belonging to a client.
CREATE TABLE IF NOT EXISTS public.client_invoice_sequences (
    client_id uuid PRIMARY KEY
        REFERENCES public.clients(id)
        ON DELETE CASCADE,

    last_number integer NOT NULL DEFAULT 0
        CHECK (last_number >= 0),

    updated_at timestamptz NOT NULL DEFAULT now()
);


-- Allocate the next permanent invoice identifier for a client.
--
-- Example:
--   Invoice-DLD-BNTR-001
--   Invoice-DLD-BNTR-002
--
-- Existing financial documents are NOT backfilled.
CREATE OR REPLACE FUNCTION public.next_financial_invoice_identifier(
    p_client_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_short_name text;
    v_next_number integer;
BEGIN
    SELECT upper(trim(c.short_name))
    INTO v_short_name
    FROM public.clients c
    WHERE c.id = p_client_id;

    IF v_short_name IS NULL OR v_short_name = '' THEN
        RAISE EXCEPTION
            'Client % must have a short_name before an invoice identifier can be generated.',
            p_client_id;
    END IF;

    INSERT INTO public.client_invoice_sequences (
        client_id,
        last_number,
        updated_at
    )
    VALUES (
        p_client_id,
        1,
        now()
    )
    ON CONFLICT (client_id)
    DO UPDATE
    SET
        last_number = public.client_invoice_sequences.last_number + 1,
        updated_at = now()
    RETURNING last_number
    INTO v_next_number;

    RETURN
        'Invoice-DLD-' ||
        v_short_name ||
        '-' ||
        lpad(v_next_number::text, 3, '0');
END;
$$;


COMMENT ON COLUMN public.financial_documents.invoice_identifier IS
'Permanent identifier for newly generated invoice documents. Existing documents remain NULL.';

COMMENT ON TABLE public.client_invoice_sequences IS
'Tracks the next per-client financial invoice sequence independently of project numbering.';

COMMENT ON FUNCTION public.next_financial_invoice_identifier(uuid) IS
'Atomically allocates the next Invoice-DLD-{CLIENT_SHORT_NAME}-{###} identifier for a client.';


-- Prevent accidental assignment of an invoice identifier to a receipt.
ALTER TABLE public.financial_documents
DROP CONSTRAINT IF EXISTS financial_documents_invoice_identifier_document_type_check;

ALTER TABLE public.financial_documents
ADD CONSTRAINT financial_documents_invoice_identifier_document_type_check
CHECK (
    invoice_identifier IS NULL
    OR document_type = 'invoice'
);
