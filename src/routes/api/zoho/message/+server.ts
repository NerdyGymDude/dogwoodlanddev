import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getZohoMessageContent,
	markZohoMessageRead
} from '$lib/server/integrations/zoho-mail';
import { requireActiveStaff } from '$lib/server/admin/authorization';

const allowedMailboxes = new Set([
	'branch@dogwoodlanddev.com',
	'office@dogwoodlanddev.com',
	'accounting@dogwoodlanddev.com',
	'permitting@dogwoodlanddev.com'
]);

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireActiveStaff(locals);

	const mailbox = (url.searchParams.get('mailbox') ?? '')
		.trim()
		.toLowerCase();

	const folderId = (url.searchParams.get('folderId') ?? '').trim();
	const messageId = (url.searchParams.get('messageId') ?? '').trim();

	if (!allowedMailboxes.has(mailbox)) {
		return json(
			{ ok: false, error: 'Invalid Dogwood mailbox.' },
			{ status: 400 }
		);
	}

	if (!folderId || !messageId) {
		return json(
			{ ok: false, error: 'The selected email is missing Zoho identifiers.' },
			{ status: 400 }
		);
	}

	try {
		const message = await getZohoMessageContent(
			mailbox,
			folderId,
			messageId
		);

		try {
		        await markZohoMessageRead(mailbox, messageId);
		} catch (cause) {
		        console.error(
		                `Zoho read-state update failed for ${mailbox}:`,
		                cause instanceof Error ? cause.message : 'Unknown error'
		        );
		}

		return json({
			ok: true,
			messageId: message.messageId,
			content: message.content
		});
	} catch (cause) {
		console.error(
			'Admin email read failed:',
			cause instanceof Error ? cause.message : 'Unknown error'
		);

		return json(
			{ ok: false, error: 'The email could not be opened.' },
			{ status: 500 }
		);
	}
};
