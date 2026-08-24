import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getClients } from '$lib/server/admin/clients';
import { getEvents, getProjects, getTasks } from '$lib/server/admin/core';
import { sendZohoMail } from '$lib/server/integrations/zoho-mail';

const allowedMailboxes = new Set([
	'branch@dogwoodlanddev.com',
	'office@dogwoodlanddev.com',
	'accounting@dogwoodlanddev.com',
	'permitting@dogwoodlanddev.com'
]);

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return {
			clients: [],
			projects: [],
			tasks: [],
			events: []
		};
	}

	const [clients, projects, tasks, events] = await Promise.all([
		getClients(locals.supabase),
		getProjects(locals.supabase),
		getTasks(locals.supabase),
		getEvents(locals.supabase)
	]);

	return {
		clients,
		projects,
		tasks,
		events
	};
};

export const actions: Actions = {
	sendEmail: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();

		if (!user) {
			return fail(401, {
				emailError: 'You must be signed in to send email.'
			});
		}

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
