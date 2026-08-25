import type { Handle } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event);

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			return {
				session: null,
				user: null
			};
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) {
			return {
				session: null,
				user: null
			};
		}

		return {
			session,
			user
		};
	};

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});

	if (
		event.url.pathname === '/admin' ||
		event.url.pathname.startsWith('/admin/') ||
		event.url.pathname === '/api' ||
		event.url.pathname.startsWith('/api/')
	) {
		response.headers.set('cache-control', 'private, no-store');
	}

	return response;
};
