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

	const estimatedProjects = $derived(store.projects.filter((project) => project.budget > 0));
	const totalProjectValue = $derived(
		estimatedProjects.reduce((sum, project) => sum + project.budget, 0)
	);

	function readableDate(value: string) {
		if (!value) return 'TBD';

		const date = new Date(`${value}T00:00:00`);
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric'
		}).format(date);
	}
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
		<strong>{estimatedProjects.length ? money(totalProjectValue) : 'TBD'}</strong>
		<span>Total project value</span>
	</div>
</div>

<div class="project-list">
	{#each store.projects as project}
		<button onclick={() => onopenproject(project.id)}>
			<div>
				<span class="status {project.status.toLowerCase()}">{project.status}</span>
				<small>{project.phase}</small>
				<small>{project.projectNumber}</small>
				<h3>{project.name}</h3>
				<p>
					{store.clients.find((client) => client.id === project.clientId)?.name}
					· {project.address}
				</p>
			</div>

			<div class="project-metrics">
				<span>
					Project Start Date
					<strong>{readableDate(project.startDate)}</strong>
				</span>
				<span>
					Project End Date
					<strong>{readableDate(project.targetCompletionDate)}</strong>
				</span>
				<span>
					Estimate
					<strong>{project.budget > 0 ? money(project.budget) : 'TBD'}</strong>
				</span>
			</div>

			<b>→</b>
		</button>
	{/each}
</div>
