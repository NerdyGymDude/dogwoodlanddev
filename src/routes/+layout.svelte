<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Dogwood Land Development</title>
	<meta
		name="description"
		content="Land development engineering, permitting, project management, onsite wastewater, mine and borrow pit permitting, and stormwater design in North Carolina."
	/>
</svelte:head>

{@render children()}
