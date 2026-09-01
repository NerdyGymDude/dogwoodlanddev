<script lang="ts">
	let {
		open,
		title,
		recordName,
		description,
		actionLabel = 'Delete',
		onconfirm,
		onclose
	}: {
		open: boolean;
		title: string;
		recordName: string;
		description: string;
		actionLabel?: string;
		onconfirm: () => Promise<void> | void;
		onclose: () => void;
	} = $props();

	let confirmationText = $state('');
	let working = $state(false);
	let wasOpen = $state(false);

	$effect(() => {
		if (open && !wasOpen) confirmationText = '';
		if (!open) confirmationText = '';
		wasOpen = open;
	});

	function close() {
		if (working) return;
		confirmationText = '';
		onclose();
	}

	async function confirm() {
		if (confirmationText !== 'DELETE' || working) return;
		working = true;
		try {
			await onconfirm();
			confirmationText = '';
		} finally {
			working = false;
		}
	}
</script>

{#if open}
	<div class="destructive-backdrop" role="presentation" onclick={(event) => event.currentTarget === event.target && close()}>
		<div class="destructive-dialog" role="dialog" aria-modal="true" aria-labelledby="destructive-title">
			<h2 id="destructive-title">{title}</h2>
			<strong>{recordName}</strong>
			<p>{description}</p>
			<label>Type DELETE to confirm.<input autocomplete="off" bind:value={confirmationText} /></label>
			<footer><button disabled={working} onclick={close}>Cancel</button><button class="destructive" disabled={confirmationText !== 'DELETE' || working} onclick={confirm}>{working ? 'Working…' : actionLabel}</button></footer>
		</div>
	</div>
{/if}

<style>
	.destructive-backdrop{position:fixed;inset:0;z-index:1400;display:grid;place-items:center;padding:18px;background:#141f1785;overflow-y:auto}.destructive-dialog{box-sizing:border-box;display:grid;gap:14px;width:min(460px,100%);max-height:calc(100dvh - 36px);overflow-y:auto;border-radius:14px;background:#fff;padding:22px}.destructive-dialog h2,.destructive-dialog p{margin:0}.destructive-dialog h2{color:#26384d}.destructive-dialog>strong{font-size:16px}.destructive-dialog label{display:grid;gap:6px;color:#46564c;font-size:12px;font-weight:700}.destructive-dialog input{width:100%;border:1px solid #d4dbd4;border-radius:7px;padding:10px}.destructive-dialog footer{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.destructive-dialog button{border:1px solid #cbd5cd;border-radius:7px;background:#fff;padding:9px 14px;color:#203552;font-weight:700;cursor:pointer}.destructive-dialog button.destructive{border-color:#9b3028;background:#9b3028;color:#fff}.destructive-dialog button:disabled{cursor:not-allowed;opacity:.5}@media(max-width:620px){.destructive-dialog footer button{flex:1 1 auto}}
</style>
