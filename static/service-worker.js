const CACHE = 'dogwood-public-v2';
const PUBLIC_SHELL = ['/manifest.webmanifest', '/images/dogwood-land-dev-logo-main.png'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PUBLIC_SHELL))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	const isSameOrigin = url.origin === self.location.origin;
	const isPrivateRoute =
		url.pathname === '/admin' ||
		url.pathname.startsWith('/admin/') ||
		url.pathname === '/api' ||
		url.pathname.startsWith('/api/');

	if (!isSameOrigin || isPrivateRoute) return;

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				if (response.ok && response.type === 'basic') {
					const copy = response.clone();
					void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
				}

				return response;
			})
			.catch(async () => (await caches.match(event.request)) ?? Response.error())
	);
});
