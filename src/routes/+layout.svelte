<script lang="ts">

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/images/dogwoodlogo-transparent.png?v=2" />
	<title>Dogwood Land Development</title>
	<meta
		name="description"
		content="Land development engineering, permitting, project management, onsite wastewater, mine and borrow pit permitting, and stormwater design in North Carolina."
	/>
</svelte:head>

{@render children()}
