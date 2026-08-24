<script lang="ts">
	let {
		title,
		description = '',
		children
	}: {
		title: string;
		description?: string;
		children: import('svelte').Snippet;
	} = $props();
</script>

<section class="form-section">
	<header>
		<div>
			<h3>{title}</h3>
			{#if description}
				<p>{description}</p>
			{/if}
		</div>
	</header>

	<div class="form-section-content">
		{@render children()}
	</div>
</section>

<style>
	.form-section {
		padding: 1.25rem;
		border: 1px solid #e4e7e1;
		border-radius: 0.9rem;
		background: #fff;
	}

	header {
		margin-bottom: 1rem;
		padding-bottom: 0.85rem;
		border-bottom: 1px solid #edf0eb;
	}

	h3 {
		margin: 0;
		font-size: 1rem;
		color: #26352b;
	}

	p {
		margin: 0.3rem 0 0;
		font-size: 0.84rem;
		line-height: 1.45;
		color: #6d766f;
	}

	.form-section-content {
		display: grid;
		gap: 1rem;
	}
</style>
