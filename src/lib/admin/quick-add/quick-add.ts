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
		type: 'invoice',
		label: 'Invoice',
		description: 'Create a client invoice',
		icon: '💵',
		mobilePriority: true
	}
];
