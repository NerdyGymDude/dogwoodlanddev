<script lang="ts">
	import './admin-portal.css';
	import { onMount } from 'svelte';
	import { adminStore as store } from '$lib/admin/store.svelte';

	import QuickAddModal from '$lib/admin/quick-add/QuickAddModal.svelte';
	import DesktopSidebar from '$lib/admin/layout/DesktopSidebar.svelte';
	import MobileNavigation from '$lib/admin/layout/MobileNavigation.svelte';
	import AdminTopbar from '$lib/admin/layout/AdminTopbar.svelte';
	import ActionCenter from '$lib/admin/action-center/ActionCenter.svelte';
	import ClientsView from '$lib/admin/clients/ClientsView.svelte';
	import ClientDetailView from '$lib/admin/clients/ClientDetailView.svelte';
	import ProjectsView from '$lib/admin/projects/ProjectsView.svelte';
	import ProjectDetailView from '$lib/admin/projects/ProjectDetailView.svelte';
	import InboxView from '$lib/admin/inbox/InboxView.svelte';
	import TasksView from '$lib/admin/tasks/TasksView.svelte';
	import DocumentsView from '$lib/admin/documents/DocumentsView.svelte';
	import CalendarView from '$lib/admin/calendar/CalendarView.svelte';
	import AccountingView from '$lib/admin/accounting/AccountingView.svelte';
	import VendorsView from '$lib/admin/vendors/VendorsView.svelte';
	import ReportsView from '$lib/admin/reports/ReportsView.svelte';
	import SettingsView from '$lib/admin/settings/SettingsView.svelte';
	import AdminLegacyModal from '$lib/admin/modals/AdminLegacyModal.svelte';
	import InvoiceDetailModal from '$lib/admin/accounting/InvoiceDetailModal.svelte';

	import type {
		AdminRecordType,
		ClientFormData,
		EventFormData,
		InvoiceFormData,
		ProjectFormData,
		TaskFormData
	} from '$lib/admin/forms/types';
	import type { Client, Invoice, ProjectStatus } from '$lib/admin/types';
	import type { PageData } from './$types';

	type InboxSearchMessage = {
		key: string;
		sender: string;
		fromAddress: string;
		subject: string;
		mailbox: string;
	};

	type SearchRecord = {
		type: string;
		title: string;
		sub: string;
		id: string;
	};

	let { data }: { data: PageData } = $props();

	let view = $state('home');
	let selectedProject = $state('');
	let selectedClient = $state('');
	let moreOpen = $state(false);
	let modal = $state('');
	let selectedInvoice = $state<Invoice | null>(null);

	let quickAddOpen = $state(false);
	let quickAddType = $state<AdminRecordType | null>(null);

	/*
	 * InboxView owns Zoho fetching, polling, filtering, message opening,
	 * replies and unread calculation. The orchestrator only receives
	 * the live search index and authoritative unread total.
	 */
	let inboxSearchMessages = $state<InboxSearchMessage[]>([]);
	let inboxUnreadCount = $state(0);

        const urgentNotificationCount = $derived(
                store.actions.filter(
                        (action) =>
                                action.state !== 'Done' &&
                                action.priority === 'High'
                ).length
        );

	const project = $derived(store.projects.find((item) => item.id === selectedProject));
	const client = $derived(store.clients.find((item) => item.id === selectedClient));

	const searchableRecords = $derived<SearchRecord[]>([
		...store.clients.map((item) => ({
			type: 'Client',
			title: item.name,
			sub: `${item.email} ${item.phone}`,
			id: item.id
		})),
		...store.projects.map((item) => ({
			type: 'Project',
			title: item.name,
			sub: `${item.address} ${item.summary}`,
			id: item.id
		})),
		...store.documents.map((item) => ({
			type: 'Document',
			title: item.name,
			sub: item.category,
			id: item.id
		})),
		...inboxSearchMessages.map((item) => ({
			type: 'Email',
			title: item.subject,
			sub: `${item.sender} ${item.fromAddress} ${item.mailbox}`,
			id: item.key
		}))
	]);

	const money = (value: number) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(value);

	function go(next: string) {
		view = next;
		moreOpen = false;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function openProject(id: string) {
		selectedProject = id;
		go('project');
	}

	function openClient(id: string) {
		selectedClient = id;
		go('client');
	}

	function chooseComponentSearchResult(result: SearchRecord) {
		if (result.type === 'Project') {
			openProject(result.id);
		} else if (result.type === 'Client') {
			openClient(result.id);
		} else if (result.type === 'Email') {
			go('inbox');
		} else {
			go('documents');
		}
	}

	function handleInboxMailChange(messages: InboxSearchMessage[], unreadCount: number) {
		inboxSearchMessages = messages;
		inboxUnreadCount = unreadCount;
	}

	function openQuickAdd(type: AdminRecordType | null = null) {
		quickAddType = type;
		quickAddOpen = true;
	}

	function closeQuickAdd() {
		quickAddOpen = false;
		quickAddType = null;
	}

	function clientRecordFromApi(record: {
		id: string;
		name: string;
		shortName: string;
		address: string;
		city: string;
		state: string;
		zip: string;
		notes: string;
		primaryContactId: string;
		primaryContactName: string;
		primaryContactPhone: string;
		primaryContactEmail: string;
		secondaryContactId: string;
		secondaryContactName: string;
		secondaryContactPhone: string;
		secondaryContactEmail: string;
		tertiaryContactId: string;
		tertiaryContactName: string;
		tertiaryContactPhone: string;
		tertiaryContactEmail: string;
	}): Client {
		const contacts: Client['contacts'] = [];

		if (record.primaryContactName || record.primaryContactPhone || record.primaryContactEmail) {
			contacts.push({
				id: record.primaryContactId,
				name: record.primaryContactName,
				role: 'Primary Contact',
				email: record.primaryContactEmail,
				phone: record.primaryContactPhone,
				preferred: 'Email',
				primary: true
			});
		}

		if (
			record.secondaryContactName ||
			record.secondaryContactPhone ||
			record.secondaryContactEmail
		) {
			contacts.push({
				id: record.secondaryContactId,
				name: record.secondaryContactName,
				role: 'Secondary Contact',
				email: record.secondaryContactEmail,
				phone: record.secondaryContactPhone,
				preferred: 'Email'
			});
		}

		if (record.tertiaryContactName || record.tertiaryContactPhone || record.tertiaryContactEmail) {
			contacts.push({
				id: record.tertiaryContactId,
				name: record.tertiaryContactName,
				role: 'Tertiary Contact',
				email: record.tertiaryContactEmail,
				phone: record.tertiaryContactPhone,
				preferred: 'Email'
			});
		}

		return {
			id: record.id,
			name: record.name,
			shortName: record.shortName,
			type: 'Company',
			email: record.primaryContactEmail,
			phone: record.primaryContactPhone,
			address: [record.address, record.city, record.state, record.zip].filter(Boolean).join(', '),
			notes: record.notes,
			contacts,
			projectIds: []
		};
	}

	function formatDateShort(value: string) {
		if (!value) return '';

		const date = new Date(`${value}T00:00:00`);

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	function formatTime(value: string) {
		if (!value) return '';

		const [hour, minute] = value.split(':').map(Number);
		const date = new Date();

		date.setHours(hour, minute, 0, 0);

		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		}).format(date);
	}

	function projectStatus(value: string): ProjectStatus {
		if (value === 'active') return 'Active';
		if (value === 'completed') return 'Completed';
		if (value === 'canceled') return 'Cancelled';

		return 'Pending';
	}

	function projectRecordFromApi(record: any) {
		return {
			id: record.id,
			projectNumber: record.projectNumber || '',
			name: record.name,
			clientId: record.clientId || '',
			address: [record.address, record.city, record.state, record.zip].filter(Boolean).join(', '),
			status: projectStatus(record.status),
			phase: record.phase || 'New',
			summary: record.description || record.notes || '',
			description: record.description || '',
			projectType: record.projectType || '',
			nextMilestone: record.targetCompletionDate
				? `Target ${formatDateShort(record.targetCompletionDate)}`
				: 'Not set',
			lastActivity: 'Just now',
			budget: Number(record.budget || 0),
			invoiced: 0,
			costs: 0,
			startDate: record.startDate || '',
			targetCompletionDate: record.targetCompletionDate || '',
			createdDate: record.createdDate || ''
		};
	}

	function taskRecordFromApi(record: any) {
		return {
			id: record.id,
			title: record.title,
			projectId: record.projectId || undefined,
			clientId: record.clientId || undefined,
			due: formatDateShort(record.dueDate),
			priority:
				record.priority === 'urgent'
					? 'Urgent'
					: record.priority === 'high'
						? 'High'
						: record.priority === 'low'
							? 'Low'
							: 'Medium',
			status:
				record.status === 'completed'
					? 'Done'
					: record.status === 'pending'
						? 'Waiting'
						: 'Open',
			assignee: record.assignedTo || 'Unassigned'
		};
	}

	function eventRecordFromApi(record: any) {
		return {
			id: record.id,
			title: record.title,
			date: formatDateShort(record.startDate),
			time: formatTime(record.startTime),
			type: record.eventType || 'Event',
			projectId: record.projectId || undefined,
			clientId: record.clientId || undefined,
			shared: Boolean(record.clientVisible)
		};
	}


	function invoiceRecordFromApi(record: any): Invoice {
		return {
			id: record.id,
			invoiceIdentifier: record.invoiceIdentifier || '',
			sentAt: record.sentAt || '',
			clientId: record.clientId || '',
			projectId: record.projectId || undefined,
			subject: record.subject || '',
			date: record.date || '',
			dueDate: record.dueDate || '',
			amount: Number(record.amount || 0),
			status: record.status || 'Billed - Not Paid',
			amountPaid: Number(record.amountPaid || 0),
			recipientContactIds: Array.isArray(record.recipientContactIds)
				? record.recipientContactIds
				: []
		};
	}

	function openInvoice(invoice: Invoice) {
		selectedInvoice = invoice;
	}

	function closeInvoice() {
		selectedInvoice = null;
	}

	async function saveQuickAdd(type: AdminRecordType, formData: unknown) {
		try {
			if (type === 'client') {
				const response = await fetch('/admin/api/clients', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(formData as ClientFormData)
				});

				const result = await response.json();

				if (!response.ok) throw new Error(result.error || 'Unable to save client.');

				store.addPersistedClient(clientRecordFromApi(result.client));
				store.notify('Client saved');
				closeQuickAdd();
				return;
			}

			if (type === 'project') {
				const response = await fetch('/admin/api/projects', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(formData as ProjectFormData)
				});

				const result = await response.json();

				if (!response.ok) throw new Error(result.error || 'Unable to save project.');

				store.addPersistedProject(projectRecordFromApi(result.project));
				store.notify('Project saved');
				closeQuickAdd();
				return;
			}

			if (type === 'task') {
				const response = await fetch('/admin/api/tasks', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(formData as TaskFormData)
				});

				const result = await response.json();

				if (!response.ok) throw new Error(result.error || 'Unable to save task.');

				store.addPersistedTask(taskRecordFromApi(result.task));
				store.notify('Task saved');
				closeQuickAdd();
				return;
			}

			if (type === 'event') {
				const response = await fetch('/admin/api/events', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(formData as EventFormData)
				});

				const result = await response.json();

				if (!response.ok) throw new Error(result.error || 'Unable to save calendar event.');

				store.addPersistedEvent(eventRecordFromApi(result.event));
				store.notify('Calendar event saved');
				closeQuickAdd();
				return;
			}

			if (type === 'invoice') {
				const invoiceForm = formData as InvoiceFormData;
				const response = await fetch('/admin/api/invoices', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						...invoiceForm,
						status: 'Billed - Not Paid'
					})
				});

				const result = await response.json();

				if (!response.ok) throw new Error(result.error || 'Unable to save invoice.');

				const invoice = invoiceRecordFromApi(result.invoice);
				store.addPersistedInvoice(invoice);
				store.notify('Invoice created');
				closeQuickAdd();
				openInvoice(invoice);
				return;
			}

			store.notify(
				`${type.charAt(0).toUpperCase() + type.slice(1)} form is ready; Supabase save is not connected yet.`
			);
			closeQuickAdd();
		} catch (error) {
			store.notify(error instanceof Error ? error.message : 'Unable to save record');
		}
	}

	onMount(() => {
		store.loadPersistedClients(data.clients.map(clientRecordFromApi));
		store.loadPersistedProjects(data.projects.map(projectRecordFromApi));
		store.loadPersistedTasks(data.tasks.map(taskRecordFromApi));
		store.loadPersistedEvents(data.events.map(eventRecordFromApi));
		store.loadPersistedInvoices(data.invoices.map(invoiceRecordFromApi));

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').catch(() => {});
		}
	});
