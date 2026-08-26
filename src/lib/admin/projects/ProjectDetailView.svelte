<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import type { Invoice, Project } from '$lib/admin/types';

	let { project, ongoback, onopenclient, onuploaddocument, oncreateinvoice, onviewinvoice, onedit, money }: {
		project: Project; ongoback: () => void; onopenclient: (id: string) => void;
		onuploaddocument: () => void; oncreateinvoice: () => void;
		onviewinvoice: (invoice: Invoice) => void; onedit: () => void;
		money: (value: number) => string;
	} = $props();

	let composeOpen = $state(false);
	let emailFrom = $state('office@dogwoodlanddev.com');
	let recipientIds = $state<string[]>([]);
	let manualRecipients = $state('');
	let emailSubject = $state('');
	let emailBody = $state('');
	let emailSending = $state(false);
	let emailError = $state('');
	const client = $derived(store.clients.find((item) => item.id === project.clientId));
	const emailContacts = $derived(client?.contacts.filter((contact) => contact.email) ?? []);
	const projectDocuments = $derived(store.documents.filter((document) => document.projectId === project.id));
	const projectInvoices = $derived(store.invoices.filter((invoice) => invoice.projectId === project.id));
	const totalInvoiced = $derived(projectInvoices.reduce((total, invoice) => total + invoice.amount, 0));

	function readableDate(value: string) {
		if (!value) return 'TBD';
		return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
			.format(new Date(`${value}T00:00:00`));
	}

	function openCompose() {
		emailFrom = 'office@dogwoodlanddev.com';
		const primary = emailContacts.find((contact) => contact.primary);
		recipientIds = primary ? [primary.id] : [];
		manualRecipients = '';
		emailSubject = project.name;
		emailBody = '';
		emailError = '';
		composeOpen = true;
	}

	function toggleRecipient(id: string, checked: boolean) {
		recipientIds = checked ? [...new Set([...recipientIds, id])] : recipientIds.filter((item) => item !== id);
	}

	async function sendEmail() {
		if (emailSending) return;
		emailSending = true;
		emailError = '';
		const selected = emailContacts.filter((contact) => recipientIds.includes(contact.id)).map((contact) => contact.email);
		const manual = manualRecipients.split(/[;,\s]+/).map((email) => email.trim()).filter(Boolean);
		try {
			const response = await fetch('/admin/api/email', {
				method: 'POST', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ from: emailFrom, recipients: [...selected, ...manual], subject: emailSubject, message: emailBody })
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error || 'Unable to send email.');
			composeOpen = false;
			store.notify('Project email sent');
		} catch (error) {
			emailError = error instanceof Error ? error.message : 'Unable to send email.';
		} finally { emailSending = false; }
	}
</script>

<button class="back" onclick={ongoback}>← All projects</button>

