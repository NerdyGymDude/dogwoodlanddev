import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	EventFormData,
	ProjectFormData,
	TaskFormData
} from '$lib/admin/forms/types';

function validUuid(value: string | undefined | null) {
	return Boolean(
		value &&
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				value
			)
	);
}

export interface AdminProjectRecord {
	id: string;
	clientId: string;
	name: string;
	projectNumber: string;
	projectType: string;
	status: string;
	phase: string;
	description: string;
	notes: string;
	address: string;
	city: string;
	state: string;
	zip: string;
	startDate: string;
	targetCompletionDate: string;
	budget: number;
	assignedTo: string;
	clientVisible: boolean;
	createdDate: string;
}

export interface AdminTaskRecord {
	id: string;
	clientId: string;
	projectId: string;
	title: string;
	description: string;
	notes: string;
	dueDate: string;
	priority: string;
	status: string;
	assignedTo: string;
	clientVisible: boolean;
}

export interface AdminEventRecord {
	id: string;
	clientId: string;
	projectId: string;
	title: string;
	description: string;
	notes: string;
	eventType: string;
	location: string;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	status: string;
	assignedTo: string;
	clientVisible: boolean;
}

function mapProject(row: any): AdminProjectRecord {
	return {
		id: row.id,
		clientId: row.client_id ?? '',
		name: row.name,
		projectNumber: row.project_number ?? '',
		projectType: row.project_type ?? '',
		status: row.status ?? 'new',
		phase: row.phase ?? 'New',
		description: row.description ?? '',
		notes: row.notes ?? '',
		address: row.address ?? '',
		city: row.city ?? '',
		state: row.state ?? '',
		zip: row.zip ?? '',
		startDate: row.start_date ?? '',
		targetCompletionDate: row.target_completion_date ?? '',
		budget: Number(row.budget ?? 0),
		assignedTo: row.assigned_to ?? '',
		clientVisible: Boolean(row.client_visible),
		createdDate: row.created_at ?? ''
	};
}

function mapTask(row: any): AdminTaskRecord {
	return {
		id: row.id,
		clientId: row.client_id ?? '',
		projectId: row.project_id ?? '',
		title: row.title,
		description: row.description ?? '',
		notes: row.notes ?? '',
		dueDate: row.due_date ?? '',
		priority: row.priority ?? 'normal',
		status: row.status ?? 'new',
		assignedTo: row.assigned_to ?? '',
		clientVisible: Boolean(row.client_visible)
	};
}

function mapEvent(row: any): AdminEventRecord {
	return {
		id: row.id,
		clientId: row.client_id ?? '',
		projectId: row.project_id ?? '',
		title: row.title,
		description: row.description ?? '',
		notes: row.notes ?? '',
		eventType: row.event_type ?? '',
		location: row.location ?? '',
		startDate: row.start_date ?? '',
		startTime: row.start_time ?? '',
		endDate: row.end_date ?? '',
		endTime: row.end_time ?? '',
		status: row.status ?? 'new',
		assignedTo: row.assigned_to ?? '',
		clientVisible: Boolean(row.client_visible)
	};
}

export async function getProjects(supabase: SupabaseClient) {
	const { data, error } = await supabase
		.from('projects')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) throw error;

	return (data ?? []).map(mapProject);
}

export async function getTasks(supabase: SupabaseClient) {
	const { data, error } = await supabase
		.from('tasks')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) throw error;

	return (data ?? []).map(mapTask);
}

export async function getEvents(supabase: SupabaseClient) {
	const { data, error } = await supabase
		.from('calendar_events')
		.select('*')
		.order('start_date', { ascending: true });

	if (error) throw error;

	return (data ?? []).map(mapEvent);
}

