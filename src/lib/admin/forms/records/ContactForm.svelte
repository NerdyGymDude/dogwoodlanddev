<script lang="ts">
	import AttachmentsField from '../AttachmentsField.svelte';
	import BaseRecordFields from '../BaseRecordFields.svelte';
	import FormField from '../FormField.svelte';
	import FormGrid from '../FormGrid.svelte';
	import FormSection from '../FormSection.svelte';
	import type { ContactFormData } from '../types';

	let {
		value,
		clients = [],
		projects = [],
		users = []
	}: {
		value: ContactFormData;
		clients?: Array<{ id: string; name: string }>;
		projects?: Array<{ id: string; name: string; clientId?: string }>;
		users?: Array<{ id: string; name: string }>;
	} = $props();
</script>

<BaseRecordFields {value} {clients} {projects} {users} />

<FormSection title="Contact Details">
	<FormGrid>
		<FormField label="First Name" forId="contact-first" required>
			<input id="contact-first" bind:value={value.firstName} />
		</FormField>

		<FormField label="Last Name" forId="contact-last" required>
			<input id="contact-last" bind:value={value.lastName} />
		</FormField>

		<FormField label="Company" forId="contact-company">
			<input id="contact-company" bind:value={value.company} />
		</FormField>

		<FormField label="Job Title / Role" forId="contact-job">
			<input id="contact-job" bind:value={value.jobTitle} />
		</FormField>

		<FormField label="Email" forId="contact-email">
			<input id="contact-email" type="email" bind:value={value.email} />
		</FormField>

		<FormField label="Phone" forId="contact-phone">
			<input id="contact-phone" type="tel" bind:value={value.phone} />
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Attachments" description="Optional files associated with this record.">
	<AttachmentsField bind:files={value.attachments} />
</FormSection>
