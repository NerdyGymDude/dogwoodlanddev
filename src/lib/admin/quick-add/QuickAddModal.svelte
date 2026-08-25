<script lang="ts">
	import { quickAddOptions } from './quick-add';
	import type { AdminRecordType } from '../forms/types';

	import ClientForm from '../forms/records/ClientForm.svelte';
	import ContactForm from '../forms/records/ContactForm.svelte';
	import ProjectForm from '../forms/records/ProjectForm.svelte';
	import TaskForm from '../forms/records/TaskForm.svelte';
	import EstimateForm from '../forms/records/EstimateForm.svelte';
	import InvoiceForm from '../forms/records/InvoiceForm.svelte';
	import ExpenseForm from '../forms/records/ExpenseForm.svelte';
	import DocumentForm from '../forms/records/DocumentForm.svelte';
	import EventForm from '../forms/records/EventForm.svelte';
	import NoteForm from '../forms/records/NoteForm.svelte';

	import {
		createClientForm,
		createContactForm,
		createDocumentForm,
		createEstimateForm,
		createEventForm,
		createExpenseForm,
		createInvoiceForm,
		createNoteForm,
		createProjectForm,
		createTaskForm
	} from '../forms/defaults';

	let {
		open = false,
		initialType = null,
		clients = [],
		projects = [],
		users = [],
		vendors = [],
		onclose,
		onsave
	}: {
		open?: boolean;
		initialType?: AdminRecordType | null;
		clients?: Array<{ id: string; name: string }>;
		projects?: Array<{ id: string; name: string; clientId?: string }>;
		users?: Array<{ id: string; name: string }>;
		vendors?: Array<{ id: string; name: string }>;
		onclose: () => void;
		onsave: (type: AdminRecordType, data: unknown) => void;
	} = $props();

	let selectedType = $state<AdminRecordType | null>(null);

	let clientForm = $state(createClientForm());
	let contactForm = $state(createContactForm());
	let projectForm = $state(createProjectForm());
	let taskForm = $state(createTaskForm());
	let estimateForm = $state(createEstimateForm());
	let invoiceForm = $state(createInvoiceForm());
	let expenseForm = $state(createExpenseForm());
	let documentForm = $state(createDocumentForm());
	let eventForm = $state(createEventForm());
	let noteForm = $state(createNoteForm());

	const selectedOption = $derived(
		quickAddOptions.find((option) => option.type === selectedType)
	);

	$effect(() => {
		if (open) selectedType = initialType;
	});

	function choose(type: AdminRecordType) {
		selectedType = type;
	}

	function back() {
		selectedType = null;
	}

	function close() {
		selectedType = initialType;
		onclose();
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();

		if (!selectedType) return;

		const values = {
			client: clientForm,
			contact: contactForm,
			project: projectForm,
			task: taskForm,
			estimate: estimateForm,
			invoice: invoiceForm,
			expense: expenseForm,
			document: documentForm,
			event: eventForm,
			note: noteForm
		};

		onsave(selectedType, values[selectedType]);
	}
</script>

