import { error, redirect } from '@sveltejs/kit';
import {
	ZOHO_CLIENT_ID,
	ZOHO_REDIRECT_URI
} from '$env/static/private';

import type { RequestHandler } from './$types';

const allowedMailboxes = new Set([
	'branch@dogwoodlanddev.com',
	'office@dogwoodlanddev.com',
	'accounting@dogwoodlanddev.com',
	'permitting@dogwoodlanddev.com'
]);

export const GET: RequestHandler = async ({ url, cookies }) => {
	const mailbox =
		url.searchParams.get('mailbox')?.toLowerCase() ??
		'branch@dogwoodlanddev.com';

	if (!allowedMailboxes.has(mailbox)) {
		throw error(400, 'Unsupported Zoho mailbox.');
	}

	cookies.set('zoho_connect_mailbox', mailbox, {
		path: '/api/zoho',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 10 * 60
	});

	const authorizationUrl = new URL(
		'https://accounts.zoho.com/oauth/v2/auth'
	);

	authorizationUrl.searchParams.set(
		'scope',
		'ZohoMail.messages.CREATE,ZohoMail.messages.READ,ZohoMail.messages.UPDATE,ZohoMail.accounts.READ'
	);

	authorizationUrl.searchParams.set(
		'client_id',
		ZOHO_CLIENT_ID
	);

	authorizationUrl.searchParams.set(
		'response_type',
		'code'
	);

	authorizationUrl.searchParams.set(
		'access_type',
		'offline'
	);

	authorizationUrl.searchParams.set(
		'redirect_uri',
		ZOHO_REDIRECT_URI
	);

	authorizationUrl.searchParams.set(
		'prompt',
		'consent'
	);

	throw redirect(302, authorizationUrl.toString());
};
