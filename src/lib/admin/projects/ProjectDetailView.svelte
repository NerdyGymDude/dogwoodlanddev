<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import type { FinancialDocument, FinancialTask, Project, ProjectPayment, ProjectPaymentAllocation } from '$lib/admin/types';

	let {
		project,
		ongoback,
		onopenclient,
		onuploaddocument,
		financialTasks,
		payments,
		allocations,
		financialDocuments,
		onfinancialchange,
		onedit,
		onremove,
		money
	}: {
		project: Project;
		ongoback: () => void;
		onopenclient: (id: string) => void;
		onuploaddocument: () => void;
		financialTasks: FinancialTask[];
		payments: ProjectPayment[];
		allocations: ProjectPaymentAllocation[];
		financialDocuments: FinancialDocument[];
		onfinancialchange: (kind: 'task' | 'payment' | 'allocation' | 'document', value: FinancialTask | ProjectPayment | ProjectPaymentAllocation | FinancialDocument) => void;
		onedit: () => void;
		onremove: () => void;
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
	let emailAttachments = $state<File[]>([]);
	let attachmentInput = $state<HTMLInputElement>();
	const client = $derived(store.clients.find((item) => item.id === project.clientId));
	const emailContacts = $derived(client?.contacts.filter((contact) => contact.email) ?? []);
	const primaryInvoiceContact = $derived(emailContacts.find((contact) => contact.primary));
	const projectDocuments = $derived(
		store.documents.filter((document) => document.projectId === project.id)
	);
	const totals = $derived({ total: financialTasks.reduce((sum, task) => sum + task.taskTotal, 0), paid: payments.reduce((sum, payment) => sum + payment.amount, 0), due: financialTasks.reduce((sum, task) => sum + task.billedAmount, 0) });
	const paidByTask = $derived.by(() => {
		const totals = new Map<string, number>();
		for (const allocation of allocations) {
			totals.set(allocation.projectBillingTaskId, (totals.get(allocation.projectBillingTaskId) ?? 0) + allocation.amount);
		}
		return totals;
	});
	let taskOpen = $state(false); let editingTask = $state<FinancialTask | null>(null); let taskDescription = $state(''); let taskTotal = $state(''); let billedAmount = $state(''); let financialError = $state(''); let financialSaving = $state(false);
	const editingTaskAmountPaid = $derived(editingTask ? (paidByTask.get(editingTask.id) ?? 0) : 0);
	const editingTaskRemainingDue = $derived(Math.max((Number(taskTotal) || 0) - editingTaskAmountPaid, 0));
	type CheckAllocationRow = { key: number; taskId: string; amount: string };
	let checkAllocationKey = 1;
	let checkOpen = $state(false); let checkAmount = $state(''); let checkAllocationMode = $state<'invoice' | 'tasks'>('invoice'); let checkAllocations = $state<CheckAllocationRow[]>([]); let checkNumber = $state(''); let checkDate = $state(new Date().toISOString().slice(0, 10)); let checkMemo = $state(''); let checkFile = $state<File | null>(null);
	let sendOpen = $state(false); let invoiceRecipients = $state<string[]>([]); let invoiceMessage = $state('Please find the attached invoice.'); let invoiceEmails = $state<string[]>(['']); let savedInvoiceEmails = $state<Array<{ client_id: string; email: string }>>([]);
	const invoiceEmailOptions = $derived([...new Set([...emailContacts.map((contact) => contact.email), ...savedInvoiceEmails.filter((item) => item.client_id === project.clientId).map((item) => item.email)])]);

	function parseMoneyInput(value: string) { const trimmed = value.trim(); if (!trimmed) return 0; if (!/^\$?(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{1,2})?$/.test(trimmed)) return Number.NaN; return Number(trimmed.replace(/[$,]/g, '')); }
	function openTask(task: FinancialTask | null = null) { editingTask = task; taskDescription = task?.description ?? ''; taskTotal = task ? String(task.taskTotal) : ''; billedAmount = ''; financialError = ''; taskOpen = true; }
	async function saveFinancialTask() { financialError = ''; const parsedBilledAmount = parseMoneyInput(billedAmount); if (!Number.isFinite(parsedBilledAmount) || parsedBilledAmount < 0) { financialError = 'Enter a valid Billed Amount.'; return; } if (editingTask && parsedBilledAmount > editingTaskRemainingDue) { financialError = 'Billed Amount cannot exceed Remaining Due.'; return; } financialSaving = true; try { const response = await fetch('/admin/api/financials/tasks', { method: editingTask ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: editingTask?.id, projectId: project.id, description: taskDescription, taskTotal: Number(taskTotal), billedAmount: parsedBilledAmount }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); onfinancialchange('task', result.task); taskOpen = false; } catch (error) { financialError = error instanceof Error ? error.message : 'Unable to save task.'; } finally { financialSaving = false; } }
	function addCheckAllocation() { checkAllocations = [...checkAllocations, { key: checkAllocationKey++, taskId: '', amount: '' }]; }
	function removeCheckAllocation(key: number) { checkAllocations = checkAllocations.filter((allocation) => allocation.key !== key); }
	async function savePaperCheck() {
		financialError = '';
		const parsedCheckAmount = parseMoneyInput(checkAmount);
		const amountCents = Math.round(parsedCheckAmount * 100);
		const amountDueCents = Math.round(totals.due * 100);
		if (!Number.isFinite(parsedCheckAmount) || !Number.isInteger(amountCents) || amountCents <= 0) { financialError = 'Enter a valid Check Amount.'; return; }
		if (amountCents > amountDueCents) { financialError = 'Check Amount cannot exceed the current Amount Due.'; return; }
		const requestedAllocations: Array<{ taskId: string; amount: number }> = [];
		if (checkAllocationMode === 'tasks') {
			if (!checkAllocations.length) { financialError = 'Add at least one task allocation.'; return; }
			const taskIds = checkAllocations.map((allocation) => allocation.taskId);
			if (taskIds.some((taskId) => !taskId)) { financialError = 'Select a task for every allocation.'; return; }
			if (new Set(taskIds).size !== taskIds.length) { financialError = 'Each task can only be selected once.'; return; }
			let allocatedCents = 0;
			for (const allocation of checkAllocations) {
				const parsedAmount = parseMoneyInput(allocation.amount);
				const allocationCents = Math.round(parsedAmount * 100);
				const task = financialTasks.find((item) => item.id === allocation.taskId);
				if (!Number.isFinite(parsedAmount) || !Number.isInteger(allocationCents) || allocationCents <= 0) { financialError = 'Enter a positive amount for every task allocation.'; return; }
				if (!task) { financialError = 'Select a valid project task.'; return; }
				if (allocationCents > Math.round(task.billedAmount * 100)) { financialError = `Allocation for ${task.description} cannot exceed its Billed Amount.`; return; }
				allocatedCents += allocationCents;
				requestedAllocations.push({ taskId: allocation.taskId, amount: allocationCents / 100 });
			}
			if (allocatedCents !== amountCents) { financialError = 'Task allocations must equal the Check Amount exactly.'; return; }
		}
		financialSaving = true;
		try {
			const form = new FormData();
			form.set('projectId', project.id); form.set('allocationMode', checkAllocationMode); form.set('allocations', JSON.stringify(requestedAllocations)); form.set('amount', String(amountCents / 100)); form.set('checkNumber', checkNumber); form.set('paymentDate', checkDate); form.set('memo', checkMemo); if (checkFile) form.set('file', checkFile);
			const response = await fetch('/admin/api/financials/payments', { method: 'POST', body: form }); const result = await response.json(); if (!response.ok) throw new Error(result.error);
			onfinancialchange('payment', result.payment); for (const allocation of result.allocations ?? []) onfinancialchange('allocation', allocation); for (const task of result.tasks ?? []) onfinancialchange('task', task); checkOpen = false;
		} catch (error) { financialError = error instanceof Error ? error.message : 'Unable to record check.'; } finally { financialSaving = false; }
	}
	async function openInvoiceSend() { financialError = ''; invoiceRecipients = []; invoiceEmails = ['']; try { const response = await fetch('/admin/api/client-invoice-emails'); const result = response.ok ? await response.json() : { emails: [] }; savedInvoiceEmails = result.emails ?? []; } catch { savedInvoiceEmails = []; } sendOpen = true; }
	function updateInvoiceEmail(index: number, value: string) { invoiceEmails[index] = value; invoiceEmails = [...invoiceEmails]; }
	function toggleInvoiceClient(checked: boolean) { if (!primaryInvoiceContact) return; invoiceRecipients = checked ? [primaryInvoiceContact.id] : []; if (checked) { if (!invoiceEmails[0]) updateInvoiceEmail(0, primaryInvoiceContact.email); } else if (invoiceEmails[0].trim().toLowerCase() === primaryInvoiceContact.email.trim().toLowerCase()) { updateInvoiceEmail(0, ''); } }
	async function sendInvoice() { financialSaving = true; financialError = ''; try { const recipientEmails = invoiceEmails.map((email) => email.trim()).filter(Boolean); const response = await fetch(`/admin/api/financials/${project.id}/send`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ recipientContactIds: invoiceRecipients, recipientEmails, saveToClientId: project.clientId, message: invoiceMessage }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); onfinancialchange('document', result.document); sendOpen = false; store.notify('Invoice sent'); } catch (error) { financialError = error instanceof Error ? error.message : 'Unable to send invoice.'; } finally { financialSaving = false; } }

	function readableDate(value: string) {
		if (!value) return 'TBD';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(`${value}T00:00:00`));
	}

	function openCompose() {
		emailFrom = 'office@dogwoodlanddev.com';
		const primary = emailContacts.find((contact) => contact.primary);
		recipientIds = primary ? [primary.id] : [];
		manualRecipients = '';
		emailSubject = project.name;
		emailBody = '';
		emailError = '';
		emailAttachments = [];
		composeOpen = true;
	}

	function readableSize(bytes: number) {
		return bytes < 1024 * 1024
			? `${Math.max(1, Math.round(bytes / 1024))} KB`
			: `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}

	function addAttachments(event: Event) {
		const files = Array.from((event.currentTarget as HTMLInputElement).files ?? []);
		const next = [...emailAttachments, ...files];
		const allowed = new Set([
			'pdf',
			'doc',
			'docx',
			'xls',
			'xlsx',
			'csv',
			'txt',
			'jpg',
			'jpeg',
			'png'
		]);
		if (next.length > 5) emailError = 'Maximum 5 attachments allowed.';
		else if (files.some((file) => file.size === 0)) emailError = 'Attachments cannot be empty.';
		else if (next.reduce((total, file) => total + file.size, 0) > 4 * 1024 * 1024)
			emailError = 'Attachments must be 4 MB or less combined.';
		else if (files.some((file) => !allowed.has(file.name.split('.').pop()?.toLowerCase() ?? '')))
			emailError = 'Select only PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, JPG, JPEG, or PNG files.';
		else {
			emailAttachments = next;
			emailError = '';
		}
		if (attachmentInput) attachmentInput.value = '';
	}

	function toggleRecipient(id: string, checked: boolean) {
		recipientIds = checked
			? [...new Set([...recipientIds, id])]
			: recipientIds.filter((item) => item !== id);
	}

	async function sendEmail() {
		if (emailSending) return;
		emailSending = true;
		emailError = '';
		const selected = emailContacts
			.filter((contact) => recipientIds.includes(contact.id))
			.map((contact) => contact.email);
		const manual = manualRecipients
			.split(/[;,\s]+/)
			.map((email) => email.trim())
			.filter(Boolean);
		try {
			const formData = new FormData();
			formData.set('from', emailFrom);
			formData.set('subject', emailSubject);
			formData.set('message', emailBody);
			for (const recipient of [...selected, ...manual]) formData.append('recipients', recipient);
			for (const file of emailAttachments) formData.append('attachments', file);
			const response = await fetch('/admin/api/email', {
				method: 'POST',
				body: formData
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error || 'Unable to send email.');
			composeOpen = false;
			emailAttachments = [];
			store.notify('Project email sent');
		} catch (error) {
			emailError = error instanceof Error ? error.message : 'Unable to send email.';
		} finally {
			emailSending = false;
		}
	}
</script>

<button class="back" onclick={ongoback}>← All projects</button>

<section class="project-hero compact-card">
	<div class="identity">
		<div class="tags">
			<span>{project.phase}</span>
		</div>
		<p class="project-number">{project.projectNumber}</p>
		<h1>{project.name}</h1>
		<div class="project-context">
			<button class="link" onclick={() => onopenclient(project.clientId)}
				>{client?.name ?? 'Client unavailable'}</button
			>
			{#if project.address}<span>·</span><span>{project.address}</span>{/if}
		</div>
	</div>
	<div class="hero-actions">
		<button onclick={openCompose}>Compose Email</button>
		<button class="primary" onclick={onedit}>Edit Project</button>
		<button onclick={onremove}>Remove Project</button>
	</div>
</section>

<div class="dashboard-grid">
	<section class="panel summary-panel">
		<h2>Project Summary</h2>
		<div class="description">
			<span>Project Description</span>
			<p>{project.description || 'TBD'}</p>
		</div>
		<div class="detail-grid">
			<div><span>Project Type</span><strong>{project.projectType || 'TBD'}</strong></div>
			<div><span>Project Start Date</span><strong>{readableDate(project.startDate)}</strong></div>
			<div>
				<span>Expected End Date</span><strong>{readableDate(project.targetCompletionDate)}</strong>
			</div>
		</div>
	</section>

	<section class="panel documents-panel">
		<div class="panel-head">
			<div>
				<h2>Documents</h2>
				<p>Files and images associated with this project.</p>
			</div>
			<button onclick={onuploaddocument}>Upload</button>
		</div>
		{#if projectDocuments.length}
			<div class="document-list">
				{#each projectDocuments as document}
					<div class="document-row">
						<div class="file-icon">FILE</div>
						<div>
							<strong>{document.name}</strong><span
								>{document.category} · {document.size} · {document.updated}</span
							>
						</div>
					</div>
				{/each}
			</div>
		{:else}<p class="empty-state">No documents associated with this project.</p>{/if}
	</section>

	<section class="panel financials-panel">
		<div class="panel-head">
			<div>
				<h2>Financials</h2>
				<p>The project’s invoice and billing tasks.</p>
			</div>
			<div class="financial-actions"><button onclick={() => openTask()}>+ Add Task</button><button onclick={() => { financialError = ''; checkAmount = ''; checkAllocationMode = 'invoice'; checkAllocations = []; checkNumber = ''; checkDate = new Date().toISOString().slice(0, 10); checkMemo = ''; checkFile = null; checkOpen = true; }}>Add Paper Check</button><button class="primary" onclick={openInvoiceSend}>Send Invoice</button></div>
		</div>
		<div class="financial-totals">
			<div><span>Total Project Invoice</span><strong>{money(totals.total)}</strong></div>
			<div><span>Amount Paid to Date</span><strong>{money(totals.paid)}</strong></div>
			<div><span>Amount Due</span><strong>{money(totals.due)}</strong></div>
		</div>
		<div class="invoice-list" aria-label="Project financial tasks">
			<div class="invoice-list-head"><span>Description</span><span>Amount</span><span>Billed Amount</span><span>Amount Paid</span><span>Remaining Due</span><span></span></div>
				{#each financialTasks as task (task.id)}
					{@const taskAmountPaid = paidByTask.get(task.id) ?? 0}
					<div class="invoice-row">
						<strong>{task.description}</strong><span>{money(task.taskTotal)}</span><strong>{money(task.billedAmount)}</strong><span>{money(taskAmountPaid)}</span><strong>{money(Math.max(task.taskTotal - taskAmountPaid, 0))}</strong><button onclick={() => openTask(task)}>Edit</button>
					</div>
				{/each}
				{#if !financialTasks.length}<p class="empty-state">No financial tasks configured.</p>{/if}
			</div>
		<h3 class="history-title">Payment History</h3>
		{#if payments.length}<div class="payment-history">{#each payments as payment (payment.id)}{@const paymentAllocations = allocations.filter((allocation) => allocation.paymentId === payment.id)}<div><strong>{money(payment.amount)}</strong><span class="payment-detail"><span>{payment.paymentMethod === 'paper_check' ? `Check ${payment.checkNumber}` : 'Electronic payment'} · {readableDate(payment.paymentDate)}</span>{#if paymentAllocations.length}<b>Applied to:</b>{#each paymentAllocations as allocation (allocation.id)}{@const allocatedTask = financialTasks.find((task) => task.id === allocation.projectBillingTaskId)}<span>{allocatedTask?.description ?? 'Task'} — {money(allocation.amount)}</span>{/each}{/if}{#if payment.memo}<span>Memo: {payment.memo}</span>{/if}</span>{#if payment.checkFilePath}<a href={`/admin/api/financials/payments/${payment.id}/file`} target="_blank">View file</a>{/if}</div>{/each}</div>{:else}<p class="empty-state">No payments recorded.</p>{/if}
		{#if financialDocuments.length}<h3 class="history-title">Invoice History</h3><div class="payment-history">{#each financialDocuments as document (document.id)}<div><strong>{money(document.amountDue)}</strong><span>{document.sentAt ? `Sent ${new Date(document.sentAt).toLocaleDateString()}` : `Created ${new Date(document.createdAt).toLocaleDateString()}`}</span>{#if document.pdfStoragePath}<a href={`/admin/api/financials/documents/${document.id}/file`} target="_blank">View PDF</a>{/if}</div>{/each}</div>{/if}
	</section>
</div>

{#if taskOpen}<div class="finance-backdrop"><form class="finance-modal" onsubmit={(event) => { event.preventDefault(); saveFinancialTask(); }}><h2>{editingTask ? 'Edit Task' : 'Add Task'}</h2><label>Description<input bind:value={taskDescription} required /></label><label>Amount<input type="number" min="0" step="0.01" bind:value={taskTotal} required /></label>{#if editingTask}<div class="readonly-field">Amount Paid<span class="read-only-financial">{money(editingTaskAmountPaid)}</span></div><div class="readonly-field">Remaining Due<span class="read-only-financial">{money(editingTaskRemainingDue)}</span></div>{/if}<label>Billed Amount<input type="text" inputmode="decimal" placeholder="Enter amount" bind:value={billedAmount} /></label>{#if financialError}<p class="email-error">{financialError}</p>{/if}<footer><button type="button" onclick={() => (taskOpen = false)}>Cancel</button><button class="primary" disabled={financialSaving}>Save Task</button></footer></form></div>{/if}
{#if checkOpen}<div class="finance-backdrop"><form class="finance-modal" onsubmit={(event) => { event.preventDefault(); savePaperCheck(); }}><h2>Add Paper Check</h2><label>Check Amount<input type="text" inputmode="decimal" placeholder="Enter amount" bind:value={checkAmount} required /></label><label>Apply Payment<select bind:value={checkAllocationMode} onchange={() => { if (checkAllocationMode === 'tasks' && !checkAllocations.length) addCheckAllocation(); }}><option value="invoice">Entire current invoice</option><option value="tasks">Allocate to tasks</option></select></label>{#if checkAllocationMode === 'tasks'}<div class="check-allocation-list"><span>Task allocations</span>{#each checkAllocations as allocation (allocation.key)}<div class="check-allocation-row"><select aria-label="Task" bind:value={allocation.taskId}><option value="">Select task</option>{#each financialTasks as task (task.id)}<option value={task.id}>{task.description} ({money(task.billedAmount)} billed)</option>{/each}</select><input aria-label="Allocation amount" type="text" inputmode="decimal" placeholder="Amount" bind:value={allocation.amount} /><button type="button" onclick={() => removeCheckAllocation(allocation.key)}>Remove</button></div>{/each}<button type="button" onclick={addCheckAllocation}>+ Add task</button><small>Allocations must equal the Check Amount exactly. Each amount must be positive and cannot exceed that task's Billed Amount.</small></div>{/if}<label>Check Number<input bind:value={checkNumber} required /></label><label>Date Received<input type="date" bind:value={checkDate} required /></label><label>Memo<textarea rows="3" bind:value={checkMemo}></textarea></label><label>Check Image / File<input type="file" onchange={(event) => (checkFile = event.currentTarget.files?.[0] ?? null)} /></label>{#if financialError}<p class="email-error">{financialError}</p>{/if}<footer><button type="button" onclick={() => (checkOpen = false)}>Cancel</button><button class="primary" disabled={financialSaving}>Record Check</button></footer></form></div>{/if}
{#if sendOpen}<div class="finance-backdrop"><form class="finance-modal" onsubmit={(event) => { event.preventDefault(); sendInvoice(); }}><h2>Send Invoice</h2><div class="invoice-recipient-line"><div class="invoice-email-list">{#each invoiceEmails as email, index}<label>Email {index + 1}<div class="invoice-email-input"><input type="email" list="invoice-email-options" placeholder="billing@example.com" value={email} oninput={(event) => updateInvoiceEmail(index, event.currentTarget.value)} />{#if invoiceEmails.length > 1}<button type="button" aria-label={`Remove email ${index + 1}`} onclick={() => (invoiceEmails = invoiceEmails.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>{/if}</div></label>{/each}<datalist id="invoice-email-options">{#each invoiceEmailOptions as email}<option value={email}></option>{/each}</datalist><button class="add-email" type="button" onclick={() => (invoiceEmails = [...invoiceEmails, ''])}>+ Add another email</button><small>New addresses are saved to this client after sending.</small></div><label class="recipient send-to-client"><input type="checkbox" checked={primaryInvoiceContact ? invoiceRecipients.includes(primaryInvoiceContact.id) : false} disabled={!primaryInvoiceContact} onchange={(event) => toggleInvoiceClient(event.currentTarget.checked)} /><span>Send to Client{#if primaryInvoiceContact}<small>{primaryInvoiceContact.email}</small>{:else}<small>No primary email</small>{/if}</span></label></div><label>Message<textarea rows="5" bind:value={invoiceMessage}></textarea></label>{#if financialError}<p class="email-error">{financialError}</p>{/if}<footer><button type="button" onclick={() => (sendOpen = false)}>Cancel</button><button class="primary" disabled={financialSaving}>Send Invoice</button></footer></form></div>{/if}

{#if composeOpen}
	<div
		class="compose-backdrop"
		role="presentation"
		onclick={(event) => event.currentTarget === event.target && (composeOpen = false)}
	>
		<div class="compose-modal" role="dialog" aria-modal="true" aria-labelledby="compose-title">
			<header>
				<div>
					<p>PROJECT EMAIL</p>
					<h2 id="compose-title">Compose Email</h2>
				</div>
				<button aria-label="Close compose email" onclick={() => (composeOpen = false)}>×</button>
			</header>
			<div class="compose-fields">
				<label
					>From<select bind:value={emailFrom}
						><option>office@dogwoodlanddev.com</option><option>branch@dogwoodlanddev.com</option
						></select
					></label
				>
				<fieldset>
					<legend>To</legend>
					{#each emailContacts as contact}<label class="recipient"
							><input
								type="checkbox"
								checked={recipientIds.includes(contact.id)}
								onchange={(event) => toggleRecipient(contact.id, event.currentTarget.checked)}
							/><span>{contact.name || contact.email} — {contact.email}</span></label
						>{/each}
					{#if !emailContacts.length}<span class="recipient-empty"
							>No client contacts with email.</span
						>{/if}
				</fieldset>
				<label
					>Additional email addresses<input
						bind:value={manualRecipients}
						placeholder="name@example.com, another@example.com"
					/></label
				>
				<label>Subject<input bind:value={emailSubject} /></label>
				<label>Body<textarea rows="8" bind:value={emailBody}></textarea></label>
				<label
					>Attachments<input
						bind:this={attachmentInput}
						type="file"
						multiple
						accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
						onchange={addAttachments}
					/><small>Maximum 5 files, 4 MB combined.</small></label
				>
				{#if emailAttachments.length}<div class="attachment-list">
						{#each emailAttachments as file, index}<div>
								<span>{file.name} · {readableSize(file.size)}</span><button
									type="button"
									onclick={() =>
										(emailAttachments = emailAttachments.filter((_, item) => item !== index))}
									>Remove</button
								>
							</div>{/each}
					</div>{/if}
				{#if emailError}<p class="email-error">{emailError}</p>{/if}
			</div>
			<footer>
				<button onclick={() => (composeOpen = false)} disabled={emailSending}>Cancel</button><button
					class="send"
					onclick={sendEmail}
					disabled={emailSending}>{emailSending ? 'Sending…' : 'Send Email'}</button
				>
			</footer>
		</div>
	</div>
{/if}

<style>
	.compact-card {
		margin-bottom: 18px;
		padding: 20px 22px;
	}
	.identity {
		min-width: 0;
	}
	.project-number {
		margin: 10px 0 2px;
		color: #718667;
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.06em;
	}
	.project-hero h1 {
		margin: 0;
	}
	.project-context {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 7px;
		margin-top: 7px;
		color: #6d7872;
		font-size: 13px;
	}
	.project-context .link {
		padding: 0;
	}
	.dashboard-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 16px;
	}
	.panel {
		margin: 0;
	}
	.panel h2,
	.panel p {
		margin-top: 0;
	}
	.summary-panel,
	.documents-panel {
		min-width: 0;
	}
	.financials-panel {
		grid-column: 1 / -1;
	}
	.panel-head {
		align-items: flex-start;
	}
	.panel-head p {
		margin: 4px 0 0;
		color: #747e86;
		font-size: 12px;
	}
	.description {
		margin: 18px 0;
	}
	.description span,
	.detail-grid span,
	.financial-totals span {
		display: block;
		margin-bottom: 5px;
		color: #7a858d;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
	}
	.description p {
		margin: 0;
		color: #3f4e47;
		line-height: 1.55;
	}
	.detail-grid,
	.financial-totals {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
	}
	.detail-grid div,
	.financial-totals div {
		border-radius: 8px;
		background: #f5f7f4;
		padding: 13px;
	}
	.detail-grid strong,
	.financial-totals strong {
		color: #26384d;
		font-size: 13px;
	}
	.financial-totals {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin: 18px 0;
	}
	.financial-totals strong {
		font-size: 20px;
	}
	.document-list,
	.invoice-list {
		display: grid;
		gap: 8px;
		margin-top: 14px;
	}
	.invoice-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border-bottom: 1px solid #e1e6e1;
		padding: 0 0 12px;
		color: #68747c;
		font-size: 12px;
	}
	.invoice-list-head,
	.invoice-row {
		display: grid;
		grid-template-columns: minmax(180px, 1fr) repeat(4, 120px) 72px;
		align-items: center;
		gap: 12px;
	}
	.invoice-list-head {
		padding: 0 12px;
		color: #7a858d;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
	}
	.document-row,
	.invoice-row {
		align-items: center;
		gap: 12px;
		border: 1px solid #e1e6e1;
		border-radius: 8px;
		padding: 11px 12px;
	}
	.document-row {
		display: flex;
	}
	.document-row > div:nth-child(2) {
		display: grid;
		flex: 1;
		gap: 3px;
		min-width: 0;
	}
	.document-row span {
		color: #747e86;
		font-size: 11px;
	}
	.file-icon {
		display: grid;
		flex: 0 0 auto;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 7px;
		background: #edf2e9;
		color: #587052;
		font-size: 9px;
		font-weight: 800;
	}
	.invoice-row button {
		border: 1px solid #cfd6d1;
		border-radius: 6px;
		background: #fff;
		padding: 7px 10px;
		color: #203552;
		font: inherit;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}
	.financial-actions { display: flex; flex-wrap: wrap; gap: 8px; }
	.history-title { margin: 22px 0 10px; color: #26384d; font-size: 15px; }
	.payment-history { display: grid; gap: 8px; }
	.payment-history > div { display: flex; align-items: center; gap: 14px; border: 1px solid #e1e6e1; border-radius: 8px; padding: 11px 12px; }
	.payment-history span { flex: 1; color: #68747c; font-size: 12px; }
	.payment-history .payment-detail { display: grid; gap: 3px; }
	.payment-history .payment-detail b { color: #26384d; }
	.payment-history a { color: #203552; font-size: 12px; font-weight: 700; }
	.finance-backdrop { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; padding: 18px; background: rgba(20, 31, 23, 0.52); }
	.finance-modal { box-sizing: border-box; display: grid; gap: 14px; width: min(500px, 100%); max-height: 90vh; overflow: auto; border-radius: 14px; background: white; padding: 22px; }
	.finance-modal h2 { margin: 0; color: #26384d; }
	.finance-modal label { display: grid; gap: 6px; color: #46564c; font-size: 12px; font-weight: 700; }
	.finance-modal .readonly-field { display: grid; gap: 6px; color: #46564c; font-size: 12px; font-weight: 700; }
	.finance-modal input, .finance-modal select, .finance-modal textarea { box-sizing: border-box; width: 100%; border: 1px solid #d4dbd4; border-radius: 7px; padding: 10px; font: inherit; }
	.read-only-financial { border: 1px solid #e0e5e0; border-radius: 7px; background: #f5f7f4; padding: 10px; color: #26384d; font-size: 14px; }
	.finance-modal fieldset { display: grid; gap: 8px; margin: 0; border: 1px solid #d4dbd4; border-radius: 7px; padding: 10px; }
	.finance-modal .recipient { display: flex; align-items: center; }
	.finance-modal .recipient input { width: auto; }
	.invoice-recipient-line { display: grid; grid-template-columns: minmax(0, 1fr) 180px; align-items: center; gap: 12px; }
	.invoice-email-list { display: grid; gap: 8px; }
	.invoice-email-input { display: flex; align-items: center; gap: 6px; }
	.finance-modal .invoice-email-input button { border: 0; background: transparent; padding: 4px; color: #9b3028; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
	.finance-modal label small { color: #7a858d; font-weight: 500; }
	.finance-modal .send-to-client { gap: 8px; }
	.finance-modal .send-to-client span, .finance-modal .send-to-client small { display: block; }
	.finance-modal .add-email { justify-self: start; border: 1px solid #cbd5cd; border-radius: 7px; background: #fff; padding: 8px 11px; color: #203552; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
	.check-allocation-list { display: grid; gap: 8px; color: #46564c; font-size: 12px; font-weight: 700; }
	.check-allocation-row { display: grid; grid-template-columns: minmax(0, 1fr) 110px auto; gap: 8px; align-items: center; }
	.check-allocation-row button { padding-inline: 10px; }
	.finance-modal footer { display: flex; justify-content: flex-end; gap: 8px; }
	.empty-state {
		margin: 18px 0 0;
		border-radius: 8px;
		background: #f6f8f5;
		padding: 18px;
		color: #7a858d;
		text-align: center;
		font-size: 13px;
	}
	.compose-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1100;
		display: grid;
		place-items: center;
		padding: 18px;
		background: rgba(20, 31, 23, 0.52);
	}
	.compose-modal {
		width: min(620px, 100%);
		border-radius: 14px;
		background: #fff;
		box-shadow: 0 24px 70px rgba(18, 31, 21, 0.25);
		overflow: hidden;
	}
	.compose-modal header {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		border-bottom: 1px solid #dfe5de;
		padding: 18px 20px;
	}
	.compose-modal header p {
		margin: 0 0 4px;
		color: #718667;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.14em;
	}
	.compose-modal header h2 {
		margin: 0;
	}
	.compose-modal header button {
		border: 0;
		background: transparent;
		color: #69757c;
		font-size: 26px;
		cursor: pointer;
	}
	.compose-fields {
		display: grid;
		gap: 14px;
		padding: 20px;
	}
	.compose-fields label {
		display: grid;
		gap: 6px;
		color: #46564c;
		font-size: 12px;
		font-weight: 700;
	}
	.compose-fields fieldset {
		display: grid;
		gap: 8px;
		margin: 0;
		border: 1px solid #d4dbd4;
		border-radius: 7px;
		padding: 10px;
	}
	.compose-fields legend {
		color: #46564c;
		font-size: 12px;
		font-weight: 700;
	}
	.compose-fields .recipient {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-weight: 500;
	}
	.compose-fields .recipient input {
		width: auto;
	}
	.recipient-empty {
		color: #7a858d;
		font-size: 12px;
	}
	.email-error {
		margin: 0;
		color: #9b3028;
		font-size: 12px;
	}
	.compose-fields small {
		color: #7a858d;
		font-weight: 500;
	}
	.attachment-list {
		display: grid;
		gap: 6px;
	}
	.attachment-list div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		border-radius: 7px;
		background: #f5f7f4;
		padding: 8px 10px;
		font-size: 12px;
	}
	.attachment-list span {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.attachment-list button {
		flex: 0 0 auto;
		border: 0;
		background: transparent;
		color: #9b3028;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.compose-fields input,
	.compose-fields select,
	.compose-fields textarea {
		box-sizing: border-box;
		width: 100%;
		border: 1px solid #d4dbd4;
		border-radius: 7px;
		padding: 10px;
		font: inherit;
		color: #26384d;
	}
	.compose-fields textarea {
		resize: vertical;
	}
	.compose-modal footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		border-top: 1px solid #dfe5de;
		padding: 14px 20px;
	}
	.compose-modal footer button {
		border: 1px solid #cfd6d1;
		border-radius: 7px;
		background: #fff;
		padding: 9px 15px;
		color: #203552;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.compose-modal footer .send {
		border-color: #203552;
		background: #203552;
		color: #fff;
	}
	.compose-modal button:disabled {
		cursor: wait;
		opacity: 0.65;
	}
	@media (max-width: 760px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
		.financials-panel {
			grid-column: auto;
		}
		.detail-grid {
			grid-template-columns: 1fr;
		}
		.invoice-row {
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.invoice-list-head {
			display: none;
		}
		.invoice-row button {
			grid-column: 1 / -1;
			justify-self: start;
		}
	}
</style>
