<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import type { ActionState, FinancialDocument, FinancialTask, ProjectPayment } from '$lib/admin/types';

	let {
		onopenproject,
		onopenclient,
		ongoto,
		onquickadd,
		financialTasks,
		payments,
		financialDocuments
	}: {
		onopenproject: (id: string) => void;
		onopenclient: (id: string) => void;
		ongoto: (view: string) => void;
		onquickadd: (type?: 'event') => void;
		financialTasks: FinancialTask[];
		payments: ProjectPayment[];
		financialDocuments: FinancialDocument[];
	} = $props();

	let actionFilter = $state('All');
	let currentDate = $state(new Date());
	const greeting = $derived(
		currentDate.getHours() < 12
			? 'Good morning'
			: currentDate.getHours() < 17
				? 'Good afternoon'
				: 'Good evening'
	);

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

	const financialRows = $derived(
		store.projects
			.map((project) => ({
				project,
				tasks: financialTasks.filter((task) => task.projectId === project.id),
				payments: payments.filter((payment) => payment.projectId === project.id),
				documents: financialDocuments.filter((document) => document.projectId === project.id)
			}))
			.filter((row) => row.tasks.length || row.payments.length || row.documents.length)
	);

	const money = (value: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
</script>

<div class="page-heading">
	<div>
		<p class="eyebrow">{todayHeading}</p>
		<h1>{greeting}, Branch.</h1>
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

<section class="action-financials">
	<div class="section-head financials-heading">
		<div>
			<h2>Financials</h2>
			<p>Current project values and invoice activity.</p>
		</div>
	</div>

	{#if financialRows.length}
		<div class="financial-project-list">
			{#each financialRows as row (row.project.id)}
				<article>
					<div class="financial-project-identity">
						<h3>{row.project.name}</h3>
						<span>{row.project.projectNumber}</span>
					</div>
					<div class="financial-project-totals">
						<span>Total Project Invoice<strong>{money(row.tasks.reduce((sum, task) => sum + task.taskTotal, 0))}</strong></span>
						<span>Amount Paid to Date<strong>{money(row.payments.reduce((sum, payment) => sum + payment.amount, 0))}</strong></span>
						<span>Amount Due<strong>{money(row.tasks.reduce((sum, task) => sum + task.billedAmount, 0))}</strong></span>
					</div>
					<footer>
						<span>{row.documents.length} invoice document{row.documents.length === 1 ? '' : 's'}</span>
						<button onclick={() => onopenproject(row.project.id)}>Open Project Financials</button>
					</footer>
				</article>
			{/each}
		</div>
	{:else}
		<div class="financial-empty"><h3>No financial records yet</h3><p>Add financial tasks from a project.</p></div>
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

<style>
	.action-financials {
		margin: 26px 0;
	}
	.financials-heading {
		margin-bottom: 12px;
	}
	.financial-project-totals {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}
	.financial-project-totals span {
		display: grid;
		gap: 5px;
		border-radius: 8px;
		background: #f5f7f4;
		padding: 12px;
		color: #7a858d;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
	}
	.financial-project-totals strong {
		color: #26384d;
		font-size: 17px;
	}
	.financial-project-list {
		display: grid;
		gap: 12px;
	}
	.financial-project-list article,
	.financial-empty {
		border: 1px solid #dfe4df;
		border-radius: 12px;
		background: white;
		padding: 18px;
	}
	.financial-project-identity h3,
	.financial-empty h3 {
		margin: 0 0 4px;
		color: #25344b;
		font-size: 17px;
	}
	.financial-project-identity span,
	.financial-project-list footer > span,
	.financial-empty p {
		color: #747e86;
		font-size: 12px;
	}
	.financial-project-totals {
		margin: 16px 0;
	}
	.financial-project-list footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border-top: 1px solid #e1e6e1;
		padding-top: 12px;
	}
	.financial-project-list footer button {
		border: 1px solid #cfd6d1;
		border-radius: 7px;
		background: white;
		padding: 8px 12px;
		color: #203552;
		font: inherit;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}
	.financial-empty {
		text-align: center;
	}
	.financial-empty p {
		margin-bottom: 0;
	}
	@media (max-width: 650px) {
		.financial-project-totals {
			grid-template-columns: 1fr;
		}
		.financial-project-list footer {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>

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
