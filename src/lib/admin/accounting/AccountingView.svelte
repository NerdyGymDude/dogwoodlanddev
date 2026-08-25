<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import ModuleHeading from '$lib/admin/ModuleHeading.svelte';

	let {
		onquickadd,
		money
	}: {
		onquickadd: (type: 'invoice' | 'estimate' | 'expense') => void;
		money: (value: number) => string;
	} = $props();

	const outstanding = $derived(
		store.invoices.reduce((sum, invoice) => sum + invoice.amount - invoice.paid, 0)
	);

	const projectCosts = $derived(
		store.expenses.reduce((sum, expense) => sum + expense.amount, 0)
	);
</script>

<ModuleHeading
	eyebrow="FINANCE"
	title="Accounting"
	description="Billing, payments, expenses, and project profitability."
	action="Create invoice"
	onclick={() => onquickadd('invoice')}
/>

<div class="finance-cards">
	<div>
		<span>Outstanding</span>
		<strong>{money(outstanding)}</strong>
		<small>{store.invoices.length} invoice{store.invoices.length === 1 ? '' : 's'}</small>
	</div>

	<div>
		<span>Project costs</span>
		<strong>{money(projectCosts)}</strong>
		<small>{store.expenses.length} recorded expense{store.expenses.length === 1 ? '' : 's'}</small>
	</div>
</div>

<div class="section-head">
	<div>
		<h2>Invoices</h2>
		<p>Current billing and balances</p>
	</div>

	<button onclick={() => onquickadd('estimate')}>＋ New estimate</button>
</div>

<div class="data-list invoices">
	<div class="data-head">
		<span>Invoice</span>
		<span>Client / project</span>
		<span>Due</span>
		<span>Amount</span>
		<span>Status</span>
	</div>

	{#each store.invoices as invoice}
		<div>
			<strong>{invoice.id}</strong>

			<span>
				{store.clients.find((client) => client.id === invoice.clientId)?.name}
				<small>
					{store.projects.find((project) => project.id === invoice.projectId)?.name}
				</small>
			</span>

			<span>{invoice.due}</span>
			<strong>{money(invoice.amount)}</strong>
			<span class="status {invoice.status.toLowerCase()}">{invoice.status}</span>
		</div>
	{/each}
</div>

<div class="accounting-bottom">
	<section class="panel">
		<div class="panel-head">
			<h2>Estimates</h2>
		</div>

		{#each store.estimates as estimate}
			<div class="estimate">
				<div>
					<strong>{estimate.id}</strong>
					<span>{estimate.title}</span>
				</div>

				<strong>{money(estimate.amount)}</strong>
				<span class="status">{estimate.status}</span>
			</div>
		{/each}
	</section>

	<section class="panel">
		<div class="panel-head">
			<h2>Recent expenses</h2>
			<button onclick={() => onquickadd('expense')}>＋ Record</button>
		</div>

		{#each store.expenses as expense}
			<div class="expense">
				<div>
					<strong>{expense.description}</strong>
					<span>
						{store.vendors.find((vendor) => vendor.id === expense.vendorId)?.name}
						· {expense.date}
					</span>
				</div>

				<strong>-{money(expense.amount)}</strong>
			</div>
		{/each}
	</section>
</div>
