<script lang="ts">
	import AttachmentsField from '../AttachmentsField.svelte';
	import MoneyInput from '../MoneyInput.svelte';
	import BaseRecordFields from '../BaseRecordFields.svelte';
	import FormField from '../FormField.svelte';
	import FormGrid from '../FormGrid.svelte';
	import FormSection from '../FormSection.svelte';
	import LineItemsEditor from '../LineItemsEditor.svelte';
	import type { InvoiceFormData } from '../types';

	let {
		value,
		clients = [],
		projects = [],
		users = []
	}: {
		value: InvoiceFormData;
		clients?: Array<{ id: string; name: string }>;
		projects?: Array<{ id: string; name: string; clientId?: string }>;
		users?: Array<{ id: string; name: string }>;
	} = $props();
</script>

<BaseRecordFields {value} {clients} {projects} {users} />

<FormSection title="Invoice Details">
	<FormGrid>
		<FormField label="Invoice Number" forId="invoice-number">
			<input id="invoice-number" bind:value={value.invoiceNumber} placeholder="INV-2026-001" />
		</FormField>

		<FormField label="Due Date" forId="invoice-due">
			<input id="invoice-due" type="date" bind:value={value.dueDate} />
		</FormField>

		<FormField label="Payment Status" forId="invoice-payment">
			<select id="invoice-payment" bind:value={value.paymentStatus}>
				<option value="unpaid">Unpaid</option>
				<option value="partial">Partially Paid</option>
				<option value="paid">Paid</option>
				<option value="overdue">Overdue</option>
			</select>
		</FormField>

		<FormField label="Discount" forId="invoice-discount">
			<MoneyInput
				id="invoice-discount"
				bind:value={value.discount}
				placeholder="0.00"
			/>
		</FormField>

		<FormField label="Tax Rate %" forId="invoice-tax">
			<input id="invoice-tax" type="number" min="0" step="0.01" bind:value={value.taxRate} />
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Invoice Services">
	<LineItemsEditor items={value.lineItems} />
</FormSection>

<FormSection title="Attachments" description="Optional files associated with this record.">
	<AttachmentsField bind:files={value.attachments} />
</FormSection>
