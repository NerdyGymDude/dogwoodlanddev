<script>
	// ---------------------------------------------------------------------
	// IMAGES — paste your file paths here. This is the ONLY place you
	// need to touch to add images. Leave a value as '' to keep showing
	// the dashed placeholder box in that spot.
	//
	// Files go in the /static folder (e.g. static/images/logo.png),
	// and are referenced here starting with a slash: '/images/logo.png'
	// ---------------------------------------------------------------------
	const images = {
		logo: '/images/centerlogo.png', // shown big, in its own section at the top of the page
		hero: '/images/dogwoodflower.jpg', // large image inside the hero section
		about: '/images/sunsetmarsh.jpg', // image next to the About text
		footerLogo: '/images/centerlogo.png', // small logo shown in the dark footer
		serviceIcons: ['/images/floodedpath.jpg', '/images/manholeaudits.jpg', '/images/longroad.jpg', '/images/townhomes.jpg'] // one per service card, in order
	};

	// ---------------------------------------------------------------------
	// PROJECT FORM MODAL
	// ---------------------------------------------------------------------
	let showProjectForm = $state(false);
	let projectFormSubmitted = $state(false);

	function openProjectForm() {
		showProjectForm = true;
		projectFormSubmitted = false;
	}

	function closeProjectForm() {
		showProjectForm = false;
	}

	/** @param {SubmitEvent} event */
	function handleProjectFormSubmit(event) {
		event.preventDefault();
		// NOTE: this doesn't go anywhere yet — it just shows the success
		// state below. Wire this up to Supabase/email/etc. when ready.
		projectFormSubmitted = true;
	}

	// ---------------------------------------------------------------------
	// STATE
	// ---------------------------------------------------------------------
	let mobileNavOpen = $state(false);

	function toggleMobileNav() {
		mobileNavOpen = !mobileNavOpen;
	}

	function closeMobileNav() {
		mobileNavOpen = false;
	}

	// ---------------------------------------------------------------------
	// CONTENT (placeholder copy — swap in real content later)
	// ---------------------------------------------------------------------
	const navLinks = [
		{ href: '#about', label: 'About' },
		{ href: '#services', label: 'Services' },
		{ href: '#why-us', label: 'Why Us' }
	];

	const services = [
		{
			title: 'Land Acquisition & Feasibility',
			description:
				'We identify, evaluate, and acquire parcels with real development potential, backed by market research and site due diligence.'
		},
		{
			title: 'Entitlement & Zoning',
			description:
				'We manage the approvals process from start to finish — rezoning, variances, and permitting with local municipalities.'
		},
		{
			title: 'Site Planning & Infrastructure',
			description:
				'From lot layout to roads, utilities, and grading, we turn raw acreage into shovel-ready, buildable ground.'
		},
		{
			title: 'Project Management',
			description:
				'We oversee budgets, timelines, and contractors from acquisition through completion, keeping every phase on track.'
		}
	];

	const whyUs = [
		{
			title: 'Local Market Knowledge',
			description: 'Deep familiarity with regional zoning, permitting, and land value trends guides every decision we make.'
		},
		{
			title: 'End-to-End Execution',
			description: 'One team manages the full lifecycle of a project, from first offer to final infrastructure handoff.'
		},
		{
			title: 'Transparent Partnership',
			description: 'Clear timelines and honest communication keep landowners, investors, and partners aligned at every stage.'
		}
	];
</script>

<!-- =====================================================================
     NAVIGATION
