import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientFormData } from '$lib/admin/forms/types';

export interface AdminClientRecord {
	id: string;
	name: string;
	status: string;
	address: string;
	city: string;
	state: string;
	zip: string;
	notes: string;
	primaryContactName: string;
	primaryContactPhone: string;
	primaryContactEmail: string;
	secondaryContactName: string;
	secondaryContactPhone: string;
	secondaryContactEmail: string;
	tertiaryContactName: string;
	tertiaryContactPhone: string;
	tertiaryContactEmail: string;
}

interface ClientContactRow {
	contact_type: 'primary' | 'secondary' | 'tertiary';
	name: string | null;
	phone: string | null;
	email: string | null;
}

interface ClientRow {
	id: string;
	name: string;
	status: string;
	address: string | null;
	city: string | null;
	state: string | null;
	zip: string | null;
	notes: string | null;
	client_contacts?: ClientContactRow[] | null;
}

function contactFor(
	contacts: ClientContactRow[] | null | undefined,
	type: ClientContactRow['contact_type']
) {
	return contacts?.find((contact) => contact.contact_type === type);
}

function mapClient(row: ClientRow): AdminClientRecord {
	const primary = contactFor(row.client_contacts, 'primary');
	const secondary = contactFor(row.client_contacts, 'secondary');
	const tertiary = contactFor(row.client_contacts, 'tertiary');

	return {
		id: row.id,
		name: row.name,
		status: row.status,
		address: row.address ?? '',
		city: row.city ?? '',
		state: row.state ?? '',
		zip: row.zip ?? '',
		notes: row.notes ?? '',

		primaryContactName: primary?.name ?? '',
		primaryContactPhone: primary?.phone ?? '',
		primaryContactEmail: primary?.email ?? '',

		secondaryContactName: secondary?.name ?? '',
		secondaryContactPhone: secondary?.phone ?? '',
		secondaryContactEmail: secondary?.email ?? '',

		tertiaryContactName: tertiary?.name ?? '',
		tertiaryContactPhone: tertiary?.phone ?? '',
		tertiaryContactEmail: tertiary?.email ?? ''
	};
}

export async function getClients(
	supabase: SupabaseClient
): Promise<AdminClientRecord[]> {
	const { data, error } = await supabase
		.from('clients')
		.select(`
			id,
			name,
			status,
			address,
			city,
			state,
			zip,
			notes,
			client_contacts (
				contact_type,
				name,
				phone,
				email
			)
		`)
		.order('created_at', { ascending: false });

	if (error) {
		throw error;
	}

	return (data ?? []).map((row) => mapClient(row as ClientRow));
}

function hasContact(name: string, phone: string, email: string) {
	return Boolean(name.trim() || phone.trim() || email.trim());
}

export async function createClient(
	supabase: SupabaseClient,
	userId: string,
	form: ClientFormData
): Promise<AdminClientRecord> {
	const name = form.companyName.trim();

	if (!name) {
		throw new Error('Client name is required.');
	}

	const { data: client, error: clientError } = await supabase
		.from('clients')
		.insert({
			name,
			status: form.status,
			address: form.address.trim() || null,
			city: form.city.trim() || null,
			state: form.state.trim() || null,
			zip: form.zip.trim() || null,
			notes: form.notes.trim() || null,
			created_by: userId
		})
		.select('id')
		.single();

	if (clientError) {
		throw clientError;
	}

	const contacts = [
		{
			type: 'primary' as const,
			name: form.primaryContactName,
			phone: form.primaryContactPhone,
			email: form.primaryContactEmail
		},
		{
			type: 'secondary' as const,
			name: form.secondaryContactName,
			phone: form.secondaryContactPhone,
			email: form.secondaryContactEmail
		},
		{
			type: 'tertiary' as const,
			name: form.tertiaryContactName,
			phone: form.tertiaryContactPhone,
			email: form.tertiaryContactEmail
		}
	]
		.filter((contact) => hasContact(contact.name, contact.phone, contact.email))
		.map((contact) => ({
			client_id: client.id,
			contact_type: contact.type,
			name: contact.name.trim() || null,
			phone: contact.phone.trim() || null,
			email: contact.email.trim() || null
		}));

	if (contacts.length) {
		const { error: contactError } = await supabase
			.from('client_contacts')
			.insert(contacts);

		if (contactError) {
			// Avoid leaving an incomplete client if contact creation fails.
			await supabase.from('clients').delete().eq('id', client.id);
			throw contactError;
		}
	}

	const { data: created, error: createdError } = await supabase
		.from('clients')
		.select(`
			id,
			name,
			status,
			address,
			city,
			state,
			zip,
			notes,
			client_contacts (
				contact_type,
				name,
				phone,
				email
			)
		`)
		.eq('id', client.id)
		.single();

	if (createdError) {
		throw createdError;
	}

	return mapClient(created as ClientRow);
}
