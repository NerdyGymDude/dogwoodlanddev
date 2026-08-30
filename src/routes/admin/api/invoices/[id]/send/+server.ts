import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';
import { sendZohoMail, validateEmailAttachments } from '$lib/server/integrations/zoho-mail';

const html = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const POST: RequestHandler = async ({ locals, params, request }) => {
	await requireActiveStaff(locals);
	const body = await request.formData().catch(() => null);
	const message = String(body?.get('message') ?? '').trim();
	const recipientEmail = String(body?.get('recipientEmail') ?? '').trim().toLowerCase();
	const sendToClient = body?.get('sendToClient') === 'true';
	const saveToClientId = String(body?.get('saveToClientId') ?? '').trim();
	if (!message) return json({ error: 'Invoice email body is required.' }, { status: 400 });
	if (recipientEmail && !validEmail(recipientEmail))
		return json({ error: 'Enter a valid recipient email address.' }, { status: 400 });
	if (!recipientEmail && !sendToClient)
		return json({ error: 'Enter an email or select Send to Client.' }, { status: 400 });
	let attachments: File[];
	try {
		attachments = validateEmailAttachments(body?.getAll('attachments') ?? []);
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Invalid email attachments.' },
			{ status: 400 }
		);
	}

	const { data: invoice, error: invoiceError } = await locals.supabase
		.from('invoices')
		.select(
			'id, client_id, subject, invoice_identifier, recipient_contact_ids, sent_at, status, amount, amount_paid'
		)
		.eq('id', params.id)
		.single();
	if (invoiceError || !invoice) return json({ error: 'Invoice not found.' }, { status: 404 });
	const { data: contacts, error: contactError } = sendToClient
		? await locals.supabase
				.from('client_contacts')
				.select('email')
				.eq('client_id', invoice.client_id)
				.eq('contact_type', 'primary')
		: { data: [], error: null };
	if (contactError) return json({ error: 'Unable to load invoice recipients.' }, { status: 500 });
	const recipients = [
		...new Set(
			[recipientEmail, ...(contacts ?? []).map((contact) => contact.email)]
				.map((contact) =>
					String(contact ?? '')
						.trim()
						.toLowerCase()
				)
				.filter(Boolean)
		)
	];
	if (!recipients.length)
		return json(
			{ error: 'The client primary contact does not have an email address.' },
			{ status: 400 }
		);

	try {
		await sendZohoMail({
			from: 'accounting@dogwoodlanddev.com',
			to: recipients.join(','),
			subject: `${invoice.invoice_identifier} - ${invoice.subject}`,
			content: html(message),
			attachments
		});
	} catch (error) {
		console.error('Invoice email failed:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Zoho could not send the invoice email.' },
			{ status: 502 }
		);
	}

	if (recipientEmail && saveToClientId) {
		const { error: saveError } = await locals.supabase
			.from('client_invoice_emails')
			.upsert({ client_id: saveToClientId, email: recipientEmail }, { onConflict: 'client_id,email' });
		if (saveError) console.error('Invoice recipient save failed:', saveError);
	}

	const sentAt = new Date().toISOString();
	const nextStatus = Number(invoice.amount_paid) > 0 ? 'billed_partial_payment' : 'billed_not_paid';
	const { error: updateError } = await locals.supabase
		.from('invoices')
		.update({ sent_at: sentAt, status: nextStatus })
		.eq('id', invoice.id);
	if (updateError) {
		console.error('Invoice sent_at update failed:', updateError);
		return json(
			{ error: 'Email was sent, but its sent status could not be saved.', emailSent: true },
			{ status: 500 }
		);
	}
	return json({
		ok: true,
		sentAt,
		status: Number(invoice.amount_paid) > 0 ? 'Billed - Partial Payment' : 'Billed - Not Paid',
		recipients
	});
};
