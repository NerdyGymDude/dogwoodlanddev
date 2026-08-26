<script lang="ts">
	import { tick } from 'svelte';
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

	let moreButton = $state<HTMLButtonElement>();
	let morePanel = $state<HTMLDivElement>();

	const moreIds = mobileMoreNavigation.map((item) => item.id);
	const moreIsCurrent = $derived(
		moreIds.includes(view) || (view === 'client' && moreIds.includes('clients'))
	);

	function isActive(id: string) {
		return (
			view === id ||
			(id === 'projects' && view === 'project') ||
			(id === 'clients' && view === 'client')
		);
	}

	async function toggleMore() {
		const opening = !moreOpen;
		ontogglemore();

		await tick();
		if (opening) morePanel?.focus();
	}

	async function dismissMore() {
		if (!moreOpen) return;

		ontogglemore();
		await tick();
		moreButton?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (moreOpen && event.key === 'Escape') {
			event.preventDefault();
			void dismissMore();
		}
	}

	$effect(() => {
		if (!moreOpen) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<nav class="bottom-nav" aria-label="Primary mobile navigation">
	{#each mobilePrimaryNavigation as item}
		<button
			type="button"
			class:active={isActive(item.id)}
			aria-current={isActive(item.id) ? 'page' : undefined}
			onclick={() => ongo(item.id)}
		>
			<i>{item.icon}</i>
			<span>{item.label}</span>

			{#if item.id === 'inbox' && inboxUnreadCount > 0}
				<b>{inboxUnreadCount}</b>
			{/if}
		</button>
	{/each}

	<button
		bind:this={moreButton}
		type="button"
		class:active={moreOpen || moreIsCurrent}
		aria-expanded={moreOpen}
		aria-controls="mobile-more-menu"
		onclick={toggleMore}
	>
		<i>•••</i>
		<span>More</span>
	</button>
</nav>

<button class="fab" type="button" aria-label="Quick add" onclick={onquickadd}>＋</button>

{#if moreOpen}
	<button
		class="more-backdrop"
		type="button"
		aria-label="Close More menu"
		onclick={dismissMore}
	></button>
	<div
		bind:this={morePanel}
		id="mobile-more-menu"
		class="more-menu"
		role="dialog"
		aria-modal="true"
		aria-labelledby="mobile-more-title"
		tabindex="-1"
	>
		<header>
			<div>
				<p>ADMIN MENU</p>
				<h2 id="mobile-more-title">More</h2>
			</div>
			<button type="button" aria-label="Close More menu" onclick={dismissMore}>×</button>
		</header>
		<nav aria-label="More Admin sections">
			{#each mobileMoreNavigation as item}
				<button
					type="button"
					class:active={isActive(item.id)}
					aria-current={isActive(item.id) ? 'page' : undefined}
					onclick={() => ongo(item.id)}
				>
					<i>{item.icon}</i>
					<span>{item.label}</span>
					<b aria-hidden="true">→</b>
				</button>
			{/each}
		</nav>
	</div>
{/if}
