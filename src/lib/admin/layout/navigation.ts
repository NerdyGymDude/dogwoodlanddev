export type AdminNavItem = {
	id: string;
	label: string;
	icon: string;
};

export const adminNavigation: AdminNavItem[] = [
	{ id: 'home', label: 'Action Center', icon: '⌂' },
	{ id: 'clients', label: 'Clients', icon: '♙' },
	{ id: 'projects', label: 'Projects', icon: '◇' },
	{ id: 'inbox', label: 'Inbox', icon: '✉' },
	{ id: 'tasks', label: 'Tasks', icon: '✓' },
	{ id: 'documents', label: 'Documents', icon: '▱' },
	{ id: 'calendar', label: 'Calendar', icon: '□' },
	{ id: 'accounting', label: 'Accounting', icon: '$' },
	{ id: 'vendors', label: 'Vendors', icon: '♢' },
	{ id: 'reports', label: 'Reports', icon: '⌁' },
	{ id: 'settings', label: 'Settings', icon: '⚙' }
];

export const mobilePrimaryNavigation = adminNavigation.filter((item) =>
	['home', 'inbox', 'projects', 'clients'].includes(item.id)
);

export const mobileMoreNavigation = adminNavigation.filter(
	(item) => !['home', 'inbox', 'projects', 'clients'].includes(item.id)
);
