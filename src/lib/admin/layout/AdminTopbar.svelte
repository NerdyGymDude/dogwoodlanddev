<script lang="ts">
	type SearchRecord = {
		type: string;
		title: string;
		sub: string;
		id: string;
	};

	let {
		records,
		onselect,
		onquickadd,
		onnotify
	}: {
		records: SearchRecord[];
		onselect: (result: SearchRecord) => void;
		onquickadd: () => void;
		onnotify: () => void;
	} = $props();

	let searchOpen = $state(false);
	let query = $state('');

	const searchResults = $derived(
		query.trim().length < 2
			? []
			: records.filter((record) =>
					`${record.title} ${record.sub} ${record.type}`
						.toLowerCase()
						.includes(query.trim().toLowerCase())
				)
	);

	function chooseResult(result: SearchRecord) {
		searchOpen = false;
		query = '';
		onselect(result);
	}
</script>

<header class="topbar">
	<div class="mobile-brand">Dogwood <span>Admin</span></div>

	<button class="search" onclick={() => (searchOpen = true)}>
		⌕
		<span>Search clients, projects, email…</span>
		<kbd>⌘ K</kbd>
	</button>

	<div class="top-actions">
		<button onclick={onnotify}>♢<em>3</em></button>
		<button class="quick" onclick={onquickadd}>
			＋ <span>Quick add</span>
		</button>
	</div>
</header>

{#if searchOpen}
	<div
		class="overlay"
		role="button"
		tabindex="0"
		aria-label="Close search"
		onclick={(e) => {
			if (e.target === e.currentTarget) searchOpen = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') searchOpen = false;
		}}
	>
		<div class="search-modal">
			<label>
				⌕
				<input bind:value={query} placeholder="Search everything…" />
				<kbd>ESC</kbd>
			</label>

			{#if !query}
				<div class="search-empty">
					<strong>Search your business</strong>
					<p>Clients, projects, email, documents, invoices, vendors, and notes.</p>
				</div>
			{:else}
				<div class="results">
					{#each searchResults as result}
						<button onclick={() => chooseResult(result)}>
							<span>{result.type}</span>
							<div>
								<strong>{result.title}</strong>
								<small>{result.sub}</small>
							</div>
							<b>→</b>
						</button>
					{/each}

					{#if !searchResults.length}
						<p>No accessible records found.</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
