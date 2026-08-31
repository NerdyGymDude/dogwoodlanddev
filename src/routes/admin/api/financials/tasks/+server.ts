import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';
import { getProjectFinancialData, mapBillingTask, validateTaskInput } from '$lib/server/admin/accounting';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireActiveStaff(locals);
	try {
		const body = await request.json();
		const value = validateTaskInput(body);
		const { data: last } = await locals.supabase.from('project_billing_tasks').select('display_order').eq('project_id', body.projectId).order('display_order', { ascending: false }).limit(1).maybeSingle();
		const { data, error } = await locals.supabase.from('project_billing_tasks').insert({ project_id: body.projectId, description: value.description, task_total: value.taskTotal, billed_amount: value.billedAmount, display_order: Number(last?.display_order ?? -1) + 1, created_by: user.id }).select('*').single();
		if (error) throw error;
		return json({ task: mapBillingTask(data) }, { status: 201 });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to add financial task.' }, { status: 400 });
	}
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	await requireActiveStaff(locals);
	try {
		const body = await request.json();
		const value = validateTaskInput(body);
		const { data: taskAllocations, error: allocationError } = await locals.supabase.from('project_payment_allocations').select('amount').eq('project_billing_task_id', body.id);
		if (allocationError) throw allocationError;
		const amountPaid = (taskAllocations ?? []).reduce((sum, allocation) => sum + Number(allocation.amount ?? 0), 0);
		const remainingDue = Math.max(value.taskTotal - amountPaid, 0);
		if (value.billedAmount > remainingDue) throw new Error('Billed Amount cannot exceed Remaining Due.');
		const { data, error } = await locals.supabase.from('project_billing_tasks').update({ description: value.description, task_total: value.taskTotal, billed_amount: value.billedAmount }).eq('id', body.id).eq('project_id', body.projectId).select('*').single();
		if (error) throw error;
		return json({ task: mapBillingTask(data) });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to update financial task.' }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ locals, url }) => {
	await requireActiveStaff(locals);
	const projectId = String(url.searchParams.get('projectId') ?? '').trim();
	const taskId = String(url.searchParams.get('id') ?? '').trim();
	if (!projectId || !taskId) return json({ error: 'Project and billing task IDs are required.' }, { status: 400 });
	try {
		const [{ count: allocationCount, error: allocationError }, { count: paymentCount, error: paymentError }] = await Promise.all([
			locals.supabase.from('project_payment_allocations').select('id', { count: 'exact', head: true }).eq('project_billing_task_id', taskId),
			locals.supabase.from('project_payments').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('project_billing_task_id', taskId)
		]);
		if (allocationError) throw allocationError;
		if (paymentError) throw paymentError;
		if ((allocationCount ?? 0) > 0 || (paymentCount ?? 0) > 0) return json({ error: 'A billing task with payment history cannot be removed. Remove eligible payment history first.' }, { status: 409 });
		const { data, error } = await locals.supabase.from('project_billing_tasks').delete().eq('id', taskId).eq('project_id', projectId).select('id').maybeSingle();
		if (error?.code === '23503') return json({ error: 'A billing task with payment history cannot be removed.' }, { status: 409 });
		if (error) throw error;
		if (!data) return json({ error: 'Billing task not found.' }, { status: 404 });
		return json({ financialState: await getProjectFinancialData(locals.supabase, projectId) });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to remove billing task.' }, { status: 500 });
	}
};
