import { error, redirect } from '@sveltejs/kit';
import {
	ZOHO_CLIENT_ID,
	ZOHO_CLIENT_SECRET,
	ZOHO_REDIRECT_URI
} from '$env/static/private';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const code = url.searchParams.get('code');

	if (!code) {
		throw error(400, 'Zoho authorization code was not provided.');
	}

	const tokenUrl = new URL('https://accounts.zoho.com/oauth/v2/token');

	tokenUrl.searchParams.set('grant_type', 'authorization_code');
	tokenUrl.searchParams.set('client_id', ZOHO_CLIENT_ID);
	tokenUrl.searchParams.set('client_secret', ZOHO_CLIENT_SECRET);
	tokenUrl.searchParams.set('redirect_uri', ZOHO_REDIRECT_URI);
	tokenUrl.searchParams.set('code', code);

	const response = await fetch(tokenUrl, {
		method: 'POST'
	});

	const result = await response.json();

	if (!response.ok || result.error) {
		console.error('Zoho OAuth token exchange failed:', result.error ?? response.status);
		throw error(500, 'Zoho authorization failed.');
	}

	/*
	 * Temporary OAuth proof-of-connection route.
	 *
	 * IMPORTANT:
	 * Do not log or return access_token or refresh_token.
	 * We will add secure token persistence after the OAuth
	 * round trip has been verified successfully.
	 */
	console.info('Zoho OAuth authorization completed successfully.');

	throw redirect(303, '/admin?zoho=connected');
};
