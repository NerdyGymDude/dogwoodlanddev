import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';
import { sendZohoMail } from '$lib/server/integrations/zoho-mail';

const allowedSenders = new Set(['branch@dogwoodlanddev.com', 'office@dogwoodlanddev.com']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const html = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

export const POST: RequestHandler = async ({ locals, request }) => {
	await requireActiveStaff(locals);
	const body = await request.json().catch(() => null) as { from?: string; recipients?: unknown; subject?: string; message?: string } | null;
	const from = String(body?.from ?? '').trim().toLowerCase();
	const recipients = Array.isArray(body?.recipients)
		? [...new Set(body.recipients.map((value) => String(value).trim().toLowerCase()).filter(Boolean))]
		: [];
	const subject = String(body?.subject ?? '').trim();
	const message = String(body?.message ?? '').trim();
	if (!allowedSenders.has(from)) return json({ error: 'Select a valid Branch or Office sender.' }, { status: 400 });
	if (!recipients.length || recipients.some((email) => !emailPattern.test(email))) return json({ error: 'Add at least one valid recipient email address.' }, { status: 400 });
	if (!subject) return json({ error: 'Email subject is required.' }, { status: 400 });
	if (!message) return json({ error: 'Email body is required.' }, { status: 400 });
	try {
		await sendZohoMail({ from, to: recipients.join(','), subject, content: html(message) });
		return json({ ok: true });
	} catch (error) {
		console.error('Admin compose email failed:', error);
		return json({ error: error instanceof Error ? error.message : 'Zoho could not send the email.' }, { status: 502 });
	}
};