export async function createProject(
	supabase: SupabaseClient,
	userId: string,
	form: ProjectFormData
) {
	const name = form.title.trim();

	if (!name) throw new Error('Project name is required.');
	if (!validUuid(form.clientId)) throw new Error('A valid client is required.');

	const { data: client, error: clientError } = await supabase
		.from('clients')
		.select('short_name')
		.eq('id', form.clientId)
		.single();

	if (clientError) throw clientError;

	const shortName = String(client.short_name ?? '').trim();
	if (!shortName) throw new Error('The selected client does not have a Short Name.');

	const normalizedShortName = shortName.replace(/\s+/g, '-');
	const identifierPrefix = `DLD-${normalizedShortName}-`;
	const identifierPattern = new RegExp(
		`^${identifierPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`,
		'i'
	);

	for (let attempt = 0; attempt < 5; attempt += 1) {
		const { data: history, error: historyError } = await supabase
			.from('projects')
			.select('project_number')
			.eq('client_id', form.clientId)
			.not('project_number', 'is', null);

		if (historyError) throw historyError;

		const nextSequence = (history ?? []).reduce((highest, row) => {
			const match = String(row.project_number ?? '').match(identifierPattern);
			return match ? Math.max(highest, Number(match[1])) : highest;
		}, 0) + 1;
		const projectNumber = `${identifierPrefix}${String(nextSequence).padStart(3, '0')}`;

		const { data, error } = await supabase
			.from('projects')
			.insert({
			client_id: form.clientId,
			name,
			project_number: projectNumber,
			project_type: form.projectType.trim() || null,
			status: form.status,
			phase: 'New',
			description: form.description.trim() || null,
			notes: form.notes.trim() || null,
			address: form.address.trim() || null,
			city: form.city.trim() || null,
			state: form.state.trim() || null,
			zip: form.zip.trim() || null,
			start_date: form.startDate || null,
			target_completion_date: form.targetCompletionDate || null,
			budget: Number(String(form.budget).replace(/[$,]/g, '')) || 0,
			assigned_to: form.assignedTo || null,
			client_visible: form.clientVisible,
			created_by: userId
			})
			.select('*')
			.single();

		if (!error) return mapProject(data);
		if (error.code !== '23505') throw error;
	}

	throw new Error('Unable to reserve a unique Project ID. Please try again.');
}

export async function createTask(
	supabase: SupabaseClient,
	userId: string,
	form: TaskFormData
) {
	if (!form.title.trim()) throw new Error('Task title is required.');

	const { data, error } = await supabase
		.from('tasks')
		.insert({
			client_id: validUuid(form.clientId) ? form.clientId : null,
			project_id: validUuid(form.projectId) ? form.projectId : null,
			title: form.title.trim(),
			description: form.description.trim() || null,
			notes: form.notes.trim() || null,
			due_date: form.dueDate || null,
			priority: form.priority,
			status: form.status,
			assigned_to: form.assignedTo || null,
			client_visible: form.clientVisible,
			created_by: userId
		})
		.select('*')
		.single();

	if (error) throw error;

	return mapTask(data);
}

export async function createEvent(
	supabase: SupabaseClient,
	userId: string,
	form: EventFormData
) {
	if (!form.title.trim()) throw new Error('Event title is required.');
	if (!form.startDate) throw new Error('Event start date is required.');

	const { data, error } = await supabase
		.from('calendar_events')
		.insert({
			client_id: validUuid(form.clientId) ? form.clientId : null,
			project_id: validUuid(form.projectId) ? form.projectId : null,
			title: form.title.trim(),
			description: form.description.trim() || null,
			notes: form.notes.trim() || null,
			event_type: form.eventType.trim() || null,
			location: form.location.trim() || null,
			start_date: form.startDate,
			start_time: form.startTime || null,
			end_date: form.endDate || null,
			end_time: form.endTime || null,
			status: form.status,
			assigned_to: form.assignedTo || null,
			client_visible: form.clientVisible,
			created_by: userId
		})
		.select('*')
		.single();

	if (error) throw error;

	return mapEvent(data);
}
