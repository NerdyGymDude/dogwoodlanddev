<script lang="ts">
	import { mobileMoreNavigation, mobilePrimaryNavigation } from './navigation';

	let {
		view,
		inboxUnreadCount,
		moreOpen,
		ongo,
		ontogglemore,
		onquickadd
	}: {
		view: string;
		inboxUnreadCount: number;
		moreOpen: boolean;
		ongo: (view: string) => void;
		ontogglemore: () => void;
		onquickadd: () => void;
	} = $props();
</script>

<nav class="bottom-nav">
	{#each mobilePrimaryNavigation as item}
		<button class:active={view === item.id} onclick={() => ongo(item.id)}>
			<i>{item.icon}</i>
			<span>{item.label === 'Action Center' ? 'Home' : item.label}</span>

			{#if item.id === 'inbox' && inboxUnreadCount > 0}
				<b>{inboxUnreadCount}</b>
			{/if}
		</button>
	{/each}

	<button class:active={moreOpen} onclick={ontogglemore}>
		<i>•••</i>
		<span>More</span>
	</button>
</nav>

<button class="fab" onclick={onquickadd}>＋</button>

{#if moreOpen}
	<div class="more-menu">
		{#each mobileMoreNavigation as item}
			<button onclick={() => ongo(item.id)}>
				<i>{item.icon}</i>
				{item.label}
			</button>
		{/each}
	</div>
{/if}
