<script lang="ts">
	import AttachmentsField from '../AttachmentsField.svelte';
	import BaseRecordFields from '../BaseRecordFields.svelte';
	import FormField from '../FormField.svelte';
	import FormGrid from '../FormGrid.svelte';
	import FormSection from '../FormSection.svelte';
	import type { EventFormData } from '../types';

	let {
		value,
		clients = [],
		projects = [],
		users = []
	}: {
		value: EventFormData;
		clients?: Array<{ id: string; name: string }>;
		projects?: Array<{ id: string; name: string; clientId?: string }>;
		users?: Array<{ id: string; name: string }>;
	} = $props();
</script>

<BaseRecordFields {value} {clients} {projects} {users} />

<FormSection title="Schedule">
	<FormGrid>
		<FormField label="Event Type" forId="event-type">
			<select id="event-type" bind:value={value.eventType}>
				<option value="">Select event type</option>
				<option>Meeting</option>
				<option>Site Visit</option>
				<option>Inspection</option>
				<option>Deadline</option>
				<option>Permit / Agency</option>
				<option>Client Meeting</option>
				<option>Other</option>
			</select>
		</FormField>

		<FormField label="Location" forId="event-location">
			<input id="event-location" bind:value={value.location} />
		</FormField>

		<FormField label="Start Date" forId="event-start-date">
			<input id="event-start-date" type="date" bind:value={value.startDate} />
		</FormField>

		<FormField label="Start Time" forId="event-start-time">
			<input id="event-start-time" type="time" bind:value={value.startTime} />
		</FormField>

		<FormField label="End Date" forId="event-end-date">
			<input id="event-end-date" type="date" bind:value={value.endDate} />
		</FormField>

		<FormField label="End Time" forId="event-end-time">
			<input id="event-end-time" type="time" bind:value={value.endTime} />
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Attachments" description="Optional files associated with this record.">
	<AttachmentsField bind:files={value.attachments} />
</FormSection>
