import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SECRET_KEY } from '$env/static/private';

/**
 * Server-only Supabase client for trusted integrations.
 * Never import this into browser/client-side code.
 */
export function createSupabaseAdminClient() {
	return createClient(
		PUBLIC_SUPABASE_URL,
		SUPABASE_SECRET_KEY,
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		}
	);
}
