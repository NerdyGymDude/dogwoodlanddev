import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseAdminClient } from '$lib/server/integrations/supabase-admin';
import { getStripe, verifyPaymentLinkToken } from '$lib/server/integrations/stripe';

function cents(value: unknown): number {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        throw new Error('Invoice amount is invalid.');
    }

    return Math.round(amount * 100);
}

export const GET: RequestHandler = async ({ params, url }) => {
    const documentId = params.documentId;
    const token = url.searchParams.get('token') ?? '';

    if (!documentId || !verifyPaymentLinkToken(documentId, token)) {
        throw error(403, 'This payment link is invalid.');
    }

    const admin = createSupabaseAdminClient();

    const { data: document, error: documentError } = await admin
        .from('financial_documents')
        .select(`
            id,
            project_id,
            document_type,
            amount_due,
            sent_at,
            financial_document_lines (
                id,
                project_billing_task_id,
                billed_amount
            )
        `)
        .eq('id', documentId)
        .eq('document_type', 'invoice')
        .single();

    if (documentError || !document) {
        throw error(404, 'Invoice not found.');
    }

    if (!document.sent_at) {
        throw error(403, 'This invoice has not been sent and cannot be paid online.');
    }

    const amount = cents(document.amount_due);

    if (amount <= 0) {
        throw error(400, 'This invoice does not have an amount due.');
    }

    const lines = document.financial_document_lines ?? [];

    const payableLines = lines
        .map((line) => ({
            taskId: String(line.project_billing_task_id ?? ''),
            amountCents: cents(line.billed_amount)
        }))
        .filter((line) => line.taskId && line.amountCents > 0);

    if (!payableLines.length) {
        throw error(409, 'This invoice does not contain payable task amounts.');
    }

    const taskIds = payableLines.map((line) => line.taskId);

    if (new Set(taskIds).size !== taskIds.length) {
        throw error(409, 'This invoice contains invalid task allocations.');
    }

    const allocationTotal = payableLines.reduce(
        (total, line) => total + line.amountCents,
        0
    );

    if (allocationTotal !== amount) {
        console.error('Stripe invoice allocation mismatch', {
            financialDocumentId: document.id,
            projectId: document.project_id
        });

        throw error(409, 'This invoice cannot currently be paid online.');
    }

    const { data: tasks, error: tasksError } = await admin
        .from('project_billing_tasks')
        .select('id, project_id, billed_amount')
        .eq('project_id', document.project_id)
        .in('id', taskIds);

    if (tasksError) {
        console.error('Unable to validate Stripe invoice tasks:', tasksError);
        throw error(500, 'This invoice cannot currently be validated for online payment.');
    }

    if ((tasks ?? []).length !== taskIds.length) {
        throw error(
            409,
            'This invoice is no longer current. Please request an updated invoice before paying online.'
        );
    }

    const taskById = new Map((tasks ?? []).map((task) => [task.id, task]));

    for (const line of payableLines) {
        const task = taskById.get(line.taskId);

        if (!task || cents(task.billed_amount) < line.amountCents) {
            throw error(
                409,
                'This invoice is no longer current. Please request an updated invoice before paying online.'
            );
        }
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: document.id,
        metadata: {
            project_id: document.project_id,
            financial_document_id: document.id
        },
        payment_intent_data: {
            metadata: {
                project_id: document.project_id,
                financial_document_id: document.id
            }
        },
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: 'usd',
                    unit_amount: amount,
                    product_data: {
                        name: 'Dogwood Land Development Invoice'
                    }
                }
            }
        ],
        success_url: `${url.origin}/?payment=success`,
        cancel_url: `${url.origin}/?payment=cancelled`
    });

    if (!session.url) {
        throw error(502, 'Stripe did not provide a checkout URL.');
    }

    throw redirect(303, session.url);
};
