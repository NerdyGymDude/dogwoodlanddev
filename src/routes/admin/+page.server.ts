import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getClients } from '$lib/server/admin/clients';
import { getEvents, getProjects, getTasks } from '$lib/server/admin/core';
import { getInvoices } from '$lib/server/admin/accounting';
import { requireActiveStaff } from '$lib/server/admin/authorization';
import {
	getZohoInboxMessages,
	sendZohoMail
} from '$lib/server/integrations/zoho-mail';

const allowedMailboxes = new Set([
	'branch@dogwoodlanddev.com',
	'office@dogwoodlanddev.com',
	'accounting@dogwoodlanddev.com',
	'permitting@dogwoodlanddev.com'
]);

export const load: PageServerLoad = async ({ locals }) => {
	await requireActiveStaff(locals);

	const [clients, projects, tasks, events, invoices] = await Promise.all([
		getClients(locals.supabase),
		getProjects(locals.supabase),
		getTasks(locals.supabase),
		getEvents(locals.supabase),
		getInvoices(locals.supabase)
	]);

	const mailboxAddresses = [
		'branch@dogwoodlanddev.com',
		'office@dogwoodlanddev.com',
		'accounting@dogwoodlanddev.com',
		'permitting@dogwoodlanddev.com'
	];

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
					`Unable to load Zoho inbox ${emailAddress}:`,
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

	return {
		clients,
		projects,
		tasks,
		events,
		invoices,
		zohoInboxes
	};
};

export const actions: Actions = {
	sendEmail: async ({ request, locals }) => {
		await requireActiveStaff(locals);

		const formData = await request.formData();

		const from = String(formData.get('from') ?? '')
			.trim()
			.toLowerCase();

		const to = String(formData.get('to') ?? '')
			.trim()
			.toLowerCase();

		const subject = String(formData.get('subject') ?? '').trim();
		const message = String(formData.get('message') ?? '').trim();

		if (!allowedMailboxes.has(from)) {
			return fail(400, {
				emailError: 'Please select a valid Dogwood mailbox.'
			});
		}

		if (!to || !to.includes('@')) {
			return fail(400, {
				emailError: 'Please enter a valid recipient email address.'
			});
		}

		if (!subject) {
			return fail(400, {
				emailError: 'Please enter an email subject.'
			});
		}

		if (!message) {
			return fail(400, {
				emailError: 'Please enter an email message.'
			});
		}

		try {
			await sendZohoMail({
				from,
				to,
				subject,
				content: message
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;')
					.replace(/\n/g, '<br>')
			});

			return {
				emailSuccess: true,
				emailMessage: `Email sent from ${from}.`
			};
		} catch (cause) {
			console.error(
				'Admin email send failed:',
				cause instanceof Error ? cause.message : 'Unknown error'
			);

			return fail(500, {
				emailError: 'The email could not be sent. Please try again.'
			});
		}
	}
};

