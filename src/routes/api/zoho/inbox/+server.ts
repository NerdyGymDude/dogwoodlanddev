import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getZohoInboxMessages } from '$lib/server/integrations/zoho-mail';

const mailboxAddresses = [
	'branch@dogwoodlanddev.com',
	'office@dogwoodlanddev.com',
	'accounting@dogwoodlanddev.com',
	'permitting@dogwoodlanddev.com'
];

export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return json(
			{ ok: false, error: 'You must be signed in to read email.' },
			{ status: 401 }
		);
	}

	const zohoInboxes = await Promise.all(
		mailboxAddresses.map(async (emailAddress) => {
			try {
				const messages = await getZohoInboxMessages(emailAddress, 25);

				return {
					emailAddress,
					messages,
					error: null
				};
			} catch (cause) {
				console.error(
					`Unable to refresh Zoho inbox ${emailAddress}:`,
					cause instanceof Error ? cause.message : 'Unknown error'
				);

				return {
					emailAddress,
					messages: [],
					error: 'Inbox could not be loaded.'
				};
			}
		})
	);

	return json({
		ok: true,
		zohoInboxes,
		refreshedAt: new Date().toISOString()
	});
};
