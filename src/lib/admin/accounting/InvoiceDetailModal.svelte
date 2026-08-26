<script lang="ts">
	import type { Invoice } from '$lib/admin/types';
	import { adminStore as store } from '$lib/admin/store.svelte';

	let {
		invoice,
		onclose,
		money
	}: {
		invoice: Invoice | null;
		onclose: () => void;
		money: (value: number) => string;
	} = $props();

	const project = $derived(
		invoice ? store.projects.find((item) => item.id === invoice.projectId) : undefined
	);
	const client = $derived(
		invoice ? store.clients.find((item) => item.id === invoice.clientId) : undefined
	);

	function dateLabel(value: string) {
		if (!value) return 'â€”';
		const date = new Date(`${value}T00:00:00`);
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}
</script>

{#if invoice}
	<div class="backdrop" role="presentation" onclick={(event) => {
		if (event.currentTarget === event.target) onclose();
	}}>
		<div class="invoice-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
			<header>
				<div>
					<p>INVOICE</p>
					<h2 id="invoice-title">{invoice.subject || 'Invoice'}</h2>
				</div>
				<button class="close" aria-label="Close invoice" onclick={onclose}>Ã—</button>
			</header>

			<div class="status-row">
				<strong>Invoice Sent</strong>
				<span>{invoice.status}</span>
			</div>

			<div class="details">
				<div><span>Invoice Identifier</span><strong>{invoice.invoiceIdentifier || 'â€”'}</strong></div>
				<div><span>Client</span><strong>{client?.name ?? 'â€”'}</strong></div>
				<div><span>Project</span><strong>{project ? `${project.projectNumber} · ${project.name}` : 'â€”'}</strong></div>
				<div><span>Invoice Date</span><strong>{dateLabel(invoice.date)}</strong></div>
				<div><span>Due Date</span><strong>{dateLabel(invoice.dueDate)}</strong></div>
			</div>

			<div class="amount">
				<span>Invoice Amount</span>
				<strong>{money(invoice.amount)}</strong>
			</div>

			{#if invoice.amountPaid > 0}
				<div class="paid">
					<span>Paid to date</span>
					<strong>{money(invoice.amountPaid)}</strong>
				</div>
			{/if}

			<footer>
				<button onclick={onclose}>Close</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: grid;
		place-items: center;
		background: rgba(20, 31, 45, 0.48);
		padding: 18px;
	}
	.invoice-modal {
		width: min(620px, 100%);
		max-height: 90vh;
		overflow: auto;
		border-radius: 14px;
		background: #fff;
		box-shadow: 0 24px 70px rgba(20, 31, 45, 0.24);
	}
	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
		padding: 22px 24px 18px;
		border-bottom: 1px solid #e3e7e3;
	}
	header p {
		margin: 0 0 5px;
		color: #718667;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: .15em;
	}
	h2 {
		margin: 0;
		color: #1b2a44;
		font-family: Georgia, serif;
		font-size: 24px;
	}
	.close {
		border: 0;
		background: transparent;
		color: #69757c;
		font-size: 28px;
		line-height: 1;
		cursor: pointer;
	}
	.status-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin: 20px 24px 0;
		border-radius: 9px;
		background: #edf2f7;
		padding: 12px 14px;
		color: #203552;
	}
	.status-row span { font-size: 12px; }
	.details {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1px;
		margin: 20px 24px;
		background: #e3e7e3;
		border: 1px solid #e3e7e3;
		border-radius: 9px;
		overflow: hidden;
	}
	.details div {
		display: grid;
		gap: 5px;
		background: #fff;
		padding: 14px;
	}
	.details span, .amount span, .paid span {
		color: #7a858d;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
	}
	.details strong { color: #26384d; font-size: 13px; }
	.amount, .paid {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0 24px;
		padding: 15px 0;
		border-top: 1px solid #e3e7e3;
	}
	.amount strong { color: #1b2a44; font-size: 24px; }
	.paid strong { color: #526a4b; }
	footer {
		display: flex;
		justify-content: flex-end;
		padding: 18px 24px 22px;
	}
	footer button {
		border: 0;
		border-radius: 7px;
		background: #203552;
		padding: 10px 18px;
		color: white;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	@media (max-width: 560px) {
		.details { grid-template-columns: 1fr; }
	}
</style>

