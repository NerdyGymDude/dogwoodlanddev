import { error, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import {
	ZOHO_CLIENT_ID,
	ZOHO_REDIRECT_URI
} from '$env/static/private';

import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';
import { createZohoOAuthState } from '$lib/server/integrations/zoho-oauth-state';

const allowedMailboxes = new Set([
	'branch@dogwoodlanddev.com',
	'office@dogwoodlanddev.com',
	'accounting@dogwoodlanddev.com',
	'permitting@dogwoodlanddev.com'
]);

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const { user } = await requireActiveStaff(locals);

	const mailbox =
		url.searchParams.get('mailbox')?.toLowerCase() ??
		'branch@dogwoodlanddev.com';

	if (!allowedMailboxes.has(mailbox)) {
		throw error(400, 'Unsupported Zoho mailbox.');
	}

	const state = createZohoOAuthState();
	const cookieOptions = {
		path: '/api/zoho',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 10 * 60
	} as const;

	cookies.set('zoho_connect_mailbox', mailbox, cookieOptions);
	cookies.set('zoho_oauth_state', state, cookieOptions);
	cookies.set('zoho_oauth_user', user.id, cookieOptions);

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

	authorizationUrl.searchParams.set('state', state);

	throw redirect(302, authorizationUrl.toString());
};
