<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import type { ActionState } from '$lib/admin/types';

	let {
		onopenproject,
		onopenclient,
		ongoto,
		onquickadd
	}: {
		onopenproject: (id: string) => void;
		onopenclient: (id: string) => void;
		ongoto: (view: string) => void;
		onquickadd: (type?: 'event') => void;
	} = $props();

	let actionFilter = $state('All');
	let currentDate = $state(new Date());

	const todayShort = $derived(
		new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric'
		}).format(currentDate)
	);

	const todayFull = $derived(
		new Intl.DateTimeFormat('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(currentDate)
	);

	const todayHeading = $derived(
		new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		})
			.format(currentDate)
			.toUpperCase()
	);

	const todayEvents = $derived(
		store.events
			.filter((event) => event.date === todayShort)
			.toSorted((a, b) => {
				function minutes(value: string) {
					if (!value) return Number.MAX_SAFE_INTEGER;

					const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
					if (!match) return Number.MAX_SAFE_INTEGER;

					let hour = Number(match[1]);
					const minute = Number(match[2]);
					const period = match[3].toUpperCase();

					if (period === 'AM' && hour === 12) hour = 0;
					if (period === 'PM' && hour !== 12) hour += 12;

					return hour * 60 + minute;
				}

				return minutes(a.time) - minutes(b.time);
			})
	);

	const filteredActions = $derived(
		store.actions.filter((action) => actionFilter === 'All' || action.state === actionFilter)
	);
</script>

<div class="page-heading">
	<div>
		<p class="eyebrow">{todayHeading}</p>
		<h1>Good morning, Branch.</h1>
		<p>Here’s what needs your attention right now.</p>
	</div>

	<button class="primary" onclick={() => onquickadd()}>＋ Add something</button>
</div>

<section class="today-calendar">
	<div class="today-calendar-head">
		<div>
			<p class="eyebrow">TODAY'S CALENDAR</p>
			<h2>{todayFull}</h2>
		</div>

		<button type="button" onclick={() => ongoto('calendar')}>View calendar →</button>
	</div>

	{#if todayEvents.length}
		<div class="today-event-list">
			{#each todayEvents as event}
				<button
					type="button"
					class="today-event"
					onclick={() => {
						if (event.projectId) onopenproject(event.projectId);
						else ongoto('calendar');
					}}
				>
					<div class="today-event-time">
						<strong>{event.time || 'All day'}</strong>
						<span>{event.type}</span>
					</div>

					<div class="today-event-copy">
						<h3>{event.title}</h3>
						<p>
							{store.projects.find((project) => project.id === event.projectId)?.name ||
								store.clients.find((client) => client.id === event.clientId)?.name ||
								'Dogwood Land Development'}
						</p>
					</div>

					<span class="today-event-arrow">→</span>
				</button>
			{/each}
		</div>
	{:else}
		<div class="today-calendar-empty">
			<div class="calendar-empty-icon">□</div>

			<div>
				<strong>No calendar events today — {todayFull}.</strong>
				<p>New events added for today will appear here automatically.</p>
			</div>

			<button type="button" onclick={() => onquickadd('event')}>＋ Add event</button>
		</div>
	{/if}
</section>

<div class="section-head">
	<div>
		<h2>Action queue</h2>
		<p>{store.actions.filter((action) => action.state !== 'Done').length} open items</p>
	</div>

	<div class="segmented">
		{#each ['All', 'New', 'Needs Action', 'Waiting'] as filter}
			<button class:active={actionFilter === filter} onclick={() => (actionFilter = filter)}>
				{filter}
			</button>
		{/each}
	</div>
</div>

<div class="action-list">
	{#each filteredActions as action}
		<article class:overdue={action.due.includes('Overdue')}>
			<div class="action-icon">
				{action.source === 'Accounting'
					? '$'
					: action.source === 'Calendar'
						? '□'
						: action.source === 'Website inquiry'
							? '＋'
							: '✉'}
			</div>

			<div class="action-copy">
				<div class="tags">
					<span class:urgent={action.priority === 'High'}>{action.priority}</span>
					<span>{action.state}</span>
				</div>

				<h3>{action.title}</h3>
				<p>{action.detail}</p>

				<div class="meta">
					<span>{action.due}</span>

					{#if action.projectId}
						<button onclick={() => onopenproject(action.projectId!)}>
							{store.projects.find((project) => project.id === action.projectId)?.name}
						</button>
					{/if}

					<span>{action.age}</span>
				</div>
			</div>

			<div class="action-controls">
				<button
					class="small-primary"
					onclick={() =>
						action.projectId
							? onopenproject(action.projectId)
							: action.clientId && onopenclient(action.clientId)}
				>
					Open
				</button>

				<select
					value={action.state}
					onchange={(event) =>
						store.setAction(action.id, event.currentTarget.value as ActionState)}
				>
					<option>New</option>
					<option>Needs Action</option>
					<option>Waiting</option>
					<option>Done</option>
				</select>
			</div>
		</article>
	{/each}
</div>
