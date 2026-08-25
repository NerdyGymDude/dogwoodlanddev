<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import type { ActionState, Project } from '$lib/admin/types';

	let {
		project,
		ongoback,
		onopenclient,
		onaddtask,
		onedit,
		money
	}: {
		project: Project;
		ongoback: () => void;
		onopenclient: (id: string) => void;
		onaddtask: () => void;
		onedit: () => void;
		money: (value: number) => string;
	} = $props();
</script>

<button class="back" onclick={ongoback}>← All projects</button>

<div class="project-hero">
	<div>
		<div class="tags">
			<span class="status {project.status.toLowerCase()}">{project.status}</span>
			<span>{project.phase}</span>
		</div>

		<h1>{project.name}</h1>

		<button class="link" onclick={() => onopenclient(project.clientId)}>
			{store.clients.find((client) => client.id === project.clientId)?.name}
		</button>

		<p>{project.address}</p>
	</div>

	<div class="hero-actions">
		<button onclick={onaddtask}>＋ Task</button>
		<button class="primary" onclick={onedit}>Edit project</button>
	</div>
</div>

<div class="project-status">
	<div>
		<span>WAITING ON</span>
		<strong>{project.waitingOn || 'Nothing — work may proceed'}</strong>
	</div>
	<div>
		<span>NEXT MILESTONE</span>
		<strong>{project.nextMilestone}</strong>
	</div>
	<div>
		<span>LAST ACTIVITY</span>
		<strong>{project.lastActivity}</strong>
	</div>
</div>

<div class="tabs">
	<button class="active">Overview</button>
	<button>Actions</button>
	<button>Timeline</button>
	<button>Parcels</button>
	<button>Permits</button>
	<button>Team</button>
	<button>Documents</button>
	<button>Financials</button>
</div>

<div class="record-grid">
	<section class="panel span2">
		<div class="panel-head">
			<h2>Open actions</h2>
			<button onclick={onaddtask}>＋ Add action</button>
		</div>

		{#each store.actions.filter(
			(action) => action.projectId === project.id && action.state !== 'Done'
		) as action}
			<div class="mini-action">
				<span class:urgent={action.priority === 'High'}></span>

				<div>
					<strong>{action.title}</strong>
					<p>{action.due} · {action.state}</p>
				</div>

				<select
					value={action.state}
					onchange={(event) =>
						store.setAction(action.id, event.currentTarget.value as ActionState)}
				>
					<option>New</option>
					<option>Needs Action</option>
					<option>Waiting</option>
					<option>Done</option>
				</select>
			</div>
		{/each}
	</section>

	<section class="panel">
		<h2>Project summary</h2>
		<p>{project.summary}</p>

		<div class="detail-list">
			<div><span>Project value</span><strong>{money(project.budget)}</strong></div>
			<div><span>Invoiced</span><strong>{money(project.invoiced)}</strong></div>
			<div><span>Costs to date</span><strong>{money(project.costs)}</strong></div>
		</div>
	</section>
</div>
