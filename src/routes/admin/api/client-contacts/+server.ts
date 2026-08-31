import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';

export const POST: RequestHandler = async ({ locals, request }) => {
	await requireActiveStaff(locals);
	const body = await request.json().catch(() => null);
	const clientId = String(body?.clientId ?? '').trim();
	const name = String(body?.name ?? '').trim();
	const email = String(body?.email ?? '').trim().toLowerCase();
	const phone = String(body?.phone ?? '').trim();
	const requestedType = String(body?.contactType ?? '').trim();
	if (!clientId || (!name && !email && !phone)) return json({ error: 'Enter at least one contact detail.' }, { status: 400 });
	if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, { status: 400 });

	if (!['primary', 'secondary'].includes(requestedType)) return json({ error: 'Select Primary or Secondary.' }, { status: 400 });
	const { data: existing, error: loadError } = await locals.supabase.from('client_contacts').select('contact_type').eq('client_id', clientId);
	if (loadError) return json({ error: 'Unable to load client contacts.' }, { status: 500 });
	const contactType = existing?.length === 0 ? 'primary' : requestedType;
	if (contactType === 'primary' && existing?.some((contact) => contact.contact_type === 'primary')) return json({ error: 'This client already has a Primary contact.' }, { status: 409 });

	const { data, error } = await locals.supabase.from('client_contacts').insert({ client_id: clientId, contact_type: contactType, name: name || null, email: email || null, phone: phone || null }).select('id, name, email, phone, contact_type').single();
	if (error?.code === '23505') return json({ error: 'This client already has a Primary contact.' }, { status: 409 });
	if (error) return json({ error: 'Unable to add contact.' }, { status: 500 });
	return json({ contact: data }, { status: 201 });
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	await requireActiveStaff(locals);
	const body = await request.json().catch(() => null), clientId = String(body?.clientId ?? '').trim(), contactId = String(body?.contactId ?? '').trim(), name = String(body?.name ?? '').trim(), email = String(body?.email ?? '').trim().toLowerCase(), phone = String(body?.phone ?? '').trim(), contactType = String(body?.contactType ?? '').trim();
	if (!clientId || !contactId || (!name && !email && !phone)) return json({ error: 'Enter at least one contact detail.' }, { status: 400 });
	if (!['primary', 'secondary'].includes(contactType)) return json({ error: 'Select Primary or Secondary.' }, { status: 400 });
	if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, { status: 400 });
	const { data, error } = await locals.supabase.from('client_contacts').update({ name: name || null, email: email || null, phone: phone || null, contact_type: contactType }).eq('id', contactId).eq('client_id', clientId).select('id, name, email, phone, contact_type').maybeSingle();
	if (error?.code === '23505') return json({ error: 'This client already has a Primary contact.' }, { status: 409 });
	if (error) return json({ error: 'Unable to update contact.' }, { status: 500 });
	if (!data) return json({ error: 'Contact not found.' }, { status: 404 });
	return json({ contact: data });
};

export const DELETE: RequestHandler = async ({ locals, url }) => {
	await requireActiveStaff(locals);
	const clientId = String(url.searchParams.get('clientId') ?? '').trim(), contactId = String(url.searchParams.get('id') ?? '').trim();
	if (!clientId || !contactId) return json({ error: 'Client and contact IDs are required.' }, { status: 400 });
	const { data, error } = await locals.supabase.from('client_contacts').delete().eq('id', contactId).eq('client_id', clientId).select('id').maybeSingle();
	if (error?.code === '23503') return json({ error: 'This contact is in use and cannot be removed.' }, { status: 409 });
	if (error) return json({ error: 'Unable to remove contact.' }, { status: 500 });
	if (!data) return json({ error: 'Contact not found.' }, { status: 404 });
	return json({ ok: true });
};
