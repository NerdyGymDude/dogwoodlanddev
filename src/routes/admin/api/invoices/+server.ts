import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import type { InvoiceFormData } from '$lib/admin/forms/types';

import { createInvoice } from '$lib/server/admin/accounting';
import { requireActiveStaff } from '$lib/server/admin/authorization';

export const POST: RequestHandler = async ({ locals, request }) => {
    const { user } = await requireActiveStaff(locals);

    try {
        const form = (await request.json()) as InvoiceFormData;
        const invoice = await createInvoice(locals.supabase, user.id, form);

        return json({ invoice }, { status: 201 });
    } catch (error) {
        console.error('Unable to create invoice:', error);

        return json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unable to create invoice.'
            },
            { status: 500 }
        );
    }
};
