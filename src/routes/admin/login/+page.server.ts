import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { getActiveStaff } from '$lib/server/admin/authorization';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();

		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');

		if (!email || !password) {
			return fail(400, {
				message: 'Enter your email address and password.',
				email
			});
		}

		const { error } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			return fail(400, {
				message: 'The email address or password is incorrect.',
				email
			});
		}

		const authorization = await getActiveStaff(locals);

		if (!authorization.authorized) {
			await locals.supabase.auth.signOut();

			return fail(403, {
				message: 'This account does not have active staff access.',
				email
			});
		}

		throw redirect(303, '/admin');
	}
};