===================================================================== -->
<header class="nav">
	<div class="nav__inner">
		<a href="#top" class="nav__brand" onclick={closeMobileNav}>
			Dogwood <span class="nav__brand-sub">Land Development</span>
		</a>

		<nav class="nav__links" aria-label="Primary">
			{#each navLinks as link (link.href)}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={link.href}>{link.label}</a>
			{/each}
		</nav>

		<button
			class="nav__toggle"
			aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
			aria-expanded={mobileNavOpen}
			onclick={toggleMobileNav}
		>
			<span class="nav__toggle-bar"></span>
			<span class="nav__toggle-bar"></span>
			<span class="nav__toggle-bar"></span>
		</button>
	</div>

	{#if mobileNavOpen}
		<nav class="nav__mobile" aria-label="Mobile">
			{#each navLinks as link (link.href)}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={link.href} onclick={closeMobileNav}>{link.label}</a>
			{/each}
		</nav>
	{/if}
</header>

<main id="top">
	<!-- =================================================================
	     LOGO
	================================================================== -->
	<section class="logo-section">
		{#if images.logo}
			<img src={images.logo} alt="Dogwood Land Development" class="logo-section__placeholder" />
		{:else}
			<div class="logo-section__placeholder">Logo</div>
		{/if}

		<div class="logo-actions">
			<button class="btn btn-primary" onclick={openProjectForm}>Start a New Project</button>
			<button class="btn btn-ghost" disabled aria-disabled="true">
				View Projects <span class="badge">Coming Soon</span>
			</button>
		</div>
	</section>

	<!-- =================================================================
	     HERO
	================================================================== -->
	<section class="hero">
		<div class="hero__inner">
			<p class="hero__eyebrow">Land Development</p>
			<h1 class="hero__title">Turning raw ground into lasting places.</h1>
			<p class="hero__subtitle">
				Dogwood Land Development partners with landowners and investors to guide land from raw
				acreage through entitlement, planning, and buildable infrastructure.
			</p>

			{#if images.hero}
				<img src={images.hero} alt="Dogwood Land Development project site" class="hero__image-placeholder" />
			{:else}
				<div class="hero__image-placeholder">Image</div>
			{/if}
		</div>
	</section>

	<!-- =================================================================
	     ABOUT
	================================================================== -->
	<section id="about" class="about">
		<div class="about__inner">
			<div class="about__content">
				<p class="section-eyebrow">About Us</p>
				<h2 class="section-title">Built on ground-level experience.</h2>
				<p class="about__text">
					Dogwood Land Development is a land development company focused on doing the work that
					turns undeveloped land into usable, valuable property. We work directly with landowners,
					municipalities, and capital partners to move projects through acquisition, entitlement, and
					site readiness — with a steady, straightforward approach at every stage.
				</p>
			</div>

			{#if images.about}
				<img src={images.about} alt="Dogwood Land Development site work" class="about__image-placeholder" />
			{:else}
				<div class="about__image-placeholder">Image</div>
			{/if}
		</div>
	</section>

	<!-- =================================================================
	     SERVICES
	================================================================== -->
	<section id="services" class="services">
		<div class="services__inner">
			<p class="section-eyebrow">What We Do</p>
			<h2 class="section-title">Services</h2>

			<div class="services__grid">
				{#each services as service, i (service.title)}
					<div class="service-card">
						{#if images.serviceIcons[i]}
							<img src={images.serviceIcons[i]} alt="" class="service-card__image" />
						{:else}
							<div class="service-card__image service-card__image--placeholder">Icon</div>
						{/if}
						<div class="service-card__body">
							<h3 class="service-card__title">{service.title}</h3>
							<p class="service-card__text">{service.description}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- =================================================================
	     WHY CHOOSE US
	================================================================== -->
	<section id="why-us" class="why-us">
		<div class="why-us__inner">
			<p class="section-eyebrow">Why Choose Us</p>
			<h2 class="section-title">A partner through every phase.</h2>

			<div class="why-us__grid">
				{#each whyUs as item (item.title)}
					<div class="why-us__item">
						<h3 class="why-us__item-title">{item.title}</h3>
						<p class="why-us__item-text">{item.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- =================================================================
	     CLOSING CTA — repeats the logo section's buttons
	================================================================== -->
	<section class="closing-cta">
		<h2 class="section-title">Ready to talk through your project?</h2>

		<div class="logo-actions">
			<button class="btn btn-primary" onclick={openProjectForm}>Start a New Project</button>
			<button class="btn btn-ghost" disabled aria-disabled="true">
				View Projects <span class="badge">Coming Soon</span>
			</button>
		</div>
	</section>
</main>

<!-- =====================================================================
     START A NEW PROJECT — modal form
===================================================================== -->
{#if showProjectForm}
	<!-- Clicking the backdrop closes the modal (mouse convenience only) — the
	     close button below already provides full keyboard access, so these
	     two divs are intentionally non-interactive containers, not controls. -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={closeProjectForm}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal" onclick={(event) => event.stopPropagation()}>
			<button class="modal-close" onclick={closeProjectForm} aria-label="Close form">&times;</button>

			{#if projectFormSubmitted}
				<div class="modal-success">
					<h3 class="modal-title">Thanks — we've got it.</h3>
					<p class="modal-subtitle">
						Someone from our team will reach out shortly to talk through your project.
					</p>
					<button class="btn btn-primary" onclick={closeProjectForm}>Close</button>
				</div>
			{:else}
				<h3 class="modal-title">Start a New Project</h3>
				<p class="modal-subtitle">
					Tell us a bit about your property and where things stand. We'll follow up to talk
					through next steps.
				</p>

				<form class="project-form" onsubmit={handleProjectFormSubmit}>
					<label class="form-field">
						Full Name
						<input type="text" name="name" required />
					</label>

					<label class="form-field">
						Email
						<input type="email" name="email" required />
					</label>

					<label class="form-field">
						Phone
						<input type="tel" name="phone" required />
					</label>

					<label class="form-field">
						Property Address
						<input type="text" name="address" placeholder="Street, city, state (or parcel/lot number if you have it)" required />
					</label>

					<label class="form-field">
						Preferred Point of Contact
						<select name="preferredContact" required>
							<option value="">Select one</option>
							<option value="phone">Phone</option>
							<option value="email">Email</option>
							<option value="text">Text</option>
						</select>
					</label>

					<label class="form-field">
						Project Type
						<select name="projectType">
							<option value="">Not sure yet</option>
							<option value="residential">Residential</option>
							<option value="commercial">Commercial</option>
							<option value="mixed-use">Mixed-Use</option>
							<option value="subdivision">Land Subdivision</option>
							<option value="other">Other</option>
						</select>
					</label>

					<label class="form-field">
						Approximate Property Size
						<input type="text" name="acreage" placeholder="e.g. 12 acres, or 'not sure'" />
					</label>

					<label class="form-field">
						Desired Timeline
						<select name="timeline">
							<option value="">Select one</option>
							<option value="asap">As soon as possible</option>
							<option value="3-6-months">3–6 months</option>
							<option value="6-12-months">6–12 months</option>
							<option value="exploring">Just exploring options</option>
						</select>
					</label>

					<label class="form-field">
						Additional Details
						<textarea name="message" rows="4" placeholder="Anything else we should know about the property or project?"
						></textarea>
					</label>

					<button type="submit" class="btn btn-primary modal-submit">Submit</button>
				</form>
			{/if}
		</div>
	</div>
{/if}

<!-- =====================================================================
     FOOTER
===================================================================== -->
<footer class="footer">
	<div class="footer__inner">
		{#if images.footerLogo}
			<img src={images.footerLogo} alt="Dogwood Land Development" class="footer__logo-placeholder" />
		{:else}
			<div class="footer__logo-placeholder">Logo</div>
		{/if}
		<p class="footer__brand">Dogwood Land Development</p>
		<p class="footer__meta">Placeholder Address, Placeholder City, ST 00000</p>
		<p class="footer__meta">(555) 123-4567 &middot; hello@dogwoodland.dev</p>
		<p class="footer__copy">&copy; {new Date().getFullYear()} Dogwood Land Development. All rights reserved.</p>
	</div>
</footer>

<!-- =====================================================================
     STYLES — everything lives here, scoped to this page. No inline styles.
===================================================================== -->
<style>
	/* -------------------------------------------------------------------
	   GLOBAL / RESET
	------------------------------------------------------------------- */
	:global(:root) {
		--cream: #f7f3ea;
		--cream-deep: #ede4d0;
		--cream-line: #e0d6bd;

		--sage-light: #b7c6a4;
		--sage: #6b8558;
		--sage-dark: #445c37;
		--sage-darker: #2b3a22;

		--text: #2b3626;
		--text-soft: #5b6652;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(html) {
		scroll-behavior: smooth;
	}

	:global(body) {
		margin: 0;
		background: var(--cream);
		color: var(--text);
		font-family: 'Inter', sans-serif;
		line-height: 1.6;
	}

	h1,
	h2,
	h3 {
		font-family: 'Space Grotesk', sans-serif;
		color: var(--sage-darker);
		margin: 0;
		line-height: 1.15;
	}

	p {
		margin: 0;
	}

	a {
		color: inherit;
		text-decoration: none;
	}

	/* -------------------------------------------------------------------
	   NAVIGATION
	------------------------------------------------------------------- */
	.nav {
		position: sticky;
		top: 0;
		z-index: 50;
		background: var(--cream);
		border-bottom: 1px solid var(--cream-line);
	}

	.nav__inner {
		max-width: 1100px;
		margin: 0 auto;
		padding: 18px 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nav__brand {
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: 'Space Grotesk', sans-serif;
		font-weight: 600;
		font-size: 18px;
		color: var(--sage-darker);
	}

	.nav__brand-sub {
		color: var(--text-soft);
		font-weight: 500;
	}

	.nav__links {
		display: none;
		gap: 28px;
	}

	.nav__links a {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-soft);
	}

	.nav__links a:hover {
		color: var(--sage-dark);
	}

	.nav__toggle {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 5px;
		width: 30px;
		height: 30px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.nav__toggle-bar {
		height: 2px;
		width: 100%;
		background: var(--sage-darker);
		border-radius: 2px;
	}

	.nav__mobile {
		display: flex;
		flex-direction: column;
		padding: 8px 24px 20px;
		border-top: 1px solid var(--cream-line);
	}

	.nav__mobile a {
		padding: 12px 0;
		font-weight: 500;
		color: var(--text-soft);
		border-bottom: 1px solid var(--cream-line);
	}

	@media (min-width: 800px) {
		.nav__links {
			display: flex;
		}
		.nav__toggle {
			display: none;
		}
	}

	/* -------------------------------------------------------------------
	   LOGO
	------------------------------------------------------------------- */
	.logo-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 28px;
		padding: 60px 24px;
	}

	.logo-section__placeholder {
		width: 100%;
		max-width: 480px;
		height: auto;
		aspect-ratio: 1 / 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--cream-deep);
		border: 1px dashed var(--sage-light);
		border-radius: 10px;
		color: var(--text-soft);
		font-size: 15px;
		object-fit: contain;
	}

	.logo-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 14px;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 13px 26px;
		border-radius: 8px;
		font-family: 'Inter', sans-serif;
		font-weight: 600;
		font-size: 15px;
		border: 1px solid transparent;
		cursor: pointer;
	}

	.btn-primary {
		background: var(--sage-dark);
		color: var(--cream);
	}

	.btn-primary:hover {
		background: var(--sage-darker);
	}

	.btn-ghost {
		background: transparent;
		border-color: var(--sage-light);
		color: var(--sage-darker);
	}

	.btn-ghost[disabled] {
		cursor: not-allowed;
		opacity: 0.7;
	}

	.badge {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		background: var(--sage-light);
		color: var(--sage-darker);
		padding: 3px 8px;
		border-radius: 999px;
	}

	/* -------------------------------------------------------------------
	   HERO
	------------------------------------------------------------------- */
	.hero {
		background: var(--cream-deep);
		padding: 90px 24px;
	}

	.hero__inner {
		max-width: 720px;
		margin: 0 auto;
		text-align: center;
	}

	.hero__eyebrow {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--sage-dark);
		margin-bottom: 16px;
	}

	.hero__title {
		font-size: clamp(32px, 5vw, 52px);
		font-weight: 600;
		margin-bottom: 20px;
	}

	.hero__subtitle {
		font-size: 17px;
		color: var(--text-soft);
		max-width: 560px;
		margin: 0 auto;
	}

	.hero__image-placeholder {
		width: 100%;
		max-width: 900px;
		margin: 40px auto 0;
		border-radius: 10px;
		aspect-ratio: 16 / 9;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--cream);
		border: 1px dashed var(--sage-light);
		color: var(--text-soft);
		font-size: 14px;
		object-fit: cover;
	}

	/* -------------------------------------------------------------------
	   ABOUT
	------------------------------------------------------------------- */
	.about {
		padding: 80px 24px;
	}

	.about__inner {
		max-width: 1000px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1fr;
		gap: 32px;
		align-items: center;
		text-align: center;
	}

	.about__image-placeholder {
		width: 100%;
		border-radius: 10px;
		aspect-ratio: 4 / 3;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--cream-deep);
		border: 1px dashed var(--sage-light);
		color: var(--text-soft);
		font-size: 14px;
		object-fit: cover;
	}

	@media (min-width: 800px) {
		.about__inner {
			grid-template-columns: 1fr 1fr;
			text-align: left;
		}
	}

	.section-eyebrow {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--sage-dark);
		margin-bottom: 10px;
	}

	.section-title {
		font-size: clamp(26px, 4vw, 34px);
		font-weight: 600;
		margin-bottom: 24px;
	}

	.about__text {
		color: var(--text-soft);
		font-size: 16px;
	}

	/* -------------------------------------------------------------------
	   SERVICES
	------------------------------------------------------------------- */
	.services {
		background: var(--cream-deep);
		padding: 80px 24px;
	}

	.services__inner {
		max-width: 1100px;
		margin: 0 auto;
		text-align: center;
	}

	.services__grid {
		margin-top: 40px;
		display: grid;
		grid-template-columns: 1fr;
		gap: 20px;
		text-align: left;
	}

	.service-card {
		display: flex;
		align-items: stretch;
		gap: 0;
		background: var(--cream);
		border: 1px solid var(--cream-line);
		border-radius: 10px;
		overflow: hidden;
	}

	.service-card__image {
		width: 96px;
		flex-shrink: 0;
		align-self: stretch;
		object-fit: cover;
	}

	.service-card__image--placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--cream-deep);
		border-right: 1px dashed var(--sage-light);
		color: var(--text-soft);
		font-size: 12px;
	}

	.service-card__body {
		padding: 16px 20px;
	}

	.service-card__title {
		font-size: 16px;
		font-weight: 600;
		margin-bottom: 6px;
		color: var(--sage-darker);
	}

	.service-card__text {
		font-size: 14px;
		color: var(--text-soft);
	}

	@media (min-width: 700px) {
		.services__grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* -------------------------------------------------------------------
	   WHY CHOOSE US
	------------------------------------------------------------------- */
	.why-us {
		padding: 80px 24px;
	}

	.why-us__inner {
		max-width: 1000px;
		margin: 0 auto;
		text-align: center;
	}

	.why-us__grid {
		margin-top: 40px;
		display: grid;
		grid-template-columns: 1fr;
		gap: 28px;
		text-align: left;
	}

	.why-us__item-title {
		font-size: 17px;
		font-weight: 600;
		margin-bottom: 8px;
		color: var(--sage-darker);
	}

	.why-us__item-text {
		font-size: 15px;
		color: var(--text-soft);
	}

	@media (min-width: 700px) {
		.why-us__grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	/* -------------------------------------------------------------------
	   CLOSING CTA
	------------------------------------------------------------------- */
	.closing-cta {
		background: var(--cream-deep);
		padding: 70px 24px;
		text-align: center;
	}

	.closing-cta .section-title {
		margin-bottom: 24px;
	}

	/* -------------------------------------------------------------------
	   FOOTER
	------------------------------------------------------------------- */
	.footer {
		background: var(--sage-darker);
		color: var(--cream);
		padding: 44px 24px;
	}

	.footer__inner {
		max-width: 1100px;
		margin: 0 auto;
		text-align: center;
	}

	.footer__logo-placeholder {
		height: 34px;
		width: 70px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 14px;
		background: rgba(247, 243, 234, 0.08);
		border: 1px dashed var(--sage-light);
		border-radius: 6px;
		font-size: 11px;
		color: var(--sage-light);
		object-fit: contain;
	}

	.footer__brand {
		font-family: 'Space Grotesk', sans-serif;
		font-weight: 600;
		font-size: 17px;
		margin-bottom: 10px;
	}

	.footer__meta {
		font-size: 14px;
		color: var(--sage-light);
		margin-bottom: 6px;
	}

	.footer__copy {
		font-size: 13px;
		color: var(--sage-light);
		margin-top: 18px;
	}

	/* -------------------------------------------------------------------
	   START A NEW PROJECT — modal form
	------------------------------------------------------------------- */
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(43, 54, 38, 0.55);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 40px 20px;
		overflow-y: auto;
	}

	.modal {
		position: relative;
		width: 100%;
		max-width: 560px;
		background: var(--cream);
		border-radius: 12px;
		padding: 36px 28px;
	}

	.modal-close {
		position: absolute;
		top: 14px;
		right: 14px;
		width: 32px;
		height: 32px;
		border-radius: 999px;
		border: none;
		background: var(--cream-deep);
		color: var(--sage-darker);
		font-size: 18px;
		line-height: 1;
		cursor: pointer;
	}

	.modal-title {
		font-size: 24px;
		margin-bottom: 10px;
		padding-right: 30px;
	}

	.modal-subtitle {
		font-size: 14px;
		color: var(--text-soft);
		margin-bottom: 24px;
	}

	.project-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: var(--sage-darker);
	}

	.form-field input,
	.form-field select,
	.form-field textarea {
		font-family: 'Inter', sans-serif;
		font-size: 15px;
		font-weight: 400;
		color: var(--text);
		background: white;
		border: 1px solid var(--cream-line);
		border-radius: 6px;
		padding: 10px 12px;
	}

	.form-field textarea {
		resize: vertical;
	}

	.modal-submit {
		margin-top: 8px;
		width: 100%;
		justify-content: center;
	}

	.modal-success {
		text-align: center;
		padding: 10px 0;
	}

	.modal-success .btn {
		margin-top: 10px;
	}
</style>