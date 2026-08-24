<script lang="ts">
	let {
		label,
		forId,
		required = false,
		hint = '',
		children
	}: {
		label: string;
		forId?: string;
		required?: boolean;
		hint?: string;
		children: import('svelte').Snippet;
	} = $props();
</script>

<div class="field">
	<label for={forId}>
		{label}
		{#if required}
			<span class="required">*</span>
		{/if}
	</label>

	{@render children()}

	{#if hint}
		<p class="hint">{hint}</p>
	{/if}
</div>

<style>
	.field {
		display: grid;
		gap: 0.4rem;
		min-width: 0;
	}

	label {
		font-size: 0.82rem;
		font-weight: 700;
		color: #34483a;
	}

	.required {
		color: #a44336;
	}

	.hint {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.4;
		color: #7b847d;
	}

	.field :global(input),
	.field :global(select),
	.field :global(textarea) {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #ccd3cc;
		border-radius: 0.65rem;
		background: #fff;
		padding: 0.72rem 0.8rem;
		font: inherit;
		color: #253329;
	}

	.field :global(textarea) {
		min-height: 90px;
		resize: vertical;
	}

	.field :global(input:focus),
	.field :global(select:focus),
	.field :global(textarea:focus) {
		outline: 2px solid rgba(92, 115, 80, 0.2);
		border-color: #5c7350;
	}
</style>
