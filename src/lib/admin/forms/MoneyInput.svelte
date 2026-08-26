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
        position: relative;
        width: 100%;
    }

    .money-input span {
        position: absolute;
        left: 0.8rem;
        top: 50%;
        transform: translateY(-50%);
        z-index: 1;
        pointer-events: none;
        font-weight: 600;
        color: #69736b;
    }

    .money-input input {
        width: 100%;
        box-sizing: border-box;
        padding-left: 1.8rem;
    }
</style>
