import {
	ZOHO_CLIENT_ID,
	ZOHO_CLIENT_SECRET
} from '$env/static/private';
import { createSupabaseAdminClient } from './supabase-admin';

type ZohoMailbox = {
	email_address: string;
	zoho_account_id: string | null;
	access_token: string | null;
	refresh_token: string | null;
	access_token_expires_at: string | null;
};

async function refreshAccessToken(mailbox: ZohoMailbox) {
	if (!mailbox.refresh_token) {
		throw new Error(`Zoho mailbox ${mailbox.email_address} is not connected.`);
	}

	const tokenUrl = new URL('https://accounts.zoho.com/oauth/v2/token');

	tokenUrl.searchParams.set('grant_type', 'refresh_token');
	tokenUrl.searchParams.set('client_id', ZOHO_CLIENT_ID);
	tokenUrl.searchParams.set('client_secret', ZOHO_CLIENT_SECRET);
	tokenUrl.searchParams.set('refresh_token', mailbox.refresh_token);

	const response = await fetch(tokenUrl, {
		method: 'POST'
	});

	const result = await response.json();

	if (!response.ok || !result.access_token) {
		throw new Error('Unable to refresh Zoho access token.');
	}

	const expiresIn = result.expires_in ?? 3600;
	const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

	const supabase = createSupabaseAdminClient();

	const { error } = await supabase
		.from('zoho_mailboxes')
		.update({
			access_token: result.access_token,
			access_token_expires_at: expiresAt,
			updated_at: new Date().toISOString()
		})
		.eq('email_address', mailbox.email_address);

	if (error) {
		throw new Error(`Unable to save refreshed Zoho token: ${error.message}`);
	}

	return result.access_token as string;
}

export async function getZohoMailbox(emailAddress: string) {
	const supabase = createSupabaseAdminClient();

	const { data, error } = await supabase
		.from('zoho_mailboxes')
		.select(
			'email_address, zoho_account_id, access_token, refresh_token, access_token_expires_at'
		)
		.eq('email_address', emailAddress)
		.single();

	if (error || !data) {
		throw new Error(`Zoho mailbox ${emailAddress} was not found.`);
	}

	const mailbox = data as ZohoMailbox;

	if (!mailbox.refresh_token) {
		throw new Error(`Zoho mailbox ${emailAddress} is not connected.`);
	}

	const expiresAt = mailbox.access_token_expires_at
		? new Date(mailbox.access_token_expires_at).getTime()
		: 0;

	const needsRefresh =
		!mailbox.access_token ||
		expiresAt <= Date.now() + 60_000;

	const accessToken = needsRefresh
		? await refreshAccessToken(mailbox)
		: mailbox.access_token!;

	return {
		...mailbox,
		access_token: accessToken
	};
}
