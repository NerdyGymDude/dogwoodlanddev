# Dogwood Admin Portal prototype

The portal is available at `/admin`. The existing public site remains unchanged.

## Architecture

- SvelteKit route: `src/routes/admin/+page.svelte`
- Domain types: `src/lib/admin/types.ts`
- Realistic demo records: `src/lib/admin/mock-data.ts`
- Reactive mock service/store: `src/lib/admin/store.svelte.ts`
- PWA manifest and offline shell: `static/manifest.webmanifest`, `static/service-worker.js`

The UI reads and mutates records through the store, rather than embedding business data in components. This is the seam for later Supabase repositories, live Zoho mail, durable file storage, calendar adapters, and push notifications.

The public inquiry form is currently local-only and lives inside `src/routes/+page.svelte`. Its future submit handler should call an inquiry service that creates an inquiry plus an Action Center item in one operation. The existing form was not changed because it has uncommitted work and production persistence is explicitly deferred.

## Validate with Branch

1. Whether projects commonly need multiple parcels.
2. Exact phase terminology and permit fields.
3. Current invoice layout and billing workflow.
4. Which features should eventually replace QuickBooks.
5. Preferred operational/financial reports and scheduled delivery.
6. Push notification defaults and future staff permissions.
7. External calendar sync priorities.
8. Dogwood-specific project fields still missing from the prototype.

Permissions and client sharing are demonstrated in frontend state only. They must be enforced server-side before production use. No secrets, Supabase schema, production integrations, client portal, or vendor portal are included.
