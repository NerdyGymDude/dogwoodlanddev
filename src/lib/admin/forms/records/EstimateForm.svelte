<script lang="ts">
	import AttachmentsField from '../AttachmentsField.svelte';
	import MoneyInput from '../MoneyInput.svelte';
	import BaseRecordFields from '../BaseRecordFields.svelte';
	import FormField from '../FormField.svelte';
	import FormGrid from '../FormGrid.svelte';
	import FormSection from '../FormSection.svelte';
	import LineItemsEditor from '../LineItemsEditor.svelte';
	import type { EstimateFormData } from '../types';

	let {
		value,
		clients = [],
		projects = [],
		users = []
	}: {
		value: EstimateFormData;
		clients?: Array<{ id: string; name: string }>;
		projects?: Array<{ id: string; name: string; clientId?: string }>;
		users?: Array<{ id: string; name: string }>;
	} = $props();
</script>

<BaseRecordFields {value} {clients} {projects} {users} />

<FormSection title="Estimate Details">
	<FormGrid>
		<FormField label="Estimate Number" forId="estimate-number">
			<input id="estimate-number" bind:value={value.estimateNumber} placeholder="EST-2026-001" />
		</FormField>

		<FormField label="Valid Through" forId="estimate-valid">
			<input id="estimate-valid" type="date" bind:value={value.validThrough} />
		</FormField>

		<FormField label="Discount" forId="estimate-discount">
			<MoneyInput
				id="estimate-discount"
				bind:value={value.discount}
				placeholder="0.00"
			/>
		</FormField>

		<FormField label="Tax Rate %" forId="estimate-tax">
			<input id="estimate-tax" type="number" min="0" step="0.01" bind:value={value.taxRate} />
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Estimate Services">
	<LineItemsEditor items={value.lineItems} />
</FormSection>

<FormSection title="Attachments" description="Optional files associated with this record.">
	<AttachmentsField bind:files={value.attachments} />
</FormSection>
