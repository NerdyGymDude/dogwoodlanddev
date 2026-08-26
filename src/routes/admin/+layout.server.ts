import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getActiveStaff } from '$lib/server/admin/authorization';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const authorization = await getActiveStaff(locals);
	const { session, user } = authorization;

	const isLoginPage = url.pathname === '/admin/login';

	if (!user && !isLoginPage) {
		throw redirect(303, '/admin/login');
	}

	if (authorization.authorized && isLoginPage) {
		throw redirect(303, '/admin');
	}

	if (user && !isLoginPage && !authorization.authorized) {
		throw error(403, 'Active staff access is required.');
	}

	return {
		session,
		user,
		profile: authorization.profile
	};
};
