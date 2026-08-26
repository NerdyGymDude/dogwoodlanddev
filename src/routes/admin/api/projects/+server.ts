import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ProjectFormData } from '$lib/admin/forms/types';
import { createProject } from '$lib/server/admin/core';
import { requireActiveStaff } from '$lib/server/admin/authorization';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireActiveStaff(locals);

	try {
		const form = (await request.json()) as ProjectFormData;
		const project = await createProject(locals.supabase, user.id, form);
		return json({ project }, { status: 201 });
	} catch (error) {
		console.error('Unable to create project:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to create project.' },
			{ status: 500 }
		);
	}
};
