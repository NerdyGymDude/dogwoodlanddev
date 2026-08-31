import type { SupabaseClient } from '@supabase/supabase-js';

export type FinancialTotals = { totalProjectInvoice: number; amountPaidToDate: number; amountDue: number };
const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100) / 100;

export function calculateFinancialTotals(
	tasks: Array<{ task_total?: unknown; taskTotal?: unknown; billed_amount?: unknown; billedAmount?: unknown }>,
	payments: Array<{ amount?: unknown }>
): FinancialTotals {
	return {
		totalProjectInvoice: cents(tasks.reduce((sum, row) => sum + Number(row.task_total ?? row.taskTotal ?? 0), 0)),
		amountPaidToDate: cents(payments.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)),
		amountDue: cents(tasks.reduce((sum, row) => sum + Number(row.billed_amount ?? row.billedAmount ?? 0), 0))
	};
}

export const mapBillingTask = (row: any) => ({ id: row.id, projectId: row.project_id, description: row.description ?? '', taskTotal: Number(row.task_total ?? 0), billedAmount: Number(row.billed_amount ?? 0), displayOrder: Number(row.display_order ?? 0) });
export const mapPayment = (row: any) => ({ id: row.id, projectId: row.project_id, paymentMethod: row.payment_method, amount: Number(row.amount ?? 0), paymentDate: row.payment_date, checkNumber: row.check_number ?? '', checkFilePath: row.check_file_path ?? '', projectBillingTaskId: row.project_billing_task_id ?? '', memo: row.memo ?? '', createdAt: row.created_at ?? '' });
export const mapPaymentAllocation = (row: any) => ({ id: row.id, paymentId: row.payment_id, projectBillingTaskId: row.project_billing_task_id, amount: Number(row.amount ?? 0), createdAt: row.created_at ?? '' });
export const mapFinancialDocument = (row: any) => ({
	id: row.id, projectId: row.project_id, documentType: row.document_type,
	totalProjectInvoice: Number(row.total_project_invoice ?? 0), amountPaidToDate: Number(row.amount_paid_to_date ?? 0), amountDue: Number(row.amount_due ?? 0),
	recipientContactIds: Array.isArray(row.recipient_contact_ids) ? row.recipient_contact_ids : [], pdfStoragePath: row.pdf_storage_path ?? '', createdAt: row.created_at ?? '', sentAt: row.sent_at ?? '',
	lines: (row.financial_document_lines ?? []).map((line: any) => ({ id: line.id, description: line.description, taskTotal: Number(line.task_total ?? 0), billedAmount: Number(line.billed_amount ?? 0), displayOrder: Number(line.display_order ?? 0) })).sort((a: any, b: any) => a.displayOrder - b.displayOrder)
});

export async function getFinancialData(supabase: SupabaseClient) {
	const [tasks, payments, allocations, documents] = await Promise.all([
		supabase.from('project_billing_tasks').select('*').order('display_order'),
		supabase.from('project_payments').select('*').order('payment_date', { ascending: false }),
		supabase.from('project_payment_allocations').select('*').order('created_at'),
		supabase.from('financial_documents').select('*, financial_document_lines(*)').eq('document_type', 'invoice').order('created_at', { ascending: false })
	]);
	if (tasks.error) throw tasks.error; if (payments.error) throw payments.error; if (allocations.error) throw allocations.error; if (documents.error) throw documents.error;
	return { projectBillingTasks: (tasks.data ?? []).map(mapBillingTask), projectPayments: (payments.data ?? []).map(mapPayment), projectPaymentAllocations: (allocations.data ?? []).map(mapPaymentAllocation), financialDocuments: (documents.data ?? []).map(mapFinancialDocument) };
}

export async function loadProjectFinancialState(supabase: SupabaseClient, projectId: string) {
	const [project, tasks, payments] = await Promise.all([
		supabase.from('projects').select('id, name, project_number, client_id').eq('id', projectId).single(),
		supabase.from('project_billing_tasks').select('*').eq('project_id', projectId).order('display_order'),
		supabase.from('project_payments').select('*').eq('project_id', projectId).order('payment_date', { ascending: false })
	]);
	if (project.error) throw project.error; if (tasks.error) throw tasks.error; if (payments.error) throw payments.error;
	return { project: project.data, tasks: tasks.data ?? [], payments: payments.data ?? [], totals: calculateFinancialTotals(tasks.data ?? [], payments.data ?? []) };
}

export async function getProjectFinancialData(supabase: SupabaseClient, projectId: string) {
	const [tasks, payments] = await Promise.all([
		supabase.from('project_billing_tasks').select('*').eq('project_id', projectId).order('display_order'),
		supabase.from('project_payments').select('*').eq('project_id', projectId).order('payment_date', { ascending: false })
	]);
	if (tasks.error) throw tasks.error;
	if (payments.error) throw payments.error;
	const paymentIds = (payments.data ?? []).map((payment) => payment.id);
	const allocations = paymentIds.length
		? await supabase.from('project_payment_allocations').select('*').in('payment_id', paymentIds).order('created_at')
		: { data: [], error: null };
	if (allocations.error) throw allocations.error;
	return {
		tasks: (tasks.data ?? []).map(mapBillingTask),
		payments: (payments.data ?? []).map(mapPayment),
		allocations: (allocations.data ?? []).map(mapPaymentAllocation)
	};
}

export function validateTaskInput(input: { description?: unknown; taskTotal?: unknown; billedAmount?: unknown }) {
	const description = String(input.description ?? '').trim(); const taskTotal = cents(input.taskTotal); const billedAmount = cents(input.billedAmount);
	if (!description) throw new Error('Description is required.');
	if (!Number.isFinite(taskTotal) || taskTotal < 0) throw new Error('Amount must be zero or greater.');
	if (!Number.isFinite(billedAmount) || billedAmount < 0) throw new Error('Billed Amount must be zero or greater.');
	if (billedAmount > taskTotal) throw new Error('Billed Amount cannot exceed Amount.');
	return { description, taskTotal, billedAmount };
}
