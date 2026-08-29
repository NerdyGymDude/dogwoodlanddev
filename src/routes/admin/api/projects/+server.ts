import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ProjectFormData } from '$lib/admin/forms/types';
import { createProject } from '$lib/server/admin/core';
import { requireActiveStaff } from '$lib/server/admin/authorization';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireActiveStaff(locals);

	try {
		const form = (await request.json()) as ProjectFormData;
		if (!form.clientId?.trim()) {
			return json({ error: 'Client is required to create project' }, { status: 400 });
		}
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

export const DELETE: RequestHandler = async ({ locals, url }) => {
	await requireActiveStaff(locals);

	const projectId = url.searchParams.get('id');
	if (!projectId) return json({ error: 'Project ID is required.' }, { status: 400 });

	const financialTables = ['project_billing_tasks', 'project_payments', 'financial_documents', 'invoices'];
	const checks = await Promise.all(
		financialTables.map((table) =>
			locals.supabase.from(table).select('id', { count: 'exact', head: true }).eq('project_id', projectId)
		)
	);

	const checkError = checks.find((result) => result.error)?.error;
	if (checkError) {
		console.error('Unable to verify project financial history:', checkError);
		return json({ error: 'Unable to verify whether this project has financial history.' }, { status: 500 });
	}

	if (checks.some((result) => (result.count ?? 0) > 0)) {
		return json(
			{ error: 'This project cannot be removed because it has financial history.' },
			{ status: 409 }
		);
	}

	const { error } = await locals.supabase.from('projects').delete().eq('id', projectId);
	if (error) {
		console.error('Unable to delete project:', error);
		const blockedByReference = error.code === '23503';
		return json(
			{
				error: blockedByReference
					? 'This project cannot be removed because it has financial history.'
					: 'Unable to remove project.'
			},
			{ status: blockedByReference ? 409 : 500 }
		);
	}

	return json({ ok: true });
};
