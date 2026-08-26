import type { SupabaseClient } from '@supabase/supabase-js';

import type { InvoiceFormData, InvoiceStatus } from '$lib/admin/forms/types';

export interface AdminInvoiceRecord {
    id: string;
    clientId: string;
    projectId: string;
    subject: string;
    date: string;
    dueDate: string;
    status: InvoiceStatus;
    amount: number;
    amountPaid: number;
    recipientContactIds: string[];
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

const statusToDatabase: Record<InvoiceStatus, string> = {
    'Not Billed': 'not_billed',
    'Billed - Not Paid': 'billed_not_paid',
    'Billed - Partial Payment': 'billed_partial_payment',
    'Billed - Paid': 'billed_paid'
};

const statusFromDatabase: Record<string, InvoiceStatus> = {
    not_billed: 'Not Billed',
    billed_not_paid: 'Billed - Not Paid',
    billed_partial_payment: 'Billed - Partial Payment',
    billed_paid: 'Billed - Paid'
};

function validUuid(value: string | undefined | null) {
    return Boolean(
        value &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                value
            )
    );
}

function parseAmount(value: string) {
    const amount = Number(value.replace(/[$,]/g, ''));

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Invoice amount must be greater than zero.');
    }

    return amount;
}

function mapInvoice(row: any): AdminInvoiceRecord {
    return {
        id: row.id,
        clientId: row.client_id ?? '',
        projectId: row.project_id ?? '',
        subject: row.subject ?? '',
        date: row.invoice_date ?? '',
        dueDate: row.due_date ?? '',
        status: statusFromDatabase[row.status] ?? 'Not Billed',
        amount: Number(row.amount ?? 0),
        amountPaid: Number(row.amount_paid ?? 0),
        recipientContactIds: Array.isArray(row.recipient_contact_ids)
            ? row.recipient_contact_ids
            : [],
        createdBy: row.created_by ?? '',
        createdAt: row.created_at ?? '',
        updatedAt: row.updated_at ?? ''
    };
}

export async function getInvoices(supabase: SupabaseClient) {
    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map(mapInvoice);
}

export async function createInvoice(
    supabase: SupabaseClient,
    userId: string,
    form: InvoiceFormData
) {
    if (!validUuid(form.clientId)) {
        throw new Error('A valid client is required.');
    }

    if (!validUuid(form.projectId)) {
        throw new Error('A valid project is required.');
    }

    const subject = form.subject.trim();

    if (!subject) {
        throw new Error('Invoice subject is required.');
    }

    if (!form.date) {
        throw new Error('Invoice date is required.');
    }

    const recipientContactIds = form.recipientContactIds.filter(validUuid);

    if (recipientContactIds.length !== form.recipientContactIds.length) {
        throw new Error('One or more invoice contacts are invalid.');
    }

    const { data, error } = await supabase
        .from('invoices')
        .insert({
            client_id: form.clientId,
            project_id: form.projectId,
            subject,
            invoice_date: form.date,
            due_date: form.dueDate || null,
            status: 'billed_not_paid',
            amount: parseAmount(form.amount),
            amount_paid: 0,
            recipient_contact_ids: recipientContactIds,
            created_by: userId
        })
        .select('*')
        .single();

    if (error) throw error;

    return mapInvoice(data);
}

