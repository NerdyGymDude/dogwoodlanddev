<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import ModuleHeading from '$lib/admin/ModuleHeading.svelte';

	let {
		oninvite
	}: {
		oninvite: () => void;
	} = $props();
</script>

<ModuleHeading
	eyebrow="ADMINISTRATION"
	title="Settings"
	description="People, permissions, notification preferences, and portal configuration."
	action="Invite user"
	onclick={oninvite}
/>

<div class="settings-grid">
	<nav>
		<button class="active">Users & permissions</button>
		<button>Notifications</button>
		<button>Project phases</button>
		<button>Mailboxes</button>
		<button>Organization</button>
		<button>PWA & devices</button>
	</nav>

	<section class="panel">
		<div class="panel-head">
			<div>
				<h2>Users & permissions</h2>
				<p>Role defaults plus individual overrides.</p>
			</div>
		</div>

		{#each store.users as user}
			<div class="user-row">
				<div class="avatar">
					{user.name
						.split(' ')
						.map((part) => part[0])
						.slice(0, 2)
						.join('')}
				</div>

				<div>
					<strong>{user.name}</strong>
					<span>{user.email}</span>
				</div>

				<select bind:value={user.role}>
					<option>Super User</option>
					<option>Admin</option>
					<option>Accounting</option>
					<option>User</option>
					<option>Client</option>
				</select>

				<span class="status">{user.status}</span>

				<button onclick={() => store.notify(`Permission editor opened for ${user.name}`)}>
					Permissions
				</button>
			</div>
		{/each}
	</section>
</div>
