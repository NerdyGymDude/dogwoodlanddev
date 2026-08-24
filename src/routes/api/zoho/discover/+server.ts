import { json } from '@sveltejs/kit';
import { discoverZohoAccountId } from '$lib/server/integrations/zoho-mail';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const accountId = await discoverZohoAccountId(
			'branch@dogwoodlanddev.com'
		);

		return json({
			ok: true,
			mailbox: 'branch@dogwoodlanddev.com',
			accountId
		});
	} catch (cause) {
		console.error(
			'Zoho account discovery failed:',
			cause instanceof Error ? cause.message : 'Unknown error'
		);

		return json(
			{
				ok: false,
				error: 'Zoho account discovery failed.'
			},
			{ status: 500 }
		);
	}
};
