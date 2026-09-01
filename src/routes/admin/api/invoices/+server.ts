import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';

const legacyResponse = () => json({ error: 'Legacy invoice editing is disabled. Use Project Financials.' }, { status: 410 });
export const POST: RequestHandler = async ({ locals }) => { await requireActiveStaff(locals); return legacyResponse(); };
export const PUT: RequestHandler = async ({ locals }) => { await requireActiveStaff(locals); return legacyResponse(); };
