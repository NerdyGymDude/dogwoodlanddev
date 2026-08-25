import { error } from '@sveltejs/kit';

const staffRoles = new Set(['super_user', 'admin', 'accounting', 'user']);

export async function getActiveStaff(locals: App.Locals) {
	const { session, user } = await locals.safeGetSession();

	if (!user) {
		return { session, user: null, profile: null, authorized: false as const };
	}

	const { data: profile, error: profileError } = await locals.supabase
		.from('profiles')
		.select('id, email, full_name, role, is_active')
		.eq('id', user.id)
		.maybeSingle();

	const authorized = Boolean(
		!profileError && profile?.is_active && staffRoles.has(profile.role)
	);

	return { session, user, profile, authorized };
}

export async function requireActiveStaff(locals: App.Locals) {
	const authorization = await getActiveStaff(locals);

	if (!authorization.user) {
		throw error(401, 'Authentication required.');
	}

	if (!authorization.authorized) {
		throw error(403, 'Active staff access required.');
	}

	return authorization;
}