<section class="project-hero compact-card">
	<div class="identity">
		<div class="tags">
			<span class="status {project.status.toLowerCase()}">{project.status}</span>
			<span>{project.phase}</span>
		</div>
		<p class="project-number">{project.projectNumber}</p>
		<h1>{project.name}</h1>
		<div class="project-context">
			<button class="link" onclick={() => onopenclient(project.clientId)}>{client?.name ?? 'Client unavailable'}</button>
			{#if project.address}<span>·</span><span>{project.address}</span>{/if}
		</div>
	</div>
	<div class="hero-actions">
		<button onclick={openCompose}>Compose Email</button>
		<button class="primary" onclick={onedit}>Edit Project</button>
	</div>
</section>

<div class="dashboard-grid">
	<section class="panel summary-panel">
		<h2>Project Summary</h2>
		<div class="description"><span>Project Description</span><p>{project.description || 'TBD'}</p></div>
		<div class="detail-grid">
			<div><span>Project Type</span><strong>{project.projectType || 'TBD'}</strong></div>
			<div><span>Project Start Date</span><strong>{readableDate(project.startDate)}</strong></div>
			<div><span>Expected End Date</span><strong>{readableDate(project.targetCompletionDate)}</strong></div>
		</div>
	</section>

	<section class="panel documents-panel">
		<div class="panel-head">
			<div><h2>Documents</h2><p>Files and images associated with this project.</p></div>
			<button onclick={onuploaddocument}>Upload</button>
		</div>
		{#if projectDocuments.length}
			<div class="document-list">
				{#each projectDocuments as document}
					<div class="document-row">
						<div class="file-icon">FILE</div>
						<div><strong>{document.name}</strong><span>{document.category} · {document.size} · {document.updated}</span></div>
					</div>
				{/each}
			</div>
		{:else}<p class="empty-state">No documents associated with this project.</p>{/if}
	</section>

	<section class="panel financials-panel">
		<div class="panel-head">
			<div><h2>Financials</h2><p>Project estimate and invoice history.</p></div>
			<button class="primary" onclick={oncreateinvoice}>+ Create Invoice</button>
		</div>
		<div class="financial-totals">
			<div><span>Project Estimate</span><strong>{project.budget > 0 ? money(project.budget) : 'TBD'}</strong></div>
			<div><span>Total Invoiced</span><strong>{money(totalInvoiced)}</strong></div>
		</div>
		{#if projectInvoices.length}
			<div class="invoice-list">
				{#each projectInvoices as invoice (invoice.id)}
					<div class="invoice-row">
						<div><strong>{invoice.invoiceIdentifier}</strong><span>{invoice.status}</span></div>
						<strong>{money(invoice.amount)}</strong>
						<button onclick={() => onviewinvoice(invoice)}>View Invoice</button>
					</div>
				{/each}
			</div>
		{:else}<p class="empty-state">No invoices for this project.</p>{/if}
	</section>
</div>

{#if composeOpen}
	<div class="compose-backdrop" role="presentation" onclick={(event) => event.currentTarget === event.target && (composeOpen = false)}>
		<div class="compose-modal" role="dialog" aria-modal="true" aria-labelledby="compose-title">
			<header><div><p>PROJECT EMAIL</p><h2 id="compose-title">Compose Email</h2></div><button aria-label="Close compose email" onclick={() => (composeOpen = false)}>×</button></header>
			<div class="compose-fields">
				<label>From<select bind:value={emailFrom}><option>office@dogwoodlanddev.com</option><option>branch@dogwoodlanddev.com</option></select></label>
				<fieldset><legend>To</legend>
					{#each emailContacts as contact}<label class="recipient"><input type="checkbox" checked={recipientIds.includes(contact.id)} onchange={(event) => toggleRecipient(contact.id, event.currentTarget.checked)} /><span>{contact.name || contact.email} — {contact.email}</span></label>{/each}
					{#if !emailContacts.length}<span class="recipient-empty">No client contacts with email.</span>{/if}
				</fieldset>
				<label>Additional email addresses<input bind:value={manualRecipients} placeholder="name@example.com, another@example.com" /></label>
				<label>Subject<input bind:value={emailSubject} /></label>
				<label>Body<textarea rows="8" bind:value={emailBody}></textarea></label>
				{#if emailError}<p class="email-error">{emailError}</p>{/if}
			</div>
			<footer><button onclick={() => (composeOpen = false)} disabled={emailSending}>Cancel</button><button class="send" onclick={sendEmail} disabled={emailSending}>{emailSending ? 'Sending…' : 'Send Email'}</button></footer>
		</div>
	</div>
{/if}

<style>
	.compact-card { margin-bottom: 18px; padding: 20px 22px; }
	.identity { min-width: 0; }
	.project-number { margin: 10px 0 2px; color: #718667; font-size: 12px; font-weight: 800; letter-spacing: .06em; }
	.project-hero h1 { margin: 0; }
	.project-context { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin-top: 7px; color: #6d7872; font-size: 13px; }
	.project-context .link { padding: 0; }
	.dashboard-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
	.panel { margin: 0; }
	.panel h2, .panel p { margin-top: 0; }
	.summary-panel, .documents-panel { min-width: 0; }
	.financials-panel { grid-column: 1 / -1; }
	.panel-head { align-items: flex-start; }
	.panel-head p { margin: 4px 0 0; color: #747e86; font-size: 12px; }
	.description { margin: 18px 0; }
	.description span, .detail-grid span, .financial-totals span { display: block; margin-bottom: 5px; color: #7a858d; font-size: 10px; font-weight: 700; text-transform: uppercase; }
	.description p { margin: 0; color: #3f4e47; line-height: 1.55; }
	.detail-grid, .financial-totals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
	.detail-grid div, .financial-totals div { border-radius: 8px; background: #f5f7f4; padding: 13px; }
	.detail-grid strong, .financial-totals strong { color: #26384d; font-size: 13px; }
	.financial-totals { grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 18px 0; }
	.financial-totals strong { font-size: 20px; }
	.document-list, .invoice-list { display: grid; gap: 8px; margin-top: 14px; }
	.document-row, .invoice-row { display: flex; align-items: center; gap: 12px; border: 1px solid #e1e6e1; border-radius: 8px; padding: 11px 12px; }
	.document-row > div:nth-child(2), .invoice-row > div { display: grid; flex: 1; gap: 3px; min-width: 0; }
	.document-row span, .invoice-row span { color: #747e86; font-size: 11px; }
	.file-icon { display: grid; flex: 0 0 auto; place-items: center; width: 38px; height: 38px; border-radius: 7px; background: #edf2e9; color: #587052; font-size: 9px; font-weight: 800; }
	.invoice-row button { border: 1px solid #cfd6d1; border-radius: 6px; background: #fff; padding: 7px 10px; color: #203552; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
	.empty-state { margin: 18px 0 0; border-radius: 8px; background: #f6f8f5; padding: 18px; color: #7a858d; text-align: center; font-size: 13px; }
	.compose-backdrop { position: fixed; inset: 0; z-index: 1100; display: grid; place-items: center; padding: 18px; background: rgba(20,31,23,.52); }
	.compose-modal { width: min(620px, 100%); border-radius: 14px; background: #fff; box-shadow: 0 24px 70px rgba(18,31,21,.25); overflow: hidden; }
	.compose-modal header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #dfe5de; padding: 18px 20px; }
	.compose-modal header p { margin: 0 0 4px; color: #718667; font-size: 10px; font-weight: 800; letter-spacing: .14em; }
	.compose-modal header h2 { margin: 0; }
	.compose-modal header button { border: 0; background: transparent; color: #69757c; font-size: 26px; cursor: pointer; }
	.compose-fields { display: grid; gap: 14px; padding: 20px; }
	.compose-fields label { display: grid; gap: 6px; color: #46564c; font-size: 12px; font-weight: 700; }
	.compose-fields fieldset { display: grid; gap: 8px; margin: 0; border: 1px solid #d4dbd4; border-radius: 7px; padding: 10px; }
	.compose-fields legend { color: #46564c; font-size: 12px; font-weight: 700; }
	.compose-fields .recipient { display: flex; align-items: flex-start; gap: 8px; font-weight: 500; }
	.compose-fields .recipient input { width: auto; }
	.recipient-empty { color: #7a858d; font-size: 12px; }
	.email-error { margin: 0; color: #9b3028; font-size: 12px; }
	.compose-fields input, .compose-fields select, .compose-fields textarea { box-sizing: border-box; width: 100%; border: 1px solid #d4dbd4; border-radius: 7px; padding: 10px; font: inherit; color: #26384d; }
	.compose-fields textarea { resize: vertical; }
	.compose-modal footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; border-top: 1px solid #dfe5de; padding: 14px 20px; }
	.compose-modal footer button { border: 1px solid #cfd6d1; border-radius: 7px; background: #fff; padding: 9px 15px; color: #203552; font: inherit; font-weight: 700; cursor: pointer; }
	.compose-modal footer .send { border-color: #203552; background: #203552; color: #fff; }
	.compose-modal button:disabled { cursor: wait; opacity: .65; }
	@media (max-width: 760px) {
		.dashboard-grid { grid-template-columns: 1fr; }
		.financials-panel { grid-column: auto; }
		.detail-grid { grid-template-columns: 1fr; }
		.invoice-row { align-items: flex-start; flex-wrap: wrap; }
		.invoice-row > div { flex-basis: 60%; }
	}
</style>
