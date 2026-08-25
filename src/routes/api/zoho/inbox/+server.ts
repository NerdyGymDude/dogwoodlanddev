import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getZohoInboxMessages } from '$lib/server/integrations/zoho-mail';
import { requireActiveStaff } from '$lib/server/admin/authorization';

const mailboxAddresses = [
	'branch@dogwoodlanddev.com',
	'office@dogwoodlanddev.com',
	'accounting@dogwoodlanddev.com',
	'permitting@dogwoodlanddev.com'
];

export const GET: RequestHandler = async ({ locals }) => {
	await requireActiveStaff(locals);

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
