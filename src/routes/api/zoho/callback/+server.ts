import { error, redirect } from '@sveltejs/kit';
import {
	ZOHO_CLIENT_ID,
	ZOHO_CLIENT_SECRET,
	ZOHO_REDIRECT_URI
} from '$env/static/private';
import { createSupabaseAdminClient } from '$lib/server/integrations/supabase-admin';
import { requireActiveStaff } from '$lib/server/admin/authorization';
import { statesMatch } from '$lib/server/integrations/zoho-oauth-state';

import type { RequestHandler } from './$types';

type ZohoTokenResponse = {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number;
	scope?: string;
	api_domain?: string;
	token_type?: string;
	error?: string;
};

export const GET: RequestHandler = async ({ url, fetch, cookies, locals }) => {
	const { user } = await requireActiveStaff(locals);

	const code = url.searchParams.get('code');
	const returnedState = url.searchParams.get('state');
	const expectedState = cookies.get('zoho_oauth_state');
	const initiatingUser = cookies.get('zoho_oauth_user');
	const mailbox = cookies.get('zoho_connect_mailbox');

	const allowedMailboxes = new Set([
		'branch@dogwoodlanddev.com',
		'office@dogwoodlanddev.com',
		'accounting@dogwoodlanddev.com',
		'permitting@dogwoodlanddev.com'
	]);

	if (!mailbox || !allowedMailboxes.has(mailbox)) {
		throw error(400, 'Zoho mailbox connection session is missing or invalid.');
	}

	if (
		!returnedState ||
		!expectedState ||
		!initiatingUser ||
		!statesMatch(expectedState, returnedState) ||
		!statesMatch(initiatingUser, user.id)
	) {
		throw error(400, 'Zoho OAuth state is missing or invalid.');
	}

	cookies.delete('zoho_oauth_state', {
		path: '/api/zoho'
	});
	cookies.delete('zoho_oauth_user', {
		path: '/api/zoho'
	});

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

	const result = (await response.json()) as ZohoTokenResponse;

	if (!response.ok || result.error || !result.access_token) {
		console.error(
			'Zoho OAuth token exchange failed:',
			result.error ?? response.status
		);

		throw error(500, 'Zoho authorization failed.');
	}

	if (!result.refresh_token) {
		console.error('Zoho OAuth response did not include a refresh token.');
		throw error(
			500,
			'Zoho did not provide a refresh token. Reauthorization is required.'
		);
	}

	const accountsResponse = await fetch(
                'https://mail.zoho.com/api/accounts',
                {
                        headers: {
                                Authorization: `Zoho-oauthtoken ${result.access_token}`
                        }
                }
        );

        const accountsResult = (await accountsResponse.json()) as {
                data?: Array<{
                        accountId?: string | number;
                        primaryEmailAddress?: string;
                }>;
        };

        if (!accountsResponse.ok) {
                throw error(500, 'Zoho mailbox identity could not be verified.');
        }

        const connectedAccount = Array.isArray(accountsResult.data)
                ? accountsResult.data.find(
                                (account) =>
                                        account.primaryEmailAddress?.toLowerCase() ===
                                        mailbox.toLowerCase()
                        )
                : undefined;

        if (!connectedAccount?.accountId) {
                console.error(`Zoho OAuth identity mismatch. Expected ${mailbox}.`);

                throw error(
                        400,
                        `Zoho signed in with a different account. Sign in to ${mailbox} and try again.`
                );
        }

        const zohoAccountId = String(connectedAccount.accountId);

        const expiresIn = result.expires_in ?? 3600;
	const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

	const scopes = result.scope
		? result.scope.split(/[,\s]+/).filter(Boolean)
		: ['ZohoMail.messages.CREATE'];

	const supabase = createSupabaseAdminClient();

	const { error: databaseError } = await supabase
		.from('zoho_mailboxes')
		.update({
			zoho_account_id: zohoAccountId,
                        access_token: result.access_token,
			refresh_token: result.refresh_token,
			access_token_expires_at: expiresAt,
			scopes,
			connected_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			is_active: true
		})
		.eq('email_address', mailbox);

	if (databaseError) {
		console.error(
			'Failed to save Zoho mailbox authorization:',
			databaseError.message
		);

		throw error(500, 'Zoho authorization could not be saved.');
	}

	cookies.delete('zoho_connect_mailbox', {
		path: '/api/zoho'
	});

	console.info(`Zoho authorization saved for ${mailbox}.`);

	throw redirect(303, '/admin?zoho=connected');
};
