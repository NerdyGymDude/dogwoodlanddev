<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import type { Project, ProjectStatus } from '$lib/admin/types';

	let {
		modal,
		project,
		onclose,
		onsaved
	}: {
		modal: string;
		project?: Project;
		onclose: () => void;
		onsaved: () => void;
	} = $props();

	let formTitle = $state('');
	let formName = $state('');
	let formEmail = $state('');
	let formPhone = $state('');
	let formDescription = $state('');
	let formFromEmail = $state('branch@dogwoodlanddev.com');
	let emailSending = $state(false);

	async function save() {
		if (modal === 'email') {
			emailSending = true;

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
			onsaved();
			onclose();
			return;
		}

		if (modal === 'client' && formName) {
			store.addClient({
				name: formName,
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
			<button type="button" class="close" onclick={onclose}>×</button>

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
					Status
					<select
						value={project.status}
						onchange={(event) =>
							store.updateProject(
								project.id,
								event.currentTarget.value as ProjectStatus,
								project.phase
							)}
					>
						<option>Active</option>
						<option>Pending</option>
						<option>Completed</option>
						<option>Cancelled</option>
					</select>
				</label>

				<label>
					Phase
					<select
						value={project.phase}
						onchange={(event) =>
							store.updateProject(project.id, project.status, event.currentTarget.value)}
					>
						{#each [
							'Due Diligence',
							'Entitlement',
							'Engineering / Design',
							'Permitting',
							'Construction',
							'Closeout'
						] as phase}
							<option>{phase}</option>
						{/each}
					</select>
				</label>

				<button class="primary" type="submit">Save project</button>
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
							placeholder={modal === 'email' ? 'Email subject' : 'Enter details'}
						/>
					{/if}
				</label>

				{#if modal === 'email'}
					<label>
						From
						<select bind:value={formFromEmail}>
							<option value="branch@dogwoodlanddev.com">
								Branch — branch@dogwoodlanddev.com
							</option>
							<option value="office@dogwoodlanddev.com">
								Office — office@dogwoodlanddev.com
							</option>
							<option value="accounting@dogwoodlanddev.com">
								Accounting — accounting@dogwoodlanddev.com
							</option>
							<option value="permitting@dogwoodlanddev.com">
								Permitting — permitting@dogwoodlanddev.com
							</option>
						</select>
					</label>

					<label>
						To
						<input
							type="email"
							required
							bind:value={formEmail}
							placeholder="name@example.com"
						/>
					</label>
				{:else if modal === 'client' || modal === 'editclient'}
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
						placeholder={modal === 'email' ? 'Write your message…' : 'Add context or notes…'}
					></textarea>
				</label>

				<button
					class="primary"
					type="submit"
					disabled={modal === 'email' && emailSending}
				>
					{modal === 'email' ? (emailSending ? 'Sending…' : 'Send email') : 'Save'}
				</button>
			{/if}
		</form>
	</div>
{/if}
