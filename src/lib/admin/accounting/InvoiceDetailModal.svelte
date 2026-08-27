<script lang="ts">
	import type { Invoice } from '$lib/admin/types';
	import { adminStore as store } from '$lib/admin/store.svelte';

	let {
		invoice,
		onclose,
		onedit,
		money
	}: {
		invoice: Invoice | null;
		onclose: () => void;
		onedit: (invoice: Invoice) => void;
		money: (value: number) => string;
	} = $props();

	const project = $derived(
		invoice ? store.projects.find((item) => item.id === invoice.projectId) : undefined
	);
	const client = $derived(
		invoice ? store.clients.find((item) => item.id === invoice.clientId) : undefined
	);
	let emailBody = $state('Please find the invoice details below.');
	let sending = $state(false);
	let sendError = $state('');
	let emailAttachments = $state<File[]>([]);
	let attachmentInput = $state<HTMLInputElement>();

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
		if (next.length > 5) sendError = 'Maximum 5 attachments allowed.';
		else if (files.some((file) => file.size === 0)) sendError = 'Attachments cannot be empty.';
		else if (next.reduce((total, file) => total + file.size, 0) > 4 * 1024 * 1024)
			sendError = 'Attachments must be 4 MB or less combined.';
		else if (files.some((file) => !allowed.has(file.name.split('.').pop()?.toLowerCase() ?? '')))
			sendError = 'Select only PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, JPG, JPEG, or PNG files.';
		else {
			emailAttachments = next;
			sendError = '';
		}
		if (attachmentInput) attachmentInput.value = '';
	}

	async function sendInvoice() {
		if (!invoice || sending) return;
		sending = true;
		sendError = '';
		try {
			const formData = new FormData();
			formData.set('message', emailBody);
			for (const file of emailAttachments) formData.append('attachments', file);
			const response = await fetch(`/admin/api/invoices/${encodeURIComponent(invoice.id)}/send`, {
				method: 'POST',
				body: formData
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error || 'Unable to send invoice.');
			invoice.sentAt = result.sentAt;
			invoice.status = result.status;
			emailAttachments = [];
			store.notify('Invoice email sent');
		} catch (error) {
			sendError = error instanceof Error ? error.message : 'Unable to send invoice.';
		} finally {
			sending = false;
		}
	}

	function dateLabel(value: string) {
		if (!value) return 'â€”';
		const date = new Date(`${value}T00:00:00`);
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}
</script>

{#if invoice}
	<div
		class="backdrop"
		role="presentation"
		onclick={(event) => {
			if (event.currentTarget === event.target) onclose();
		}}
	>
		<div class="invoice-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
			<header>
				<div>
					<p>INVOICE</p>
					<h2 id="invoice-title">{invoice.subject || 'Invoice'}</h2>
				</div>
				<button class="close" aria-label="Close invoice" onclick={onclose}>Ã—</button>
			</header>

			<div class="status-row">
				<strong>{invoice.sentAt ? 'Invoice Sent' : 'Not Sent'}</strong>
				<span>{invoice.status}</span>
			</div>

			<div class="details">
				<div>
					<span>Invoice Identifier</span><strong>{invoice.invoiceIdentifier || 'â€”'}</strong>
				</div>
				<div><span>Client</span><strong>{client?.name ?? 'â€”'}</strong></div>
				<div>
					<span>Project</span><strong
						>{project ? `${project.projectNumber} · ${project.name}` : 'â€”'}</strong
					>
				</div>
				<div><span>Invoice Date</span><strong>{dateLabel(invoice.date)}</strong></div>
				<div><span>Due Date</span><strong>{dateLabel(invoice.dueDate)}</strong></div>
			</div>

			<div class="amount">
				<span>Invoice Amount</span>
				<strong>{money(invoice.amount)}</strong>
			</div>

			{#if invoice.amountPaid > 0}
				<div class="paid">
					<span>Paid to date</span>
					<strong>{money(invoice.amountPaid)}</strong>
				</div>
			{/if}

			<div class="email-panel">
				<strong>Email from accounting@dogwoodlanddev.com</strong>
				<textarea rows="5" bind:value={emailBody}></textarea>
				<label class="attachments"
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
				{#if sendError}<p>{sendError}</p>{/if}
				<button onclick={sendInvoice} disabled={sending}
					>{sending ? 'Sending…' : invoice.sentAt ? 'Send Again' : 'Send Invoice'}</button
				>
			</div>

			<footer>
				{#if invoice.status !== 'Billed - Paid' && invoice.amountPaid < invoice.amount}<button
						class="edit"
						onclick={() => onedit(invoice)}>Edit Invoice</button
					>{/if}
				<button onclick={onclose}>Close</button>
			</footer>
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
		background: rgba(20, 31, 45, 0.48);
		padding: 18px;
	}
	.invoice-modal {
		width: min(620px, 100%);
		max-height: 90vh;
		overflow: auto;
		border-radius: 14px;
		background: #fff;
		box-shadow: 0 24px 70px rgba(20, 31, 45, 0.24);
	}
	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
		padding: 22px 24px 18px;
		border-bottom: 1px solid #e3e7e3;
	}
	header p {
		margin: 0 0 5px;
		color: #718667;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.15em;
	}
	h2 {
		margin: 0;
		color: #1b2a44;
		font-family: Georgia, serif;
		font-size: 24px;
	}
	.close {
		border: 0;
		background: transparent;
		color: #69757c;
		font-size: 28px;
		line-height: 1;
		cursor: pointer;
	}
	.status-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin: 20px 24px 0;
		border-radius: 9px;
		background: #edf2f7;
		padding: 12px 14px;
		color: #203552;
	}
	.status-row span {
		font-size: 12px;
	}
	.details {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1px;
		margin: 20px 24px;
		background: #e3e7e3;
		border: 1px solid #e3e7e3;
		border-radius: 9px;
		overflow: hidden;
	}
	.details div {
		display: grid;
		gap: 5px;
		background: #fff;
		padding: 14px;
	}
	.details span,
	.amount span,
	.paid span {
		color: #7a858d;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
	}
	.details strong {
		color: #26384d;
		font-size: 13px;
	}
	.amount,
	.paid {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0 24px;
		padding: 15px 0;
		border-top: 1px solid #e3e7e3;
	}
	.amount strong {
		color: #1b2a44;
		font-size: 24px;
	}
	.paid strong {
		color: #526a4b;
	}
	.email-panel {
		display: grid;
		gap: 10px;
		margin: 16px 24px 0;
		border-top: 1px solid #e3e7e3;
		padding-top: 16px;
	}
	.email-panel textarea {
		box-sizing: border-box;
		width: 100%;
		border: 1px solid #d4dbd4;
		border-radius: 7px;
		padding: 10px;
		font: inherit;
		resize: vertical;
	}
	.attachments {
		display: grid;
		gap: 6px;
		color: #46564c;
		font-size: 12px;
		font-weight: 700;
	}
	.attachments input {
		box-sizing: border-box;
		width: 100%;
		border: 1px solid #d4dbd4;
		border-radius: 7px;
		padding: 10px;
		font: inherit;
	}
	.attachments small {
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
		padding: 0;
		color: #9b3028;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.email-panel p {
		margin: 0;
		color: #9b3028;
		font-size: 12px;
	}
	.email-panel button {
		justify-self: end;
		border: 0;
		border-radius: 7px;
		background: #203552;
		padding: 10px 16px;
		color: #fff;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.email-panel button:disabled {
		cursor: wait;
		opacity: 0.65;
	}
	footer {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 18px 24px 22px;
	}
	footer button {
		border: 0;
		border-radius: 7px;
		background: #203552;
		padding: 10px 18px;
		color: white;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	footer .edit {
		border: 1px solid #cbd5cd;
		background: #fff;
		color: #203552;
	}
	@media (max-width: 560px) {
		.details {
			grid-template-columns: 1fr;
		}
	}
</style>
