<script lang="ts">
	let {
		columns = 2,
		children
	}: {
		columns?: 1 | 2 | 3;
		children: import('svelte').Snippet;
	} = $props();
</script>

<div class="form-grid" data-columns={columns}>
	{@render children()}
</div>

<style>
	.form-grid {
		display: grid;
		gap: 1rem;
	}

	.form-grid[data-columns='2'] {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.form-grid[data-columns='3'] {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	@media (max-width: 700px) {
		.form-grid,
		.form-grid[data-columns='2'],
		.form-grid[data-columns='3'] {
			grid-template-columns: 1fr;
		}
	}
</style>
