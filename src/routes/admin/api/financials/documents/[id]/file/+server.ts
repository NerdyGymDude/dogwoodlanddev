import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';
import { createSupabaseAdminClient } from '$lib/server/integrations/supabase-admin';

export const GET: RequestHandler = async ({ locals, params }) => {
	await requireActiveStaff(locals);
	const admin = createSupabaseAdminClient();
	const { data } = await admin.from('financial_documents').select('pdf_storage_path').eq('id', params.id).single();
	if (!data?.pdf_storage_path) throw redirect(303, '/admin');
	const { data: signed } = await admin.storage.from('client-documents').createSignedUrl(data.pdf_storage_path, 60);
	if (!signed?.signedUrl) throw redirect(303, '/admin');
	throw redirect(302, signed.signedUrl);
};
