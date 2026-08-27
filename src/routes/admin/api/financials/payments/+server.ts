import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';
import { createSupabaseAdminClient } from '$lib/server/integrations/supabase-admin';
import { mapBillingTask, mapPayment, mapPaymentAllocation } from '$lib/server/admin/accounting';
import { createAndSendReceipt } from '$lib/server/admin/invoice-documents';
import { buildPaymentAllocationPlan, moneyCents, type RequestedAllocation } from '$lib/server/admin/payment-allocations';

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'check';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireActiveStaff(locals);
	try {
		const form = await request.formData();
		const projectId = String(form.get('projectId') ?? '');
		const amountCents = moneyCents(form.get('amount'));
		const amount = amountCents / 100;
		const allocationMode = String(form.get('allocationMode') ?? 'invoice');
		const checkNumber = String(form.get('checkNumber') ?? '').trim();
		const memo = String(form.get('memo') ?? '').trim();
		const paymentDate = String(form.get('paymentDate') ?? '');
		const file = form.get('file');
		if (!projectId || !Number.isInteger(amountCents) || amountCents <= 0 || !checkNumber || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) throw new Error('Check amount, check number, and date received are required.');
		if (allocationMode !== 'invoice' && allocationMode !== 'tasks') throw new Error('Select a valid payment allocation method.');
		if (file instanceof File && file.size > 10 * 1024 * 1024) throw new Error('Check files must be 10 MB or less.');
		let requestedAllocations: RequestedAllocation[] | null = null;
		if (allocationMode === 'tasks') {
			const raw = JSON.parse(String(form.get('allocations') ?? '[]')) as Array<{ taskId?: unknown; amount?: unknown }>;
			if (!Array.isArray(raw)) throw new Error('Invalid task allocations.');
			requestedAllocations = raw.map((allocation) => ({ taskId: String(allocation.taskId ?? ''), amountCents: moneyCents(allocation.amount) }));
		}

		const admin = createSupabaseAdminClient();
		const [{ data: project, error: projectError }, { data: tasks, error: taskError }] = await Promise.all([
			admin.from('projects').select('id').eq('id', projectId).maybeSingle(),
			admin.from('project_billing_tasks').select('*').eq('project_id', projectId).order('display_order')
		]);
		if (projectError) throw projectError;
		if (!project) throw new Error('Project not found.');
		if (taskError) throw taskError;
		const plan = buildPaymentAllocationPlan(tasks ?? [], amountCents, requestedAllocations);

		const { data: payment, error: paymentError } = await admin.from('project_payments').insert({ project_id: projectId, project_billing_task_id: null, payment_method: 'paper_check', amount, payment_date: paymentDate, check_number: checkNumber, memo: memo || null, created_by: user.id }).select('*').single();
		if (paymentError) throw paymentError;
		let savedPayment = payment;
		let checkPath = '';
		if (file instanceof File && file.size > 0) {
			checkPath = `financials/${projectId}/checks/${payment.id}/${safeName(file.name)}`;
			const { error: uploadError } = await admin.storage.from('client-documents').upload(checkPath, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream', upsert: false });
			if (uploadError) { await admin.from('project_payments').delete().eq('id', payment.id); throw uploadError; }
			const { data: updated, error: updateError } = await admin.from('project_payments').update({ check_file_path: checkPath }).eq('id', payment.id).select('*').single();
			if (updateError) { await admin.storage.from('client-documents').remove([checkPath]); await admin.from('project_payments').delete().eq('id', payment.id); throw updateError; }
			savedPayment = updated;
		}

		const { data: allocations, error: allocationError } = await admin.from('project_payment_allocations').insert(plan.map((allocation) => ({ payment_id: payment.id, project_billing_task_id: allocation.taskId, amount: allocation.amountCents / 100 }))).select('*');
		if (allocationError) {
			if (checkPath) await admin.storage.from('client-documents').remove([checkPath]);
			await admin.from('project_payments').delete().eq('id', payment.id);
			throw allocationError;
		}

		const updatedTasks = [];
		for (const allocation of plan) {
			const { data, error } = await admin.from('project_billing_tasks').update({ billed_amount: allocation.nextBilledAmount }).eq('id', allocation.taskId).eq('project_id', projectId).select('*').single();
			if (error) throw new Error(`Payment ${payment.id} and its allocations were recorded, but Billed Amount could not be updated for every task: ${error.message}`);
			updatedTasks.push(data);
		}

		const receipt = await createAndSendReceipt(admin, user.id, { id: savedPayment.id, project_id: savedPayment.project_id, amount: savedPayment.amount });
		return json({ payment: mapPayment(savedPayment), allocations: (allocations ?? []).map(mapPaymentAllocation), tasks: updatedTasks.map(mapBillingTask), receipt }, { status: 201 });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to record paper check.' }, { status: 400 });
	}
};
