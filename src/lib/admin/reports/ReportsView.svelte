<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import ModuleHeading from '$lib/admin/ModuleHeading.svelte';

	let {
		onschedule,
		money
	}: {
		onschedule: () => void;
		money: (value: number) => string;
	} = $props();

	const openActions = $derived(
		store.actions.filter((action) => action.state !== 'Done').length
	);

	const waitingActions = $derived(
		store.actions.filter((action) => action.state === 'Waiting').length
	);

	const totalInvoiced = $derived(
		store.invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
	);

	const totalCosts = $derived(
		store.expenses.reduce((sum, expense) => sum + expense.amount, 0)
	);
</script>

<ModuleHeading
	eyebrow="INSIGHTS"
	title="Reports"
	description="Operational clarity and financial performance without the noise."
	action="Schedule report"
	onclick={onschedule}
/>

<div class="report-grid">
	<section class="panel">
		<h2>Attention report</h2>

		<div class="big-stat">
			{openActions}
			<span>open actions</span>
		</div>

		<div class="detail-list">
			<div>
				<span>Waiting</span>
				<strong>{waitingActions}</strong>
			</div>
		</div>
	</section>

	<section class="panel">
		<h2>Financial activity</h2>

		<div class="detail-list">
			<div>
				<span>Invoice value</span>
				<strong>{money(totalInvoiced)}</strong>
			</div>

			<div>
				<span>Recorded costs</span>
				<strong>{money(totalCosts)}</strong>
			</div>
		</div>
	</section>

	<section class="panel span2">
		<div class="panel-head">
			<h2>Report library</h2>
			<button>Configure</button>
		</div>

		<div class="report-links">
			{#each [
				'Active projects',
				'Waiting items',
				'Project profitability',
				'Outstanding balances',
				'Vendor spending',
				'Client activity'
			] as report}
				<button>
					<span>⌁</span>
					{report}
					<b>→</b>
				</button>
			{/each}
		</div>
	</section>
</div>