</script>

<svelte:head
	><title>Action Center Â· Dogwood Admin</title><meta name="theme-color" content="#18263f" /><link
		rel="manifest"
		href="/manifest.webmanifest"
	/><meta name="apple-mobile-web-app-capable" content="yes" /></svelte:head
>

<div class="app">
        <DesktopSidebar
                {view}
                {inboxUnreadCount}
                ongo={go}
        />

        <main class="main">
                <AdminTopbar
                        records={searchableRecords}
                        onselect={chooseComponentSearchResult}
                        onquickadd={() => openQuickAdd()}
                        notificationCount={urgentNotificationCount}
                        onnotify={() => store.notify('No new urgent notifications')}
                />

                <div class="content">
                        {#if view === 'home'}
                                <ActionCenter
                                        onopenproject={openProject}
                                        onopenclient={openClient}
                                        ongoto={go}
                                        onquickadd={(type) => openQuickAdd(type ?? null)}
                                />
                        {:else if view === 'clients'}
                                <ClientsView
                                        onopenclient={openClient}
                                        onquickadd={() => openQuickAdd('client')}
                                />
                        {:else if view === 'client' && client}
                                <ClientDetailView
                                        {client}
                                        ongoback={() => go('clients')}
                                        onopenproject={openProject}
                                        onemail={() => (modal = 'email')}
                                        onedit={() => (modal = 'editclient')}
                                        onremove={async () => {
                                                if (!confirm(`Remove ${client.name}?`)) return;

                                                const response = await fetch(
                                                        `/admin/api/clients?id=${encodeURIComponent(client.id)}`,
                                                        { method: 'DELETE' }
                                                );

                                                if (!response.ok) {
                                                        store.notify('Unable to remove client');
                                                        return;
                                                }

                                                store.removePersistedClient(client.id);
                                                store.notify(`${client.name} removed`);
                                                go('clients');
                                        }}
                                        oncreateproject={() => openQuickAdd('project')}
                                />
                        {:else if view === 'projects'}
                                <ProjectsView
                                        onopenproject={openProject}
                                        onquickadd={() => openQuickAdd('project')}
                                        {money}
                                />
                        {:else if view === 'project' && project}
                                <ProjectDetailView
                                        {project}
                                        ongoback={() => go('projects')}
                                        onopenclient={openClient}
										onuploaddocument={() => openQuickAdd('document')}
                                        oncreateinvoice={() => {
                                                quickAddType = 'invoice';
                                                quickAddOpen = true;
                                        }}
                                        onviewinvoice={openInvoice}
                                        onedit={() => (modal = 'editproject')}
                                        {money}
                                />
                        {:else if view === 'inbox'}
                                <InboxView
                                        initialInboxes={data.zohoInboxes ?? []}
                                        onmailchange={handleInboxMailChange}
                                        oncompose={() => (modal = 'email')}
                                />
                        {:else if view === 'tasks'}
                                <TasksView
                                        onopenproject={openProject}
                                        onquickadd={() => openQuickAdd('task')}
                                />
                        {:else if view === 'documents'}
                                <DocumentsView
                                        onopenproject={openProject}
                                        onquickadd={() => openQuickAdd('document')}
                                />
                        {:else if view === 'calendar'}
                                <CalendarView
                                        onquickadd={() => openQuickAdd('event')}
                                />
                        {:else if view === 'accounting'}
                                <AccountingView
                                        oncreateinvoice={() => openQuickAdd('invoice')}
                                        onviewinvoice={openInvoice}
                                />
                        {:else if view === 'vendors'}
                                <VendorsView
                                        onaddvendor={() => (modal = 'vendor')}
                                        {money}
                                />
                        {:else if view === 'reports'}
                                <ReportsView
                                        onschedule={() => (modal = 'schedule')}
                                        {money}
                                />
                        {:else if view === 'settings'}
                                <SettingsView
                                        oninvite={() => (modal = 'user')}
                                />
                        {/if}
                </div>
        </main>

        <MobileNavigation
                {view}
                {inboxUnreadCount}
                {moreOpen}
                ongo={go}
                ontogglemore={() => (moreOpen = !moreOpen)}
                onquickadd={() => openQuickAdd()}
        />
</div>

<QuickAddModal
	open={quickAddOpen}
	initialType={quickAddType}
	initialClientId={view === 'client' && client
		? client.id
		: view === 'project' && project
			? project.clientId
			: ''}
	initialProjectId={view === 'project' && project ? project.id : ''}
	lockProjectClient={view === 'client' && Boolean(client) && quickAddType === 'project'}
	clients={store.clients.map((c) => ({
		id: c.id,
		name: c.name,
		contacts: c.contacts.map((contact) => ({
			id: contact.id,
			name: contact.name,
			email: contact.email,
			role: contact.role,
			primary: contact.primary
		}))
	}))}
	invoices={store.invoices.map((invoice) => ({
		projectId: invoice.projectId,
		invoiceIdentifier: invoice.invoiceIdentifier
	}))}
	projects={store.projects.map((p) => ({
		id: p.id,
		name: p.name,
		clientId: p.clientId,
		projectNumber: p.projectNumber
	}))}
	users={store.users.map((u) => ({ id: u.id, name: u.name }))}
	vendors={store.vendors.map((v) => ({ id: v.id, name: v.name }))}
	onclose={closeQuickAdd}
	onsave={saveQuickAdd}
/>

<AdminLegacyModal
        {modal}
        {project}
        onclose={() => (modal = '')}
        onsaved={() => {}}
/>

<InvoiceDetailModal
	invoice={selectedInvoice}
	onclose={closeInvoice}
	{money}
/>

{#if store.toast}<div class="toast">âœ“ {store.toast}</div>{/if}


