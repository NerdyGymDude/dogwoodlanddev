<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Admin Login | Dogwood Land Development</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="login-page">
	<section class="login-card">
		<a class="brand" href="/" aria-label="Dogwood Land Development home">
			<img src="/images/dogwoodlogo-transparent.png" alt="Dogwood Land Development" />
		</a>

		<div class="heading">
			<p class="eyebrow">DOGWOOD ADMIN</p>
			<h1>Welcome back</h1>
			<p>Sign in to access the Dogwood Land Development admin portal.</p>
		</div>

		{#if form?.message}
			<div class="error-message" role="alert">
				{form.message}
			</div>
		{/if}

		<form method="POST">
			<label>
				<span>Email address</span>
				<input
					type="email"
					name="email"
					value={form?.email ?? ''}
					autocomplete="email"
					placeholder="name@dogwoodlanddev.com"
					required
				/>
			</label>

			<label>
				<span>Password</span>
				<input
					type="password"
					name="password"
					autocomplete="current-password"
					placeholder="Enter your password"
					required
				/>
			</label>

			<button type="submit">Sign in</button>
		</form>

		<p class="help">
			Admin access is restricted to authorized Dogwood Land Development users.
		</p>

		<a class="back" href="/">← Back to website</a>
	</section>
</main>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
	}

	.login-page {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 24px;
		background:
			radial-gradient(circle at top left, rgba(92, 115, 80, 0.14), transparent 38%),
			#f3f5f2;
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
			sans-serif;
		color: #14261d;
	}

	.login-card {
		width: min(100%, 440px);
		padding: 38px;
		background: #ffffff;
		border: 1px solid #dde4dd;
		border-radius: 20px;
		box-shadow: 0 24px 70px rgba(20, 38, 29, 0.12);
	}

	.brand {
		display: inline-block;
		margin-bottom: 28px;
	}

	.brand img {
		display: block;
		width: 76px;
		height: 76px;
		object-fit: contain;
	}

	.heading {
		margin-bottom: 26px;
	}

	.eyebrow {
		margin: 0 0 8px;
		color: #5c7350;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.16em;
	}

	h1 {
		margin: 0;
		font-family: Georgia, "Times New Roman", serif;
		font-size: clamp(2rem, 7vw, 2.6rem);
		line-height: 1;
		color: #173126;
	}

	.heading > p:last-child {
		margin: 14px 0 0;
		color: #65736b;
		font-size: 0.95rem;
		line-height: 1.55;
	}

	form {
		display: grid;
		gap: 18px;
	}

	label {
		display: grid;
		gap: 7px;
	}

	label span {
		font-size: 0.84rem;
		font-weight: 700;
		color: #31483c;
	}

	input {
		width: 100%;
		min-height: 48px;
		padding: 0 14px;
		border: 1px solid #cad4cc;
		border-radius: 10px;
		background: #ffffff;
		font: inherit;
		color: #14261d;
		outline: none;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	input:focus {
		border-color: #5c7350;
		box-shadow: 0 0 0 3px rgba(92, 115, 80, 0.14);
	}

	button {
		min-height: 50px;
		margin-top: 4px;
		border: 0;
		border-radius: 10px;
		background: #173126;
		color: #ffffff;
		font: inherit;
		font-weight: 800;
		cursor: pointer;
	}

	button:hover {
		background: #244838;
	}

	.error-message {
		margin-bottom: 20px;
		padding: 12px 14px;
		border: 1px solid #e4b7b7;
		border-radius: 10px;
		background: #fff4f4;
		color: #8a2929;
		font-size: 0.88rem;
		line-height: 1.4;
	}

	.help {
		margin: 22px 0 0;
		color: #7a867f;
		font-size: 0.78rem;
		line-height: 1.5;
	}

	.back {
		display: inline-block;
		margin-top: 20px;
		color: #4f6958;
		font-size: 0.84rem;
		font-weight: 700;
		text-decoration: none;
	}

	.back:hover {
		text-decoration: underline;
	}

	@media (max-width: 520px) {
		.login-page {
			align-items: start;
			padding: 18px;
		}

		.login-card {
			margin-top: 6vh;
			padding: 28px 22px;
			border-radius: 16px;
		}
	}
</style>
