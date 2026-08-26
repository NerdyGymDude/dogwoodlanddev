import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ClientFormData } from '$lib/admin/forms/types';
import { createClient } from '$lib/server/admin/clients';
import { requireActiveStaff } from '$lib/server/admin/authorization';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireActiveStaff(locals);

	let form: ClientFormData;

	try {
		form = (await request.json()) as ClientFormData;
	} catch {
		return json(
			{ error: 'Invalid client data.' },
			{ status: 400 }
		);
	}

	try {
		const client = await createClient(
			locals.supabase,
			user.id,
			form
		);

		return json({ client }, { status: 201 });
	} catch (error) {
		console.error('Unable to create client:', error);

		return json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Unable to create client.'
			},
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ locals, url }) => {
	await requireActiveStaff(locals);

        const clientId = url.searchParams.get('id');

        if (!clientId) {
                return json(
                        { error: 'Client ID is required.' },
                        { status: 400 }
                );
        }

        const { error } = await locals.supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

        if (error) {
                console.error('Unable to delete client:', error);

                return json(
                        { error: 'Unable to delete client.' },
                        { status: 500 }
                );
        }

        return json({ ok: true });
};