{#if open}
	<div
		class="backdrop"
		role="presentation"
		onclick={(event) => {
			if (event.currentTarget === event.target) close();
		}}
	>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
			<header class="modal-header">
				<div>
					<p class="eyebrow">QUICK ADD</p>
					<h2 id="quick-add-title">
						{selectedOption?.label ?? 'What would you like to add?'}
					</h2>

					{#if selectedOption}
						<p class="subtitle">{selectedOption.description}</p>
					{:else}
						<p class="subtitle">Create or upload something without leaving the Action Center.</p>
					{/if}
				</div>

				<button type="button" class="close" aria-label="Close Quick Add" onclick={close}>×</button>
			</header>

			{#if !selectedType}
				<div class="option-grid">
					{#each quickAddOptions as option}
						<button type="button" class="option" onclick={() => choose(option.type)}>
							<span class="option-icon">{option.icon}</span>
							<span>
								<strong>{option.label}</strong>
								<small>{option.description}</small>
							</span>
						</button>
					{/each}
				</div>
			{:else}
				<form onsubmit={submit}>
					<div class="form-scroll">
						{#if selectedType === 'client'}
							<ClientForm value={clientForm} />
						{:else if selectedType === 'contact'}
							<ContactForm value={contactForm} {clients} {projects} {users} />
						{:else if selectedType === 'project'}
							<ProjectForm value={projectForm} {clients} {users} />
						{:else if selectedType === 'task'}
							<TaskForm value={taskForm} {clients} {projects} {users} />
						{:else if selectedType === 'estimate'}
							<EstimateForm value={estimateForm} {clients} {projects} {users} />
						{:else if selectedType === 'invoice'}
							<InvoiceForm value={invoiceForm} {clients} {projects} {users} />
						{:else if selectedType === 'expense'}
							<ExpenseForm value={expenseForm} {clients} {projects} {users} {vendors} />
						{:else if selectedType === 'document'}
							<DocumentForm value={documentForm} {clients} {projects} {users} />
						{:else if selectedType === 'event'}
							<EventForm value={eventForm} {clients} {projects} {users} />
						{:else if selectedType === 'note'}
							<NoteForm value={noteForm} {clients} {projects} {users} />
						{/if}
					</div>

					<footer class="actions">
						<button type="button" class="secondary" onclick={back}>← Back</button>
						<button type="submit" class="primary">
							{selectedType === 'document' ? 'Upload File' : `Save ${selectedOption?.label ?? ''}`}
						</button>
					</footer>
				</form>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgba(20, 31, 23, 0.52);
		backdrop-filter: blur(3px);
	}

	.modal {
		display: flex;
		flex-direction: column;
		width: min(920px, 100%);
		max-height: min(900px, calc(100vh - 2rem));
		overflow: hidden;
		border-radius: 1rem;
		background: #f5f7f3;
		box-shadow: 0 24px 70px rgba(18, 31, 21, 0.25);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1.4rem;
		border-bottom: 1px solid #dfe5de;
		background: #fff;
	}

	.eyebrow {
		margin: 0 0 0.25rem;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.16em;
		color: #6b7e65;
	}

	h2 {
		margin: 0;
		font-size: 1.35rem;
		color: #26372b;
	}

	.subtitle {
		margin: 0.3rem 0 0;
		font-size: 0.82rem;
		color: #707a72;
	}

	.close {
		flex: 0 0 auto;
		width: 38px;
		height: 38px;
		border: 0;
		border-radius: 50%;
		background: #eef1ed;
		font-size: 1.35rem;
		color: #58655b;
		cursor: pointer;
	}

	.option-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		overflow-y: auto;
		padding: 1.25rem;
	}

	.option {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		min-height: 84px;
		border: 1px solid #dde3dc;
		border-radius: 0.85rem;
		background: #fff;
		padding: 1rem;
		text-align: left;
		color: #2f4034;
		cursor: pointer;
	}

	.option:hover {
		border-color: #9cad96;
		background: #fbfcfa;
	}

	.option-icon {
		display: grid;
		flex: 0 0 auto;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: 0.7rem;
		background: #edf2e9;
		font-size: 1.15rem;
	}

	.option span:last-child {
		display: grid;
		gap: 0.2rem;
	}

	.option small {
		line-height: 1.35;
		color: #758077;
	}

	form {
		display: flex;
		min-height: 0;
		flex: 1;
		flex-direction: column;
	}

	.form-scroll {
		display: grid;
		gap: 1rem;
		overflow-y: auto;
		padding: 1.25rem;
	}

	.actions {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid #dfe5de;
		background: #fff;
	}

	.actions button {
		border-radius: 0.65rem;
		padding: 0.7rem 1rem;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.secondary {
		border: 1px solid #cdd5cc;
		background: #fff;
		color: #526057;
	}

	.primary {
		border: 1px solid #4f6947;
		background: #5c7350;
		color: #fff;
	}

	@media (max-width: 700px) {
		.backdrop {
			align-items: end;
			padding: 0;
		}

		.modal {
			width: 100%;
			max-height: 94dvh;
			border-radius: 1rem 1rem 0 0;
		}

		.option-grid {
			grid-template-columns: 1fr;
			padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
		}

		.actions {
			padding-bottom: calc(1rem + env(safe-area-inset-bottom));
		}

		.primary {
			flex: 1;
		}
	}
</style>
