<script lang="ts">
	import { formatMoneyInput } from './money';

	let {
		id,
		value = $bindable(),
		placeholder = '',
		required = false
	}: {
		id: string;
		value: string;
		placeholder?: string;
		required?: boolean;
	} = $props();

	function handleInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		value = formatMoneyInput(input.value);
	}
</script>

<div class="money-input">
	<span aria-hidden="true">$</span>

	<input
		{id}
		type="text"
		inputmode="decimal"
		{placeholder}
		{required}
		value={value}
		oninput={handleInput}
	/>
</div>

<style>
	.money-input {
		display: flex;
		align-items: center;
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #ccd3cc;
		border-radius: 0.65rem;
		background: #fff;
		overflow: hidden;
	}

	.money-input:focus-within {
		outline: 2px solid rgba(92, 115, 80, 0.2);
		border-color: #5c7350;
	}

	span {
		padding-left: 0.8rem;
		font-weight: 600;
		color: #69736b;
	}

	input {
		min-width: 0;
		width: 100%;
		box-sizing: border-box;
		border: 0;
		outline: 0;
		background: transparent;
		padding: 0.72rem 0.8rem 0.72rem 0.35rem;
		font: inherit;
		color: #253329;
	}
</style>
