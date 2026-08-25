<script lang="ts">
	import { adminNavigation } from './navigation';

	let {
		view,
		inboxUnreadCount,
		ongo
	}: {
		view: string;
		inboxUnreadCount: number;
		ongo: (view: string) => void;
	} = $props();

	function isActive(id: string) {
		return (
			view === id ||
			(id === 'projects' && view === 'project') ||
			(id === 'clients' && view === 'client')
		);
	}
</script>

<aside class="sidebar">
	<a class="brand" href="/admin">
		<img src="/images/dogwood-land-dev-logo-main.png" alt="Dogwood" />
		<span>ADMIN PORTAL</span>
	</a>

	<nav>
		{#each adminNavigation as item}
			<button class:active={isActive(item.id)} onclick={() => ongo(item.id)}>
				<i>{item.icon}</i>
				{item.label}

				{#if item.id === 'inbox' && inboxUnreadCount > 0}
					<b>{inboxUnreadCount}</b>
				{/if}
			</button>
		{/each}
	</nav>

	<div class="profile">
		<div class="avatar">BW</div>
		<div>
			<strong>Branch Williams</strong>
			<span>Super User</span>
		</div>
		<button>•••</button>
	</div>
</aside>
