<script lang="ts">
	import AttachmentsField from '../AttachmentsField.svelte';
	import FormField from '../FormField.svelte';
	import FormGrid from '../FormGrid.svelte';
	import FormSection from '../FormSection.svelte';
	import type { ClientFormData } from '../types';

	let {
		value
	}: {
		value: ClientFormData;
	} = $props();
</script>

<FormSection title="Client Details" description="Business or individual client information.">
	<FormGrid>
		<FormField label="Company / Client Name" forId="client-company" required>
			<input id="client-company" bind:value={value.companyName} />
		</FormField>

		<FormField label="Status" forId="client-status">
			<select id="client-status" bind:value={value.status}>
				<option value="new">New</option>
				<option value="active">Active</option>
				<option value="pending">Pending</option>
				<option value="completed">Completed</option>
				<option value="canceled">Canceled</option>
			</select>
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Primary Contact" description="Main point of contact for this client.">
	<FormGrid>
		<FormField label="Name" forId="client-primary-name">
			<input id="client-primary-name" bind:value={value.primaryContactName} />
		</FormField>

		<FormField label="Phone" forId="client-primary-phone">
			<input id="client-primary-phone" type="tel" bind:value={value.primaryContactPhone} />
		</FormField>

		<FormField label="Email" forId="client-primary-email">
			<input id="client-primary-email" type="email" bind:value={value.primaryContactEmail} />
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Secondary Contact" description="Optional additional contact.">
	<FormGrid>
		<FormField label="Name" forId="client-secondary-name">
			<input id="client-secondary-name" bind:value={value.secondaryContactName} />
		</FormField>

		<FormField label="Phone" forId="client-secondary-phone">
			<input id="client-secondary-phone" type="tel" bind:value={value.secondaryContactPhone} />
		</FormField>

		<FormField label="Email" forId="client-secondary-email">
			<input id="client-secondary-email" type="email" bind:value={value.secondaryContactEmail} />
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Tertiary Contact" description="Optional third contact.">
	<FormGrid>
		<FormField label="Name" forId="client-tertiary-name">
			<input id="client-tertiary-name" bind:value={value.tertiaryContactName} />
		</FormField>

		<FormField label="Phone" forId="client-tertiary-phone">
			<input id="client-tertiary-phone" type="tel" bind:value={value.tertiaryContactPhone} />
		</FormField>

		<FormField label="Email" forId="client-tertiary-email">
			<input id="client-tertiary-email" type="email" bind:value={value.tertiaryContactEmail} />
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Mailing Address" description="Primary mailing address for this client.">
	<FormField label="Street Address" forId="client-address">
		<input id="client-address" bind:value={value.address} />
	</FormField>

	<FormGrid columns={3}>
		<FormField label="City" forId="client-city">
			<input id="client-city" bind:value={value.city} />
		</FormField>

		<FormField label="State" forId="client-state">
			<input id="client-state" bind:value={value.state} />
		</FormField>

		<FormField label="ZIP" forId="client-zip">
			<input id="client-zip" bind:value={value.zip} />
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Internal Notes" description="Notes visible to Dogwood staff.">
	<FormField label="Notes" forId="client-notes">
		<textarea
			id="client-notes"
			rows="4"
			bind:value={value.notes}
			placeholder="Client preferences, follow-up information, or other context"
		></textarea>
	</FormField>
</FormSection>

<FormSection title="Attachments" description="Optional files associated with this client.">
	<AttachmentsField bind:files={value.attachments} />
</FormSection>
