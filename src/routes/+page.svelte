<script>
	import { onMount } from 'svelte';

	// =====================================================================
	// IMAGES
	// Files live in: static/service-images/
	// =====================================================================

	const images = {
		logo: '/images/dogwoodlogo-transparent.png',
		footerLogo: '/images/dogwoodlogo-transparent.png',

		about: '/service-images/about-creek.webp',

		services: [
			[
				'/service-images/service-1-land-development-road.webp',
				'/service-images/service-1-devaun-park-homes.webp',
				'/service-images/service-1-devaun-park-fountain.webp'
			],
			[
				'/service-images/service-2-pump-station.webp'
			],
			['/service-images/service-3-sand-gravel-mining.webp'],
			[
				'/service-images/service-4-beach-houses.webp',
				'/service-images/service-4-stormwater-installation-1.webp',
				'/service-images/service-4-stormwater-installation-2.webp'
			]
		]
	};

	// =====================================================================
	// CONTENT
	// =====================================================================

	const navLinks = [
		{ href: '#about', label: 'About' },
		{ href: '#services', label: 'Services' },
		{ href: '#contact', label: 'Contact' }
	];

	const services = [
		{
			number: '01',
			title: 'Land Development Entitlement & Management',
			lead: 'Turn-Key Development and Construction Services',
			description:
				'Civil engineering design and project management for residential subdivisions, commercial properties, and industrial sites.'
		},
		{
			number: '02',
			title: 'Onsite Wastewater Design & Operations',
			lead: 'Residential & Commercial Properties',
			description:
				'Engineered small and large onsite wastewater systems for residential and commercial properties.'
		},
		{
			number: '03',
			title: 'Sand & Gravel Commercial Mine and Borrow Pit Permits',
			lead: 'Permitting & Regulatory Coordination',
			description:
				'Commercial sand and gravel mine and borrow pit permitting with practical site planning and regulatory coordination.'
		},
		{
			number: '04',
			title: 'Stormwater Design Plans',
			lead: 'New Construction & Existing Communities',
			description:
				'Stormwater planning and design services for new construction projects and existing communities.'
		}
	];

	// =====================================================================
	// SERVICE PHOTO CAROUSELS
	// =====================================================================

	let activeSlides = $state([0, 0, 0, 0]);
	let carouselPaused = $state([false, false, false, false]);

	/** @param {number} serviceIndex */
	function nextSlide(serviceIndex) {
		const photoCount = images.services[serviceIndex].length;

		if (photoCount <= 1) return;

		activeSlides[serviceIndex] =
			(activeSlides[serviceIndex] + 1) % photoCount;
	}

	/** @param {number} serviceIndex */
	function previousSlide(serviceIndex) {
		const photoCount = images.services[serviceIndex].length;

		if (photoCount <= 1) return;

		activeSlides[serviceIndex] =
			(activeSlides[serviceIndex] - 1 + photoCount) % photoCount;
	}

	/**
	 * @param {number} serviceIndex
	 * @param {number} slideIndex
	 */
	function goToSlide(serviceIndex, slideIndex) {
		activeSlides[serviceIndex] = slideIndex;
	}

	/** @param {number} serviceIndex */
	function pauseCarousel(serviceIndex) {
		carouselPaused[serviceIndex] = true;
	}

	/** @param {number} serviceIndex */
	function resumeCarousel(serviceIndex) {
		carouselPaused[serviceIndex] = false;
	}

	onMount(() => {
		const interval = window.setInterval(() => {
			images.services.forEach((serviceImages, index) => {
				if (serviceImages.length > 1 && !carouselPaused[index]) {
					nextSlide(index);
				}
			});
		}, 5000);

		return () => {
			window.clearInterval(interval);
		};
	});

	// =====================================================================
	// NAVIGATION
	// =====================================================================

	let mobileNavOpen = $state(false);

	function toggleMobileNav() {
		mobileNavOpen = !mobileNavOpen;
	}

	function closeMobileNav() {
		mobileNavOpen = false;
	}

	// =====================================================================
	// PROJECT FORM
	// =====================================================================

	let showProjectForm = $state(false);
	let projectFormSubmitted = $state(false);
	let projectFormSending = $state(false);
	let projectFormError = $state('');

	/**
	 * @typedef {Object} ProjectInquiryForm
	 * @property {string} businessName
	 * @property {string} firstName
	 * @property {string} lastName
	 * @property {string} phone
	 * @property {string} email
	 */

	/** @type {ProjectInquiryForm} */
	let projectInquiryForm = $state({
		businessName: '',
		firstName: '',
		lastName: '',
		phone: '',
		email: ''
	});

	function openProjectForm() {
		showProjectForm = true;
		projectFormSubmitted = false;
		projectFormError = '';
		projectInquiryForm = {
			businessName: '',
			firstName: '',
			lastName: '',
			phone: '',
			email: ''
		};
	}

	function closeProjectForm() {
		showProjectForm = false;
	}

	/** @param {SubmitEvent} event */
	async function handleProjectFormSubmit(event) {
		event.preventDefault();
		if (projectFormSending) return;
		projectFormSending = true;
		projectFormError = '';
		const formData = new FormData(/** @type {HTMLFormElement} */ (event.currentTarget));
		const payload = {
			businessName: projectInquiryForm.businessName,
			firstName: projectInquiryForm.firstName,
			lastName: projectInquiryForm.lastName,
			phone: projectInquiryForm.phone,
			email: projectInquiryForm.email,
			address: String(formData.get('address') ?? ''),
			preferredContact: String(formData.get('preferredContact') ?? ''),
			projectType: String(formData.get('projectType') ?? ''),
			message: String(formData.get('message') ?? '')
		};
		try {
			const response = await fetch('/api/project-inquiries', {
				method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error || 'Unable to submit your inquiry.');
			projectFormSubmitted = true;
		} catch (error) {
			projectFormError = error instanceof Error ? error.message : 'Unable to submit your inquiry.';
		} finally {
			projectFormSending = false;
		}
	}
</script>

<svelte:head>
	<title>Dogwood Land Development</title>
	<meta
		name="description"
		content="Land development, engineering, permitting, wastewater, mining and stormwater services in North Carolina."
	/>
</svelte:head>

<!-- =====================================================================
     NAVIGATION
===================================================================== -->

<header class="nav">
	<div class="nav__inner">
		<a href="#top" class="nav__brand" onclick={closeMobileNav}>
			<img src={images.logo} alt="Dogwood Land Development" />
		</a>

		<nav class="nav__links" aria-label="Primary navigation">
			{#each navLinks as link (link.href)}
				<a href={link.href}>{link.label}</a>
			{/each}

			<button class="nav__project-button" onclick={openProjectForm}>
				Start a Project
			</button>
		</nav>

		<button
			class="nav__toggle"
			aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
			aria-expanded={mobileNavOpen}
			onclick={toggleMobileNav}
		>
			<span></span>
			<span></span>
			<span></span>
		</button>
	</div>

	{#if mobileNavOpen}
		<nav class="nav__mobile" aria-label="Mobile navigation">
			{#each navLinks as link (link.href)}
				<a href={link.href} onclick={closeMobileNav}>
					{link.label}
				</a>
			{/each}

			<button
				onclick={() => {
					closeMobileNav();
					openProjectForm();
				}}
			>
				Start a Project
			</button>
		</nav>
	{/if}
</header>

<main id="top">

	<!-- =================================================================
	     HERO
	================================================================== -->

	<section class="hero">
		<div class="hero__inner">
			<img
				src={images.logo}
				alt="Dogwood Land Development"
				class="hero__logo"
			/>

			<p class="hero__eyebrow">
				Engineering · Permitting · Project Management
			</p>

			<h1>Moving land forward.</h1>

			<p class="hero__subtitle">
				Practical guidance from acquisition and entitlement through site
				readiness.
			</p>

			<button class="btn btn-primary" onclick={openProjectForm}>
				Start a New Project
			</button>
		</div>
	</section>

	<!-- =================================================================
	     ABOUT
	================================================================== -->

	<section id="about" class="about">
		<div class="about__inner">

			<div class="about__image-wrap">
				<img
					src={images.about}
					alt="Coastal North Carolina landscape"
					class="about__image"
				/>
			</div>

			<div class="about__content">
				<p class="section-eyebrow">About Us</p>

				<h2>Steady guidance at every stage.</h2>

				<p>
					Dogwood Land Development is a land development company focused on
					engineering and permitting undeveloped or redeveloped land for
					residential, commercial, or industrial markets. We work directly with
					landowners, municipalities, and capital partners to move projects
					through acquisition, entitlement, and site readiness — with a steady,
					straightforward approach at every stage.
				</p>
			</div>

		</div>
	</section>

	<!-- =================================================================
	     SERVICES
	================================================================== -->

	<section id="services" class="services">

		<div class="services__header">
			<p class="section-eyebrow">What We Do</p>

			<h2>Services</h2>

			<p class="services__intro">
				From early planning and permitting through site readiness, Dogwood
				provides practical development services built around the needs of each
				property and project.
			</p>
		</div>

		<div class="services__list">

			{#each services as service, i (service.title)}

				<article class="service">

					<!-- =====================================================
					     ROTATING SERVICE PHOTOS
					====================================================== -->

					<div
						class="service__carousel"
						role="group"
						aria-label={`${service.title} project photos`}
						onmouseenter={() => pauseCarousel(i)}
						onmouseleave={() => resumeCarousel(i)}
						onfocusin={() => pauseCarousel(i)}
						onfocusout={() => resumeCarousel(i)}
					>

						<div class="service__slides">

							{#each images.services[i] as image, imageIndex}

								<img
									src={image}
									alt={`${service.title} project ${imageIndex + 1}`}
									class="service__slide"
									class:active={activeSlides[i] === imageIndex}
								/>

							{/each}

						</div>

						{#if images.services[i].length > 1}

							<button
								type="button"
								class="carousel-arrow carousel-arrow--left"
								aria-label={`Previous ${service.title} photo`}
								onclick={() => {
									pauseCarousel(i);
									previousSlide(i);
								}}
							>
								‹
							</button>

							<button
								type="button"
								class="carousel-arrow carousel-arrow--right"
								aria-label={`Next ${service.title} photo`}
								onclick={() => {
									pauseCarousel(i);
									nextSlide(i);
								}}
							>
								›
							</button>

							<div
								class="carousel-dots"
								role="group"
								aria-label={`${service.title} photo selection`}
							>

								{#each images.services[i] as _, imageIndex}

									<button
										type="button"
										class="carousel-dot"
										class:active={activeSlides[i] === imageIndex}
										aria-label={`Show photo ${imageIndex + 1}`}
										aria-current={
											activeSlides[i] === imageIndex
												? 'true'
												: undefined
										}
										onclick={() => {
											pauseCarousel(i);
											goToSlide(i, imageIndex);
										}}
									></button>

								{/each}

							</div>

						{/if}

					</div>

					<!-- =====================================================
					     SERVICE INFORMATION
					====================================================== -->

					<div class="service__content">

						<p class="service__number">
							{service.number}
						</p>

						<h3>
							{service.title}
						</h3>

						<p class="service__lead">
							{service.lead}
						</p>

						<p class="service__description">
							{service.description}
						</p>

					</div>

				</article>

			{/each}

		</div>

	</section>

	<!-- =================================================================
	     CALL TO ACTION
	================================================================== -->

	<section class="closing-cta">

		<div class="closing-cta__inner">

			<p class="section-eyebrow">
				Have a Property or Project?
			</p>

			<h2>
				Let's talk through what's next.
			</h2>

			<p>
				Tell us a little about the property and where things stand. We'll
				follow up to discuss the next steps.
			</p>

			<button class="btn btn-light" onclick={openProjectForm}>
				Start a New Project
			</button>

		</div>

	</section>

</main>

<!-- =====================================================================
     START A NEW PROJECT MODAL
===================================================================== -->

{#if showProjectForm}

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->

	<div
		class="modal-overlay"
		onclick={closeProjectForm}
	>

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->

		<div
			class="modal"
			onclick={(event) => event.stopPropagation()}
		>

			<button
				class="modal-close"
				onclick={closeProjectForm}
				aria-label="Close form"
			>
				&times;
			</button>

			{#if projectFormSubmitted}

				<div class="modal-success">

					<p class="section-eyebrow">
						Project Request
					</p>

					<h3>
						Thanks — we've got it.
					</h3>

					<p>
						Someone from Dogwood Land Development will reach out shortly to
						talk through your project.
					</p>

					<button
						class="btn btn-primary"
						onclick={closeProjectForm}
					>
						Close
					</button>

				</div>

			{:else}

				<p class="section-eyebrow">
					Project Inquiry
				</p>

				<h3 class="modal-title">
					Start a New Project
				</h3>

				<p class="modal-subtitle">
					Keep it simple. Tell us what you know about the property or project
					and we'll take it from there.
				</p>

				<form
					class="project-form"
					onsubmit={handleProjectFormSubmit}
				>

					<label class="form-field">
						Business Name (Optional)

						<input
							type="text"
							name="businessName"
							bind:value={projectInquiryForm.businessName}
						/>
					</label>

					<div class="form-row">
						<label class="form-field">
							First Name
							<input type="text" name="firstName" bind:value={projectInquiryForm.firstName} required />
						</label>
						<label class="form-field">
							Last Name
							<input type="text" name="lastName" bind:value={projectInquiryForm.lastName} required />
						</label>
					</div>

					<div class="form-row">
						<label class="form-field">
							Phone (Optional)
							<input type="tel" name="phone" bind:value={projectInquiryForm.phone} />
						</label>
						<label class="form-field">
							Email
							<input type="email" name="email" bind:value={projectInquiryForm.email} required />
						</label>
					</div>

					<label class="form-field">
						Property Address

						<input
							type="text"
							name="address"
							placeholder="Street, city, state or parcel/lot number"
						/>
					</label>

					<div class="form-row">

						<label class="form-field">
							Preferred Contact

							<select name="preferredContact">
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
								<option value="industrial">Industrial</option>
								<option value="subdivision">Subdivision</option>
								<option value="wastewater">Onsite Wastewater</option>
								<option value="stormwater">Stormwater</option>
								<option value="mining">Mine / Borrow Pit</option>
								<option value="other">Other</option>
							</select>

						</label>

					</div>

					<label class="form-field">
						Project Details

						<textarea
							name="message"
							rows="5"
							placeholder="Tell us anything you know about the property, project, permitting needs, or where things currently stand."
						></textarea>
					</label>

					<label class="form-field">
						Supporting Files

						<input
							type="file"
							name="attachments"
							multiple
							accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
						/>

						<span class="form-help">
							Optional — plans, surveys, permits, photos or other project
							documents.
						</span>
					</label>

					<button
						type="submit"
						class="btn btn-primary modal-submit"
						disabled={projectFormSending}
					>
						{projectFormSending ? 'Sending…' : 'Send Project Information'}
					</button>
					{#if projectFormError}<p class="form-error">{projectFormError}</p>{/if}

				</form>

			{/if}

		</div>

	</div>

{/if}

<!-- =====================================================================
     FOOTER
===================================================================== -->

<footer id="contact" class="footer">

	<div class="footer__inner">

		<div class="footer__brand-column">

			<img
				src={images.footerLogo}
				alt="Dogwood Land Development"
				class="footer__logo"
			/>

			<p>
				Engineering, permitting and development guidance with a steady,
				straightforward approach.
			</p>

		</div>

		<div class="footer__column">

			<h3>Contact</h3>

			<address>

				<p>
					PO Box 93<br />
					Wrightsville Beach, NC 28480
				</p>

				<a href="tel:+19103863285">
					910-386-3285
				</a>

			</address>

		</div>

		<div class="footer__column">

			<h3>Email</h3>

			<div class="footer__emails">

				<a href="mailto:office@dogwoodlanddev.com">
					office@dogwoodlanddev.com
				</a>

			</div>

		</div>

	</div>

	<div class="footer__bottom">

		<p>
			&copy; {new Date().getFullYear()} Dogwood Land Development.
			All rights reserved.
		</p>

	</div>

</footer>

<style>
	:global(:root) {
		--cream: #f7f3ea;
		--cream-deep: #ede8dc;
		--cream-line: #dcd5c5;

		--sage-light: #a7b7a0;
		--sage: #5c7350;
		--sage-dark: #40543a;

		--navy: #1b2a4a;
		--navy-deep: #101a2d;

		--text: #26313f;
		--text-soft: #596269;

		--white: #ffffff;
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
		margin: 0;
		font-family: 'Space Grotesk', sans-serif;
		line-height: 1.15;
		color: var(--navy);
	}

	p {
		margin: 0;
	}

	a {
		color: inherit;
		text-decoration: none;
	}

	button,
	input,
	select,
	textarea {
		font: inherit;
	}

	/* =================================================================
	   SHARED
	================================================================= */

	.section-eyebrow {
		margin-bottom: 10px;
		color: var(--sage);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 14px 26px;
		border: 1px solid transparent;
		border-radius: 7px;
		font-weight: 700;
		font-size: 14px;
		cursor: pointer;
		transition:
			background 0.2s ease,
			transform 0.2s ease;
	}

	.btn:hover {
		transform: translateY(-1px);
	}

	.btn-primary {
		background: var(--navy);
		color: var(--cream);
	}

	.btn-primary:hover {
		background: var(--navy-deep);
	}

	.btn-light {
		background: var(--cream);
		color: var(--navy);
	}

	/* =================================================================
	   NAVIGATION
	================================================================= */

	.nav {
		position: sticky;
		top: 0;
		z-index: 50;
		background: rgba(247, 243, 234, 0.97);
		border-bottom: 1px solid var(--cream-line);
	}

	.nav__inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 1180px;
		min-height: 76px;
		margin: 0 auto;
		padding: 12px 24px;
	}

	.nav__brand img {
		display: block;
		width: 190px;
		height: 48px;
		object-fit: contain;
		object-position: left center;
	}

	.nav__links {
		display: none;
		align-items: center;
		gap: 30px;
	}

	.nav__links a {
		color: var(--text-soft);
		font-size: 14px;
		font-weight: 600;
	}

	.nav__links a:hover {
		color: var(--sage);
	}

	.nav__project-button {
		padding: 10px 17px;
		background: var(--navy);
		border: 0;
		border-radius: 6px;
		color: var(--cream);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
	}

	.nav__toggle {
		display: flex;
		width: 32px;
		flex-direction: column;
		gap: 5px;
		padding: 5px 0;
		background: transparent;
		border: 0;
		cursor: pointer;
	}

	.nav__toggle span {
		display: block;
		width: 100%;
		height: 2px;
		background: var(--navy);
	}

	.nav__mobile {
		display: flex;
		flex-direction: column;
		padding: 5px 24px 22px;
		border-top: 1px solid var(--cream-line);
	}

	.nav__mobile a,
	.nav__mobile button {
		padding: 13px 0;
		background: none;
		border: 0;
		border-bottom: 1px solid var(--cream-line);
		color: var(--text);
		text-align: left;
		font-weight: 600;
		cursor: pointer;
	}

	@media (min-width: 800px) {
		.nav__links {
			display: flex;
		}

		.nav__toggle {
			display: none;
		}
	}

	/* =================================================================
	   HERO
	================================================================= */

	.hero {
		padding: 105px 24px 110px;
		background: linear-gradient(
			135deg,
			rgba(237, 232, 220, 0.95),
			rgba(247, 243, 234, 1)
		);
	}

	.hero__inner {
		max-width: 760px;
		margin: 0 auto;
		text-align: center;
	}

	.hero__logo {
		display: block;
		width: min(470px, 90%);
		height: auto;
		margin: 0 auto 36px;
	}

	.hero__eyebrow {
		margin-bottom: 15px;
		color: var(--sage);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.hero h1 {
		margin-bottom: 20px;
		font-size: clamp(38px, 6vw, 62px);
		font-weight: 600;
	}

	.hero__subtitle {
		max-width: 590px;
		margin: 0 auto 32px;
		color: var(--text-soft);
		font-size: 18px;
	}

	/* =================================================================
	   ABOUT
	================================================================= */

	.about {
		padding: 90px 24px;
		background: var(--cream);
	}

	.about__inner {
		display: grid;
		grid-template-columns: 1fr;
		gap: 45px;
		align-items: center;
		max-width: 1120px;
		margin: 0 auto;
	}

	.about__image-wrap {
		overflow: hidden;
		border-radius: 10px;
	}

	.about__image {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
	}

	.about__content h2 {
		margin-bottom: 24px;
		font-size: clamp(30px, 4vw, 42px);
		font-weight: 600;
	}

	.about__content > p:last-child {
		color: var(--text-soft);
		font-size: 16px;
		line-height: 1.8;
	}

	@media (min-width: 820px) {
		.about__inner {
			grid-template-columns: 1.05fr 0.95fr;
			gap: 70px;
		}
	}

	/* =================================================================
	   SERVICES
	================================================================= */

	.services {
		padding: 95px 24px;
		background: var(--cream-deep);
	}

	.services__header {
		max-width: 680px;
		margin: 0 auto 55px;
		text-align: center;
	}

	.services__header h2 {
		margin-bottom: 18px;
		font-size: clamp(32px, 5vw, 44px);
	}

	.services__intro {
		color: var(--text-soft);
	}

	.services__list {
		display: flex;
		max-width: 1120px;
		margin: 0 auto;
		flex-direction: column;
		gap: 34px;
	}

	.service {
		display: grid;
		grid-template-columns: 1fr;
		overflow: hidden;
		background: var(--cream);
		border: 1px solid var(--cream-line);
		border-radius: 12px;
	}

	/* =================================================================
	   SERVICE PHOTO CAROUSEL
	================================================================= */

	.service__carousel {
		position: relative;
		min-height: 300px;
		overflow: hidden;
		background: var(--navy-deep);
	}

	.service__slides {
		position: absolute;
		inset: 0;
	}

	.service__slide {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;

		opacity: 0;
		visibility: hidden;

		transition:
			opacity 0.8s ease,
			visibility 0.8s ease;
	}

	.service__slide.active {
		opacity: 1;
		visibility: visible;
	}

	.carousel-arrow {
		position: absolute;
		top: 50%;
		z-index: 5;

		display: flex;
		width: 42px;
		height: 42px;
		align-items: center;
		justify-content: center;

		padding: 0;

		transform: translateY(-50%);

		background: rgba(16, 26, 45, 0.72);
		border: 1px solid rgba(255, 255, 255, 0.35);
		border-radius: 50%;

		color: white;
		font-size: 30px;
		line-height: 1;

		cursor: pointer;

		transition:
			background 0.2s ease,
			transform 0.2s ease;
	}

	.carousel-arrow:hover {
		background: rgba(16, 26, 45, 0.95);
	}

	.carousel-arrow--left {
		left: 15px;
	}

	.carousel-arrow--right {
		right: 15px;
	}

	.carousel-dots {
		position: absolute;
		right: 0;
		bottom: 17px;
		left: 0;
		z-index: 5;

		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.carousel-dot {
		width: 10px;
		height: 10px;
		padding: 0;

		background: rgba(255, 255, 255, 0.55);
		border: 1px solid rgba(16, 26, 45, 0.35);
		border-radius: 50%;

		cursor: pointer;

		transition:
			background 0.2s ease,
			transform 0.2s ease;
	}

	.carousel-dot.active {
		background: white;
		transform: scale(1.25);
	}

	/* =================================================================
	   SERVICE CONTENT
	================================================================= */

	.service__content {
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 32px;
	}

	.service__number {
		margin-bottom: 13px;
		color: var(--sage);
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.14em;
	}

	.service__content h3 {
		margin-bottom: 13px;
		font-size: clamp(21px, 3vw, 28px);
	}

	.service__lead {
		margin-bottom: 13px;
		color: var(--sage-dark);
		font-size: 14px;
		font-weight: 700;
	}

	.service__description {
		color: var(--text-soft);
		font-size: 15px;
	}

	@media (min-width: 760px) {
		.service {
			grid-template-columns: 1.08fr 0.92fr;
			min-height: 390px;
		}

		.service:nth-child(even) .service__carousel {
			order: 2;
		}

		.service:nth-child(even) .service__content {
			order: 1;
		}

		.service__carousel {
			min-height: 390px;
		}

		.service__content {
			padding: 45px;
		}
	}

	/* =================================================================
	   CALL TO ACTION
	================================================================= */

	.closing-cta {
		padding: 85px 24px;
		background: var(--sage-dark);
	}

	.closing-cta__inner {
		max-width: 680px;
		margin: 0 auto;
		text-align: center;
	}

	.closing-cta .section-eyebrow {
		color: var(--sage-light);
	}

	.closing-cta h2 {
		margin-bottom: 17px;
		color: var(--cream);
		font-size: clamp(30px, 5vw, 44px);
	}

	.closing-cta p:not(.section-eyebrow) {
		margin-bottom: 28px;
		color: rgba(247, 243, 234, 0.8);
	}

	/* =================================================================
	   FOOTER
	================================================================= */

	.footer {
		padding: 60px 24px 25px;
		background: var(--navy-deep);
		color: var(--cream);
	}

	.footer__inner {
		display: grid;
		max-width: 1120px;
		margin: 0 auto;
		grid-template-columns: 1fr;
		gap: 38px;
	}

	.footer__logo {
		display: block;
		width: 210px;
		max-height: 90px;
		margin-bottom: 17px;
		object-fit: contain;
		object-position: left center;
	}

	.footer__brand-column > p {
		max-width: 350px;
		color: var(--sage-light);
		font-size: 14px;
	}

	.footer__column h3 {
		margin-bottom: 14px;
		color: var(--cream);
		font-size: 15px;
	}

	.footer address {
		color: var(--sage-light);
		font-style: normal;
		font-size: 14px;
	}

	.footer address a {
		display: inline-block;
		margin-top: 12px;
	}

	.footer__emails {
		display: flex;
		flex-direction: column;
		gap: 7px;
		color: var(--sage-light);
		font-size: 14px;
	}

	.footer a:hover {
		color: var(--cream);
	}

	.footer__bottom {
		max-width: 1120px;
		margin: 45px auto 0;
		padding-top: 20px;
		border-top: 1px solid rgba(247, 243, 234, 0.12);
		color: var(--sage-light);
		font-size: 12px;
	}

	@media (min-width: 760px) {
		.footer__inner {
			grid-template-columns: 1.4fr 0.8fr 1fr;
		}
	}

	/* =================================================================
	   PROJECT FORM
	================================================================= */

	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		overflow-y: auto;
		align-items: flex-start;
		justify-content: center;
		padding: 35px 18px;
		background: rgba(16, 26, 45, 0.7);
	}

	.modal {
		position: relative;
		width: 100%;
		max-width: 620px;
		padding: 38px 30px;
		background: var(--cream);
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
	}

	.modal-close {
		position: absolute;
		top: 14px;
		right: 14px;

		display: flex;
		width: 34px;
		height: 34px;
		align-items: center;
		justify-content: center;

		background: var(--cream-deep);
		border: 0;
		border-radius: 50%;

		color: var(--navy);
		font-size: 21px;

		cursor: pointer;
	}

	.modal-title,
	.modal-success h3 {
		margin-bottom: 10px;
		font-size: 28px;
	}

	.modal-subtitle,
	.modal-success > p:not(.section-eyebrow) {
		margin-bottom: 25px;
		color: var(--text-soft);
		font-size: 14px;
	}

	.project-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		color: var(--navy);
		font-size: 13px;
		font-weight: 700;
	}

	.form-field input,
	.form-field select,
	.form-field textarea {
		width: 100%;
		padding: 11px 12px;
		background: var(--white);
		border: 1px solid var(--cream-line);
		border-radius: 6px;
		color: var(--text);
		font-size: 14px;
		font-weight: 400;
	}

	.form-field input:focus,
	.form-field select:focus,
	.form-field textarea:focus {
		outline: 2px solid rgba(92, 115, 80, 0.25);
		border-color: var(--sage);
	}

	.form-field textarea {
		resize: vertical;
	}

	.form-field input[type='file'] {
		padding: 9px;
	}

	.form-help {
		color: var(--text-soft);
		font-size: 11px;
		font-weight: 400;
	}

	.form-error { color: #9b3028; font-size: 13px; }

	.modal-submit {
		width: 100%;
		margin-top: 5px;
	}

	.modal-success {
		padding: 20px 0;
		text-align: center;
	}

	@media (min-width: 600px) {
		.form-row {
			grid-template-columns: 1fr 1fr;
		}
	}

	/* =================================================================
	   MOBILE
	================================================================= */

	@media (max-width: 500px) {
		.hero {
			padding-top: 75px;
			padding-bottom: 80px;
		}

		.about,
		.services {
			padding-top: 70px;
			padding-bottom: 70px;
		}

		.service__carousel {
			min-height: 260px;
		}

		.service__content {
			padding: 25px 22px;
		}

		.carousel-arrow {
			width: 38px;
			height: 38px;
		}

		.modal {
			padding: 34px 20px 25px;
		}
	}

	/* =================================================================
	   REDUCED MOTION
	================================================================= */

	@media (prefers-reduced-motion: reduce) {
		.service__slide,
		.btn,
		.carousel-dot {
			transition: none;
		}
	}
</style>
