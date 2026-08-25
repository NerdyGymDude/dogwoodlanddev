<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import ModuleHeading from '$lib/admin/ModuleHeading.svelte';

	let {
		onquickadd
	}: {
		onquickadd: () => void;
	} = $props();
</script>

<ModuleHeading
	eyebrow="SCHEDULE"
	title="Calendar"
	description="Deadlines, meetings, inspections, and follow-ups in one place."
	action="New event"
	onclick={onquickadd}
/>

<div class="calendar-layout">
	<section class="month">
		<header>
			<button>←</button>
			<h2>August 2026</h2>
			<button>→</button>
		</header>

		<div class="weekdays">
			{#each ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as day}
				<span>{day}</span>
			{/each}
		</div>

		<div class="days">
			{#each Array(35) as _, index}
				<button
					class:today={index === 26}
					class:has-event={[26, 27, 31, 33].includes(index)}
				>
					{index < 5 ? '' : index - 4}
					{#if [26, 27, 31, 33].includes(index)}
						<i></i>
					{/if}
				</button>
			{/each}
		</div>
	</section>

	<section class="agenda">
		<h2>Upcoming</h2>

		{#each store.events as event}
			<article>
				<div>
					<strong>{event.date.split(' ')[1]}</strong>
					<span>{event.date.split(' ')[0]}</span>
				</div>

				<section>
					<span>{event.type} · {event.time}</span>
					<h3>{event.title}</h3>

					<p>
						{store.projects.find((project) => project.id === event.projectId)?.name ||
							store.clients.find((client) => client.id === event.clientId)?.name}
					</p>

					<label class="share">
						<input
							type="checkbox"
							checked={event.shared}
							onchange={() => store.toggleEvent(event.id)}
						/>
						<span></span>
						Shared
					</label>
				</section>
			</article>
		{/each}
	</section>
</div>
