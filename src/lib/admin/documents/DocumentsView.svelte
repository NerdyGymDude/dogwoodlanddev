<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import ModuleHeading from '$lib/admin/ModuleHeading.svelte';

	let {
		onopenproject,
		onquickadd
	}: {
		onopenproject: (id: string) => void;
		onquickadd: () => void;
	} = $props();
</script>

<ModuleHeading
	eyebrow="FILES"
	title="Documents"
	description="Private by default. Share only what the client should see."
	action="Upload document"
	onclick={onquickadd}
/>

<div class="toolbar">
	<label>⌕ <input placeholder="Search documents…" /></label>
	<button>All categories</button>
	<button>All projects</button>
</div>

<div class="document-grid">
	{#each store.documents as document}
		<article>
			<div class="file-icon">PDF</div>

			<div>
				<h3>{document.name}</h3>
				<p>{document.category} · {document.size} · {document.updated}</p>

				<button onclick={() => document.projectId && onopenproject(document.projectId)}>
					{store.projects.find((project) => project.id === document.projectId)?.name}
				</button>
			</div>

			<label class="share">
				<input
					type="checkbox"
					checked={document.shared}
					onchange={() => store.toggleDocument(document.id)}
				/>
				<span></span>
				Share with client
			</label>

			<button class="dots">•••</button>
		</article>
	{/each}
</div>
