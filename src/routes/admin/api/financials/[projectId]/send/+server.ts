import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';
import { createSupabaseAdminClient } from '$lib/server/integrations/supabase-admin';
import { createAndSendInvoice } from '$lib/server/admin/invoice-documents';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireActiveStaff(locals);
	try {
		const body = await request.json();
		const document = await createAndSendInvoice(createSupabaseAdminClient(), user.id, params.projectId, Array.isArray(body.recipientContactIds) ? body.recipientContactIds : [], String(body.message ?? ''));
		return json({ document }, { status: 201 });
	} catch (error) {
		console.error('Unable to send financial invoice:', error);
		return json({ error: error instanceof Error ? error.message : 'Unable to send invoice.' }, { status: 500 });
	}
};
