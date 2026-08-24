<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';

	let {
		onopenclient,
		onquickadd
	}: {
		onopenclient: (id: string) => void;
		onquickadd: () => void;
	} = $props();
</script>

<div class="page-heading">
	<div>
		<p class="eyebrow">RELATIONSHIPS</p>
		<h1>Clients</h1>
		<p>Contacts, projects, communication, and financial history.</p>
	</div>
	<button class="primary" onclick={onquickadd}>＋ Add client</button>
</div>

<div class="toolbar">
	<label>⌕ <input placeholder="Search clients…" /></label>
	<button>All clients</button>
	<button>Active projects</button>
</div>

<div class="cards">
	{#each store.clients as client}
		<button class="client-card" onclick={() => onopenclient(client.id)}>
			<div class="card-top">
				<div class="monogram">
					{client.name
						.split(' ')
						.map((part) => part[0])
						.slice(0, 2)
						.join('')}
				</div>
				<span>{client.type}</span>
			</div>

			<h3>{client.name}</h3>
			<p>{client.contacts[0]?.name} · {client.contacts[0]?.role}</p>

			<dl>
				<div>
					<dt>Projects</dt>
					<dd>{client.projectIds.length}</dd>
				</div>
				<div>
					<dt>Open actions</dt>
					<dd>
						{store.actions.filter(
							(action) => action.clientId === client.id && action.state !== 'Done'
						).length}
					</dd>
				</div>
			</dl>

			<footer>
				<span>{client.email}</span>
				<b>View →</b>
			</footer>
		</button>
	{/each}
</div>
