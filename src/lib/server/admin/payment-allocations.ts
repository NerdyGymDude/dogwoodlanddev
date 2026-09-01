export type AllocationTask = { id: string; billed_amount: unknown; display_order: unknown };
export type RequestedAllocation = { taskId: string; amountCents: number };
export type PaymentAllocationPlan = { taskId: string; amountCents: number; nextBilledAmount: number }[];

export const moneyCents = (value: unknown) => Math.round(Number(value) * 100);

export function buildPaymentAllocationPlan(tasks: AllocationTask[], paymentAmountCents: number, requested: RequestedAllocation[] | null): PaymentAllocationPlan {
	const orderedTasks = [...tasks].sort((a, b) => Number(a.display_order) - Number(b.display_order));
	const amountDueCents = orderedTasks.reduce((sum, task) => sum + moneyCents(task.billed_amount), 0);
	if (!Number.isInteger(paymentAmountCents) || paymentAmountCents <= 0) throw new Error('Check Amount must be greater than zero.');
	if (paymentAmountCents > amountDueCents) throw new Error('Check Amount cannot exceed the current Amount Due.');

	if (requested) {
		if (!requested.length) throw new Error('Add at least one task allocation.');
		const ids = requested.map((allocation) => allocation.taskId);
		if (new Set(ids).size !== ids.length) throw new Error('Each task may only be allocated once per payment.');
		const total = requested.reduce((sum, allocation) => sum + allocation.amountCents, 0);
		if (total !== paymentAmountCents) throw new Error('Task allocations must equal the Check Amount.');
		return requested.map((allocation) => {
			if (!Number.isInteger(allocation.amountCents) || allocation.amountCents <= 0) throw new Error('Every task allocation must be greater than zero.');
			const task = orderedTasks.find((item) => item.id === allocation.taskId);
			if (!task) throw new Error('Every allocated task must belong to this project.');
			const billedCents = moneyCents(task.billed_amount);
			if (allocation.amountCents > billedCents) throw new Error('A task allocation cannot exceed that task’s current Billed Amount.');
			return { taskId: task.id, amountCents: allocation.amountCents, nextBilledAmount: (billedCents - allocation.amountCents) / 100 };
		});
	}

	let remaining = paymentAmountCents;
	const plan: PaymentAllocationPlan = [];
	for (const task of orderedTasks) {
		if (remaining <= 0) break;
		const billedCents = moneyCents(task.billed_amount);
		if (billedCents <= 0) continue;
		const amountCents = Math.min(billedCents, remaining);
		plan.push({ taskId: task.id, amountCents, nextBilledAmount: (billedCents - amountCents) / 100 });
		remaining -= amountCents;
	}
	if (remaining !== 0) throw new Error('Unable to allocate the full Check Amount to current billed tasks.');
	return plan;
}
