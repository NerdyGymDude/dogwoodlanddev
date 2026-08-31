import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type Stripe from 'stripe';
import { createSupabaseAdminClient } from '$lib/server/integrations/supabase-admin';
import { getStripe, getStripeWebhookSecret } from '$lib/server/integrations/stripe';
import { createAndSendReceipt } from '$lib/server/admin/invoice-documents';

const moneyCents = (value: unknown) => Math.round(Number(value) * 100);

async function processSuccessfulCheckout(
    session: Stripe.Checkout.Session,
    eventId: string,
    eventCreated: number
) {
    const stripe = getStripe();
    const admin = createSupabaseAdminClient();

    const projectId = String(session.metadata?.project_id ?? '');
    const documentId = String(session.metadata?.financial_document_id ?? '');

    if (!projectId || !documentId) {
        throw new Error('Stripe Checkout Session is missing Dogwood metadata.');
    }

    const paymentIntentId =
        typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? '';

    if (!paymentIntentId) {
        throw new Error('Stripe Checkout Session does not contain a PaymentIntent.');
    }

    /*
     * Idempotency check.
     *
     * Different Stripe events can describe the same underlying payment, so
     * PaymentIntent and Checkout Session IDs are checked in addition to the
     * event ID.
     */
    const { data: existingPayments, error: existingError } = await admin
        .from('project_payments')
        .select('id, project_id, amount, stripe_payment_intent_id, stripe_checkout_session_id, stripe_event_id')
        .or(
            `stripe_payment_intent_id.eq.${paymentIntentId},stripe_checkout_session_id.eq.${session.id},stripe_event_id.eq.${eventId}`
        )
        .limit(1);

    if (existingError) throw existingError;

    if (existingPayments?.length) {
        const existingPayment = existingPayments[0];

        if (!existingPayment.stripe_event_id) {
            throw new Error('Stripe payment application is still in progress; retry this webhook.');
        }

        await createAndSendReceipt(
            admin,
            null,
            {
                id: existingPayment.id,
                project_id: existingPayment.project_id,
                amount: existingPayment.amount
            },
            documentId
        );

        return { duplicate: true, paymentId: existingPayment.id };
    }

    const { data: document, error: documentError } = await admin
        .from('financial_documents')
        .select(`
            id,
            project_id,
            document_type,
            amount_due,
            financial_document_lines (
                id,
                project_billing_task_id,
                billed_amount
            )
        `)
        .eq('id', documentId)
        .eq('project_id', projectId)
        .eq('document_type', 'invoice')
        .not('sent_at', 'is', null)
        .single();

    if (documentError || !document) {
        throw new Error('Stripe payment references an invalid Dogwood invoice.');
    }

    const lines = document.financial_document_lines ?? [];

    const snapshotAllocations = lines
        .map((line) => ({
            taskId: String(line.project_billing_task_id ?? ''),
            amountCents: moneyCents(line.billed_amount)
        }))
        .filter((allocation) => allocation.taskId && allocation.amountCents > 0);

    if (!snapshotAllocations.length) {
        throw new Error('Stripe invoice does not contain payable task allocations.');
    }

    const expectedAmountCents = moneyCents(document.amount_due);
    const allocationTotalCents = snapshotAllocations.reduce(
        (sum, allocation) => sum + allocation.amountCents,
        0
    );

    if (
        expectedAmountCents <= 0 ||
        allocationTotalCents !== expectedAmountCents
    ) {
        throw new Error('Dogwood invoice allocation total does not match Amount Due.');
    }

    if (session.payment_status !== 'paid') {
        throw new Error('Stripe Checkout Session is not marked paid.');
    }

    if (session.amount_total !== expectedAmountCents) {
        throw new Error('Stripe Checkout Session amount does not match the Dogwood invoice.');
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
        throw new Error('Stripe PaymentIntent is not successful.');
    }

    if (
        paymentIntent.metadata?.project_id !== projectId ||
        paymentIntent.metadata?.financial_document_id !== documentId
    ) {
        throw new Error('Stripe PaymentIntent metadata does not match the Dogwood invoice.');
    }

    const paidAmountCents = paymentIntent.amount_received;

    if (paidAmountCents !== expectedAmountCents) {
        throw new Error('Stripe payment amount does not match the Dogwood invoice.');
    }

    if (paymentIntent.currency.toLowerCase() !== 'usd') {
        throw new Error('Stripe payment currency does not match Dogwood billing currency.');
    }

    const taskIds = snapshotAllocations.map((allocation) => allocation.taskId);

    if (new Set(taskIds).size !== taskIds.length) {
        throw new Error('Dogwood invoice contains duplicate billing task allocations.');
    }

    const { data: tasks, error: tasksError } = await admin
        .from('project_billing_tasks')
        .select('id, project_id, billed_amount')
        .eq('project_id', projectId)
        .in('id', taskIds);

    if (tasksError) throw tasksError;

    if ((tasks ?? []).length !== taskIds.length) {
        throw new Error('One or more Stripe invoice tasks no longer belong to this project.');
    }

    const taskById = new Map((tasks ?? []).map((task) => [task.id, task]));

    for (const allocation of snapshotAllocations) {
        const task = taskById.get(allocation.taskId);

        if (!task) {
            throw new Error('Stripe invoice task could not be resolved.');
        }

        const currentBilledCents = moneyCents(task.billed_amount);

        if (allocation.amountCents > currentBilledCents) {
            throw new Error(
                'Stripe invoice allocation exceeds the task current Billed Amount.'
            );
        }
    }

    let chargeId: string | null = null;

    if (typeof paymentIntent.latest_charge === 'string') {
        chargeId = paymentIntent.latest_charge;
    } else if (paymentIntent.latest_charge?.id) {
        chargeId = paymentIntent.latest_charge.id;
    }

    const completedAt = new Date(eventCreated * 1000).toISOString();

    const paymentDate = completedAt.slice(0, 10);

    const { data: payment, error: paymentError } = await admin
        .from('project_payments')
        .insert({
            project_id: projectId,
            project_billing_task_id: null,
            payment_method: 'stripe',
            amount: paidAmountCents / 100,
            currency: 'usd',
            payment_date: paymentDate,
            stripe_completed_at: completedAt,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_checkout_session_id: session.id,
            stripe_charge_id: chargeId,
            // This is set only after every allocation and task update succeeds.
            // A null value lets a racing delivery distinguish an in-progress
            // payment from one that is safe to use for receipt retries.
            stripe_event_id: null,
            check_number: null,
            check_file_path: null,
            created_by: null
        })
        .select('*')
        .single();

    if (paymentError) {
        /*
         * A simultaneous duplicate webhook can race the pre-insert check.
         * Re-check the unique Stripe identifiers before treating it as a
         * genuine processing failure.
         */
        const { data: racedPayment } = await admin
            .from('project_payments')
            .select('id, project_id, amount, stripe_event_id')
            .or(
                `stripe_payment_intent_id.eq.${paymentIntent.id},stripe_checkout_session_id.eq.${session.id}`
            )
            .limit(1)
            .maybeSingle();

        if (racedPayment) {
            if (!racedPayment.stripe_event_id) {
                throw new Error('Stripe payment application is still in progress; retry this webhook.');
            }

            await createAndSendReceipt(
                admin,
                null,
                {
                    id: racedPayment.id,
                    project_id: racedPayment.project_id,
                    amount: racedPayment.amount
                },
                documentId
            );

            return { duplicate: true, paymentId: racedPayment.id };
        }

        throw paymentError;
    }

    const { error: allocationError } = await admin
        .from('project_payment_allocations')
        .insert(
            snapshotAllocations.map((allocation) => ({
                payment_id: payment.id,
                project_billing_task_id: allocation.taskId,
                amount: allocation.amountCents / 100
            }))
        );

    if (allocationError) {
        await admin.from('project_payments').delete().eq('id', payment.id);
        throw allocationError;
    }

    const updatedTaskIds: string[] = [];

    try {
        for (const allocation of snapshotAllocations) {
            const task = taskById.get(allocation.taskId)!;
            const nextBilledAmount =
                (moneyCents(task.billed_amount) - allocation.amountCents) / 100;

            const { data: updatedTask, error: updateError } = await admin
                .from('project_billing_tasks')
                .update({ billed_amount: nextBilledAmount })
                .eq('id', allocation.taskId)
                .eq('project_id', projectId)
                .eq('billed_amount', Number(task.billed_amount))
                .select('id')
                .maybeSingle();

            if (updateError) {
                throw updateError;
            }

            if (!updatedTask) {
                throw new Error('A billing task changed while the Stripe payment was being applied.');
            }

            updatedTaskIds.push(allocation.taskId);
        }

        const { data: completedPayment, error: completionError } = await admin
            .from('project_payments')
            .update({ stripe_event_id: eventId })
            .eq('id', payment.id)
            .is('stripe_event_id', null)
            .select('id')
            .maybeSingle();

        if (completionError) throw completionError;
        if (!completedPayment) throw new Error('Stripe payment completion could not be recorded.');
    } catch (updateError) {
        for (const taskId of updatedTaskIds) {
            const originalTask = taskById.get(taskId);

            if (originalTask) {
                await admin
                    .from('project_billing_tasks')
                    .update({
                        billed_amount: moneyCents(originalTask.billed_amount) / 100
                    })
                    .eq('id', taskId)
                    .eq('project_id', projectId)
                    .eq(
                        'billed_amount',
                        (moneyCents(originalTask.billed_amount) -
                            snapshotAllocations.find((item) => item.taskId === taskId)!.amountCents) /
                            100
                    );
            }
        }

        await admin
            .from('project_payment_allocations')
            .delete()
            .eq('payment_id', payment.id);

        await admin
            .from('project_payments')
            .delete()
            .eq('id', payment.id);

        const message =
            updateError instanceof Error
                ? updateError.message
                : String(updateError);

        throw new Error(
            `Stripe payment could not be applied safely to every billing task: ${message}`
        );
    }

    await createAndSendReceipt(
        admin,
        null,
        {
            id: payment.id,
            project_id: payment.project_id,
            amount: payment.amount
        },
        documentId
    );

    return { duplicate: false, paymentId: payment.id };
}

