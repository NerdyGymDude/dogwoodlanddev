import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { TaskFormData } from '$lib/admin/forms/types';
import { createTask } from '$lib/server/admin/core';
import { requireActiveStaff } from '$lib/server/admin/authorization';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireActiveStaff(locals);

	try {
		const form = (await request.json()) as TaskFormData;
		const task = await createTask(locals.supabase, user.id, form);
		return json({ task }, { status: 201 });
	} catch (error) {
		console.error('Unable to create task:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to create task.' },
			{ status: 500 }
		);
	}
};
