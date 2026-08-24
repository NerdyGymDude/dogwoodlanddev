import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { EventFormData } from '$lib/admin/forms/types';
import { createEvent } from '$lib/server/admin/core';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await locals.safeGetSession();

	if (!user) return json({ error: 'You must be signed in.' }, { status: 401 });

	try {
		const form = (await request.json()) as EventFormData;
		const event = await createEvent(locals.supabase, user.id, form);
		return json({ event }, { status: 201 });
	} catch (error) {
		console.error('Unable to create calendar event:', error);
		return json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Unable to create calendar event.'
			},
			{ status: 500 }
		);
	}
};
