import { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET } from '$env/static/private';
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
		.select('email_address, zoho_account_id, access_token, refresh_token, access_token_expires_at')
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

	const needsRefresh = !mailbox.access_token || expiresAt <= Date.now() + 60_000;

	const accessToken = needsRefresh ? await refreshAccessToken(mailbox) : mailbox.access_token!;

	return {
		...mailbox,
		access_token: accessToken
	};
}

type ZohoAccount = {
	accountId?: string;
	primaryEmailAddress?: string;
};

export async function discoverZohoAccountId(emailAddress: string) {
	const mailbox = await getZohoMailbox(emailAddress);

	const response = await fetch('https://mail.zoho.com/api/accounts', {
		headers: {
			Authorization: `Zoho-oauthtoken ${mailbox.access_token}`
		}
	});

	const result = await response.json();

	if (!response.ok) {
		throw new Error('Unable to retrieve Zoho mail account information.');
	}

	const accounts = Array.isArray(result.data) ? (result.data as ZohoAccount[]) : [];

	const account =
		accounts.find(
			(item) => item.primaryEmailAddress?.toLowerCase() === emailAddress.toLowerCase()
		) ?? accounts[0];

	if (!account?.accountId) {
		throw new Error(`No Zoho Mail account ID was found for ${emailAddress}.`);
	}

	const supabase = createSupabaseAdminClient();

	const { error } = await supabase
		.from('zoho_mailboxes')
		.update({
			zoho_account_id: account.accountId,
			updated_at: new Date().toISOString()
		})
		.eq('email_address', emailAddress);

	if (error) {
		throw new Error(`Unable to save Zoho account ID: ${error.message}`);
	}

	return account.accountId;
}

export type SendZohoMailInput = {
	from: string;
	to: string;
	subject: string;
	content: string;
};

export async function sendZohoMail(input: SendZohoMailInput) {
	let mailbox = await getZohoMailbox(input.from);

	const accountId = mailbox.zoho_account_id ?? (await discoverZohoAccountId(input.from));

	mailbox = await getZohoMailbox(input.from);

	const response = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/messages`, {
		method: 'POST',
		headers: {
			Authorization: `Zoho-oauthtoken ${mailbox.access_token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			fromAddress: input.from,
			toAddress: input.to,
			subject: input.subject,
			content: input.content,
			mailFormat: 'html'
		})
	});

	const result = await response.json();

	if (!response.ok) {
		console.error(
			'Zoho send-mail request failed:',
			result?.data?.errorCode ?? result?.status?.description ?? response.status
		);

		throw new Error('Zoho could not send the email.');
	}

	return result;
}

export type ZohoInboxMessage = {
	messageId: string;
	folderId: string;
	subject: string;
	fromAddress: string;
	sender: string;
	receivedTime: string | null;
	summary: string;
	hasAttachment: boolean;
	isRead: boolean;
};

type ZohoMessageListItem = {
	messageId?: string | number;
	folderId?: string | number;
	subject?: string;
	fromAddress?: string;
	sender?: string;
	receivedTime?: string | number;
	summary?: string;
	hasAttachment?: boolean | string;
	status?: string | number;
};

export async function getZohoInboxMessages(
	emailAddress: string,
	limit = 25
): Promise<ZohoInboxMessage[]> {
	let mailbox = await getZohoMailbox(emailAddress);

	const accountId = mailbox.zoho_account_id ?? (await discoverZohoAccountId(emailAddress));

	mailbox = await getZohoMailbox(emailAddress);

	const response = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/messages/view`, {
		headers: {
			Authorization: `Zoho-oauthtoken ${mailbox.access_token}`
		}
	});

	const result = await response.json();

	if (!response.ok) {
		console.error(
			'Zoho inbox request failed:',
			result?.data?.errorCode ?? result?.status?.description ?? response.status
		);

		throw new Error(`Zoho could not retrieve ${emailAddress}.`);
	}

	const messages = Array.isArray(result.data) ? (result.data as ZohoMessageListItem[]) : [];

	return messages.slice(0, limit).map((message) => ({
		messageId: String(message.messageId ?? ''),
		folderId: String(message.folderId ?? ''),
		subject: message.subject?.trim() || '(No subject)',
		fromAddress: message.fromAddress?.trim() || '',
		sender: message.sender?.trim() || message.fromAddress?.trim() || 'Unknown sender',
		receivedTime:
			message.receivedTime === undefined || message.receivedTime === null
				? null
				: String(message.receivedTime),
		summary: message.summary?.trim() || '',
		hasAttachment: message.hasAttachment === true || message.hasAttachment === 'true',
		isRead: String(message.status ?? '0') === '0'
	}));
}

export async function getZohoMessageContent(
	emailAddress: string,
	folderId: string,
	messageId: string
) {
	if (!folderId || !messageId) {
		throw new Error('Zoho folder ID and message ID are required.');
	}

	let mailbox = await getZohoMailbox(emailAddress);

	const accountId = mailbox.zoho_account_id ?? (await discoverZohoAccountId(emailAddress));

	mailbox = await getZohoMailbox(emailAddress);

	const response = await fetch(
		`https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content?includeBlockContent=true`,
		{
			headers: {
				Authorization: `Zoho-oauthtoken ${mailbox.access_token}`
			}
		}
	);

	const result = await response.json();

	if (!response.ok || !result?.data) {
		console.error('Zoho message-content request failed:', {
			status: response.status,
			accountId,
			folderId,
			messageId,
			errorCode: result?.data?.errorCode ?? null,
			description: result?.status?.description ?? null,
			response: result
		});

		throw new Error('Zoho could not retrieve the email contents.');
	}

	return {
		messageId: String(result.data.messageId ?? messageId),
		content: String(result.data.content ?? '')
	};
}

export async function markZohoMessageRead(
        emailAddress: string,
        messageId: string
) {
        if (!messageId) {
                throw new Error('Zoho message ID is required.');
        }

        let mailbox = await getZohoMailbox(emailAddress);

        const accountId =
                mailbox.zoho_account_id ?? (await discoverZohoAccountId(emailAddress));

        mailbox = await getZohoMailbox(emailAddress);

        const response = await fetch(
                `https://mail.zoho.com/api/accounts/${accountId}/updatemessage`,
                {
                        method: 'PUT',
                        headers: {
                                Authorization: `Zoho-oauthtoken ${mailbox.access_token}`,
                                'Content-Type': 'application/json'
                        },
                        body: `{"mode":"markAsRead","messageId":[${messageId}]}`
                }
        );

        const result = await response.json().catch(() => null);

        console.log('Zoho mark-as-read response:', {
                httpStatus: response.status,
                mailbox: emailAddress,
                accountId,
                messageId,
                zohoStatus: result?.status ?? null,
                zohoData: result?.data ?? null
        });

        if (
                !response.ok ||
                result?.status?.code !== 200 ||
                result?.status?.description !== 'success'
        ) {
                throw new Error(
                        `Zoho mark-as-read failed: ${result?.status?.description ?? response.status}`
                );
        }
}
