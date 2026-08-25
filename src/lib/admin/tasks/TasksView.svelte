<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import ModuleHeading from '$lib/admin/ModuleHeading.svelte';

	let {
		onopenproject,
		onquickadd
	}: {
		onopenproject: (id: string) => void;
		onquickadd: () => void;
	} = $props();
</script>

<ModuleHeading
	eyebrow="WORK QUEUE"
	title="Tasks"
	description="Simple, linked work items across clients and projects."
	action="Create task"
	onclick={onquickadd}
/>

<div class="data-list">
	<div class="data-head">
		<span>Task</span>
		<span>Related to</span>
		<span>Due</span>
		<span>Priority</span>
		<span>Status</span>
	</div>

	{#each store.tasks as task}
		<div>
			<strong>{task.title}</strong>

			<button onclick={() => task.projectId && onopenproject(task.projectId)}>
				{store.projects.find((project) => project.id === task.projectId)?.name || 'General'}
			</button>

			<span>{task.due}</span>

			<span class:danger={task.priority === 'High'}>
				{task.priority}
			</span>

			<select bind:value={task.status}>
				<option>Open</option>
				<option>In progress</option>
				<option>Waiting</option>
				<option>Done</option>
			</select>
		</div>
	{/each}
</div>
