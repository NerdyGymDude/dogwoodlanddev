<script lang="ts">
	import FormField from './FormField.svelte';
	import FormGrid from './FormGrid.svelte';
	import FormSection from './FormSection.svelte';
	import type { AdminFormBase } from './types';

	let {
		value,
		clients = [],
		projects = [],
		users = []
	}: {
		value: AdminFormBase;
		clients?: Array<{ id: string; name: string }>;
		projects?: Array<{ id: string; name: string; clientId?: string }>;
		users?: Array<{ id: string; name: string }>;
	} = $props();

	const visibleProjects = $derived(
		value.clientId
			? projects.filter((project) => !project.clientId || project.clientId === value.clientId)
			: projects
	);
</script>

<FormSection
	title="Basic Information"
	description="Connect this record to the appropriate Dogwood client and project."
>
	<FormGrid>
		<FormField label="Client" forId="record-client">
			<select id="record-client" bind:value={value.clientId}>
				<option value="">No client selected</option>
				{#each clients as client}
					<option value={client.id}>{client.name}</option>
				{/each}
			</select>
		</FormField>

		<FormField label="Project" forId="record-project">
			<select id="record-project" bind:value={value.projectId}>
				<option value="">No project selected</option>
				{#each visibleProjects as project}
					<option value={project.id}>{project.name}</option>
				{/each}
			</select>
		</FormField>

		<FormField label="Title / Subject" forId="record-title" required>
			<input
				id="record-title"
				type="text"
				bind:value={value.title}
				placeholder="Enter a clear title"
			/>
		</FormField>

		<FormField label="Date" forId="record-date">
			<input id="record-date" type="date" bind:value={value.date} />
		</FormField>

		<FormField label="Status" forId="record-status">
			<select id="record-status" bind:value={value.status}>
				<option value="new">New</option>
				<option value="draft">Draft</option>
				<option value="active">Active</option>
				<option value="pending">Pending</option>
				<option value="completed">Completed</option>
				<option value="canceled">Canceled</option>
			</select>
		</FormField>

		<FormField label="Assigned To" forId="record-assigned">
			<select id="record-assigned" bind:value={value.assignedTo}>
				<option value="">Unassigned</option>
				{#each users as user}
					<option value={user.id}>{user.name}</option>
				{/each}
			</select>
		</FormField>
	</FormGrid>

	<FormField label="Description" forId="record-description">
		<textarea
			id="record-description"
			bind:value={value.description}
			placeholder="What is this for?"
		></textarea>
	</FormField>

	<FormField label="Internal Notes" forId="record-notes">
		<textarea
			id="record-notes"
			bind:value={value.notes}
			placeholder="Internal notes, follow-up information, or context"
		></textarea>
	</FormField>

	<label class="share-toggle">
		<input type="checkbox" bind:checked={value.clientVisible} />
		<span>
			<strong>Share with client</strong>
			<small>Allow this item to appear in the Client Portal when applicable.</small>
		</span>
	</label>
</FormSection>

<style>
	.share-toggle {
		display: flex;
		align-items: flex-start;
		gap: 0.7rem;
		padding: 0.85rem;
		border: 1px solid #e0e5df;
		border-radius: 0.7rem;
		background: #f8faf7;
		cursor: pointer;
	}

	.share-toggle input {
		margin-top: 0.2rem;
	}

	.share-toggle span {
		display: grid;
		gap: 0.15rem;
	}

	.share-toggle strong {
		font-size: 0.84rem;
		color: #314336;
	}

	.share-toggle small {
		font-size: 0.75rem;
		line-height: 1.4;
		color: #737d75;
	}
</style>
