import type { PageServerLoad } from './$types';
import { getClients } from '$lib/server/admin/clients';
import { getEvents, getProjects, getTasks } from '$lib/server/admin/core';

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
