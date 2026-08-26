<script lang="ts">
	import AttachmentsField from '../AttachmentsField.svelte';
	import MoneyInput from '../MoneyInput.svelte';
	import FormField from '../FormField.svelte';
	import FormGrid from '../FormGrid.svelte';
	import FormSection from '../FormSection.svelte';
	import type { InvoiceFormData } from '../types';

	type InvoiceContact = { id: string; name: string; email: string; role: string; primary?: boolean };
	type InvoiceClient = { id: string; name: string; contacts: InvoiceContact[] };
	type InvoiceProject = { id: string; name: string; clientId?: string; projectNumber?: string };

	let { value, clients = [], projects = [] }: {
		value: InvoiceFormData;
		clients?: InvoiceClient[];
		projects?: InvoiceProject[];
	} = $props();

	const selectedClient = $derived(clients.find((client) => client.id === value.clientId));
	const selectedProject = $derived(projects.find((project) => project.id === value.projectId));
	const visibleProjects = $derived(value.clientId
		? projects.filter((project) => !project.clientId || project.clientId === value.clientId)
		: projects);
	const invoiceIdentifier = $derived(selectedProject?.projectNumber || 'Select a project');

	$effect(() => {
		const subject = selectedClient && selectedProject
			? `${selectedClient.name} - ${selectedProject.name} - Invoice`
			: '';
		if (value.subject !== subject) value.subject = subject;
	});

	function defaultRecipients(clientId: string) {
		const primary = clients.find((client) => client.id === clientId)?.contacts.find(
			(contact) => contact.primary && contact.email
		);
		value.recipientContactIds = primary ? [primary.id] : [];
	}

	function changeClient(event: Event) {
		const clientId = (event.currentTarget as HTMLSelectElement).value;
		value.clientId = clientId;
		if (value.projectId && projects.find((project) => project.id === value.projectId)?.clientId !== clientId) {
			value.projectId = '';
		}
		defaultRecipients(clientId);
	}

	function changeProject(event: Event) {
		const projectId = (event.currentTarget as HTMLSelectElement).value;
		value.projectId = projectId;
		const projectClientId = projects.find((project) => project.id === projectId)?.clientId;
		if (projectClientId && projectClientId !== value.clientId) {
			value.clientId = projectClientId;
			defaultRecipients(projectClientId);
		}
	}

	function toggleRecipient(contactId: string, checked: boolean) {
		value.recipientContactIds = checked
			? [...new Set([...value.recipientContactIds, contactId])]
			: value.recipientContactIds.filter((id) => id !== contactId);
	}
</script>

<FormSection title="Invoice" description="Choose the project being billed. Client details follow the project relationship already on file.">
	<FormGrid>
		<FormField label="Client" forId="invoice-client" required>
			<select id="invoice-client" value={value.clientId} onchange={changeClient} required>
				<option value="">Select a client</option>
				{#each clients as client}<option value={client.id}>{client.name}</option>{/each}
			</select>
		</FormField>
		<FormField label="Project" forId="invoice-project" required>
			<select id="invoice-project" value={value.projectId} onchange={changeProject} required>
				<option value="">Select a project</option>
				{#each visibleProjects as project}<option value={project.id}>{project.name}</option>{/each}
			</select>
		</FormField>
		<FormField label="Invoice Identifier" hint="The first invoice uses the Project ID. Later suffixes require persisted invoice history.">
			<div class="read-only-value">{invoiceIdentifier}</div>
		</FormField>
		<FormField label="Status"><div class="status-value">Billed - Not Paid</div></FormField>
	</FormGrid>
	<FormField label="Subject"><div class="read-only-value">{value.subject || 'Select a client and project'}</div></FormField>
	<FormGrid>
		<FormField label="Date" forId="invoice-date" required>
			<input id="invoice-date" type="date" bind:value={value.date} required />
		</FormField>
		<FormField label="Due Date" forId="invoice-due" hint="Optional">
			<input id="invoice-due" type="date" bind:value={value.dueDate} />
		</FormField>
	</FormGrid>
</FormSection>

<FormSection title="Share with Client" description="Choose the client contacts associated with this invoice. Delivery will be handled by the invoice sending workflow.">
	{#if !selectedClient}
		<p class="empty-copy">Select a client or project to see registered contacts.</p>
	{:else if selectedClient.contacts.filter((contact) => contact.email).length === 0}
		<p class="empty-copy">This client has no registered contacts with an email address.</p>
	{:else}
		<div class="contact-list">
			{#each selectedClient.contacts.filter((contact) => contact.email) as contact}
				<label class="contact-option">
					<input type="checkbox" checked={value.recipientContactIds.includes(contact.id)} onchange={(event) => toggleRecipient(contact.id, event.currentTarget.checked)} />
					<span><strong>{contact.name || contact.email}</strong><small>{contact.role} · {contact.email}</small></span>
				</label>
			{/each}
		</div>
	{/if}
</FormSection>

<FormSection title="Invoice Amount" description="Enter the single amount to invoice for this project.">
	<div class="amount-field">
		<FormField label="Invoice Amount" forId="invoice-amount" required>
			<MoneyInput id="invoice-amount" bind:value={value.amount} placeholder="0.00" required />
		</FormField>
	</div>
</FormSection>

<FormSection title="Attachments" description="Optional files selected here stay in this form only until attachment storage is implemented.">
	<AttachmentsField bind:files={value.attachments} />
</FormSection>

<style>
	.read-only-value, .status-value { min-height: 44px; box-sizing: border-box; border: 1px solid #dfe5df; border-radius: .65rem; background: #f6f8f5; padding: .72rem .8rem; color: #34483a; }
	.status-value { color: #526a4b; font-weight: 700; }
	.contact-list { display: grid; gap: .65rem; }
	.contact-option { display: flex; align-items: flex-start; gap: .75rem; border: 1px solid #dfe5df; border-radius: .7rem; padding: .85rem; cursor: pointer; }
	.contact-option:has(input:checked) { border-color: #7f9676; background: #f5f9f3; }
	.contact-option input { margin-top: .2rem; width: 18px; height: 18px; accent-color: #5c7350; }
	.contact-option span { display: grid; gap: .18rem; min-width: 0; }
	.contact-option strong { color: #314336; }
	.contact-option small, .empty-copy { margin: 0; overflow-wrap: anywhere; color: #737d75; font-size: .78rem; line-height: 1.4; }
	.amount-field { max-width: 420px; }
</style>
