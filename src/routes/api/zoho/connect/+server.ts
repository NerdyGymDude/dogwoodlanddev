import { redirect } from '@sveltejs/kit';
import {
	ZOHO_CLIENT_ID,
	ZOHO_REDIRECT_URI
} from '$env/static/private';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const authorizationUrl = new URL(
		'https://accounts.zoho.com/oauth/v2/auth'
	);

	authorizationUrl.searchParams.set(
		'scope',
		'ZohoMail.messages.CREATE'
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
