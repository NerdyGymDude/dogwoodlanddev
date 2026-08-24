<script lang="ts">
	import AttachmentsField from '../AttachmentsField.svelte';
	import BaseRecordFields from '../BaseRecordFields.svelte';
	import FormField from '../FormField.svelte';
	import FormSection from '../FormSection.svelte';
	import type { DocumentFormData } from '../types';

	let {
		value,
		clients = [],
		projects = [],
		users = []
	}: {
		value: DocumentFormData;
		clients?: Array<{ id: string; name: string }>;
		projects?: Array<{ id: string; name: string; clientId?: string }>;
		users?: Array<{ id: string; name: string }>;
	} = $props();

	function fileChanged(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		value.file = input.files?.[0] ?? null;
	}
</script>

<BaseRecordFields {value} {clients} {projects} {users} />

<FormSection title="Document Details">
	<FormField label="Document Type" forId="document-type">
		<select id="document-type" bind:value={value.documentType}>
			<option value="">Select document type</option>
			<option>Plan / Drawing</option>
			<option>Permit</option>
			<option>Report</option>
			<option>Contract</option>
			<option>Estimate</option>
			<option>Invoice</option>
			<option>Receipt</option>
			<option>Photo</option>
			<option>Correspondence</option>
			<option>Other</option>
		</select>
	</FormField>

	<label class="upload">
		<strong>{value.file?.name ?? 'Choose a file'}</strong>
		<span>Plans, permits, reports, photos, receipts, spreadsheets, and other project files</span>
		<input type="file" onchange={fileChanged} />
	</label>
</FormSection>

<style>
	.upload {
		display: grid;
		gap: 0.4rem;
		padding: 1.5rem;
		border: 1px dashed #b8c4b7;
		border-radius: 0.8rem;
		background: #f8faf7;
		text-align: center;
		cursor: pointer;
	}

	.upload span {
		font-size: 0.78rem;
		color: #788279;
	}
</style>

<FormSection title="Attachments" description="Optional files associated with this record.">
	<AttachmentsField bind:files={value.attachments} />
</FormSection>
