<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import type { Client } from '$lib/admin/types';

	let {
		client,
		ongoback,
		onopenproject,
		onemail,
		onedit,
		onremove,
		oncreateproject
	}: {
		client: Client;
		ongoback: () => void;
		onopenproject: (id: string) => void;
		onemail: () => void;
		onedit: () => void;
		onremove: () => void;
		oncreateproject: () => void;
	} = $props();
</script>

<button class="back" onclick={ongoback}>← All clients</button>

<div class="record-hero">
	<div class="monogram large">
		{client.name
			.split(' ')
			.map((part) => part[0])
			.slice(0, 2)
			.join('')}
	</div>

	<div>
		<span class="status">{client.type}</span>
		<h1>{client.name}</h1>
		<p>{client.address}</p>
	</div>

	<div class="hero-actions">
		<button onclick={onemail}>✉ Email</button>
		<button class="primary" onclick={onedit}>Edit client</button>
                <button onclick={onremove}>Remove</button>
	</div>
</div>

<div class="record-grid">
	<section class="panel span2">
		<div class="panel-head">
			<h2>Projects</h2>
			<button onclick={oncreateproject}>＋ Create project</button>
		</div>

		{#if store.projects.some((project) => project.clientId === client.id)}
			{#each store.projects.filter((project) => project.clientId === client.id) as project}
				<button class="project-row" onclick={() => onopenproject(project.id)}>
					<div>
						<h3>{project.name}</h3>
						<p>{project.phase} · {project.address}</p>
					</div>

					<div>
						<strong>{project.nextMilestone}</strong>
						<span>Next milestone</span>
					</div>

					<b>→</b>
				</button>
			{/each}
		{/if}
	</section>

	<section class="panel">
		<div class="panel-head">
			<h2>Contacts</h2>
			<button>＋ Add</button>
		</div>

		{#each client.contacts as contact}
			<div class="contact">
				<div class="avatar">
					{contact.name
						.split(' ')
						.map((part) => part[0])
						.join('')}
				</div>

				<div>
					<strong>
						{contact.name}
						{#if contact.primary}
							<span class="primary-tag">Primary</span>
						{/if}
					</strong>
					<span>{contact.role}</span>
					<a href={`mailto:${contact.email}`}>{contact.email}</a>
					<span>{contact.phone} · Prefers {contact.preferred}</span>
				</div>
			</div>
		{/each}
	</section>

	<section class="panel">
		<h2>Client details</h2>

		<div class="detail-list">
			<div><span>Email</span><strong>{client.email}</strong></div>
			<div><span>Phone</span><strong>{client.phone}</strong></div>
			<div>
				<span>Notes</span>
				<p>{client.notes}</p>
			</div>
		</div>
	</section>
</div>
