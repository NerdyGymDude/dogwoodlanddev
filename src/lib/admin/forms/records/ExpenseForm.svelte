<script lang="ts">
	import AttachmentsField from '../AttachmentsField.svelte';
	import MoneyInput from '../MoneyInput.svelte';
	import BaseRecordFields from '../BaseRecordFields.svelte';
	import FormField from '../FormField.svelte';
	import FormGrid from '../FormGrid.svelte';
	import FormSection from '../FormSection.svelte';
	import type { ExpenseFormData } from '../types';

	let {
		value,
		clients = [],
		projects = [],
		users = [],
		vendors = []
	}: {
		value: ExpenseFormData;
		clients?: Array<{ id: string; name: string }>;
		projects?: Array<{ id: string; name: string; clientId?: string }>;
		users?: Array<{ id: string; name: string }>;
		vendors?: Array<{ id: string; name: string }>;
	} = $props();

	function receiptChanged(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		value.receiptFile = input.files?.[0] ?? null;
	}
</script>

<BaseRecordFields {value} {clients} {projects} {users} />

<FormSection title="Expense Details">
	<FormGrid>
		<FormField label="Vendor" forId="expense-vendor">
			<select id="expense-vendor" bind:value={value.vendorId}>
				<option value="">Select vendor</option>
				{#each vendors as vendor}
					<option value={vendor.id}>{vendor.name}</option>
				{/each}
			</select>
		</FormField>

		<FormField label="Amount" forId="expense-amount" required>
			<MoneyInput
				id="expense-amount"
				bind:value={value.amount}
				placeholder="0.00"
				required
			/>
		</FormField>

		<FormField label="Expense Date" forId="expense-date">
			<input id="expense-date" type="date" bind:value={value.expenseDate} />
		</FormField>

		<FormField label="Category" forId="expense-category">
			<select id="expense-category" bind:value={value.category}>
				<option value="">Select category</option>
				<option>Engineering / Consulting</option>
				<option>Surveying</option>
				<option>Permitting / Government Fees</option>
				<option>Materials</option>
				<option>Travel / Mileage</option>
				<option>Equipment</option>
				<option>Software</option>
				<option>Office</option>
				<option>Subcontractor</option>
				<option>Other</option>
			</select>
		</FormField>

		<FormField label="Payment Method" forId="expense-payment">
			<select id="expense-payment" bind:value={value.paymentMethod}>
				<option value="">Select payment method</option>
				<option>Business Card</option>
				<option>ACH / Bank</option>
				<option>Check</option>
				<option>Cash</option>
				<option>Personal Reimbursement</option>
				<option>Other</option>
			</select>
		</FormField>
	</FormGrid>
</FormSection>

<FormSection
	title="Receipt / Supporting Document"
	description="Attach a receipt, vendor invoice, photo, or other supporting document."
>
	<label class="upload">
		<span class="icon">⇧</span>
		<strong>{value.receiptFile?.name ?? 'Choose receipt or document'}</strong>
		<small>PDF, image, spreadsheet, or document</small>
		<input type="file" onchange={receiptChanged} />
	</label>
</FormSection>

<style>
	.upload {
		display: grid;
		justify-items: center;
		gap: 0.25rem;
		padding: 1.5rem;
		border: 1px dashed #b8c4b7;
		border-radius: 0.8rem;
		background: #f8faf7;
		text-align: center;
		cursor: pointer;
	}

	.upload input {
		width: 100%;
		margin-top: 0.65rem;
	}

	.icon {
		font-size: 1.5rem;
		color: #5c7350;
	}

	.upload small {
		color: #788279;
	}
</style>

<FormSection title="Attachments" description="Optional files associated with this record.">
	<AttachmentsField bind:files={value.attachments} />
</FormSection>
