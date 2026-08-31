import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActiveStaff } from '$lib/server/admin/authorization';
import { createSupabaseAdminClient } from '$lib/server/integrations/supabase-admin';
import { getProjectFinancialData, mapBillingTask, mapPayment, mapPaymentAllocation } from '$lib/server/admin/accounting';
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

		let receipt = null;
		let warning = '';
		try {
			receipt = await createAndSendReceipt(admin, user.id, { id: savedPayment.id, project_id: savedPayment.project_id, amount: savedPayment.amount });
		} catch (error) {
			console.error(`Paper check ${savedPayment.id} was recorded, but its receipt could not be completed:`, error);
			warning = 'Payment recorded, but the receipt could not be generated or sent.';
		}
		const financialState = await getProjectFinancialData(admin, projectId);
		return json({ payment: mapPayment(savedPayment), allocations: (allocations ?? []).map(mapPaymentAllocation), tasks: updatedTasks.map(mapBillingTask), receipt, warning, financialState }, { status: 201 });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to record paper check.' }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ locals, url }) => {
	await requireActiveStaff(locals);
	const projectId = String(url.searchParams.get('projectId') ?? '').trim();
	const paymentId = String(url.searchParams.get('id') ?? '').trim();
	if (!projectId || !paymentId) return json({ error: 'Project and payment IDs are required.' }, { status: 400 });
	const admin = createSupabaseAdminClient();
	try {
		const { data: payment, error: paymentError } = await admin.from('project_payments').select('id, payment_method, check_file_path').eq('id', paymentId).eq('project_id', projectId).maybeSingle();
		if (paymentError) throw paymentError;
		if (!payment) return json({ error: 'Payment not found.' }, { status: 404 });
		if (payment.payment_method !== 'paper_check') return json({ error: 'Stripe payments cannot be removed.' }, { status: 409 });
		const { data: allocations, error: allocationError } = await admin.from('project_payment_allocations').select('project_billing_task_id, amount').eq('payment_id', paymentId);
		if (allocationError) throw allocationError;
		const taskIds = (allocations ?? []).map((allocation) => allocation.project_billing_task_id);
		const { data: tasks, error: taskError } = taskIds.length
			? await admin.from('project_billing_tasks').select('id, billed_amount, task_total').eq('project_id', projectId).in('id', taskIds)
			: { data: [], error: null };
		if (taskError) throw taskError;
		if ((tasks ?? []).length !== taskIds.length) throw new Error('One or more allocated billing tasks could not be restored.');
		const taskById = new Map((tasks ?? []).map((task) => [task.id, task]));
		const restorations = (allocations ?? []).map((allocation) => {
			const task = taskById.get(allocation.project_billing_task_id)!;
			const restored = Math.round((Number(task.billed_amount) + Number(allocation.amount)) * 100) / 100;
			if (restored > Number(task.task_total)) throw new Error('This check cannot be removed because a related task Amount was reduced after payment.');
			return { id: task.id, original: Number(task.billed_amount), restored };
		});

		const { data: receipts, error: receiptLoadError } = await admin.from('financial_documents').select('id, pdf_storage_path').eq('source_payment_id', paymentId).eq('document_type', 'receipt');
		if (receiptLoadError) throw receiptLoadError;
		const restoredTaskIds: string[] = [];
		try {
			for (const restoration of restorations) {
				const { data: restoredTask, error: restoreError } = await admin.from('project_billing_tasks').update({ billed_amount: restoration.restored }).eq('id', restoration.id).eq('project_id', projectId).eq('billed_amount', restoration.original).select('id').maybeSingle();
				if (restoreError) throw restoreError;
				if (!restoredTask) throw new Error('A billing task changed while the check was being removed. Please retry.');
				restoredTaskIds.push(restoration.id);
			}
			if (receipts?.length) {
			const { error: receiptDeleteError } = await admin.from('financial_documents').delete().eq('source_payment_id', paymentId).eq('document_type', 'receipt');
			if (receiptDeleteError) throw new Error(`The generated receipt could not be removed: ${receiptDeleteError.message}`);
			}

			const { data: deleted, error: deleteError } = await admin.from('project_payments').delete().eq('id', paymentId).eq('project_id', projectId).eq('payment_method', 'paper_check').select('id').maybeSingle();
			if (deleteError) throw deleteError;
			if (!deleted) throw new Error('Paper-check payment was not found during removal.');
		} catch (deleteError) {
			for (const taskId of restoredTaskIds.reverse()) {
				const restoration = restorations.find((item) => item.id === taskId)!;
				await admin.from('project_billing_tasks').update({ billed_amount: restoration.original }).eq('id', taskId).eq('project_id', projectId).eq('billed_amount', restoration.restored);
			}
			throw deleteError;
		}

		const cleanupPaths = [payment.check_file_path, ...(receipts ?? []).map((receipt) => receipt.pdf_storage_path)].filter((path): path is string => Boolean(path));
		let warning = '';
		if (cleanupPaths.length) {
			const { error: cleanupError } = await admin.storage.from('client-documents').remove(cleanupPaths);
			if (cleanupError) {
				console.error(`Payment ${paymentId} was removed, but storage cleanup failed:`, cleanupError);
				warning = 'Payment removed, but one or more associated files could not be cleaned up.';
			}
		}
		return json({ financialState: await getProjectFinancialData(admin, projectId), warning });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to remove paper-check payment.' }, { status: 500 });
	}
};
