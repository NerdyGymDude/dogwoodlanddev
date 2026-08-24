<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import ModuleHeading from '$lib/admin/ModuleHeading.svelte';

	let {
		onaddvendor,
		money
	}: {
		onaddvendor: () => void;
		money: (value: number) => string;
	} = $props();
</script>

<ModuleHeading
	eyebrow="PARTNERS"
	title="Vendors"
	description="Outside partners, project costs, and payment history."
	action="Add vendor"
	onclick={onaddvendor}
/>

<div class="cards">
	{#each store.vendors as vendor}
		<article class="vendor-card">
			<div class="monogram">
				{vendor.name
					.split(' ')
					.map((part) => part[0])
					.slice(0, 2)
					.join('')}
			</div>

			<span class="status">{vendor.category}</span>
			<h3>{vendor.name}</h3>
			<p>{vendor.contact} · {vendor.email}</p>

			<dl>
				<div>
					<dt>Total spend</dt>
					<dd>{money(vendor.spend)}</dd>
				</div>
				<div>
					<dt>Projects</dt>
					<dd>{vendor.projectIds.length}</dd>
				</div>
			</dl>

			<button>View vendor →</button>
		</article>
	{/each}
</div>
