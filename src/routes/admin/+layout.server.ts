import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	const isLoginPage = url.pathname === '/admin/login';

	if (!user && !isLoginPage) {
		throw redirect(303, '/admin/login');
	}

	if (user && isLoginPage) {
		throw redirect(303, '/admin');
	}

	return {
		session,
		user
	};
};