export const POST: RequestHandler = async ({ request }) => {
    const stripe = getStripe();

    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return json({ error: 'Missing Stripe signature.' }, { status: 400 });
    }

    const rawBody = await request.text();

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            getStripeWebhookSecret()
        );
    } catch (verificationError) {
        console.error('Stripe webhook signature verification failed:', verificationError);
        return json({ error: 'Invalid Stripe signature.' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;

                if (session.payment_status === 'paid') {
                    await processSuccessfulCheckout(session, event.id, event.created);
                }

                break;
            }

            case 'checkout.session.async_payment_succeeded': {
                const session = event.data.object as Stripe.Checkout.Session;
                await processSuccessfulCheckout(session, event.id, event.created);
                break;
            }

            case 'checkout.session.async_payment_failed': {
                const session = event.data.object as Stripe.Checkout.Session;

                console.warn('Stripe asynchronous payment failed', {
                    eventId: event.id,
                    checkoutSessionId: session.id,
                    financialDocumentId: session.metadata?.financial_document_id ?? null
                });

                break;
            }
        }

        return json({ received: true });
    } catch (processingError) {
        console.error('Stripe webhook processing failed:', processingError);

        return json(
            { error: 'Stripe webhook could not be processed.' },
            { status: 500 }
        );
    }
};
