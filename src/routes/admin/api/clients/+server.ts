import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ClientFormData } from '$lib/admin/forms/types';
import { createClient } from '$lib/server/admin/clients';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return json(
			{ error: 'You must be signed in.' },
			{ status: 401 }
		);
	}

	let form: ClientFormData;

	try {
		form = (await request.json()) as ClientFormData;
	} catch {
		return json(
			{ error: 'Invalid client data.' },
			{ status: 400 }
		);
	}

	try {
		const client = await createClient(
			locals.supabase,
			user.id,
			form
		);

		return json({ client }, { status: 201 });
	} catch (error) {
		console.error('Unable to create client:', error);

		return json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Unable to create client.'
			},
			{ status: 500 }
		);
	}
};
