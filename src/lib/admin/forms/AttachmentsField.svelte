<script lang="ts">
	let {
		files = $bindable()
	}: {
		files: File[];
	} = $props();

	function selectFiles(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const selected = Array.from(input.files ?? []);

		if (selected.length) {
			files = [...files, ...selected];
		}

		input.value = '';
	}

	function removeFile(index: number) {
		files = files.filter((_, fileIndex) => fileIndex !== index);
	}

	function fileSize(bytes: number) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<div class="attachments">
	<label class="upload">
		<span class="upload-icon">＋</span>
		<span>
			<strong>Add files</strong>
			<small>Attach plans, correspondence, photos, PDFs, or other supporting files.</small>
		</span>
		<input type="file" multiple onchange={selectFiles} />
	</label>

	{#if files.length}
		<div class="file-list">
			{#each files as file, index}
				<div class="file">
					<div>
						<strong>{file.name}</strong>
						<small>{fileSize(file.size)}</small>
					</div>

					<button
						type="button"
						aria-label={`Remove ${file.name}`}
						onclick={() => removeFile(index)}
					>
						×
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.attachments {
		display: grid;
		gap: 0.75rem;
	}

	.upload {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 1rem;
		border: 1px dashed #bfc9bc;
		border-radius: 0.75rem;
		background: #fafcf9;
		cursor: pointer;
	}

	.upload:hover {
		border-color: #809378;
		background: #f7faf5;
	}

	.upload input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		opacity: 0;
	}

	.upload-icon {
		display: grid;
		flex: 0 0 auto;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: #e9efe6;
		font-size: 1.25rem;
		color: #526a4b;
	}

	.upload > span:last-of-type {
		display: grid;
		gap: 0.2rem;
	}

	.upload strong,
	.file strong {
		color: #314035;
	}

	.upload small,
	.file small {
		color: #768078;
		line-height: 1.35;
	}

	.file-list {
		display: grid;
		gap: 0.5rem;
	}

	.file {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid #dfe5dd;
		border-radius: 0.65rem;
		background: #fff;
	}

	.file > div {
		display: grid;
		min-width: 0;
		gap: 0.15rem;
	}

	.file strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.85rem;
	}

	.file button {
		flex: 0 0 auto;
		width: 30px;
		height: 30px;
		border: 0;
		border-radius: 50%;
		background: #eef1ed;
		color: #647067;
		cursor: pointer;
	}
</style>
