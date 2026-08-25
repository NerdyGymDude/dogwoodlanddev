<script lang="ts">
	import type { LineItem } from './types';
	import MoneyInput from './MoneyInput.svelte';
	import { displayMoney, parseMoney } from './money';

	let {
		items
	}: {
		items: LineItem[];
	} = $props();

	function addItem() {
		items.push({
			id: crypto.randomUUID(),
			description: '',
			quantity: 1,
			rate: ''
		});
	}

	function removeItem(id: string) {
		const index = items.findIndex((item) => item.id === id);
		if (index !== -1) items.splice(index, 1);
	}

	const subtotal = $derived(
		items.reduce((total, item) => total + Number(item.quantity || 0) * parseMoney(item.rate), 0)
	);
</script>

<div class="line-items">
	<div class="heading">
		<div>
			<strong>Line Items</strong>
			<p>Add the services, fees, or work included.</p>
		</div>

		<button type="button" class="add" onclick={addItem}>+ Add line</button>
	</div>

	{#if items.length === 0}
		<button type="button" class="empty" onclick={addItem}>
			<strong>No line items yet</strong>
			<span>Add the first service or fee</span>
		</button>
	{:else}
		<div class="items">
			{#each items as item (item.id)}
				<div class="item">
					<label class="description">
						<span>Description</span>
						<input bind:value={item.description} placeholder="Engineering services" />
					</label>

					<label>
						<span>Qty</span>
						<input type="number" min="0" step="0.01" bind:value={item.quantity} />
					</label>

					<label>
						<span>Rate</span>
						<MoneyInput
							id={`line-rate-${item.id}`}
							bind:value={item.rate}
							placeholder="0.00"
						/>
					</label>

					<div class="amount">
						<span>Amount</span>
						<strong>{displayMoney(Number(item.quantity || 0) * parseMoney(item.rate))}</strong>
					</div>

					<button
						type="button"
						class="remove"
						aria-label="Remove line item"
						onclick={() => removeItem(item.id)}
					>
						×
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<div class="subtotal">
		<span>Subtotal</span>
		<strong>{displayMoney(subtotal)}</strong>
	</div>
</div>

<style>
	.line-items {
		display: grid;
		gap: 1rem;
	}

	.heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.heading p {
		margin: 0.2rem 0 0;
		font-size: 0.78rem;
		color: #747e76;
	}

	.add {
		border: 1px solid #5c7350;
		border-radius: 0.6rem;
		background: #fff;
		padding: 0.55rem 0.75rem;
		font-weight: 700;
		color: #4c6543;
		cursor: pointer;
	}

	.empty {
		display: grid;
		gap: 0.2rem;
		width: 100%;
		border: 1px dashed #bdc8bc;
		border-radius: 0.75rem;
		background: #f8faf7;
		padding: 1.25rem;
		color: #536156;
		cursor: pointer;
	}

	.empty span {
		font-size: 0.78rem;
		font-weight: 400;
		color: #7b847d;
	}

	.items {
		display: grid;
		gap: 0.65rem;
	}

	.item {
		display: grid;
		grid-template-columns: minmax(180px, 1fr) 80px 110px 110px 36px;
		gap: 0.6rem;
		align-items: end;
		padding: 0.75rem;
		border: 1px solid #e2e6e1;
		border-radius: 0.7rem;
	}

	label {
		display: grid;
		gap: 0.3rem;
	}

	label span,
	.amount span {
		font-size: 0.72rem;
		font-weight: 700;
		color: #647067;
	}

	input {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #ccd3cc;
		border-radius: 0.55rem;
		padding: 0.6rem;
		font: inherit;
	}

	.amount {
		display: grid;
		gap: 0.45rem;
		padding-bottom: 0.55rem;
	}

	.remove {
		width: 34px;
		height: 34px;
		border: 0;
		border-radius: 50%;
		background: #f4e9e7;
		font-size: 1.2rem;
		color: #934c40;
		cursor: pointer;
	}

	.subtotal {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding-top: 0.8rem;
		border-top: 1px solid #e5e8e4;
	}

	@media (max-width: 760px) {
		.item {
			grid-template-columns: 1fr 1fr;
		}

		.description {
			grid-column: 1 / -1;
		}

		.remove {
			justify-self: end;
		}
	}
</style>
