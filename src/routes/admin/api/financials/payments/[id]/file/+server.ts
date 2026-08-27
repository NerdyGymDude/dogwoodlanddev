import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';
import { createSupabaseAdminClient } from '$lib/server/integrations/supabase-admin';

export const GET: RequestHandler = async ({ locals, params }) => {
	await requireActiveStaff(locals);
	const admin = createSupabaseAdminClient();
	const { data, error } = await admin.from('project_payments').select('check_file_path').eq('id', params.id).eq('payment_method', 'paper_check').single();
	if (error || !data?.check_file_path) throw redirect(303, '/admin');
	const { data: signed, error: signError } = await admin.storage.from('client-documents').createSignedUrl(data.check_file_path, 60);
	if (signError || !signed?.signedUrl) throw redirect(303, '/admin');
	throw redirect(302, signed.signedUrl);
};
