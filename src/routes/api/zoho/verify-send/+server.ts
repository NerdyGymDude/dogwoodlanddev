import { error, json } from '@sveltejs/kit';
import { sendZohoMail } from '$lib/server/integrations/zoho-mail';

import type { RequestHandler } from './$types';

const allowedMailboxes = new Set([
	'branch@dogwoodlanddev.com',
	'office@dogwoodlanddev.com',
	'accounting@dogwoodlanddev.com',
	'permitting@dogwoodlanddev.com'
]);

export const GET: RequestHandler = async ({ url }) => {
	const mailbox = url.searchParams.get('mailbox')?.toLowerCase();

	if (!mailbox || !allowedMailboxes.has(mailbox)) {
		throw error(400, 'Unsupported Zoho mailbox.');
	}

	try {
		await sendZohoMail({
			from: mailbox,
			to: mailbox,
			subject: 'Dogwood Admin Portal — Mailbox Verification',
			content: `
				<p>This is a mailbox verification email from the Dogwood Land Development Admin Portal.</p>
				<p><strong>${mailbox}</strong> is successfully connected for outgoing email.</p>
			`
		});

		return json({
			ok: true,
			mailbox,
			message: 'Verification email sent.'
		});
	} catch (cause) {
		console.error(
			`Zoho send verification failed for ${mailbox}:`,
			cause instanceof Error ? cause.message : 'Unknown error'
		);

		return json(
			{
				ok: false,
				mailbox,
				error: 'Verification email could not be sent.'
			},
			{ status: 500 }
		);
	}
};
