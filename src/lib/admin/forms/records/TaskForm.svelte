<script lang="ts">
	import AttachmentsField from '../AttachmentsField.svelte';
	import BaseRecordFields from '../BaseRecordFields.svelte';
	import FormField from '../FormField.svelte';
	import FormGrid from '../FormGrid.svelte';
	import FormSection from '../FormSection.svelte';
	import type { TaskFormData } from '../types';

	let {
		value,
		clients = [],
		projects = [],
		users = []
	}: {
		value: TaskFormData;
		clients?: Array<{ id: string; name: string }>;
		projects?: Array<{ id: string; name: string; clientId?: string }>;
		users?: Array<{ id: string; name: string }>;
	} = $props();
</script>

<BaseRecordFields {value} {clients} {projects} {users} />

<FormSection title="Task Details">
	<FormGrid>
		<FormField label="Due Date" forId="task-due">
			<input id="task-due" type="date" bind:value={value.dueDate} />
		</FormField>

		<FormField label="Priority" forId="task-priority">
			<select id="task-priority" bind:value={value.priority}>
				<option value="low">Low</option>
				<option value="normal">Normal</option>
				<option value="high">High</option>
				<option value="urgent">Urgent</option>
			</select>
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Attachments" description="Optional files associated with this record.">
	<AttachmentsField bind:files={value.attachments} />
</FormSection>
