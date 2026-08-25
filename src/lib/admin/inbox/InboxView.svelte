<script lang="ts">
	import { onMount } from 'svelte';
	import { adminStore as store } from '$lib/admin/store.svelte';

	type ZohoInbox = {
		emailAddress: string;
		messages: Array<{
			messageId: string;
			folderId: string;
			subject: string;
			fromAddress: string;
			sender: string;
			receivedTime: string | null;
			summary: string;
			hasAttachment: boolean;
			isRead: boolean;
		}>;
	};

	type ZohoMailMessage = ZohoInbox['messages'][number] & {
		key: string;
		emailAddress: string;
		mailbox: string;
	};

	let {
		initialInboxes,
		onmailchange,
		oncompose
	}: {
		initialInboxes: ZohoInbox[];
		onmailchange: (messages: ZohoMailMessage[], unreadCount: number) => void;
		oncompose: () => void;
	} = $props();

	let liveZohoInboxes = $state<ZohoInbox[]>([]);
	let selectedMail = $state('');
	let mailbox = $state('All');
	let mailSearch = $state('');

	let selectedMailContent = $state('');
	let selectedMailLoading = $state(false);
	let selectedMailError = $state('');
	let replyText = $state('');
	let replySending = $state(false);

	let zohoRefreshing = $state(false);
	let zohoRefreshError = $state('');

	const zohoMail = $derived(
		liveZohoInboxes.flatMap((inbox) =>
			inbox.messages.map((message) => ({
				...message,
				key: `${inbox.emailAddress}:${message.messageId}`,
				emailAddress: inbox.emailAddress,
				mailbox:
					inbox.emailAddress === 'branch@dogwoodlanddev.com'
						? 'Branch'
						: inbox.emailAddress === 'office@dogwoodlanddev.com'
							? 'Office'
							: inbox.emailAddress === 'accounting@dogwoodlanddev.com'
								? 'Accounting'
								: 'Permitting'
			}))
		)
	);

	const unreadCount = $derived(zohoMail.filter((message) => !message.isRead).length);

	const visibleZohoMail = $derived(
		zohoMail
			.filter((message) => mailbox === 'All' || message.mailbox === mailbox)
			.filter((message) => {
				const search = mailSearch.trim().toLowerCase();

				if (!search) return true;

				return [
					message.sender,
					message.fromAddress,
					message.subject,
					message.summary,
					message.mailbox
				].some((value) => value?.toLowerCase().includes(search));
			})
			.sort((a, b) => Number(b.receivedTime ?? 0) - Number(a.receivedTime ?? 0))
	);

	const selectedZohoMail = $derived(zohoMail.find((message) => message.key === selectedMail));

	const selectedMailDocument = $derived(`
	<meta
		http-equiv="Content-Security-Policy"
		content="default-src 'none'; img-src data: cid:; style-src 'unsafe-inline'; font-src data:;"
	>
	${selectedMailContent}
`);

	$effect(() => {
		onmailchange(zohoMail, unreadCount);
	});

	function formatZohoTime(value: string | null) {
		if (!value) return '';

		const numeric = Number(value);
		const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);

		if (Number.isNaN(date.getTime())) return '';

		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		}).format(date);
	}

	function formatZohoReceived(value: string | null) {
		if (!value) return '';

		const numeric = Number(value);
		const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);

		if (Number.isNaN(date.getTime())) return '';

		const today = new Date();

		if (
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		) {
			return new Intl.DateTimeFormat('en-US', {
				hour: 'numeric',
				minute: '2-digit'
			}).format(date);
		}

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	async function openZohoMessage(message: ZohoMailMessage) {
		selectedMail = message.key;
		selectedMailContent = '';
		selectedMailError = '';
		selectedMailLoading = true;
		replyText = '';

		const params = new URLSearchParams({
			mailbox: message.emailAddress,
			folderId: message.folderId,
			messageId: message.messageId
		});

		try {
			const response = await fetch(`/api/zoho/message?${params.toString()}`);
			const result = await response.json();

			if (!response.ok || !result?.ok) {
				selectedMailError = result?.error ?? 'The email could not be opened.';
				return;
			}

			selectedMailContent = result.content ?? '';
		} catch {
			selectedMailError = 'The email could not be opened.';
		} finally {
			selectedMailLoading = false;
		}
	}

	async function sendZohoReply() {
		if (!selectedZohoMail || !replyText.trim()) return;

		replySending = true;

		const formData = new FormData();
		formData.set('from', selectedZohoMail.emailAddress);
		formData.set('to', selectedZohoMail.fromAddress);
		formData.set(
			'subject',
			selectedZohoMail.subject.toLowerCase().startsWith('re:')
				? selectedZohoMail.subject
				: `Re: ${selectedZohoMail.subject}`
		);
		formData.set('message', replyText.trim());

		try {
			const response = await fetch('?/sendEmail', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (!response.ok || result?.type === 'failure') {
				store.notify(result?.data?.emailError ?? 'Reply could not be sent.');
				return;
			}

			replyText = '';
			store.notify(`Reply sent from ${selectedZohoMail.emailAddress}`);
			await refreshZohoInbox();
		} catch {
			store.notify('Reply could not be sent.');
		} finally {
			replySending = false;
		}
	}

	async function refreshZohoInbox() {
		if (zohoRefreshing) return;

		zohoRefreshing = true;
		zohoRefreshError = '';

		try {
			const response = await fetch('/api/zoho/inbox', {
				method: 'GET',
				cache: 'no-store'
			});

			const result = await response.json();

			if (!response.ok || !result?.ok) {
				throw new Error(result?.error ?? 'Zoho inbox could not be refreshed.');
			}

			liveZohoInboxes = result.zohoInboxes ?? [];
		} catch (cause) {
			console.error(
				'Live Zoho inbox refresh failed:',
				cause instanceof Error ? cause.message : 'Unknown error'
			);

			zohoRefreshError = 'Live Zoho refresh failed. Showing the last successful inbox state.';
		} finally {
			zohoRefreshing = false;
		}
	}

	onMount(() => {
		liveZohoInboxes = initialInboxes ?? [];
		void refreshZohoInbox();

		const interval = window.setInterval(() => {
			if (document.visibilityState === 'visible') {
				void refreshZohoInbox();
			}
		}, 30000);

		const handleFocus = () => {
			void refreshZohoInbox();
		};

		window.addEventListener('focus', handleFocus);

		return () => {
			window.clearInterval(interval);
			window.removeEventListener('focus', handleFocus);
		};
	});
</script>

<div class="page-heading compact">
	<div>
		<p class="eyebrow">COMMUNICATIONS</p>
		<h1>Inbox</h1>
		<p>Live Zoho mail across all four Dogwood mailboxes.</p>
	</div>

	<div class="inbox-actions">
		<button class="secondary" disabled={zohoRefreshing} onclick={() => refreshZohoInbox()}>
			{zohoRefreshing ? 'Refreshing…' : '↻ Refresh'}
		</button>
		<button class="primary" onclick={oncompose}>✎ Compose</button>
	</div>
</div>

{#if zohoRefreshError}
	<div class="mail-refresh-warning">{zohoRefreshError}</div>
{/if}

<div class="mailboxes">
	{#each ['All', 'Branch', 'Office', 'Accounting', 'Permitting'] as box}
		<button
			class:active={mailbox === box}
			onclick={() => {
				mailbox = box;
				selectedMail = '';
				selectedMailContent = '';
				selectedMailError = '';
				replyText = '';
			}}
		>
			<span>{box}</span>
		</button>
	{/each}
</div>

<div class="inbox">
	<div class="threads">
		<label>
			⌕
			<input bind:value={mailSearch} placeholder="Search this mailbox…" />
		</label>

		{#if visibleZohoMail.length}
			{#each visibleZohoMail as m}
				<button
					class:active={selectedMail === m.key}
					class:unread={!m.isRead}
					onclick={() => openZohoMessage(m)}
				>
					<div>
						<strong class:unread-sender={!m.isRead}>
							{#if !m.isRead}<i class="unread-dot" aria-hidden="true"></i>{/if}
							{m.sender}
						</strong>
						<time>
							<span>{formatZohoReceived(m.receivedTime)}</span>
							<small>{formatZohoTime(m.receivedTime)}</small>
						</time>
					</div>

					<h3 class:unread-subject={!m.isRead}>{m.subject}</h3>
					<p>{m.summary || m.fromAddress}</p>
					<span>{m.mailbox}</span>
				</button>
			{/each}
		{:else}
			<div class="mail-list-empty">
				<strong>No messages found</strong>
				<p>
					{mailSearch
						? 'Try a different search.'
						: 'Zoho returned no messages for this mailbox.'}
				</p>
			</div>
		{/if}
	</div>

	{#if selectedZohoMail}
		<section class="message">
			<header>
				<div>
					<span class="status">{selectedZohoMail.mailbox}</span>
					<h2>{selectedZohoMail.subject}</h2>
					<p>
						From {selectedZohoMail.sender}
						&lt;{selectedZohoMail.fromAddress}&gt;
					</p>
					<p>
						{formatZohoReceived(selectedZohoMail.receivedTime)}
						{#if selectedZohoMail.hasAttachment}
							· Has attachment
						{/if}
					</p>
				</div>
			</header>

			{#if selectedMailLoading}
				<div class="mail-reader-state">
					<strong>Opening email…</strong>
				</div>
			{:else if selectedMailError}
				<div class="mail-reader-state error">
					<strong>{selectedMailError}</strong>
					<button onclick={() => openZohoMessage(selectedZohoMail)}>Try again</button>
				</div>
			{:else}
				<div class="real-mail-body">
					<iframe
						title={`Email: ${selectedZohoMail.subject}`}
						sandbox=""
						srcdoc={selectedMailDocument}
					></iframe>
				</div>

				<div class="reply">
					<textarea
						bind:value={replyText}
						placeholder={`Reply from ${selectedZohoMail.emailAddress}…`}
					></textarea>

					<div>
						<span class="reply-from">
							Replying from {selectedZohoMail.mailbox}
						</span>

						<button
							class="primary"
							disabled={replySending || !replyText.trim()}
							onclick={sendZohoReply}
						>
							{replySending ? 'Sending…' : 'Send reply'}
						</button>
					</div>
				</div>
			{/if}
		</section>
	{:else}
		<section class="message mail-empty-reader">
			<div>
				<span class="mail-empty-icon">✉</span>
				<h2>Select an email</h2>
				<p>Choose a message from the left to read it here.</p>
			</div>
		</section>
	{/if}
</div>
