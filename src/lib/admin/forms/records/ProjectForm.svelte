<script lang="ts">
	import AttachmentsField from '../AttachmentsField.svelte';
	import MoneyInput from '../MoneyInput.svelte';
	import FormField from '../FormField.svelte';
	import FormGrid from '../FormGrid.svelte';
	import FormSection from '../FormSection.svelte';
	import type { ProjectFormData } from '../types';

	let {
		value,
		clients = [],
		clientLocked = false
	}: {
		value: ProjectFormData;
		clients?: Array<{ id: string; name: string }>;
		clientLocked?: boolean;
	} = $props();

	const selectedClient = $derived(clients.find((client) => client.id === value.clientId));
</script>

<FormSection
	title="Basic Information"
	description="Create the project and connect it to the appropriate Dogwood client."
>
	<FormGrid>
		<FormField label="Client" forId="project-client" required>
			{#if clientLocked}
				<div class="read-only-value" id="project-client">{selectedClient?.name ?? 'Client unavailable'}</div>
			{:else}
				<select id="project-client" bind:value={value.clientId} aria-required="true">
					<option value="">No client selected</option>
					{#each clients as client}
						<option value={client.id}>{client.name}</option>
					{/each}
				</select>
			{/if}
		</FormField>

		<FormField label="Project Name" forId="project-name" required>
			<input
				id="project-name"
				bind:value={value.title}
				placeholder="Project name"
				required
			/>
		</FormField>

	</FormGrid>

	<FormField label="Description" forId="project-description">
		<textarea
			id="project-description"
			bind:value={value.description}
			placeholder="Project scope and general description"
		></textarea>
	</FormField>

	<FormField label="Internal Notes" forId="project-notes">
		<textarea
			id="project-notes"
			bind:value={value.notes}
			placeholder="Internal notes or follow-up information"
		></textarea>
	</FormField>
</FormSection>

<FormSection title="Project Details">
	<FormGrid>
		<FormField label="Project Type" forId="project-type">
			<select id="project-type" bind:value={value.projectType}>
				<option value="">Select project type</option>
				<option>Residential Development</option>
				<option>Commercial Development</option>
				<option>Industrial Development</option>
				<option>Site Planning</option>
				<option>Stormwater</option>
				<option>Onsite Wastewater</option>
				<option>Mine / Borrow Pit</option>
				<option>Permitting</option>
				<option>Other</option>
			</select>
		</FormField>

		<FormField label="Start Date" forId="project-start">
			<input id="project-start" type="date" bind:value={value.startDate} />
		</FormField>

		<FormField label="Target Completion" forId="project-target">
			<input id="project-target" type="date" bind:value={value.targetCompletionDate} />
		</FormField>

		<FormField label="Estimate" forId="project-estimate">
			<MoneyInput
				id="project-estimate"
				bind:value={value.budget}
				placeholder="0.00"
			/>
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Project Location">
	<FormField label="Street / Site Address" forId="project-address">
		<input id="project-address" bind:value={value.address} />
	</FormField>

	<FormGrid columns={3}>
		<FormField label="City" forId="project-city">
			<input id="project-city" bind:value={value.city} />
		</FormField>

		<FormField label="State" forId="project-state">
			<input id="project-state" bind:value={value.state} />
		</FormField>

		<FormField label="ZIP" forId="project-zip">
			<input id="project-zip" bind:value={value.zip} />
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Attachments" description="Optional files associated with this project.">
	<AttachmentsField bind:files={value.attachments} />
</FormSection>

<style>
	.read-only-value {
		min-height: 44px;
		box-sizing: border-box;
		border: 1px solid #dfe5df;
		border-radius: .65rem;
		background: #f6f8f5;
		padding: .72rem .8rem;
		color: #34483a;
	}
</style>
