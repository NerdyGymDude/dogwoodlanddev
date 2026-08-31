<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import type { Client, Project } from '$lib/admin/types';

	let {
		modal,
		project,
		client,
		initialRecipientId = '',
		onclose,
		onsaved
	}: {
		modal: string;
		project?: Project;
		client?: Client;
		initialRecipientId?: string;
		onclose: () => void;
		onsaved: (record?: unknown) => void;
	} = $props();

	let formTitle = $state('');
	let formName = $state('');
	let formEmail = $state('');
	let formPhone = $state('');
	let formDescription = $state('');
	let projectName = $state('');
	let projectType = $state('');
	let projectPhase = $state('');
	let projectDescription = $state('');
	let projectNotes = $state('');
	let projectBudget = $state('');
	let projectAddress = $state('');
	let projectCity = $state('');
	let projectState = $state('');
	let projectZip = $state('');
	let projectStartDate = $state('');
	let projectEndDate = $state('');
	let projectSaving = $state(false);
	let projectError = $state('');
	let formFromEmail = $state('branch@dogwoodlanddev.com');
	let emailSending = $state(false);
	let recipientIds = $state<string[]>([]);
	let manualRecipients = $state('');
	let emailError = $state('');
	let emailAttachments = $state<File[]>([]);
	let attachmentInput = $state<HTMLInputElement>();

	$effect(() => {
		if (modal === 'email' && client) {
			const contactsWithEmail = client.contacts.filter((contact) => contact.email);
			const requested = contactsWithEmail.find((contact) => contact.id === initialRecipientId);
			const primary = requested ?? contactsWithEmail.find((contact) => contact.primary);

			formEmail = primary?.email ?? contactsWithEmail[0]?.email ?? '';
			recipientIds = primary ? [primary.id] : [];
			manualRecipients = '';
			emailError = '';
			formFromEmail = 'branch@dogwoodlanddev.com';
			formTitle = '';
			formDescription = '';
			emailAttachments = [];
		}
		if (modal === 'editclient' && client) {
			formName = client.name;
			formEmail = client.email;
			formPhone = client.phone;
			formDescription = client.notes;
		}
		if (modal === 'editproject' && project) {
			projectName = project.name;
			projectType = project.projectType;
			projectPhase = project.phase;
			projectDescription = project.description;
			projectNotes = project.notes;
			projectBudget = String(project.budget);
			projectAddress = project.streetAddress;
			projectCity = project.city;
			projectState = project.state;
			projectZip = project.zip;
			projectStartDate = project.startDate;
			projectEndDate = project.targetCompletionDate;
			projectError = '';
		}
	});

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

	async function save() {
		if (modal === 'email') {
			if (emailSending) return;
			emailSending = true;
			emailError = '';

			if (client) {
				const selected = client.contacts
					.filter((contact) => recipientIds.includes(contact.id))
					.map((contact) => contact.email);
				const manual = manualRecipients
					.split(/[;,\s]+/)
					.map((email) => email.trim())
					.filter(Boolean);
				try {
					const formData = new FormData();
					formData.set('from', formFromEmail);
					formData.set('subject', formTitle);
					formData.set('message', formDescription);
					for (const recipient of [...selected, ...manual])
						formData.append('recipients', recipient);
					for (const file of emailAttachments) formData.append('attachments', file);
					const response = await fetch('/admin/api/email', {
						method: 'POST',
						body: formData
					});
					const result = await response.json();
					if (!response.ok) throw new Error(result.error || 'Email could not be sent.');
					emailAttachments = [];
					store.notify('Client email sent');
					onsaved();
					onclose();
				} catch (error) {
					emailError = error instanceof Error ? error.message : 'Email could not be sent.';
				} finally {
					emailSending = false;
				}
				return;
			}

			const formData = new FormData();
			formData.set('from', formFromEmail);
			formData.set('to', formEmail);
			formData.set('subject', formTitle);
			formData.set('message', formDescription);

			try {
				const response = await fetch('?/sendEmail', {
					method: 'POST',
					body: formData
				});

				const result = await response.json();

				if (!response.ok || result?.type === 'failure') {
					store.notify(result?.data?.emailError ?? 'Email could not be sent.');
					return;
				}

				store.notify(`Email sent from ${formFromEmail}`);
				onsaved();
				onclose();
			} catch {
				store.notify('Email could not be sent.');
			} finally {
				emailSending = false;
			}

			return;
		}

		if (modal === 'editproject' && project) {
			if (projectSaving) return;
			projectSaving = true;
			projectError = '';
			try {
				const response = await fetch(`/admin/api/projects?id=${encodeURIComponent(project.id)}`, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ name: projectName, projectType, phase: projectPhase, description: projectDescription, notes: projectNotes, budget: projectBudget, address: projectAddress, city: projectCity, state: projectState, zip: projectZip, startDate: projectStartDate, targetCompletionDate: projectEndDate })
				});
				const result = await response.json();
				if (!response.ok) throw new Error(result.error || 'Unable to update project.');
				onsaved(result.project);
				store.notify('Project updated');
				onclose();
			} catch (error) {
				projectError = error instanceof Error ? error.message : 'Unable to update project.';
			} finally {
				projectSaving = false;
			}
			return;
		}

		if (modal === 'client' && formName) {
			store.addClient({
				name: formName,
				shortName: formName,
				type: 'Company',
				email: formEmail,
				phone: formPhone,
				address: '',
				notes: formDescription
			});
		} else {
			store.notify('Record saved');
		}

		onsaved();
		onclose();
	}

	function toggleRecipient(id: string, checked: boolean) {
		recipientIds = checked
			? [...new Set([...recipientIds, id])]
			: recipientIds.filter((item) => item !== id);
	}
