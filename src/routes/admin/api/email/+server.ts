import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';
import { sendZohoMail, validateEmailAttachments } from '$lib/server/integrations/zoho-mail';

const allowedSenders = new Set(['branch@dogwoodlanddev.com', 'office@dogwoodlanddev.com']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const html = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

export const POST: RequestHandler = async ({ locals, request }) => {
	await requireActiveStaff(locals);
	const body = await request.formData().catch(() => null);
	const from = String(body?.get('from') ?? '')
		.trim()
		.toLowerCase();
	const recipients = [
		...new Set(
			(body?.getAll('recipients') ?? [])
				.map((value) => String(value).trim().toLowerCase())
				.filter(Boolean)
		)
	];
	const subject = String(body?.get('subject') ?? '').trim();
	const message = String(body?.get('message') ?? '').trim();
	if (!allowedSenders.has(from))
		return json({ error: 'Select a valid Branch or Office sender.' }, { status: 400 });
	if (!recipients.length || recipients.some((email) => !emailPattern.test(email)))
		return json({ error: 'Add at least one valid recipient email address.' }, { status: 400 });
	if (!subject) return json({ error: 'Email subject is required.' }, { status: 400 });
	if (!message) return json({ error: 'Email body is required.' }, { status: 400 });
	let attachments: File[];
	try {
		attachments = validateEmailAttachments(body?.getAll('attachments') ?? []);
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Invalid email attachments.' },
			{ status: 400 }
		);
	}
	try {
		await sendZohoMail({
			from,
			to: recipients.join(','),
			subject,
			content: html(message),
			attachments
		});
		return json({ ok: true });
	} catch (error) {
		console.error('Admin compose email failed:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Zoho could not send the email.' },
			{ status: 502 }
		);
	}
};
