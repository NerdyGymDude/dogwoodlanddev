<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';

	let {
		onopenproject,
		onquickadd,
		money
	}: {
		onopenproject: (id: string) => void;
		onquickadd: () => void;
		money: (value: number) => string;
	} = $props();
</script>

<div class="page-heading">
	<div>
		<p class="eyebrow">WORK</p>
		<h1>Projects</h1>
		<p>Every active job, its next milestone, and what’s blocking progress.</p>
	</div>

	<button class="primary" onclick={onquickadd}>＋ Create project</button>
</div>

<div class="summary-strip">
	<div>
		<strong>{store.projects.filter((project) => project.status === 'Active').length}</strong>
		<span>Active</span>
	</div>

	<div>
		<strong>{store.projects.filter((project) => project.status === 'Pending').length}</strong>
		<span>Pending</span>
	</div>

	<div>
		<strong>
			{store.actions.filter(
				(action) =>
					action.state !== 'Done' &&
					action.projectId &&
					store.projects.some((project) => project.id === action.projectId)
			).length}
		</strong>
		<span>Needs attention</span>
	</div>

	<div>
		<strong>{money(store.projects.reduce((sum, project) => sum + project.budget, 0))}</strong>
		<span>Total project value</span>
	</div>
</div>

<div class="project-list">
	{#each store.projects as project}
		<button onclick={() => onopenproject(project.id)}>
			<div>
				<span class="status {project.status.toLowerCase()}">{project.status}</span>
				<small>{project.phase}</small>
				<h3>{project.name}</h3>
				<p>
					{store.clients.find((client) => client.id === project.clientId)?.name}
					· {project.address}
				</p>
			</div>

			<div class="project-metrics">
				<span>
					Next milestone
					<strong>{project.nextMilestone}</strong>
				</span>
				<span>
					Last activity
					<strong>{project.lastActivity}</strong>
				</span>
				<span>
					Open actions
					<strong>
						{store.actions.filter(
							(action) => action.projectId === project.id && action.state !== 'Done'
						).length}
					</strong>
				</span>
			</div>

			<b>→</b>
		</button>
	{/each}
</div>