</script>

{#if modal}
	<div
		class="overlay"
		onclick={(event) => {
			if (event.target === event.currentTarget) onclose();
		}}
		role="presentation"
	>
		<form
			class="modal"
			onsubmit={(event) => {
				event.preventDefault();
				void save();
			}}
		>
			<button type="button" class="close" onclick={onclose}>&times;</button>

			<p class="eyebrow">QUICK ACTION</p>

			<h2>
				{modal === 'email'
					? 'Compose email'
					: modal === 'editproject'
						? 'Edit project'
						: modal === 'editclient'
							? 'Edit client'
							: modal === 'vendor'
								? 'Add vendor'
								: modal === 'schedule'
									? 'Schedule report'
									: modal === 'user'
										? 'Invite user'
										: `Add ${modal}`}
			</h2>

			{#if modal === 'editproject' && project}
				<label>
					Project Number
					<input value={project.projectNumber} readonly aria-readonly="true" />
				</label>
				<label>
					Project Name
					<input bind:value={projectName} required />
				</label>
				<label>
					Project Type
					<select bind:value={projectType}>
						<option value="">Select project type</option>
						{#each ['Residential Development', 'Commercial Development', 'Industrial Development', 'Site Planning', 'Stormwater', 'Onsite Wastewater', 'Mine / Borrow Pit', 'Permitting', 'Other'] as type}<option>{type}</option>{/each}
					</select>
				</label>
				<label>
					Project Description
					<textarea bind:value={projectDescription} rows="4"></textarea>
				</label>
				<label>
					Internal Notes
					<textarea bind:value={projectNotes} rows="3"></textarea>
				</label>
				<label>
					Estimate
					<input type="number" min="0" step="0.01" bind:value={projectBudget} />
				</label>
				<label>
					Street / Site Address
					<input bind:value={projectAddress} />
				</label>
				<div class="project-location-grid">
					<label>City<input bind:value={projectCity} /></label>
					<label>State<input bind:value={projectState} /></label>
					<label>ZIP<input bind:value={projectZip} /></label>
				</div>
				<label>
					Phase
					<select bind:value={projectPhase}>
						{#each ['New', 'Due Diligence', 'Entitlement', 'Engineering / Design', 'Permitting', 'Construction', 'Closeout'] as phase}<option>{phase}</option>{/each}
					</select>
				</label>
				<div class="project-date-grid">
					<label>Project Start Date<input type="date" bind:value={projectStartDate} /></label>
					<label>Expected End Date<input type="date" bind:value={projectEndDate} /></label>
				</div>
				{#if projectError}<p class="email-error">{projectError}</p>{/if}

				<button class="primary" type="submit" disabled={projectSaving}>{projectSaving ? 'Saving...' : 'Save project'}</button>
			{:else}
				<label>
					{modal === 'client' || modal === 'editclient'
						? 'Client or company name'
						: modal === 'email'
							? 'Subject'
							: 'Title'}

					{#if modal === 'client' || modal === 'editclient'}
						<input bind:value={formName} placeholder="Client or company name" />
					{:else}
						<input
							bind:value={formTitle}
							required={modal === 'email'}
							placeholder={modal === 'email' ? 'Write your message...' : 'Add context or notes...'}
						/>
					{/if}
				</label>

				{#if modal === 'email'}
					<label>
						From
						<select bind:value={formFromEmail}>
							{#if client}
								<option value="branch@dogwoodlanddev.com"
									>Branch &mdash; branch@dogwoodlanddev.com</option
								>
								<option value="office@dogwoodlanddev.com"
									>Office &mdash; office@dogwoodlanddev.com</option
								>
							{:else}
								<option value="branch@dogwoodlanddev.com">
									Branch &mdash; branch@dogwoodlanddev.com
								</option>
								<option value="office@dogwoodlanddev.com">
									Office &mdash; office@dogwoodlanddev.com
								</option>
								<option value="accounting@dogwoodlanddev.com">
									Accounting &mdash; accounting@dogwoodlanddev.com
								</option>
								<option value="permitting@dogwoodlanddev.com">
									Permitting &mdash; permitting@dogwoodlanddev.com
								</option>
							{/if}
						</select>
					</label>

					<label>
						To

						{#if client}
							<div class="recipient-list">
								{#each client.contacts.filter((contact) => contact.email) as contact}
									<label class="recipient-option">
										<input
											type="checkbox"
											checked={recipientIds.includes(contact.id)}
											onchange={(event) => toggleRecipient(contact.id, event.currentTarget.checked)}
										/>
										<span>
											{contact.name} — {contact.primary ? 'Primary' : contact.role} — {contact.email}
										</span>
									</label>
								{/each}
							</div>
							<input bind:value={manualRecipients} placeholder="Additional email addresses" />

							{#if !client.contacts.some((contact) => contact.email)}
								<small>No contacts for this client have an email address.</small>
							{/if}
						{:else}
							<input type="email" required bind:value={formEmail} placeholder="name@example.com" />
						{/if}
					</label>
					{#if client}
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
					{/if}
					{#if emailError}<p class="email-error">{emailError}</p>{/if}
				{:else if modal === 'client' || modal === 'editclient'}
					{#if modal === 'editclient' && client}
						<label>
							Short Name
							<input value={client.shortName} readonly aria-readonly="true" />
						</label>
					{/if}
					<label>
						Email
						<input type="email" bind:value={formEmail} placeholder="name@example.com" />
					</label>

					<label>
						Phone
						<input bind:value={formPhone} placeholder="(910) 555-0000" />
					</label>
				{/if}

				<label>
					{modal === 'email' ? 'Message' : 'Details'}
					<textarea
						bind:value={formDescription}
						rows="4"
						placeholder={modal === 'email' ? 'Write your message...' : 'Add context or notes...'}
					></textarea>
				</label>

				<button class="primary" type="submit" disabled={modal === 'email' && emailSending}>
					{modal === 'email' ? (emailSending ? 'Sending...' : 'Send email') : 'Save'}
				</button>
			{/if}
		</form>
	</div>
{/if}

<style>
	.project-location-grid, .project-date-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 13px 0; }
	.project-date-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.project-location-grid label, .project-date-grid label { display: flex; flex-direction: column; gap: 6px; min-width: 0; font-size: 11px; font-weight: bold; }
	.project-location-grid input, .project-date-grid input { width: 100%; }
	.attachments {
		display: grid;
		gap: 6px;
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
		color: #9b3028;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.email-error {
		margin: 0;
		color: #9b3028;
		font-size: 12px;
	}
	@media (max-width: 520px) { .project-location-grid, .project-date-grid { grid-template-columns: 1fr; } }
</style>
