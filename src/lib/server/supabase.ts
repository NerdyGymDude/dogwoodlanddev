import { createServerClient } from '@supabase/ssr';
import {
	PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	PUBLIC_SUPABASE_URL
} from '$env/static/public';
import type { RequestEvent } from '@sveltejs/kit';

export function createSupabaseServerClient(event: RequestEvent) {
	return createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return event.cookies.getAll();
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) => {
							event.cookies.set(name, value, {
								...options,
								path: '/'
							});
						});
					} catch {
						// The response may already have been generated.
						// In that case SvelteKit can no longer write refreshed auth cookies.
					}
				}
			}
		}
	);
}
