import { error, json } from '@sveltejs/kit';
import { discoverZohoAccountId } from '$lib/server/integrations/zoho-mail';

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
		const accountId = await discoverZohoAccountId(mailbox);

		return json({
			ok: true,
			mailbox,
			accountId
		});
	} catch (cause) {
		console.error(
			`Zoho account discovery failed for ${mailbox}:`,
			cause instanceof Error ? cause.message : 'Unknown error'
		);

		return json(
			{
				ok: false,
				mailbox,
				error: 'Zoho account discovery failed.'
			},
			{ status: 500 }
		);
	}
};
