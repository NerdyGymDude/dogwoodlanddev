import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';

export const GET: RequestHandler = async ({ locals }) => {
	await requireActiveStaff(locals);
	const { data, error } = await locals.supabase
		.from('client_invoice_emails')
		.select('client_id, email')
		.order('created_at', { ascending: false });
	if (error) return json({ error: 'Unable to load saved invoice emails.' }, { status: 500 });
	return json({ emails: data ?? [] });
};
