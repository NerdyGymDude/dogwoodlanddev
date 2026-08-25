<script lang="ts">
	import AttachmentsField from '../AttachmentsField.svelte';
	import BaseRecordFields from '../BaseRecordFields.svelte';
	import FormField from '../FormField.svelte';
	import FormSection from '../FormSection.svelte';
	import type { NoteFormData } from '../types';

	let {
		value,
		clients = [],
		projects = [],
		users = []
	}: {
		value: NoteFormData;
		clients?: Array<{ id: string; name: string }>;
		projects?: Array<{ id: string; name: string; clientId?: string }>;
		users?: Array<{ id: string; name: string }>;
	} = $props();
</script>

<BaseRecordFields {value} {clients} {projects} {users} />

<FormSection title="Note Details">
	<FormField label="Note Type" forId="note-type">
		<select id="note-type" bind:value={value.noteType}>
			<option value="">Select note type</option>
			<option>General</option>
			<option>Client Communication</option>
			<option>Project Update</option>
			<option>Site Visit</option>
			<option>Agency / Permitting</option>
			<option>Accounting</option>
			<option>Internal</option>
		</select>
	</FormField>
</FormSection>

<FormSection title="Attachments" description="Optional files associated with this record.">
	<AttachmentsField bind:files={value.attachments} />
</FormSection>
