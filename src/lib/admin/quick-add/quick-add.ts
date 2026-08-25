import type { AdminRecordType } from '../forms/types';

export interface QuickAddOption {
	type: AdminRecordType;
	label: string;
	description: string;
	icon: string;
	mobilePriority: boolean;
}

export const quickAddOptions: QuickAddOption[] = [
	{
		type: 'client',
		label: 'Client',
		description: 'Add a new client or company',
		icon: '👤',
		mobilePriority: true
	},
	{
		type: 'contact',
		label: 'Contact',
		description: 'Add a client or project contact',
		icon: '📇',
		mobilePriority: false
	},
	{
		type: 'project',
		label: 'Project',
		description: 'Start a new development project',
		icon: '🏗️',
		mobilePriority: true
	},
	{
		type: 'task',
		label: 'Task',
		description: 'Create a task or follow-up',
		icon: '✓',
		mobilePriority: true
	},
	{
		type: 'estimate',
		label: 'Estimate',
		description: 'Prepare a project estimate',
		icon: '🧾',
		mobilePriority: true
	},
	{
		type: 'invoice',
		label: 'Invoice',
		description: 'Create a client invoice',
		icon: '💵',
		mobilePriority: true
	},
	{
		type: 'expense',
		label: 'Expense',
		description: 'Record an expense or receipt',
		icon: '💳',
		mobilePriority: true
	},
	{
		type: 'document',
		label: 'Upload File',
		description: 'Upload a receipt, plan, permit or other file',
		icon: '📎',
		mobilePriority: true
	},
	{
		type: 'event',
		label: 'Calendar Event',
		description: 'Schedule a meeting, deadline or site visit',
		icon: '📅',
		mobilePriority: true
	},
	{
		type: 'note',
		label: 'Note',
		description: 'Add a project or client note',
		icon: '📝',
		mobilePriority: true
	}
];
