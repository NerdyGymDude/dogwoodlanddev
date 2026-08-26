import { json } from '@sveltejs/kit';
import { sendZohoMail } from '$lib/server/integrations/zoho-mail';
import { requireActiveStaff } from '$lib/server/admin/authorization';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	await requireActiveStaff(locals);

	try {
		await sendZohoMail({
			from: 'branch@dogwoodlanddev.com',
			to: 'branch@dogwoodlanddev.com',
			subject: 'Dogwood Admin Portal — Zoho Email Test',
			content: `
				<p>This is a test email from the Dogwood Land Development Admin Portal.</p>
				<p>If you received this message, the Zoho Mail sending integration is working.</p>
			`
		});

		return json({
			ok: true,
			message: 'Test email sent from Branch to Branch.'
		});
	} catch (cause) {
		console.error(
			'Zoho test email failed:',
			cause instanceof Error ? cause.message : 'Unknown error'
		);

		return json(
			{
				ok: false,
				error: 'Test email could not be sent.'
			},
			{ status: 500 }
		);
	}
};
